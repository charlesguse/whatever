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
  readonly reservedRects: readonly Rect[];
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
// button cluster in portrait (band length is width there).
const PAD_SHARE = 0.6;

// FR-009 requires the pad/grab hit targets at or above 64 CSS px and
// pause/restart at or above 44. These floors are the safety net for that
// requirement, not the everyday value (the natural size derived from
// PAD_OUTER_RADIUS/GRAB_SIZE above is normally larger): if a future tuning
// pass shrinks those constants, the reserved band (portrait) or margins
// (landscape) still can't collapse below the size that keeps FR-009's
// minimums true. Both device boxes in layout.test.ts already pass the
// 64/44 assertions with these floors in place — lowering one trades away
// the requirement for reclaimed screen space.
const PORTRAIT_BAND_FLOOR = 160;
const LANDSCAPE_MARGIN_FLOOR = 140;

// Each landscape margin (pad on the left, grab/pause/restart on the
// right — FR-031's "margins beside it", plural) is capped at this fraction
// of the inset box's width so the two margins never crowd out caveRect.
const LANDSCAPE_MARGIN_MAX_FRACTION = 0.35;

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

// Portrait: one reserved band along the bottom edge — pad in the first
// PAD_SHARE of its width, grab/pause/restart in the rest — with caveRect
// the remainder of insetBox above it. The band is carved out of insetBox
// first and caveRect is the exact remainder, so the two can never overlap
// and neither can ever extend beyond insetBox, by construction, regardless
// of the tuning constants above (FR-031, FR-031a, SC-011, SC-011a).
function computePortraitLayout(insetBox: InsetBox): TouchControlLayout {
  const height = clamp(PAD_OUTER_RADIUS * 2 + MARGIN * 2, PORTRAIT_BAND_FLOOR, insetBox.height * 0.45);
  const bandRect: Rect = { x: insetBox.x, y: insetBox.y + insetBox.height - height, width: insetBox.width, height };
  const caveRect: Rect = { x: insetBox.x, y: insetBox.y, width: insetBox.width, height: insetBox.height - height };

  const padSection = bandRect.width * PAD_SHARE;
  const buttonSection = bandRect.width - padSection;
  const bandThickness = bandRect.height;

  const outerRadius = Math.max(0, Math.min(PAD_OUTER_RADIUS, padSection / 2 - MARGIN, bandThickness / 2 - MARGIN));
  const deadRadius = Math.min(PAD_DEAD_RADIUS, outerRadius * 0.4);
  const center = { x: bandRect.x + MARGIN + outerRadius, y: bandRect.y + bandRect.height / 2 };

  // The button cluster's region is narrow-and-tall (buttonSection wide, the
  // full band thickness tall) — grab sits above a row holding pause and
  // restart side by side.
  const buttonColumnX = bandRect.x + padSection;
  const buttonColumnWidth = buttonSection;
  const buttonColumnHeight = bandThickness;
  const grabSize = clamp(GRAB_SIZE, 0, Math.min(buttonColumnWidth - 2 * MARGIN, buttonColumnHeight - 2 * MARGIN));
  const smallSize = clamp(
    Math.min(PAUSE_SIZE, RESTART_SIZE),
    0,
    Math.min((buttonColumnWidth - 3 * MARGIN) / 2, buttonColumnHeight - grabSize - 3 * MARGIN)
  );
  const grabButton: Rect = {
    x: buttonColumnX + buttonColumnWidth - MARGIN - grabSize,
    y: bandRect.y + MARGIN,
    width: grabSize,
    height: grabSize,
  };
  const pauseButton: Rect = {
    x: buttonColumnX + buttonColumnWidth - MARGIN - smallSize,
    y: grabButton.y + grabSize + MARGIN,
    width: smallSize,
    height: smallSize,
  };
  const restartButton: Rect = {
    x: pauseButton.x - MARGIN - smallSize,
    y: grabButton.y + grabSize + MARGIN,
    width: smallSize,
    height: smallSize,
  };

  return {
    reservedRects: [bandRect],
    caveRect,
    pad: { center, deadRadius, outerRadius, zones: makeZones(center, outerRadius, deadRadius) },
    grabButton: containRect(grabButton, bandRect),
    pauseButton: containRect(pauseButton, bandRect),
    restartButton: containRect(restartButton, bandRect),
  };
}

