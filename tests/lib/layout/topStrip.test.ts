import { describe, expect, it } from 'vitest';
import {
  computeReadoutWidthCap,
  computeTopStripLayout,
  type Size,
  type TopStripOccupantSizes,
} from '../../../src/lib/layout/topStrip';
import { computeOrientation, computeTouchControlLayout, type InsetBox, type Rect } from '../../../src/lib/input/touch/layout';

// Mirrors tests/lib/input/touch/layout.test.ts's own rectsIntersect/
// rectFullyInside helpers (lines 25-36) — the same geometry predicates, over
// this feature's occupants instead of the touch controls'.
function rectsIntersect(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function rectFullyInside(rect: Rect, box: InsetBox): boolean {
  return (
    rect.x >= box.x - 1e-9 &&
    rect.y >= box.y - 1e-9 &&
    rect.x + rect.width <= box.x + box.width + 1e-9 &&
    rect.y + rect.height <= box.y + box.height + 1e-9
  );
}

// FR-023: the narrowest supported viewport is 320 CSS px on the short edge,
// in both orientations.
const NARROWEST_PORTRAIT: InsetBox = { x: 0, y: 0, width: 320, height: 480 };
const NARROWEST_LANDSCAPE: InsetBox = { x: 0, y: 0, width: 480, height: 320 };
// FR-020: a wide desktop-sized box for the no-regression checks.
const WIDE_DESKTOP: InsetBox = { x: 0, y: 0, width: 1024, height: 768 };
// A widely reported phone viewport width (issue #35's own repro) — expanded
// picker still fits here, so this is where FR-013's priority order (picker
// gives way first, never the readout) matters most.
const REPORTING_DEVICE_PORTRAIT: InsetBox = { x: 0, y: 0, width: 412, height: 915 };
const REPORTING_DEVICE_LANDSCAPE: InsetBox = { x: 0, y: 0, width: 915, height: 412 };
// FR-020's third pinned width: 360 CSS px, between 320 and 412.
const PORTRAIT_360: InsetBox = { x: 0, y: 0, width: 360, height: 640 };
const LANDSCAPE_360: InsetBox = { x: 0, y: 0, width: 640, height: 360 };

// Matching reservedRects samples, shaped exactly like
// computeTouchControlLayout's own output (a bottom band in portrait, two
// side margins in landscape) — reusing the real function rather than
// hand-rolling a stand-in shape that could drift from it.
const PORTRAIT_RESERVED_RECTS: readonly Rect[] = computeTouchControlLayout(
  NARROWEST_PORTRAIT,
  computeOrientation(NARROWEST_PORTRAIT)
).reservedRects;
const LANDSCAPE_RESERVED_RECTS: readonly Rect[] = computeTouchControlLayout(
  NARROWEST_LANDSCAPE,
  computeOrientation(NARROWEST_LANDSCAPE)
).reservedRects;
const PORTRAIT_360_RESERVED_RECTS: readonly Rect[] = computeTouchControlLayout(
  PORTRAIT_360,
  computeOrientation(PORTRAIT_360)
).reservedRects;
const LANDSCAPE_360_RESERVED_RECTS: readonly Rect[] = computeTouchControlLayout(
  LANDSCAPE_360,
  computeOrientation(LANDSCAPE_360)
).reservedRects;
const REPORTING_DEVICE_PORTRAIT_RESERVED_RECTS: readonly Rect[] = computeTouchControlLayout(
  REPORTING_DEVICE_PORTRAIT,
  computeOrientation(REPORTING_DEVICE_PORTRAIT)
).reservedRects;
const REPORTING_DEVICE_LANDSCAPE_RESERVED_RECTS: readonly Rect[] = computeTouchControlLayout(
  REPORTING_DEVICE_LANDSCAPE,
  computeOrientation(REPORTING_DEVICE_LANDSCAPE)
).reservedRects;
// "No touch controls visible" cases (Edge Cases) — an empty array, exactly
// what App.svelte passes when touchLayout is undefined.
const NO_RESERVED_RECTS: readonly Rect[] = [];

// FR-020's full pinned viewport set (320/360/412, both orientations), each
// paired with its own reservedRects sample — used by every fit/cap
// assertion below that must hold at all three pinned widths.
const PINNED_VIEWPORTS: readonly [string, InsetBox, readonly Rect[]][] = [
  ['320 portrait', NARROWEST_PORTRAIT, PORTRAIT_RESERVED_RECTS],
  ['320 landscape', NARROWEST_LANDSCAPE, LANDSCAPE_RESERVED_RECTS],
  ['360 portrait', PORTRAIT_360, PORTRAIT_360_RESERVED_RECTS],
  ['360 landscape', LANDSCAPE_360, LANDSCAPE_360_RESERVED_RECTS],
  ['412 portrait', REPORTING_DEVICE_PORTRAIT, REPORTING_DEVICE_PORTRAIT_RESERVED_RECTS],
  ['412 landscape', REPORTING_DEVICE_LANDSCAPE, REPORTING_DEVICE_LANDSCAPE_RESERVED_RECTS],
];

// A typical in-play readout and the title screen's widest readout line
// (spec.md Acceptance Scenario 4) — both natural sizes, never hard-coded
// against character count (FR-003).
const READOUT_TYPICAL: Size = { width: 140, height: 24 };
const READOUT_TITLE_WIDE: Size = { width: 260, height: 24 };
const MUTE_BUTTON: Size = { width: 44, height: 32 };

// A plain stand-in for what the browser's text metrics would report for a
// readout wrapped to a given capped width (data-model.md's Occupant Content
// Size entity: "no DOM") — narrower widths need more lines and so report a
// taller height, and any width at or beyond the readout's own natural width
// needs only its one natural line. Deliberately invented numbers, not the
// maintainer's measured 44/62/80px or 18/36px spill figures (SC-002).
function heightForWidth(readout: Size, capWidth: number): number {
  if (capWidth >= readout.width) return readout.height;
  const lines = Math.ceil(readout.width / Math.max(1, capWidth));
  return readout.height * lines;
}

// One theme button's natural width plus its row gap, standing in for the
// measured widths of one through four registered themes (data-model.md's
// "Occupant Size Inputs" table) — the collapsed form's width never grows
// with the count (FR-012, SC-009), so every sample below shares one fixed
// collapsed size regardless of expanded width or theme count.
const THEME_PICKER_COLLAPSED: Size = { width: 96, height: 32 };
function themePicker(expandedWidth: number): NonNullable<TopStripOccupantSizes['themePicker']> {
  return { expanded: { width: expandedWidth, height: 32 }, collapsed: THEME_PICKER_COLLAPSED };
}
const THEME_PICKER_SAMPLES = {
  oneTheme: themePicker(70),
  twoThemes: themePicker(146),
  threeThemes: themePicker(222),
  fourThemes: themePicker(298),
  // One unusually long theme name (User Story 3) — much wider than any
  // count-scaled sample above, but still shares the fixed collapsed size.
  longThemeName: themePicker(420),
};

// TopStripOccupantSizes tables standing in for the screens/states
// data-model.md's table describes: a typical in-play readout, the title
// screen's widest readout line, no readout, and no theme picker (a
// one-theme registry, per the existing App.svelte gate).
const OCCUPANT_SIZE_SAMPLES = {
  typicalReadout: { readout: READOUT_TYPICAL, muteButton: MUTE_BUTTON, themePicker: THEME_PICKER_SAMPLES.twoThemes },
  titleWideReadout: {
    readout: READOUT_TITLE_WIDE,
    muteButton: MUTE_BUTTON,
    themePicker: THEME_PICKER_SAMPLES.twoThemes,
  },
  noReadout: { muteButton: MUTE_BUTTON, themePicker: THEME_PICKER_SAMPLES.twoThemes },
  noThemePicker: { readout: READOUT_TYPICAL, muteButton: MUTE_BUTTON },
  // Same readout/mute as titleWideReadout, but with no picker to give way —
  // used by the freed-space test below, where the readout must be wide
  // enough that it is still genuinely cap-constrained in the with-picker
  // case even after FR-013's picker-gives-way-first fix (T022), so the
  // comparison keeps testing something.
  noThemePickerWide: { readout: READOUT_TITLE_WIDE, muteButton: MUTE_BUTTON },
  // Forces the collapse decision at NARROWEST_PORTRAIT: the natural-size sum
  // (260 + 44 + 298 + margins) far exceeds a 320 CSS px band's usable width.
  collapseForcing: {
    readout: READOUT_TITLE_WIDE,
    muteButton: MUTE_BUTTON,
    themePicker: THEME_PICKER_SAMPLES.fourThemes,
  },
  // Forces the collapse decision at NARROWEST_PORTRAIT via an unusually wide
  // picker (not a wide readout) — the readout here is the typical width, so
  // this pins that the picker gives way first (FR-013) and the readout is
  // left untouched once it does.
  collapseForcingTypicalReadout: {
    readout: READOUT_TYPICAL,
    muteButton: MUTE_BUTTON,
    themePicker: THEME_PICKER_SAMPLES.longThemeName,
  },
} satisfies Record<string, TopStripOccupantSizes>;

function collectRects(layout: ReturnType<typeof computeTopStripLayout>): Rect[] {
  const rects: Rect[] = [layout.muteButton.rect];
  if (layout.readout) rects.push(layout.readout.rect);
  if (layout.themePicker) rects.push(layout.themePicker.rect);
  return rects;
}

describe('computeTopStripLayout — fits the content at the width it was given (US1, FR-004, FR-009, FR-016a, SC-001)', () => {
  const themePickerSamples: [string, NonNullable<TopStripOccupantSizes['themePicker']>][] = [
    ['one theme', THEME_PICKER_SAMPLES.oneTheme],
    ['two themes', THEME_PICKER_SAMPLES.twoThemes],
    ['three themes', THEME_PICKER_SAMPLES.threeThemes],
    ['four themes', THEME_PICKER_SAMPLES.fourThemes],
    ['one unusually long theme name', THEME_PICKER_SAMPLES.longThemeName],
  ];

  for (const [viewportLabel, box, viewportReservedRects] of PINNED_VIEWPORTS) {
    for (const [reservedLabel, rects] of [
      ['with reservedRects', viewportReservedRects],
      ['without reservedRects', NO_RESERVED_RECTS],
    ] as const) {
      for (const [themeLabel, picker] of themePickerSamples) {
        it(`readout box is at least as tall as its content needs at the capped width (${viewportLabel}, ${reservedLabel}, ${themeLabel})`, () => {
          const sizes: TopStripOccupantSizes = { readout: READOUT_TYPICAL, muteButton: MUTE_BUTTON, themePicker: picker };
          const capWidth = computeReadoutWidthCap(box, rects, sizes);
          const heightAtCap = heightForWidth(READOUT_TYPICAL, capWidth);
          const layout = computeTopStripLayout(box, rects, sizes, heightAtCap);
          const growthAllowance = box.height / 3;
          expect(layout.readout).toBeDefined();
          expect(layout.readout!.rect.height).toBeGreaterThanOrEqual(Math.min(heightAtCap, growthAllowance) - 1e-9);
        });
      }
    }
  }

  it("the readout's width is unaffected by which height value it is given (FR-004, FR-016a)", () => {
    const sizes = OCCUPANT_SIZE_SAMPLES.typicalReadout;
    const oneLine = computeTopStripLayout(NARROWEST_PORTRAIT, NO_RESERVED_RECTS, sizes, READOUT_TYPICAL.height);
    const tallestStandIn = heightForWidth(READOUT_TYPICAL, 1); // as narrow a cap as this helper models
    const grown = computeTopStripLayout(NARROWEST_PORTRAIT, NO_RESERVED_RECTS, sizes, tallestStandIn);
    expect(grown.readout!.rect.width).toBe(oneLine.readout!.rect.width);
    expect(grown.readout!.rect.x).toBe(oneLine.readout!.rect.x);
  });
});

describe('computeTopStripLayout — 412px stays exactly as it ships today (US1, SC-003)', () => {
  it('a height-for-width value that already fits on the shipped two lines leaves the readout rect unchanged', () => {
    const sizes = OCCUPANT_SIZE_SAMPLES.typicalReadout;
    const capWidth = computeReadoutWidthCap(REPORTING_DEVICE_PORTRAIT, NO_RESERVED_RECTS, sizes);
    const heightAtCap = heightForWidth(READOUT_TYPICAL, capWidth);
    // 412 px is wide enough that nothing wraps here — the width that passes
    // today and must keep passing (spec.md).
    expect(heightAtCap).toBe(READOUT_TYPICAL.height);
    const before = computeTopStripLayout(REPORTING_DEVICE_PORTRAIT, NO_RESERVED_RECTS, sizes);
    const after = computeTopStripLayout(REPORTING_DEVICE_PORTRAIT, NO_RESERVED_RECTS, sizes, heightAtCap);
    expect(after.readout!.rect).toEqual(before.readout!.rect);
    expect(after.muteButton.rect).toEqual(before.muteButton.rect);
    expect(after.themePicker!.rect).toEqual(before.themePicker!.rect);
  });
});

describe('computeTopStripLayout — the widest readout line still fits at 320px (US1, AC5)', () => {
  it('the title screen line is fully inside its box at the narrowest supported width', () => {
    const sizes: TopStripOccupantSizes = {
      readout: READOUT_TITLE_WIDE,
      muteButton: MUTE_BUTTON,
      themePicker: THEME_PICKER_SAMPLES.twoThemes,
    };
    const capWidth = computeReadoutWidthCap(NARROWEST_PORTRAIT, NO_RESERVED_RECTS, sizes);
    const heightAtCap = heightForWidth(READOUT_TITLE_WIDE, capWidth);
    const layout = computeTopStripLayout(NARROWEST_PORTRAIT, NO_RESERVED_RECTS, sizes, heightAtCap);
    const growthAllowance = NARROWEST_PORTRAIT.height / 3;
    expect(layout.readout!.rect.height).toBeGreaterThanOrEqual(Math.min(heightAtCap, growthAllowance) - 1e-9);
    expect(rectFullyInside(layout.readout!.rect, NARROWEST_PORTRAIT)).toBe(true);
  });
});

describe('computeTopStripLayout — desktop stays uncapped (US1, AC6, FR-017)', () => {
  it('nothing is capped, wrapped, or grown at a desktop width', () => {
    const sizes = OCCUPANT_SIZE_SAMPLES.typicalReadout;
    const layout = computeTopStripLayout(WIDE_DESKTOP, NO_RESERVED_RECTS, sizes, READOUT_TYPICAL.height);
    expect(layout.readout!.capped).toBe(false);
    expect(layout.readout!.rect.height).toBe(READOUT_TYPICAL.height);
    expect(layout.readout!.rect.x).toBeLessThan(layout.muteButton.rect.x);
    expect(layout.muteButton.rect.x + layout.muteButton.rect.width).toBeLessThanOrEqual(layout.themePicker!.rect.x);
  });
});

describe('computeTopStripLayout — non-overlap and containment (US1, FR-007, FR-008)', () => {
  const cases: [string, TopStripOccupantSizes][] = [
    ['typical readout', OCCUPANT_SIZE_SAMPLES.typicalReadout],
    ['title screen widest readout', OCCUPANT_SIZE_SAMPLES.titleWideReadout],
    ['no readout present', OCCUPANT_SIZE_SAMPLES.noReadout],
    ['no theme picker present', OCCUPANT_SIZE_SAMPLES.noThemePicker],
  ];

  for (const [label, sizes] of cases) {
    it(`no two of readout/muteButton/themePicker intersect (${label})`, () => {
      const layout = computeTopStripLayout(NARROWEST_PORTRAIT, NO_RESERVED_RECTS, sizes);
      const rects = collectRects(layout);
      for (let i = 0; i < rects.length; i++) {
        for (let j = i + 1; j < rects.length; j++) {
          expect(rectsIntersect(rects[i], rects[j])).toBe(false);
        }
      }
    });

    it(`every returned box lies fully inside availableBox (${label})`, () => {
      const layout = computeTopStripLayout(NARROWEST_PORTRAIT, NO_RESERVED_RECTS, sizes);
      for (const rect of collectRects(layout)) {
        expect(rectFullyInside(rect, NARROWEST_PORTRAIT)).toBe(true);
      }
    });
  }
});

describe('computeTopStripLayout — collapse decision (US1, FR-011, FR-012, FR-012a, FR-012b, FR-018, FR-020)', () => {
  it('collapses when the natural-size sum exceeds the band, at the collapsed size exactly', () => {
    const layout = computeTopStripLayout(NARROWEST_PORTRAIT, NO_RESERVED_RECTS, OCCUPANT_SIZE_SAMPLES.collapseForcing);
    expect(layout.themePicker?.collapsed).toBe(true);
    expect(layout.themePicker?.rect.width).toBe(THEME_PICKER_COLLAPSED.width);
    expect(layout.themePicker?.rect.height).toBe(THEME_PICKER_COLLAPSED.height);
  });

  it('is idempotent for both the expanded and collapsed form, over the whole pinned viewport set (SC-010)', () => {
    const viewports: [string, InsetBox][] = [
      ['NARROWEST_PORTRAIT', NARROWEST_PORTRAIT],
      ['NARROWEST_LANDSCAPE', NARROWEST_LANDSCAPE],
      ['WIDE_DESKTOP', WIDE_DESKTOP],
    ];
    const forms: [string, TopStripOccupantSizes][] = [
      ['expanded', OCCUPANT_SIZE_SAMPLES.typicalReadout],
      ['collapsed', OCCUPANT_SIZE_SAMPLES.collapseForcing],
    ];
    for (const [, box] of viewports) {
      for (const [, sizes] of forms) {
        const first = computeTopStripLayout(box, NO_RESERVED_RECTS, sizes);
        const second = computeTopStripLayout(box, NO_RESERVED_RECTS, sizes);
        expect(second).toEqual(first);
      }
    }
  });

  it('stays expanded, at natural size, arranged leading/centered/trailing, when everything fits (FR-020)', () => {
    const layout = computeTopStripLayout(WIDE_DESKTOP, NO_RESERVED_RECTS, OCCUPANT_SIZE_SAMPLES.typicalReadout);
    expect(layout.themePicker?.collapsed).toBe(false);
    expect(layout.themePicker?.rect.width).toBe(THEME_PICKER_SAMPLES.twoThemes.expanded.width);
    expect(layout.readout).toBeDefined();
    expect(layout.themePicker).toBeDefined();
    // readout leading edge, mute centered between it and the picker, picker trailing edge
    expect(layout.readout!.rect.x).toBeLessThan(layout.muteButton.rect.x);
    expect(layout.muteButton.rect.x + layout.muteButton.rect.width).toBeLessThanOrEqual(layout.themePicker!.rect.x);
  });
});

describe('computeTopStripLayout — degradation priority order (FR-013)', () => {
  it('does not starve the readout at a reported phone width where the picker still fits expanded', () => {
    const layout = computeTopStripLayout(REPORTING_DEVICE_PORTRAIT, NO_RESERVED_RECTS, OCCUPANT_SIZE_SAMPLES.typicalReadout);
    expect(layout.themePicker?.collapsed).toBe(false);
    expect(layout.readout!.rect.width).toBe(READOUT_TYPICAL.width);
  });

  it('does not starve the readout once the picker has already given way to its collapsed form', () => {
    const layout = computeTopStripLayout(
      NARROWEST_PORTRAIT,
      NO_RESERVED_RECTS,
      OCCUPANT_SIZE_SAMPLES.collapseForcingTypicalReadout
    );
    expect(layout.themePicker?.collapsed).toBe(true);
    expect(layout.readout!.rect.width).toBe(READOUT_TYPICAL.width);
  });
});

describe('computeTopStripLayout — reserved regions and rotation (US2, FR-009, FR-020)', () => {
  it('no occupant intersects the landscape side margins, and the non-overlap/containment properties still hold', () => {
    const layout = computeTopStripLayout(NARROWEST_LANDSCAPE, LANDSCAPE_RESERVED_RECTS, OCCUPANT_SIZE_SAMPLES.typicalReadout);
    const rects = collectRects(layout);
    for (const rect of rects) {
      for (const reserved of LANDSCAPE_RESERVED_RECTS) {
        expect(rectsIntersect(rect, reserved)).toBe(false);
      }
      expect(rectFullyInside(rect, NARROWEST_LANDSCAPE)).toBe(true);
    }
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        expect(rectsIntersect(rects[i], rects[j])).toBe(false);
      }
    }
  });

  it('no occupant intersects the portrait bottom band', () => {
    const layout = computeTopStripLayout(NARROWEST_PORTRAIT, PORTRAIT_RESERVED_RECTS, OCCUPANT_SIZE_SAMPLES.typicalReadout);
    for (const rect of collectRects(layout)) {
      for (const reserved of PORTRAIT_RESERVED_RECTS) {
        expect(rectsIntersect(rect, reserved)).toBe(false);
      }
      expect(rectFullyInside(rect, NARROWEST_PORTRAIT)).toBe(true);
    }
  });

  it("matches today's shipped desktop arrangement: readout leading, mute centered, picker trailing (FR-020)", () => {
    const layout = computeTopStripLayout(WIDE_DESKTOP, NO_RESERVED_RECTS, OCCUPANT_SIZE_SAMPLES.typicalReadout);
    expect(layout.readout!.rect.x).toBeLessThan(layout.muteButton.rect.x);
    expect(layout.muteButton.rect.x + layout.muteButton.rect.width).toBeLessThanOrEqual(layout.themePicker!.rect.x);
    expect(layout.themePicker!.collapsed).toBe(false);
  });

  it('insets the leading and trailing edges by the same ~0.5rem margin the pre-feature CSS used (FR-020, SC-007)', () => {
    const layout = computeTopStripLayout(WIDE_DESKTOP, NO_RESERVED_RECTS, OCCUPANT_SIZE_SAMPLES.typicalReadout);
    const EDGE_MARGIN = 8; // mirrors computeTopStripLayout's own MARGIN constant (0.5rem)
    expect(layout.readout!.rect.x).toBe(WIDE_DESKTOP.x + EDGE_MARGIN);
    expect(layout.themePicker!.rect.x + layout.themePicker!.rect.width).toBe(
      WIDE_DESKTOP.x + WIDE_DESKTOP.width - EDGE_MARGIN
    );
  });

  it('a degenerate available box (near-zero width or height) returns contained rects without throwing', () => {
    const nearZeroWidth: InsetBox = { x: 0, y: 0, width: 1, height: 480 };
    const nearZeroHeight: InsetBox = { x: 0, y: 0, width: 320, height: 1 };
    for (const box of [nearZeroWidth, nearZeroHeight]) {
      expect(() => computeTopStripLayout(box, NO_RESERVED_RECTS, OCCUPANT_SIZE_SAMPLES.typicalReadout)).not.toThrow();
      const layout = computeTopStripLayout(box, NO_RESERVED_RECTS, OCCUPANT_SIZE_SAMPLES.typicalReadout);
      for (const rect of collectRects(layout)) {
        expect(rectFullyInside(rect, box)).toBe(true);
      }
    }
  });
});

