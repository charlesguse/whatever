import { describe, expect, it } from 'vitest';
import { getCell, getStatus, isExplosion } from '../../src/sim/cave';
import { caveFromLines, runTicks } from './helpers/ascii-cave';
import type { ElementId } from '../../src/sim/elements';

type Dir = 'up' | 'down' | 'left' | 'right';

// A 5x5 box with the kid fixed at the center (2,2); the enemy is placed
// adjacent to the kid in the given direction. The enemy's contact check
// (FR-010) runs before any movement attempt, so nothing else about the
// layout matters for these cases.
function contactCave(enemyChar: string, dir: Dir): string {
  const grid = [
    'SSSSS',
    'S...S',
    'S.P.S',
    'S...S',
    'SSSSS',
  ];
  const [ex, ey]: [number, number] =
    dir === 'up' ? [2, 1] : dir === 'down' ? [2, 3] : dir === 'left' ? [1, 2] : [3, 2];
  const row = grid[ey];
  grid[ey] = row.slice(0, ex) + enemyChar + row.slice(ex + 1);
  return grid.join('\n');
}

describe('contact detonation (FR-010, SC-003)', () => {
  const cases: readonly [string, Dir][] = [
    ['F', 'up'],
    ['F', 'down'],
    ['F', 'left'],
    ['F', 'right'],
    ['Y', 'up'],
    ['Y', 'down'],
    ['Y', 'left'],
    ['Y', 'right'],
  ];

  it.each(cases)('the kid dies on contact with %s from the %s direction', (enemyChar, dir) => {
    const state = caveFromLines(contactCave(enemyChar, dir));
    const next = runTicks(state, 1);
    expect(getStatus(next)).toBe('dying');
  });

  it('diagonal-only adjacency never triggers detonation', () => {
    const state = caveFromLines(`
      SSSSS
      SFSSS
      SSPSS
      SSSSS
    `);
    const next = runTicks(state, 20);
    expect(getStatus(next)).toBe('inPlay');
  });
});

const BODY_ELEMENT: Readonly<Record<string, ElementId>> = { o: 'boulder', '*': 'diamond' };
const ENEMY_ELEMENT: Readonly<Record<string, ElementId>> = { F: 'firefly', Y: 'butterfly' };

// The enemy at (3,3) is boxed on three sides so it can never patrol away
// before the body reaches it; the falling body approaches down the only
// open side (up), matching FR-011's "falling body reaches an enemy" trigger.
function fallingOntoEnemyCave(bodyChar: string, enemyChar: string): string {
  return [
    'SSSSSSS',
    `S..${bodyChar}..S`,
    'S.....S',
    `S.S${enemyChar}S.S`,
    'S.SSS.S',
    'S.....S',
    'S....PS',
    'SSSSSSS',
  ].join('\n');
}

function restingOnEnemyCave(bodyChar: string, enemyChar: string): string {
  return [
    'SSSSSSS',
    'S.....S',
    `S..${bodyChar}..S`,
    `S.S${enemyChar}S.S`,
    'S.SSS.S',
    'S.....S',
    'S....PS',
    'SSSSSSS',
  ].join('\n');
}

describe('a falling body detonates an enemy it lands on (FR-011)', () => {
  const cases: readonly [string, string][] = [
    ['o', 'F'],
    ['o', 'Y'],
    ['*', 'F'],
    ['*', 'Y'],
  ];

  it.each(cases)('a falling %s detonates a %s, and does not move into its cell', (bodyChar, enemyChar) => {
    const state = caveFromLines(fallingOntoEnemyCave(bodyChar, enemyChar));
    const next = runTicks(state, 2);
    expect(isExplosion(next, 3, 3)).toBe(true); // the enemy's own cell
    expect(isExplosion(next, 3, 2)).toBe(true); // the body's cell, consumed by the same blast
    expect(getStatus(next)).toBe('inPlay'); // the kid is untouched by this blast
  });

  it.each(cases)('a resting %s above a %s never detonates it, over many ticks', (bodyChar, enemyChar) => {
    const state = caveFromLines(restingOnEnemyCave(bodyChar, enemyChar));
    const next = runTicks(state, 25);
    expect(isExplosion(next, 3, 3)).toBe(false);
    expect(getCell(next, 3, 3)).toBe(ENEMY_ELEMENT[enemyChar]);
    expect(getCell(next, 3, 2)).toBe(BODY_ELEMENT[bodyChar]);
    expect(getStatus(next)).toBe('inPlay');
  });
});