// Landscape: FR-031 requires "margins beside it" (plural) — one thumb's
// margin on each side of the cave, not a single band holding everything.
// The pad gets its own left margin, grab/pause/restart their own right
// margin, and caveRect is the exact vertical strip between them — the two
// margins are carved out of insetBox first, so neither they nor caveRect
// can ever overlap or extend beyond insetBox, by construction.
function computeLandscapeLayout(insetBox: InsetBox): TouchControlLayout {
  const padMarginWidth = clamp(
    PAD_OUTER_RADIUS * 2 + MARGIN * 2,
    LANDSCAPE_MARGIN_FLOOR,
    insetBox.width * LANDSCAPE_MARGIN_MAX_FRACTION
  );
  const buttonMarginWidth = clamp(
    GRAB_SIZE + 2 * MARGIN,
    LANDSCAPE_MARGIN_FLOOR,
    insetBox.width * LANDSCAPE_MARGIN_MAX_FRACTION
  );

  const padMargin: Rect = { x: insetBox.x, y: insetBox.y, width: padMarginWidth, height: insetBox.height };
  const buttonMargin: Rect = {
    x: insetBox.x + insetBox.width - buttonMarginWidth,
    y: insetBox.y,
    width: buttonMarginWidth,
    height: insetBox.height,
  };
  const caveRect: Rect = {
    x: padMargin.x + padMargin.width,
    y: insetBox.y,
    width: insetBox.width - padMargin.width - buttonMargin.width,
    height: insetBox.height,
  };

  const outerRadius = Math.max(
    0,
    Math.min(PAD_OUTER_RADIUS, padMargin.width / 2 - MARGIN, padMargin.height / 2 - MARGIN)
  );
  const deadRadius = Math.min(PAD_DEAD_RADIUS, outerRadius * 0.4);
  const center = { x: padMargin.x + padMargin.width / 2, y: padMargin.y + padMargin.height / 2 };

  // The button margin holds grab above a row of pause and restart, exactly
  // like portrait's button column, just centered in its own margin instead
  // of sharing a band with the pad.
  const grabSize = clamp(GRAB_SIZE, 0, Math.min(buttonMargin.width - 2 * MARGIN, buttonMargin.height - 2 * MARGIN));
  const smallSize = clamp(
    Math.min(PAUSE_SIZE, RESTART_SIZE),
    0,
    Math.min((buttonMargin.width - 3 * MARGIN) / 2, buttonMargin.height - grabSize - 3 * MARGIN)
  );
  const grabButton: Rect = {
    x: buttonMargin.x + (buttonMargin.width - grabSize) / 2,
    y: buttonMargin.y + MARGIN,
    width: grabSize,
    height: grabSize,
  };
  const pauseButton: Rect = {
    x: buttonMargin.x + buttonMargin.width / 2 - MARGIN / 2 - smallSize,
    y: grabButton.y + grabSize + MARGIN,
    width: smallSize,
    height: smallSize,
  };
  const restartButton: Rect = {
    x: buttonMargin.x + buttonMargin.width / 2 + MARGIN / 2,
    y: grabButton.y + grabSize + MARGIN,
    width: smallSize,
    height: smallSize,
  };

  return {
    reservedRects: [padMargin, buttonMargin],
    caveRect,
    pad: { center, deadRadius, outerRadius, zones: makeZones(center, outerRadius, deadRadius) },
    grabButton: containRect(grabButton, buttonMargin),
    pauseButton: containRect(pauseButton, buttonMargin),
    restartButton: containRect(restartButton, buttonMargin),
  };
}

export function computeTouchControlLayout(insetBox: InsetBox, orientation: Orientation): TouchControlLayout {
  return orientation === 'portrait' ? computePortraitLayout(insetBox) : computeLandscapeLayout(insetBox);
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