describe('computeTopStripLayout — the mute and picker boxes never depend on the readout (US2, FR-013, FR-022, SC-005)', () => {
  it('muteButton and themePicker rects are identical across differing readout heights, at every pinned viewport', () => {
    for (const [, box, reservedRects] of PINNED_VIEWPORTS) {
      const sizes = OCCUPANT_SIZE_SAMPLES.typicalReadout;
      const growthAllowance = box.height / 3;
      const oneLine = computeTopStripLayout(box, reservedRects, sizes, READOUT_TYPICAL.height);
      const tallestPermitted = computeTopStripLayout(box, reservedRects, sizes, growthAllowance);
      // Deliberately wrong: larger than growthAllowance, standing in for a
      // stale or buggy measurement (FR-022).
      const deliberatelyWrong = computeTopStripLayout(box, reservedRects, sizes, growthAllowance + 10_000);
      expect(tallestPermitted.muteButton.rect).toEqual(oneLine.muteButton.rect);
      expect(deliberatelyWrong.muteButton.rect).toEqual(oneLine.muteButton.rect);
      expect(tallestPermitted.themePicker!.rect).toEqual(oneLine.themePicker!.rect);
      expect(deliberatelyWrong.themePicker!.rect).toEqual(oneLine.themePicker!.rect);
    }
  });
});

