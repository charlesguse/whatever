import type { InsetBox, Rect } from '../input/touch/layout';

export interface Size {
  readonly width: number;
  readonly height: number;
}

export interface TopStripOccupantSizes {
  readonly readout?: Size;
  readonly muteButton: Size;
  readonly themePicker?: {
    readonly expanded: Size;
    readonly collapsed: Size;
  };
}

export interface TopStripLayout {
  readonly readout?: Rect;
  readonly muteButton: Rect;
  readonly themePicker?: {
    readonly rect: Rect;
    readonly collapsed: boolean;
  };
}

// The gap between the band's edges and its occupants, and between adjacent
// occupants — a maintainer-tunable value, like touch/layout.ts's own MARGIN,
// chosen to match the 0.5rem CSS gap the fixed positions this feature
// replaces already used.
const MARGIN = 8;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// Guarantees a rect never extends beyond bounds, regardless of the sizing
// arithmetic below — mirrors src/lib/input/touch/layout.ts's own
// containRect (FR-008 depends on this, not on every branch below getting
// the arithmetic right).
function containRect(rect: Rect, bounds: Rect): Rect {
  const width = Math.min(rect.width, bounds.width);
  const height = Math.min(rect.height, bounds.height);
  const x = clamp(rect.x, bounds.x, bounds.x + bounds.width - width);
  const y = clamp(rect.y, bounds.y, bounds.y + bounds.height - height);
  return { x, y, width, height };
}

function overlapsVertically(a: Rect, b: Rect): boolean {
  return a.y < b.y + b.height && a.y + a.height > b.y;
}

export function computeTopStripLayout(
  availableBox: InsetBox,
  reservedRects: readonly Rect[],
  sizes: TopStripOccupantSizes
): TopStripLayout {
  const heights = [sizes.muteButton.height];
  if (sizes.readout) heights.push(sizes.readout.height);
  if (sizes.themePicker) heights.push(sizes.themePicker.expanded.height, sizes.themePicker.collapsed.height);

  // Step 1: form the band, then subtract any reservedRects entry that
  // overlaps it vertically from its usable interior — this is what makes
  // landscape's full-height side margins cut into the top strip too,
  // without an orientation-specific branch (research.md).
  const bandHeight = Math.max(...heights) + MARGIN * 2;
  const band: Rect = { x: availableBox.x, y: availableBox.y, width: availableBox.width, height: bandHeight };
  // Inset the band's own leading/trailing edges by MARGIN before subtracting
  // any reservedRects, so the readout's leading edge and the theme picker's
  // trailing edge sit off the screen edge by the same ~8px (0.5rem) the
  // pre-feature fixed `.readout`/`.theme-picker` CSS used (FR-020).
  let usableLeft = band.x + MARGIN;
  let usableRight = band.x + band.width - MARGIN;
  for (const reserved of reservedRects) {
    if (!overlapsVertically(reserved, band)) continue;
    const reservedLeft = reserved.x;
    const reservedRight = reserved.x + reserved.width;
    if (reservedLeft <= usableLeft) usableLeft = Math.max(usableLeft, reservedRight);
    if (reservedRight >= usableRight) usableRight = Math.min(usableRight, reservedLeft);
  }
  const usableWidth = Math.max(0, usableRight - usableLeft);
  const centerY = (ownHeight: number): number => band.y + (bandHeight - ownHeight) / 2;

  // Step 2: decide the theme picker's form once, from natural sizes only
  // (FR-012a) — never from a previously-returned layout — so the decision
  // cannot oscillate (FR-012b).
  let collapsed = false;
  if (sizes.themePicker) {
    const presentCount = 2 + (sizes.readout ? 1 : 0); // mute + picker, plus readout if present
    const naturalSum =
      sizes.muteButton.width +
      (sizes.readout?.width ?? 0) +
      sizes.themePicker.expanded.width +
      MARGIN * (presentCount - 1);
    collapsed = naturalSum > usableWidth;
  }
  const pickerSize = sizes.themePicker ? (collapsed ? sizes.themePicker.collapsed : sizes.themePicker.expanded) : undefined;

  // Step 3: the theme picker (if present), in the form chosen above, claims
  // a fixed-width block at the band's trailing edge, at full natural size
  // (FR-011: it never shrinks). Placed before the readout and the mute
  // button because FR-013 makes it the first occupant to give up space —
  // everything else's cap is computed against its already-fixed width.
  const pickerRect: Rect | undefined = pickerSize
    ? {
        x: usableLeft + usableWidth - pickerSize.width,
        y: centerY(pickerSize.height),
        width: pickerSize.width,
        height: pickerSize.height,
      }
    : undefined;

  // Step 4: the readout (if present) takes the band's leading edge, capped
  // by the space left once the picker's fixed block and the mute button's
  // full natural width are both set aside (FR-013: the picker gives way
  // first, the mute never shrinks, so the readout's cap is computed against
  // their natural sizes directly — never against the mute's eventual
  // centered position, which would starve the readout for no reason).
  const readoutOthersWidth = sizes.muteButton.width + (pickerRect?.width ?? 0);
  const readoutGaps = pickerRect ? 2 : 1; // readout-to-mute, and mute-to-picker if present
  const readoutCap = usableWidth - readoutOthersWidth - MARGIN * readoutGaps;
  const readoutRect: Rect | undefined = sizes.readout
    ? {
        x: usableLeft,
        y: centerY(sizes.readout.height),
        width: Math.max(0, Math.min(sizes.readout.width, readoutCap)),
        height: sizes.readout.height,
      }
    : undefined;

  // Step 5: the mute button is placed at full natural size (FR-011),
  // centered in the gap between the readout's trailing edge (or the band's
  // leading edge, if no readout) and the picker's leading edge (or the
  // band's trailing edge, if no picker) — its historical desktop-centered
  // position, not the whole region left of the picker (FR-013).
  const muteLeftBound = readoutRect ? readoutRect.x + readoutRect.width + MARGIN : usableLeft;
  const muteRightBound = pickerRect ? pickerRect.x - MARGIN : usableLeft + usableWidth;
  const muteRegionWidth = muteRightBound - muteLeftBound;
  const muteRect: Rect = {
    x: muteLeftBound + (muteRegionWidth - sizes.muteButton.width) / 2,
    y: centerY(sizes.muteButton.height),
    width: sizes.muteButton.width,
    height: sizes.muteButton.height,
  };

  // Step 6: clamp every returned rect into availableBox, so no box can ever
  // extend beyond it regardless of the arithmetic above (FR-008).
  const bounds: Rect = { x: availableBox.x, y: availableBox.y, width: availableBox.width, height: availableBox.height };
  return {
    readout: readoutRect ? containRect(readoutRect, bounds) : undefined,
    muteButton: containRect(muteRect, bounds),
    themePicker: pickerRect ? { rect: containRect(pickerRect, bounds), collapsed } : undefined,
  };
}
