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
  // Forces the collapse decision at NARROWEST_PORTRAIT: the natural-size sum
  // (260 + 44 + 298 + margins) far exceeds a 320 CSS px band's usable width.
  collapseForcing: {
    readout: READOUT_TITLE_WIDE,
    muteButton: MUTE_BUTTON,
    themePicker: THEME_PICKER_SAMPLES.fourThemes,
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

  it('is idempotent: identical arguments return a deep-equal layout, including the same collapsed value (SC-010)', () => {
    const first = computeTopStripLayout(NARROWEST_PORTRAIT, NO_RESERVED_RECTS, OCCUPANT_SIZE_SAMPLES.collapseForcing);
    const second = computeTopStripLayout(NARROWEST_PORTRAIT, NO_RESERVED_RECTS, OCCUPANT_SIZE_SAMPLES.collapseForcing);
    expect(second).toEqual(first);
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