describe('computeTopStripLayout — single-pass, structurally acyclic idempotence (US2, FR-016, FR-016a, FR-016b, SC-006)', () => {
  it("computeReadoutWidthCap's result never depends on a later readoutHeightAtCapWidth", () => {
    // True by signature — computeReadoutWidthCap never takes that parameter
    // at all — asserted directly as a regression guard (FR-016).
    const sizes = OCCUPANT_SIZE_SAMPLES.typicalReadout;
    const capA = computeReadoutWidthCap(NARROWEST_PORTRAIT, NO_RESERVED_RECTS, sizes);
    const capB = computeReadoutWidthCap(NARROWEST_PORTRAIT, NO_RESERVED_RECTS, sizes);
    expect(capB).toBe(capA);
  });

  it('two calls with identical arguments, including the same readoutHeightAtCapWidth, are deep-equal (statelessness)', () => {
    for (const [, box, reservedRects] of PINNED_VIEWPORTS) {
      const sizes = OCCUPANT_SIZE_SAMPLES.typicalReadout;
      const first = computeTopStripLayout(box, reservedRects, sizes, 48);
      const second = computeTopStripLayout(box, reservedRects, sizes, 48);
      expect(second).toEqual(first);
    }
  });

  it('a deliberately wrong achieved band height only ever reaches the readout own rect.height/capped/maxLines', () => {
    for (const [, box, reservedRects] of PINNED_VIEWPORTS) {
      const sizes = OCCUPANT_SIZE_SAMPLES.typicalReadout;
      const growthAllowance = box.height / 3;
      const correct = computeTopStripLayout(box, reservedRects, sizes, READOUT_TYPICAL.height);
      const wrong = computeTopStripLayout(box, reservedRects, sizes, growthAllowance + 10_000);
      expect(wrong.muteButton).toEqual(correct.muteButton);
      expect(wrong.themePicker).toEqual(correct.themePicker);
      expect(wrong.readout!.rect.x).toBe(correct.readout!.rect.x);
      expect(wrong.readout!.rect.y).toBe(correct.readout!.rect.y);
      expect(wrong.readout!.rect.width).toBe(correct.readout!.rect.width);
    }
  });
});

