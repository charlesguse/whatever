import type { Direction } from '../../../sim/tick';
import { resolveDominantAxis } from './axis';

export interface InsetBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export type Orientation = 'portrait' | 'landscape';

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface PadZone {
  readonly direction: Direction;
  readonly rect: Rect;
}

export interface TouchControlLayout {
  readonly reservedRect: Rect;
  readonly caveRect: Rect;
  readonly pad: {
    readonly center: { readonly x: number; readonly y: number };
    readonly deadRadius: number;
    readonly outerRadius: number;
    readonly zones: readonly PadZone[];
  };
  readonly grabButton: Rect;
  readonly pauseButton: Rect;
  readonly restartButton: Rect;
}

export type ControlHit =
  | { readonly kind: 'pad'; readonly direction: Direction | undefined }
  | { readonly kind: 'grab' }
  | { readonly kind: 'pause' }
  | { readonly kind: 'restart' }
  | { readonly kind: 'none' };

// Tuning values the maintainer may retune at review, like the camera dead
// zone and door-flash interval from earlier features (FR-009).
const MARGIN = 16;
const PAD_OUTER_RADIUS = 110;
const PAD_DEAD_RADIUS = 30;
const GRAB_SIZE = 72;
const PAUSE_SIZE = 52;
const RESTART_SIZE = 52;

// The fraction of the reserved band's length given to the pad vs. the
// button cluster (portrait: band length is width; landscape: band length
// is height).
const PAD_SHARE = 0.6;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// Guarantees a rect never extends beyond bounds, regardless of the sizing
// arithmetic above — the invariant SC-011/FR-031a depend on (every control
// fully inside insetBox) is enforced structurally here, not by hoping the
// formulas above got every edge case right.
function containRect(rect: Rect, bounds: Rect): Rect {
  const width = Math.min(rect.width, bounds.width);
  const height = Math.min(rect.height, bounds.height);
  const x = clamp(rect.x, bounds.x, bounds.x + bounds.width - width);
  const y = clamp(rect.y, bounds.y, bounds.y + bounds.height - height);
  return { x, y, width, height };
}

// FR-031: no matchMedia, no screen API — a pure comparison of the inset
// box's own dimensions.
export function computeOrientation(insetBox: InsetBox): Orientation {
  return insetBox.height >= insetBox.width ? 'portrait' : 'landscape';
}

function makeZones(center: { x: number; y: number }, outerRadius: number, deadRadius: number): PadZone[] {
  const span = outerRadius - deadRadius;
  return [
    {
      direction: 'up',
      rect: { x: center.x - outerRadius, y: center.y - outerRadius, width: outerRadius * 2, height: span },
    },
    {
      direction: 'down',
      rect: { x: center.x - outerRadius, y: center.y + deadRadius, width: outerRadius * 2, height: span },
    },
    {
      direction: 'left',
      rect: { x: center.x - outerRadius, y: center.y - outerRadius, width: span, height: outerRadius * 2 },
    },
    {
      direction: 'right',
      rect: { x: center.x + deadRadius, y: center.y - outerRadius, width: span, height: outerRadius * 2 },
    },
  ];
}

