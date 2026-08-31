import { describe, expect, it } from 'vitest';
import { ELEMENT_IDS, type ElementId } from '../../../src/sim/elements';
import { listThemes } from '../../../src/lib/themes/registry';
import type { Theme } from '../../../src/lib/themes/types';
import '../../../src/lib/themes';

const REQUIRED_STRING_FIELDS: ReadonlyArray<[string, (theme: Theme) => string]> = [
  ['displayName', (t) => t.displayName],
  ['title', (t) => t.title],
  ['messages.dead', (t) => t.messages.dead],
  ['messages.completed', (t) => t.messages.completed],
  ['readout.template', (t) => t.readout.template],
  ['caveIntro.template', (t) => t.caveIntro.template],
  ['lifeLost.label', (t) => t.lifeLost.label],
  ['gameOver.label', (t) => t.gameOver.label],
  ['won.label', (t) => t.won.label],
  ['paused.label', (t) => t.paused.label],
  ['hud.lives', (t) => t.hud.lives],
  ['hud.time', (t) => t.hud.time],
  ['hud.score', (t) => t.hud.score],
  ['hud.highScore', (t) => t.hud.highScore],
  ['hud.furthestCave', (t) => t.hud.furthestCave],
  ['caveComplete.label', (t) => t.caveComplete.label],
];

// FR-029, SC-008: fails naming both the theme's id and the specific
// missing element id or field — never a bare boolean failure.
function checkThemeCompleteness(theme: Theme, elementIds: readonly ElementId[] = ELEMENT_IDS): void {
  for (const id of elementIds) {
    if (!(id in theme.elements)) {
      throw new Error(`Theme "${theme.id}" is missing an entry for element id "${id}"`);
    }
  }

  if (!theme.doorOpenEntry) {
    throw new Error(`Theme "${theme.id}" is missing doorOpenEntry`);
  }
  if (!theme.magicWallActiveEntry) {
    throw new Error(`Theme "${theme.id}" is missing magicWallActiveEntry`);
  }

  for (const [name, getValue] of REQUIRED_STRING_FIELDS) {
    const value = getValue(theme);
    if (typeof value !== 'string' || value.length === 0) {
      throw new Error(`Theme "${theme.id}" is missing a non-empty "${name}"`);
    }
  }
}

describe('registered theme completeness (FR-029, SC-008, Acceptance Scenario 1)', () => {
  it.each(listThemes())('theme "$id" passes the completeness check', (theme) => {
    expect(() => checkThemeCompleteness(theme)).not.toThrow();
  });
});

describe('the completeness check fails loudly on a deliberately incomplete fixture (Acceptance Scenario 2)', () => {
  it('names both the fixture id and the missing element id', () => {
    const complete = listThemes()[0];
    const { boulder: _omitted, ...incompleteElements } = complete.elements;
    const incompleteFixture: Theme = {
      ...complete,
      id: 'incomplete-fixture',
      elements: incompleteElements as Theme['elements'],
    };

    expect(() => checkThemeCompleteness(incompleteFixture)).toThrow(/incomplete-fixture/);
    expect(() => checkThemeCompleteness(incompleteFixture)).toThrow(/boulder/);
  });
});

describe('the completeness check fails for every registered theme when a new element id has no themed entry (Acceptance Scenario 3)', () => {
  it('fails for every shipped theme against an element-id list with one extra id', () => {
    const elementIdsWithExtra = [...ELEMENT_IDS, 'unthemedFutureElement'] as unknown as readonly ElementId[];
    for (const theme of listThemes()) {
      expect(() => checkThemeCompleteness(theme, elementIdsWithExtra)).toThrow(
        new RegExp(`${theme.id}.*unthemedFutureElement`)
      );
    }
  });
});