describe('computeTopStripLayout — a grown readout never flips the collapse decision (US2, FR-012a, FR-015, AC6)', () => {
  it('themePicker.collapsed stays fixed across readout heights from one line to the tallest permitted, at a borderline viewport', () => {
    // typicalReadout at PORTRAIT_360 is borderline: naturalSum (346) exceeds
    // usableWidth (344) by only 2px — exactly where a height-dependent
    // regression would flip the decision if one crept back in.
    const sizes = OCCUPANT_SIZE_SAMPLES.typicalReadout;
    const growthAllowance = PORTRAIT_360.height / 3;
    const heights = [READOUT_TYPICAL.height, heightForWidth(READOUT_TYPICAL, 1), growthAllowance];
    const decisions = heights.map(
      (h) => computeTopStripLayout(PORTRAIT_360, NO_RESERVED_RECTS, sizes, h).themePicker?.collapsed
    );
    for (const decision of decisions) {
      expect(decision).toBe(decisions[0]);
    }
  });
});

describe('computeTopStripLayout — 012 properties still hold with a grown readout (US2, FR-007, FR-008, FR-009, FR-014)', () => {
  for (const [label, box, reservedRects] of PINNED_VIEWPORTS) {
    it(`no intersection, full containment, and reserved-region clearance hold at the tallest permitted readout height (${label})`, () => {
      const sizes = OCCUPANT_SIZE_SAMPLES.typicalReadout;
      const growthAllowance = box.height / 3;
      const layout = computeTopStripLayout(box, reservedRects, sizes, growthAllowance);
      const rects = collectRects(layout);
      for (let i = 0; i < rects.length; i++) {
        for (let j = i + 1; j < rects.length; j++) {
          expect(rectsIntersect(rects[i], rects[j])).toBe(false);
        }
      }
      for (const rect of rects) {
        expect(rectFullyInside(rect, box)).toBe(true);
        for (const reserved of reservedRects) {
          expect(rectsIntersect(rect, reserved)).toBe(false);
        }
      }
    });
  }
});

