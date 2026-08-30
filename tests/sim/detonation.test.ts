import { describe, expect, it } from 'vitest';
import { getCell, getStatus, isExplosion } from '../../src/sim/cave';
import { caveFromLines, expectAscii, runTicks } from './helpers/ascii-cave';
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

describe('chain reactions (FR-012, FR-023, FR-024, SC-008, SC-016)', () => {
  it('a chain propagates one link per tick through a mix of enemy types, and no enemy detonates twice', () => {
    // F(2,3) detonates on contact with the kid at tick 1, catching Y(3,3)
    // in the same blast. Y's own blast, deferred to tick 2 (FR-023), reaches
    // F(4,3) — one cell further, one tick later. F(4,3)'s own blast,
    // deferred to tick 3, reaches no further enemy: the chain ends there.
    // F(4,3) is boxed above/below so it cannot patrol away before the chain
    // reaches it.
    const state = caveFromLines(`
      SSSSSSSSS
      S.......S
      S...S...S
      S.FYF...S
      S.P.S...S
      S.......S
      SSSSSSSSS
    `);

    const afterTick1 = runTicks(state, 1);
    expect(isExplosion(afterTick1, 2, 3)).toBe(true); // the trigger
    expect(isExplosion(afterTick1, 3, 3)).toBe(true); // caught in the same blast
    expect(getCell(afterTick1, 4, 3)).toBe('firefly'); // not reached yet — still alive

    const afterTick2 = runTicks(state, 2);
    expect(isExplosion(afterTick2, 4, 3)).toBe(true); // Y's deferred blast reaches it

    const afterTick3 = runTicks(state, 3);
    expect(isExplosion(afterTick3, 4, 3)).toBe(true); // still resolving its own lifetime

    // No enemy cell is ever seen going from destroyed back to a live
    // firefly/butterfly id — each one detonates at most once (FR-023).
    expect(getCell(afterTick3, 2, 3)).not.toBe('firefly');
    expect(getCell(afterTick3, 3, 3)).not.toBe('butterfly');
    expect(getCell(afterTick3, 4, 3)).not.toBe('firefly');

    // Once every explosion in the chain has fully converted, the resolved
    // grid actually holds both kinds of blast content — gold stars where a
    // butterfly's own blast was the last one to touch a cell, empty space
    // where a firefly's was — not just a timing window (FR-036).
    const resolved = runTicks(state, 5);
    expect(getStatus(resolved)).toBe('dead');
    expectAscii(
      resolved,
      `
        SSSSSSSSS
        S.......S
        S*..S...S
        S*......S
        S...S...S
        S.*.....S
        SSSSSSSSS
      `
    );
  });

  it('the kid is caught in a blast started by something else, entering the dying state (FR-012, FR-015)', () => {
    // The eraser — not the kid, and not the butterfly's own contact check
    // (the kid is only diagonally adjacent to the butterfly, which never
    // triggers FR-010) — is what sets this blast off.
    const state = caveFromLines(`
      SSSSSSS
      S..o..S
      S...P.S
      S.SY..S
      S.S...S
      S.....S
      SSSSSSS
    `);

    const afterFall = runTicks(state, 1);
    expect(getStatus(afterFall)).toBe('inPlay');

    const afterDetonate = runTicks(state, 2);
    expect(getStatus(afterDetonate)).toBe('dying');
    expect(isExplosion(afterDetonate, 4, 2)).toBe(true); // the kid's former cell
  });

  it('the kid dying to the first link of a chain lets the rest of the cascade keep resolving, ending dead (FR-024, SC-016)', () => {
    // F(2,3) detonates on contact with the kid, catching Y(3,3) in the same
    // blast. Y's own blast, deferred one tick, reaches no further enemy —
    // but it re-covers some of F's cells, extending their lifetime. The
    // cave keeps advancing through the dying state regardless (FR-015),
    // and every explosion — including the re-ignited ones — eventually
    // burns out.
    const state = caveFromLines(`
      SSSSSSS
      S.....S
      S.....S
      S.FY..S
      S.P...S
      S.....S
      S.....S
      SSSSSSS
    `);

    const afterTick1 = runTicks(state, 1);
    expect(getStatus(afterTick1)).toBe('dying'); // the kid died to the very first link

    const afterTick2 = runTicks(state, 2);
    expect(getStatus(afterTick2)).toBe('dying'); // Y's deferred blast is still resolving

    const resolved = runTicks(state, 8); // comfortably past every explosion's lifetime
    expect(getStatus(resolved)).toBe('dead');

    // The cascade — including the kid's own cell — finished converting, not
    // just the status transition (FR-036, SC-016).
    expectAscii(
      resolved,
      `
        SSSSSSS
        S.....S
        S.***.S
        S.***.S
        S.***.S
        S.....S
        S.....S
        SSSSSSS
      `
    );
  });
});
