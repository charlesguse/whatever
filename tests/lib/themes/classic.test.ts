import { describe, expect, it } from 'vitest';
import { ELEMENT_IDS } from '../../../src/sim/elements';
import { classicTheme } from '../../../src/lib/themes/classic';

// FR-007, FR-010: every element id, plus the two transient appearances,
// plus every declared player-facing string field — same completeness bar
// classroom.test.ts already holds Classroom to.
describe('classic theme completeness', () => {
  it.each(ELEMENT_IDS)('has a ThemeEntry for element id "%s"', (id) => {
    const entry = classicTheme.elements[id];
    expect(entry).toBeDefined();
    expect(typeof entry.fillColor).toBe('string');
    expect(entry.fillColor.length).toBeGreaterThan(0);
    expect(typeof entry.glyph).toBe('string');
    expect(typeof entry.label).toBe('string');
    expect(entry.label.length).toBeGreaterThan(0);
  });

  it('covers exactly the declared element set, nothing more or less', () => {
    const themeKeys = Object.keys(classicTheme.elements).sort();
    const declaredIds = [...ELEMENT_IDS].sort();
    expect(themeKeys).toEqual(declaredIds);
  });

  it('supplies doorOpenEntry and magicWallActiveEntry', () => {
    expect(classicTheme.doorOpenEntry).toBeDefined();
    expect(classicTheme.magicWallActiveEntry).toBeDefined();
  });

  const stringFields: Array<[string, string]> = [
    ['displayName', classicTheme.displayName],
    ['title', classicTheme.title],
    ['messages.dead', classicTheme.messages.dead],
    ['messages.completed', classicTheme.messages.completed],
    ['readout.template', classicTheme.readout.template],
    ['caveIntro.template', classicTheme.caveIntro.template],
    ['lifeLost.label', classicTheme.lifeLost.label],
    ['gameOver.label', classicTheme.gameOver.label],
    ['won.label', classicTheme.won.label],
    ['paused.label', classicTheme.paused.label],
    ['hud.lives', classicTheme.hud.lives],
    ['hud.time', classicTheme.hud.time],
    ['hud.score', classicTheme.hud.score],
    ['hud.highScore', classicTheme.hud.highScore],
    ['hud.furthestCave', classicTheme.hud.furthestCave],
    ['caveComplete.label', classicTheme.caveComplete.label],
  ];

  it.each(stringFields)('supplies a non-empty %s', (_name, value) => {
    expect(typeof value).toBe('string');
    expect(value.length).toBeGreaterThan(0);
  });
});

// FR-008: the closed exit must be byte-identical to the steel wall.
describe('classic theme door/wall rule', () => {
  it('makes the closed exit visually identical to the steel wall', () => {
    expect(classicTheme.elements.exit).toEqual(classicTheme.elements.steelWall);
  });
});

// FR-009: each transient appearance is visibly distinct from its inert
// counterpart and from every other entry in the theme.
describe('classic theme transient-appearance distinctness', () => {
  it('doorOpenEntry is distinct from the closed exit and from every other entry', () => {
    const open = classicTheme.doorOpenEntry;
    expect(open).not.toEqual(classicTheme.elements.exit);
    for (const id of ELEMENT_IDS) {
      const other = classicTheme.elements[id];
      expect(open.glyph === other.glyph && open.fillColor === other.fillColor).toBe(false);
    }
  });

  it('magicWallActiveEntry is distinct from the inert magic wall and from every other entry', () => {
    const active = classicTheme.magicWallActiveEntry;
    expect(active).not.toEqual(classicTheme.elements.magicWall);
    for (const id of ELEMENT_IDS) {
      const other = classicTheme.elements[id];
      expect(active.glyph === other.glyph && active.fillColor === other.fillColor).toBe(false);
    }
  });

  it('doorOpenEntry and magicWallActiveEntry are distinct from each other', () => {
    const open = classicTheme.doorOpenEntry;
    const active = classicTheme.magicWallActiveEntry;
    expect(open.glyph === active.glyph && open.fillColor === active.fillColor).toBe(false);
  });
});

// FR-011: no theme's title/displayName may use the commercial original's
// trademarked name.
describe('classic theme avoids the trademarked original name', () => {
  it('title contains no substring of the trademarked name', () => {
    expect(classicTheme.title.toLowerCase()).not.toContain('boulder dash');
  });

  it('displayName contains no substring of the trademarked name', () => {
    expect(classicTheme.displayName.toLowerCase()).not.toContain('boulder dash');
  });
});