describe('computeTopStripLayout — theme count scaling (US3, FR-012, FR-014, SC-009)', () => {
  // READOUT_TITLE_WIDE forces the collapse decision at every one of these
  // theme counts (the point of this describe block: the collapsed form's
  // width, not the expanded form's, must stay constant as the count grows).
  const themeCountSamples: [string, TopStripOccupantSizes][] = [
    ['one theme', { readout: READOUT_TITLE_WIDE, muteButton: MUTE_BUTTON, themePicker: THEME_PICKER_SAMPLES.oneTheme }],
    ['two themes', { readout: READOUT_TITLE_WIDE, muteButton: MUTE_BUTTON, themePicker: THEME_PICKER_SAMPLES.twoThemes }],
    ['three themes', { readout: READOUT_TITLE_WIDE, muteButton: MUTE_BUTTON, themePicker: THEME_PICKER_SAMPLES.threeThemes }],
    ['four themes', { readout: READOUT_TITLE_WIDE, muteButton: MUTE_BUTTON, themePicker: THEME_PICKER_SAMPLES.fourThemes }],
    [
      'one unusually long theme name',
      { readout: READOUT_TITLE_WIDE, muteButton: MUTE_BUTTON, themePicker: THEME_PICKER_SAMPLES.longThemeName },
    ],
  ];

  for (const [label, sizes] of themeCountSamples) {
    it(`non-overlap and containment hold at NARROWEST_PORTRAIT (${label})`, () => {
      const layout = computeTopStripLayout(NARROWEST_PORTRAIT, NO_RESERVED_RECTS, sizes);
      const rects = collectRects(layout);
      for (let i = 0; i < rects.length; i++) {
        for (let j = i + 1; j < rects.length; j++) {
          expect(rectsIntersect(rects[i], rects[j])).toBe(false);
        }
      }
      for (const rect of rects) {
        expect(rectFullyInside(rect, NARROWEST_PORTRAIT)).toBe(true);
      }
    });
  }

  it("the collapsed form's width never grows with the theme count", () => {
    const layouts = themeCountSamples.map(([, sizes]) => computeTopStripLayout(NARROWEST_PORTRAIT, NO_RESERVED_RECTS, sizes));
    for (const layout of layouts) {
      expect(layout.themePicker!.collapsed).toBe(true);
    }
    const widths = layouts.map((layout) => layout.themePicker!.rect.width);
    for (const width of widths) {
      expect(width).toBe(widths[0]);
    }
  });

  it("the collapsed form's capped flag reflects whether it fits, not the theme count (US3, SC-009)", () => {
    // The shared THEME_PICKER_COLLAPSED size fits at every sampled count —
    // capped is false here regardless of how many themes are registered, no
    // per-count branch involved.
    for (const [, sizes] of themeCountSamples) {
      const layout = computeTopStripLayout(NARROWEST_PORTRAIT, NO_RESERVED_RECTS, sizes);
      expect(layout.themePicker!.capped).toBe(false);
    }
  });

  it('a theme display name wide enough to overflow even the collapsed form is capped (US3 AC4)', () => {
    // Only a wider sample is needed to demonstrate this generalizes to a
    // future theme's display name — no change to
    // src/lib/layout/topStrip.ts (User Story 3 AC4).
    const widerCollapsedPicker: NonNullable<TopStripOccupantSizes['themePicker']> = {
      expanded: THEME_PICKER_SAMPLES.longThemeName.expanded,
      collapsed: { width: 500, height: THEME_PICKER_COLLAPSED.height },
    };
    const sizes: TopStripOccupantSizes = {
      readout: READOUT_TITLE_WIDE,
      muteButton: MUTE_BUTTON,
      themePicker: widerCollapsedPicker,
    };
    const layout = computeTopStripLayout(NARROWEST_PORTRAIT, NO_RESERVED_RECTS, sizes);
    expect(layout.themePicker!.collapsed).toBe(true);
    expect(layout.themePicker!.capped).toBe(true);
    expect(rectFullyInside(layout.themePicker!.rect, NARROWEST_PORTRAIT)).toBe(true);
  });
});

