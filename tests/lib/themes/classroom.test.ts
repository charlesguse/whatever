import { describe, expect, it } from 'vitest';
import { ELEMENT_IDS } from '../../../src/sim/elements';
import { classroomTheme } from '../../../src/lib/themes/classroom';

// FR-025, FR-026: every declared element id — including the 9 with no sim
// behavior yet — must have a ThemeEntry in every registered theme.
describe('classroom theme completeness', () => {
  it.each(ELEMENT_IDS)('has a ThemeEntry for element id "%s"', (id) => {
    const entry = classroomTheme.elements[id];
    expect(entry).toBeDefined();
    expect(typeof entry.fillColor).toBe('string');
    expect(entry.fillColor.length).toBeGreaterThan(0);
    expect(typeof entry.glyph).toBe('string');
    expect(typeof entry.label).toBe('string');
    expect(entry.label.length).toBeGreaterThan(0);
  });

  it('covers exactly the declared element set, nothing more or less', () => {
    const themeKeys = Object.keys(classroomTheme.elements).sort();
    const declaredIds = [...ELEMENT_IDS].sort();
    expect(themeKeys).toEqual(declaredIds);
  });
});

// FR-029, FR-030: the firefly and butterfly labels are corrected now that
// both elements have behavior, and stay distinguishable from each other and
// from every other element (appearance-only — no src/sim/ or render change).
describe('classroom theme enemy labels', () => {
  it('labels the firefly "Pencil Sharpener"', () => {
    expect(classroomTheme.elements.firefly.label).toBe('Pencil Sharpener');
  });

  it('labels the butterfly "Paper Airplane"', () => {
    expect(classroomTheme.elements.butterfly.label).toBe('Paper Airplane');
  });

  it('keeps the firefly and butterfly mutually distinguishable', () => {
    const firefly = classroomTheme.elements.firefly;
    const butterfly = classroomTheme.elements.butterfly;
    expect(firefly.glyph === butterfly.glyph && firefly.fillColor === butterfly.fillColor).toBe(false);
  });

  it('keeps the firefly and butterfly distinguishable from every other element', () => {
    for (const id of ELEMENT_IDS) {
      if (id === 'firefly' || id === 'butterfly') continue;
      const other = classroomTheme.elements[id];
      for (const enemyId of ['firefly', 'butterfly'] as const) {
        const enemy = classroomTheme.elements[enemyId];
        expect(enemy.glyph === other.glyph && enemy.fillColor === other.fillColor).toBe(false);
      }
    }
  });
});

// FR-032, FR-033, FR-034: the magic wall's relabel and its second, active
// theme entry — visually distinguishable from every other entry, including
// its own inert appearance.
describe('classroom theme magic wall labels/entries', () => {
  it('labels the magic wall entry exactly "Sticker Machine"', () => {
    expect(classroomTheme.elements.magicWall.label).toBe('Sticker Machine');
  });

  it('carries a magicWallActiveEntry field distinct from elements.magicWall', () => {
    const inert = classroomTheme.elements.magicWall;
    const active = classroomTheme.magicWallActiveEntry;
    expect(active).toBeDefined();
    expect(active.glyph === inert.glyph && active.fillColor === inert.fillColor).toBe(false);
  });

  it('keeps magicWallActiveEntry distinguishable from every other entry at the shipped cell size', () => {
    const active = classroomTheme.magicWallActiveEntry;
    for (const id of ELEMENT_IDS) {
      const other = classroomTheme.elements[id];
      expect(active.glyph === other.glyph && active.fillColor === other.fillColor).toBe(false);
    }
  });
});

// FR-024, FR-038, FR-040: the closed door (elements.exit) must be visually
// identical to a steel wall, and every theme must supply the door's open
// appearance, both terminal messages, and the readout template.
describe('classroom theme door/message/readout fields', () => {
  it('makes the closed door (exit) visually identical to a steel wall', () => {
    expect(classroomTheme.elements.exit).toEqual(classroomTheme.elements.steelWall);
  });

  it('gives the open door a visibly distinct appearance from the closed door', () => {
    expect(classroomTheme.doorOpenEntry).not.toEqual(classroomTheme.elements.exit);
  });

  it('supplies non-empty dead/completed messages', () => {
    expect(classroomTheme.messages.dead.length).toBeGreaterThan(0);
    expect(classroomTheme.messages.completed.length).toBeGreaterThan(0);
  });

  it('supplies a readout template', () => {
    expect(classroomTheme.readout.template.length).toBeGreaterThan(0);
  });
});

// FR-002, FR-003, FR-005, FR-007, FR-046, SC-013: every full-screen/HUD
// field this feature adds is present, non-empty, and distinguishable; the
// existing messages.dead/messages.completed in-play banners are unchanged
// and distinct from the new full-screen wording.
describe('classroom theme title/caveIntro/lifeLost/gameOver/won/paused/HUD fields', () => {
  it('supplies a non-empty title', () => {
    expect(classroomTheme.title.length).toBeGreaterThan(0);
  });

  it('supplies a non-empty caveIntro template', () => {
    expect(classroomTheme.caveIntro.template.length).toBeGreaterThan(0);
  });

  it('supplies a non-empty caveComplete label', () => {
    expect(classroomTheme.caveComplete.label.length).toBeGreaterThan(0);
  });

  it('supplies a non-empty paused label', () => {
    expect(classroomTheme.paused.label.length).toBeGreaterThan(0);
  });

  it('supplies non-empty lifeLost/gameOver/won labels, each mutually distinct and distinct from messages.dead/completed', () => {
    const fullScreenLabels = [
      classroomTheme.lifeLost.label,
      classroomTheme.gameOver.label,
      classroomTheme.won.label,
    ];
    for (const label of fullScreenLabels) {
      expect(label.length).toBeGreaterThan(0);
      expect(label).not.toBe(classroomTheme.messages.dead);
      expect(label).not.toBe(classroomTheme.messages.completed);
    }
    expect(new Set(fullScreenLabels).size).toBe(fullScreenLabels.length);
  });

  it('leaves messages.dead/messages.completed unchanged from features 001–004', () => {
    expect(classroomTheme.messages.dead).toBe('Ouch! Head back to the classroom and try again.');
    expect(classroomTheme.messages.completed).toBe('You made it out the door!');
  });

  it('supplies non-empty hud.lives/hud.time/hud.score/hud.highScore/hud.furthestCave templates', () => {
    const hudFields = [
      classroomTheme.hud.lives,
      classroomTheme.hud.time,
      classroomTheme.hud.score,
      classroomTheme.hud.highScore,
      classroomTheme.hud.furthestCave,
    ];
    for (const field of hudFields) {
      expect(field.length).toBeGreaterThan(0);
    }
    expect(new Set(hudFields).size).toBe(hudFields.length);
  });
});
