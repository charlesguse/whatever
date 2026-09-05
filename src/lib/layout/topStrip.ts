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
  readonly readout?: {
    readonly rect: Rect;
    readonly capped: boolean;
    readonly maxLines: number;
  };
  readonly muteButton: {
    readonly rect: Rect;
    readonly capped: boolean;
  };
  readonly themePicker?: {
    readonly rect: Rect;
    readonly collapsed: boolean;
    readonly capped: boolean;
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

interface BandPlacement {
  readonly usableLeft: number;
  readonly usableWidth: number;
  readonly centerY: (ownHeight: number) => number;
  readonly collapsed: boolean;
  readonly pickerSize: Size | undefined;
  readonly pickerRect: Rect | undefined;
  readonly readoutCap: number;
}

// Steps 1-4 of the Top-Strip Placement algorithm (data-model.md): the band's
// geometry and reserved-region subtraction, the collapse decision, the theme
// picker's placement, and the readout's width cap arithmetic.
//
// Two different band heights are in play here, deliberately kept separate:
// - the *reserved-subtraction* band (this function's `bandHeight`) uses
//   `growthAllowance` in place of the readout's own height (FR-016a), so
//   which reservedRects count against the usable width depends only on
//   availableBox — never on the readout's achieved or natural height, which
//   is what severs 012's width→height→width cycle at its only closing edge.
// - the *visual* centering line (`centerY`), which stays exactly as 012 had
//   it — a function of the occupants' natural sizes only — so substituting
//   growthAllowance above never moves the mute button or theme picker
//   relative to today's shipped positions (FR-013, SC-003): growthAllowance
//   can be much larger than any natural height (it is a fraction of the
//   whole available box), and centering against it would shove every
//   occupant toward the middle of the screen instead of the top of the strip.
function computeBandPlacement(
  availableBox: InsetBox,
  reservedRects: readonly Rect[],
  sizes: TopStripOccupantSizes,
  growthAllowance: number
): BandPlacement {
  const reservedHeights = [sizes.muteButton.height, growthAllowance];
  if (sizes.themePicker) reservedHeights.push(sizes.themePicker.expanded.height, sizes.themePicker.collapsed.height);
  const bandHeight = Math.max(...reservedHeights) + MARGIN * 2;
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

  // The visual centering line — unchanged from 012, a function of natural
  // sizes only (see the note above `bandHeight` for why this is not the
  // same height as the reserved-subtraction band).
  const visualHeights = [sizes.muteButton.height, sizes.readout?.height ?? 0];
  if (sizes.themePicker) visualHeights.push(sizes.themePicker.expanded.height, sizes.themePicker.collapsed.height);
  const visualBandHeight = Math.max(...visualHeights) + MARGIN * 2;
  const centerY = (ownHeight: number): number => availableBox.y + (visualBandHeight - ownHeight) / 2;

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

  // Step 4/5: the readout's width cap — the space left once the picker's
  // fixed block and the mute button's full natural width are both set aside
  // (FR-013: the picker gives way first, the mute never shrinks, so the
  // readout's cap is computed against their natural sizes directly — never
  // against the mute's eventual centered position, which would starve the
  // readout for no reason).
  const readoutOthersWidth = sizes.muteButton.width + (pickerRect?.width ?? 0);
  const readoutGaps = pickerRect ? 2 : 1; // readout-to-mute, and mute-to-picker if present
  const readoutCap = usableWidth - readoutOthersWidth - MARGIN * readoutGaps;

  return { usableLeft, usableWidth, centerY, collapsed, pickerSize, pickerRect, readoutCap };
}

/**
 * The width the readout will receive, computed with no knowledge of the
 * readout's own height (FR-016a) — call this between the shell's two DOM
 * passes (FR-016b) to learn the width to measure the readout's real height
 * against.
 */
export function computeReadoutWidthCap(
  availableBox: InsetBox,
  reservedRects: readonly Rect[],
  sizes: TopStripOccupantSizes
): number {
  const growthAllowance = availableBox.height / 3;
  return computeBandPlacement(availableBox, reservedRects, sizes, growthAllowance).readoutCap;
}

/**
 * readoutHeightAtCapWidth: the shell's second-pass measurement — the
 * readout's real wrapped height at exactly computeReadoutWidthCap(...)'s
 * result. Omit (or pass undefined) before that measurement exists yet; the
 * function then falls back to the readout's natural single-line height,
 * which cannot spill (Edge Cases: "Text metrics that are unavailable or
 * report zero").
 */
export function computeTopStripLayout(
  availableBox: InsetBox,
  reservedRects: readonly Rect[],
  sizes: TopStripOccupantSizes,
  readoutHeightAtCapWidth?: number
): TopStripLayout {
  // Step 1: the growth allowance — a backstop, not a budget (FR-009) —
  // depends only on availableBox, computed before anything else.
  const growthAllowance = availableBox.height / 3;

  const placement = computeBandPlacement(availableBox, reservedRects, sizes, growthAllowance);
  const readoutCap = computeReadoutWidthCap(availableBox, reservedRects, sizes);
  const { usableLeft, usableWidth, centerY, collapsed, pickerSize, pickerRect } = placement;

  // Step 6: resolve the readout's height — the natural single-line height as
  // the fallback for "measurement not available yet" (Edge Cases), grown up
  // to (but never beyond) growthAllowance.
  const contentHeight = sizes.readout ? (readoutHeightAtCapWidth ?? sizes.readout.height) : undefined;
  const readoutHeight = contentHeight !== undefined ? Math.min(contentHeight, growthAllowance) : undefined;
  // A zero or unavailable natural height (Edge Cases: "Text metrics that are
  // unavailable or report zero") must not reach this division — dividing by
  // zero yields Infinity, and `-webkit-line-clamp: Infinity` is an invalid
  // CSS declaration the browser silently drops. Fall back to 1 line, the
  // same single-line default the height fallback above uses.
  const maxLines =
    sizes.readout && sizes.readout.height > 0 ? Math.max(1, Math.floor(growthAllowance / sizes.readout.height)) : 1;

  const readoutRect: Rect | undefined =
    sizes.readout && readoutHeight !== undefined
      ? {
          x: usableLeft,
          // Centered against the readout's natural (single-line) height, not
          // its grown height — so the box's top edge is fixed and growth
          // only ever extends downward. Centering against the achieved
          // height instead would move readout.rect.y whenever the content's
          // height changed, which is exactly the dependency FR-016a/FR-022
          // rule out for the other occupants and which step 6 never lists
          // as something the readout's own height resolution touches.
          y: centerY(sizes.readout.height),
          width: Math.max(0, Math.min(sizes.readout.width, readoutCap)),
          height: readoutHeight,
        }
      : undefined;

  // The mute button is placed at full natural size (FR-011), centered in the
  // gap between the readout's trailing edge (or the band's leading edge, if
  // no readout) and the picker's leading edge (or the band's trailing edge,
  // if no picker) — its historical desktop-centered position, not the whole
  // region left of the picker (FR-013).
  const muteLeftBound = readoutRect ? readoutRect.x + readoutRect.width + MARGIN : usableLeft;
  const muteRightBound = pickerRect ? pickerRect.x - MARGIN : usableLeft + usableWidth;
  const muteRegionWidth = muteRightBound - muteLeftBound;
  const muteRect: Rect = {
    x: muteLeftBound + (muteRegionWidth - sizes.muteButton.width) / 2,
    y: centerY(sizes.muteButton.height),
    width: sizes.muteButton.width,
    height: sizes.muteButton.height,
  };

  // Clamp every returned rect into availableBox, so no box can ever extend
  // beyond it regardless of the arithmetic above (FR-008).
  const bounds: Rect = { x: availableBox.x, y: availableBox.y, width: availableBox.width, height: availableBox.height };
  const boundedReadout = readoutRect ? containRect(readoutRect, bounds) : undefined;
  const boundedMute = containRect(muteRect, bounds);
  const boundedPicker = pickerRect ? containRect(pickerRect, bounds) : undefined;

  // Step 7/8: each occupant's `capped` flag, evaluated against the
  // post-clamp size so the degenerate near-zero-availableBox edge case is
  // covered by the same flag rather than a special case.
  const readoutCapped =
    boundedReadout !== undefined && sizes.readout !== undefined && contentHeight !== undefined
      ? boundedReadout.width < sizes.readout.width || boundedReadout.height < contentHeight
      : false;
  const muteCapped = boundedMute.width < sizes.muteButton.width || boundedMute.height < sizes.muteButton.height;
  const pickerCapped =
    boundedPicker !== undefined && pickerSize !== undefined
      ? boundedPicker.width < pickerSize.width || boundedPicker.height < pickerSize.height
      : false;

  return {
    readout: boundedReadout ? { rect: boundedReadout, capped: readoutCapped, maxLines } : undefined,
    muteButton: { rect: boundedMute, capped: muteCapped },
    themePicker: boundedPicker ? { rect: boundedPicker, collapsed, capped: pickerCapped } : undefined,
  };
}
