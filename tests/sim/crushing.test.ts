import { describe, expect, it } from 'vitest';
import { getStatus } from '../../src/sim/cave';
import { caveFromLines, expectAscii, runTicks } from './helpers/ascii-cave';

describe('crushing (FR-010–FR-011, amended by FR-013)', () => {
  it('a falling boulder kills the kid in a bloom that resolves to empty space', () => {
    const state = caveFromLines(`
      SSSSS
      S.o.S
      S...S
      S.P.S
      SSSSS
    `);

    const dying = runTicks(state, 2);
    expect(getStatus(dying)).toBe('dying'); // FR-015: bloom first, not a silent death

    const dead = runTicks(state, 4); // FR-019: explosion persists 2 ticks after the stamp tick
    expect(getStatus(dead)).toBe('dead');
    expectAscii(
      dead,
      `
        SSSSS
        S...S
        S...S
        S...S
        SSSSS
      `
    );
  });

  it('a falling diamond kills the kid too, in the same bloom', () => {
    const state = caveFromLines(`
      SSSSS
      S.*.S
      S...S
      S.P.S
      SSSSS
    `);
    const dead = runTicks(state, 4);
    expect(getStatus(dead)).toBe('dead');
    expectAscii(
      dead,
      `
        SSSSS
        S...S
        S...S
        S...S
        SSSSS
      `
    );
  });

  it('a resting body directly above the kid never kills them, regardless of tick count', () => {
    const state = caveFromLines(`
      SSSSS
      S.o.S
      S.P.S
      SSSSS
    `);
    const next = runTicks(state, 25);
    expect(getStatus(next)).toBe('inPlay');
  });
});
