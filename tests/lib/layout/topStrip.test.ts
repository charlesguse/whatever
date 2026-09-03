import { describe, expect, it } from 'vitest';
import { computeTopStripLayout, type Size, type TopStripOccupantSizes } from '../../../src/lib/layout/topStrip';
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
// "No touch controls visible" cases (Edge Cases) — an empty array, exactly
// what App.svelte passes when touchLayout is undefined.
const NO_RESERVED_RECTS: readonly Rect[] = [];

// A typical in-play readout and the title screen's widest readout line
// (spec.md Acceptance Scenario 4) — both natural sizes, never hard-coded
// against character count (FR-003).
const READOUT_TYPICAL: Size = { width: 140, height: 24 };
const READOUT_TITLE_WIDE: Size = { width: 260, height: 24 };
const MUTE_BUTTON: Size = { width: 44, height: 32 };

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
  const rects: Rect[] = [layout.muteButton];
  if (layout.readout) rects.push(layout.readout);
  if (layout.themePicker) rects.push(layout.themePicker.rect);
  return rects;
}

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
    expect(layout.readout!.x).toBeLessThan(layout.muteButton.x);
    expect(layout.muteButton.x + layout.muteButton.width).toBeLessThanOrEqual(layout.themePicker!.rect.x);
  });
});

describe('computeTopStripLayout — degradation priority order (FR-013)', () => {
  it('does not starve the readout at a reported phone width where the picker still fits expanded', () => {
    const layout = computeTopStripLayout(REPORTING_DEVICE_PORTRAIT, NO_RESERVED_RECTS, OCCUPANT_SIZE_SAMPLES.typicalReadout);
    expect(layout.themePicker?.collapsed).toBe(false);
    expect(layout.readout!.width).toBe(READOUT_TYPICAL.width);
  });

  it('does not starve the readout once the picker has already given way to its collapsed form', () => {
    const layout = computeTopStripLayout(
      NARROWEST_PORTRAIT,
      NO_RESERVED_RECTS,
      OCCUPANT_SIZE_SAMPLES.collapseForcingTypicalReadout
    );
    expect(layout.themePicker?.collapsed).toBe(true);
    expect(layout.readout!.width).toBe(READOUT_TYPICAL.width);
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
    expect(layout.readout!.x).toBeLessThan(layout.muteButton.x);
    expect(layout.muteButton.x + layout.muteButton.width).toBeLessThanOrEqual(layout.themePicker!.rect.x);
    expect(layout.themePicker!.collapsed).toBe(false);
  });

  it('insets the leading and trailing edges by the same ~0.5rem margin the pre-feature CSS used (FR-020, SC-007)', () => {
    const layout = computeTopStripLayout(WIDE_DESKTOP, NO_RESERVED_RECTS, OCCUPANT_SIZE_SAMPLES.typicalReadout);
    const EDGE_MARGIN = 8; // mirrors computeTopStripLayout's own MARGIN constant (0.5rem)
    expect(layout.readout!.x).toBe(WIDE_DESKTOP.x + EDGE_MARGIN);
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
    const usedWidthWithout = withoutPicker.readout!.width + withoutPicker.muteButton.width;
    const usedWidthWith = withPicker.readout!.width + withPicker.muteButton.width;
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
    expect(layout.readout!.x).toBe(8);
    expect(rectsIntersect(brokenMuteButton, layout.readout!)).toBe(true);
  });
});