describe('computeTopStripLayout — any occupant that has to shrink is flagged capped (US3, SC-009)', () => {
  it('an oversized collapsed theme-picker is contained and flagged capped, the same way the readout is', () => {
    const oversizedCollapsedPicker: NonNullable<TopStripOccupantSizes['themePicker']> = {
      expanded: { width: 420, height: 32 },
      collapsed: { width: 500, height: 32 },
    };
    const sizes: TopStripOccupantSizes = {
      readout: READOUT_TYPICAL,
      muteButton: MUTE_BUTTON,
      themePicker: oversizedCollapsedPicker,
    };
    const layout = computeTopStripLayout(NARROWEST_PORTRAIT, NO_RESERVED_RECTS, sizes);
    expect(layout.themePicker!.collapsed).toBe(true);
    expect(rectFullyInside(layout.themePicker!.rect, NARROWEST_PORTRAIT)).toBe(true);
    expect(layout.themePicker!.capped).toBe(true);
  });
});

describe('computeTopStripLayout — freed space with no theme picker (US3, Edge Cases: "One registered theme")', () => {
  it('the mute button and readout occupy more width than the equivalent two-occupant case with a picker present', () => {
    // Uses the wide readout on both sides: with FR-013's picker-gives-way-
    // first priority (T022), a typical-width readout already fits at natural
    // size whether or not a picker is present, so it would no longer show a
    // difference here — the wide readout keeps this test meaningful by
    // staying genuinely cap-constrained in the with-picker case.
    const withoutPicker = computeTopStripLayout(NARROWEST_PORTRAIT, NO_RESERVED_RECTS, OCCUPANT_SIZE_SAMPLES.noThemePickerWide);
    const withPicker = computeTopStripLayout(NARROWEST_PORTRAIT, NO_RESERVED_RECTS, OCCUPANT_SIZE_SAMPLES.titleWideReadout);
    expect(withoutPicker.themePicker).toBeUndefined();
    for (const rect of collectRects(withoutPicker)) {
      expect(rectFullyInside(rect, NARROWEST_PORTRAIT)).toBe(true);
    }
    const usedWidthWithout = withoutPicker.readout!.rect.width + withoutPicker.muteButton.rect.width;
    const usedWidthWith = withPicker.readout!.rect.width + withPicker.muteButton.rect.width;
    expect(usedWidthWithout).toBeGreaterThan(usedWidthWith);
  });
});

