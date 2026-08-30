import { describe, expect, it } from 'vitest';
import { getStatus } from '../../src/sim/cave';
import { caveFromLines, expectAscii, runTicks } from './helpers/ascii-cave';

// An open interior far from any wall, so the full 3x3 resolves with nothing
// spared — isolating FR-018's "what a blast leaves behind" from FR-017's
// wall/door sparing (covered separately in Phase 5). The kid stands
// orthogonally adjacent to the enemy so contact detonation (FR-010) fires on
// the very first tick, with no other trigger needed.

describe('blast content (FR-018, SC-005)', () => {
  it('a butterfly leaves exactly a 3x3 of gold stars', () => {
    const state = caveFromLines(`
      SSSSSSS
      S.....S
      S.....S
      S..Y..S
      S..P..S
      S.....S
      S.....S
      SSSSSSS
    `);
    const resolved = runTicks(state, 3); // stamp tick + 2-tick lifetime
    expect(getStatus(resolved)).toBe('dead'); // the kid was caught in this same blast
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

  it('a firefly leaves exactly a 3x3 of empty space', () => {
    const state = caveFromLines(`
      SSSSSSS
      S.....S
      S.....S
      S..F..S
      S..P..S
      S.....S
      S.....S
      SSSSSSS
    `);
    const resolved = runTicks(state, 3);
    expect(getStatus(resolved)).toBe('dead');
    expectAscii(
      resolved,
      `
        SSSSSSS
        S.....S
        S.....S
        S.....S
        S.....S
        S.....S
        S.....S
        SSSSSSS
      `
    );
  });
});
