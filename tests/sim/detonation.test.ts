import { describe, expect, it } from 'vitest';
import { getStatus } from '../../src/sim/cave';
import { caveFromLines, runTicks } from './helpers/ascii-cave';

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