describe('computeTopStripLayout — the suite catches a real regression (US4, SC-005)', () => {
  it('a broken placement that ignores the other occupants fails the non-overlap assertion', () => {
    // A deliberate regression, local to this test only: pins the mute
    // button to a fixed box regardless of its inputs, exactly the kind of
    // "assumed position" bug issue #35 reported — never a change to
    // computeTopStripLayout itself.
    function brokenPlacement(sizes: TopStripOccupantSizes): Rect {
      return { x: 0, y: 0, width: sizes.muteButton.width, height: sizes.muteButton.height };
    }
    const sizes = OCCUPANT_SIZE_SAMPLES.typicalReadout;
    const brokenMuteButton = brokenPlacement(sizes);
    const layout = computeTopStripLayout(NARROWEST_PORTRAIT, NO_RESERVED_RECTS, sizes);
    // The readout also starts at the band's leading edge (x: MARGIN, not 0 —
    // see T020's edge inset), well within the broken mute button's 0-44
    // span, so the broken mute button — pinned to (0, 0) regardless of
    // input — collides with it.
    expect(layout.readout!.rect.x).toBe(8);
    expect(rectsIntersect(brokenMuteButton, layout.readout!.rect)).toBe(true);
  });
});

describe('computeTopStripLayout — the suite catches the shipped regression (US4, FR-021, SC-007)', () => {
  // A deliberate regression, local to this test only: pins the readout's
  // placed height to its unwrapped natural height regardless of the width
  // it was actually given — exactly today's shipped bug (spec.md User Story
  // 4) — never a change to computeTopStripLayout itself.
  function pinnedToUnwrappedNaturalHeight(
    layout: ReturnType<typeof computeTopStripLayout>,
    sizes: TopStripOccupantSizes
  ): ReturnType<typeof computeTopStripLayout> {
    if (!layout.readout || !sizes.readout) return layout;
    return { ...layout, readout: { ...layout.readout, rect: { ...layout.readout.rect, height: sizes.readout.height } } };
  }

  it("pinning the readout's placed height to its unwrapped natural height fails the FR-004 fit assertion at 360px and 320px, both orientations", () => {
    const sizes = OCCUPANT_SIZE_SAMPLES.titleWideReadout;
    const viewports: [string, InsetBox, readonly Rect[]][] = [
      ['320 portrait', NARROWEST_PORTRAIT, PORTRAIT_RESERVED_RECTS],
      ['320 landscape', NARROWEST_LANDSCAPE, LANDSCAPE_RESERVED_RECTS],
      ['360 portrait', PORTRAIT_360, PORTRAIT_360_RESERVED_RECTS],
      ['360 landscape', LANDSCAPE_360, LANDSCAPE_360_RESERVED_RECTS],
    ];
    for (const [, box, reservedRects] of viewports) {
      const capWidth = computeReadoutWidthCap(box, reservedRects, sizes);
      const heightAtCap = heightForWidth(READOUT_TITLE_WIDE, capWidth);
      const growthAllowance = box.height / 3;
      const required = Math.min(heightAtCap, growthAllowance);
      const correct = computeTopStripLayout(box, reservedRects, sizes, heightAtCap);
      const broken = pinnedToUnwrappedNaturalHeight(correct, sizes);
      // Sanity: this viewport actually needs more than one line, and the
      // correct (T008) arithmetic satisfies it — otherwise this case would
      // not exercise the regression at all.
      expect(heightAtCap).toBeGreaterThan(READOUT_TITLE_WIDE.height);
      expect(correct.readout!.rect.height).toBeGreaterThanOrEqual(required - 1e-9);
      // The regression: pinning to the unwrapped natural height fails FR-004
      // whenever the capped width needs more than that one line.
      expect(broken.readout!.rect.height).toBeLessThan(required);
    }
  });
});