// The reserved band is always carved out of insetBox first, and caveRect is
// the exact remainder — the two can never overlap and neither can ever
// extend beyond insetBox, by construction, regardless of the tuning
// constants above (FR-031, FR-031a, SC-011, SC-011a).
export function computeTouchControlLayout(insetBox: InsetBox, orientation: Orientation): TouchControlLayout {
  const reservedRect: Rect =
    orientation === 'portrait'
      ? (() => {
          const height = clamp(PAD_OUTER_RADIUS * 2 + MARGIN * 2, 160, insetBox.height * 0.45);
          return { x: insetBox.x, y: insetBox.y + insetBox.height - height, width: insetBox.width, height };
        })()
      : (() => {
          const width = clamp(PAD_OUTER_RADIUS * 2 + MARGIN * 2, 140, insetBox.width * 0.45);
          return { x: insetBox.x + insetBox.width - width, y: insetBox.y, width, height: insetBox.height };
        })();

  const caveRect: Rect =
    orientation === 'portrait'
      ? { x: insetBox.x, y: insetBox.y, width: insetBox.width, height: insetBox.height - reservedRect.height }
      : { x: insetBox.x, y: insetBox.y, width: insetBox.width - reservedRect.width, height: insetBox.height };

  // Within the band, the pad gets the first PAD_SHARE of its length, the
  // button cluster the rest — length runs along width in portrait (a
  // horizontal band) and along height in landscape (a vertical margin).
  const bandLength = orientation === 'portrait' ? reservedRect.width : reservedRect.height;
  const bandThickness = orientation === 'portrait' ? reservedRect.height : reservedRect.width;
  const padSection = bandLength * PAD_SHARE;
  const buttonSection = bandLength - padSection;

  const outerRadius = Math.max(0, Math.min(PAD_OUTER_RADIUS, padSection / 2 - MARGIN, bandThickness / 2 - MARGIN));
  const deadRadius = Math.min(PAD_DEAD_RADIUS, outerRadius * 0.4);

  const center =
    orientation === 'portrait'
      ? { x: reservedRect.x + MARGIN + outerRadius, y: reservedRect.y + reservedRect.height / 2 }
      : { x: reservedRect.x + reservedRect.width / 2, y: reservedRect.y + MARGIN + outerRadius };

  let grabButton: Rect;
  let pauseButton: Rect;
  let restartButton: Rect;

  if (orientation === 'portrait') {
    // The button cluster's region is narrow-and-tall (buttonSection wide,
    // the full band thickness tall) — grab sits above a row holding pause
    // and restart side by side.
    const buttonColumnX = reservedRect.x + padSection;
    const buttonColumnWidth = buttonSection;
    const buttonColumnHeight = bandThickness;
    const grabSize = clamp(GRAB_SIZE, 0, Math.min(buttonColumnWidth - 2 * MARGIN, buttonColumnHeight - 2 * MARGIN));
    const smallSize = clamp(
      Math.min(PAUSE_SIZE, RESTART_SIZE),
      0,
      Math.min((buttonColumnWidth - 3 * MARGIN) / 2, buttonColumnHeight - grabSize - 3 * MARGIN)
    );
    grabButton = {
      x: buttonColumnX + buttonColumnWidth - MARGIN - grabSize,
      y: reservedRect.y + MARGIN,
      width: grabSize,
      height: grabSize,
    };
    pauseButton = {
      x: buttonColumnX + buttonColumnWidth - MARGIN - smallSize,
      y: grabButton.y + grabSize + MARGIN,
      width: smallSize,
      height: smallSize,
    };
    restartButton = {
      x: pauseButton.x - MARGIN - smallSize,
      y: grabButton.y + grabSize + MARGIN,
      width: smallSize,
      height: smallSize,
    };
  } else {
    // The button cluster's region is wide-and-short (the full band
    // thickness wide, buttonSection tall) — grab, pause, and restart sit
    // side by side in one row.
    const buttonRowY = reservedRect.y + padSection;
    const buttonRowWidth = bandThickness;
    const buttonRowHeight = buttonSection;
    const grabSize = clamp(GRAB_SIZE, 0, buttonRowHeight - 2 * MARGIN);
    const remainingWidth = buttonRowWidth - grabSize - 4 * MARGIN;
    const smallSize = clamp(Math.min(PAUSE_SIZE, RESTART_SIZE), 0, Math.min(remainingWidth / 2, buttonRowHeight - 2 * MARGIN));
    grabButton = {
      x: reservedRect.x + MARGIN,
      y: buttonRowY + (buttonRowHeight - grabSize) / 2,
      width: grabSize,
      height: grabSize,
    };
    pauseButton = {
      x: grabButton.x + grabSize + MARGIN,
      y: buttonRowY + (buttonRowHeight - smallSize) / 2,
      width: smallSize,
      height: smallSize,
    };
    restartButton = {
      x: pauseButton.x + smallSize + MARGIN,
      y: buttonRowY + (buttonRowHeight - smallSize) / 2,
      width: smallSize,
      height: smallSize,
    };
  }

  return {
    reservedRect,
    caveRect,
    pad: { center, deadRadius, outerRadius, zones: makeZones(center, outerRadius, deadRadius) },
    grabButton: containRect(grabButton, reservedRect),
    pauseButton: containRect(pauseButton, reservedRect),
    restartButton: containRect(restartButton, reservedRect),
  };
}

function pointInRect(rect: Rect, x: number, y: number): boolean {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}

// contracts/touch-api.md's resolution order: buttons before the pad, so a
// button placed near the pad's outer radius cannot be shadowed by the
// pad's larger hit area.
export function resolveTouchPoint(layout: TouchControlLayout, x: number, y: number): ControlHit {
  if (pointInRect(layout.grabButton, x, y)) return { kind: 'grab' };
  if (pointInRect(layout.pauseButton, x, y)) return { kind: 'pause' };
  if (pointInRect(layout.restartButton, x, y)) return { kind: 'restart' };

  const dx = x - layout.pad.center.x;
  const dy = y - layout.pad.center.y;
  const distance = Math.hypot(dx, dy);
  if (distance <= layout.pad.outerRadius) {
    if (distance <= layout.pad.deadRadius) return { kind: 'pad', direction: undefined };
    return { kind: 'pad', direction: resolveDominantAxis(dx, dy) };
  }

  return { kind: 'none' };
}
