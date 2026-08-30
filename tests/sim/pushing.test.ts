import { describe, expect, it } from 'vitest';
import { asciiFromState } from '../../src/sim/ascii';
import { getPlayerPosition } from '../../src/sim/cave';
import { caveFromLines, expectAscii, runTicks } from './helpers/ascii-cave';

// PUSH_CHANCE is 1/8 against the sim's mulberry32 PRNG. Seed 7's first draw
// is ~0.0117 (a success); its second and third draws are failures; its
// fourth is a success again. Computed once, offline, from src/sim/prng.ts's
// exact algorithm — not re-derived at test time.
const SUCCEED_SEED = 7;

describe('pushing (FR-012–FR-016)', () => {
  it('succeeds under a seed/input chosen to succeed, moving both the boulder and the kid', () => {
    const state = caveFromLines('S.Po.S', { seed: SUCCEED_SEED });
    const next = runTicks(state, 1, ['right']);
    expectAscii(next, ['S..PoS']);
  });

  it('is blocked by an occupied beyond-cell — no move, and no randomness consumed', () => {
    const state = caveFromLines('S.PoS', { seed: SUCCEED_SEED });
    const next = runTicks(state, 1, ['right']);
    expectAscii(next, ['S.PoS']);
  });

  it('is blocked by an off-grid beyond-cell — no move, and no randomness consumed', () => {
    const state = caveFromLines('S.Po', { seed: SUCCEED_SEED });
    const next = runTicks(state, 1, ['right']);
    expectAscii(next, ['S.Po']);
  });

  it('is blocked while the boulder is currently falling — no move', () => {
    const state = caveFromLines(
      `
      SSSSSS
      S.o..S
      SP...S
      S....S
      S....S
      SSSSSS
    `,
      { seed: SUCCEED_SEED }
    );
    // Tick 1: the boulder falls from (2,1) to (2,2). Tick 2: the kid
    // presses right into the now-falling boulder at (2,2) before it has a
    // chance to rest — ineligible, no move.
    const next = runTicks(state, 2, [undefined, 'right']);
    expect(getPlayerPosition(next)).toEqual({ x: 1, y: 2 });
  });

  it('rejects a vertical press against a boulder — no move', () => {
    const state = caveFromLines(
      `
      SSSSS
      S.o.S
      S.P.S
      SSSSS
    `,
      { seed: SUCCEED_SEED }
    );
    const next = runTicks(state, 1, ['up']);
    expectAscii(
      next,
      `
      SSSSS
      S.o.S
      S.P.S
      SSSSS
    `
    );
  });

  it('draws an identical success/failure sequence across two runs of the same seed and inputs', () => {
    const cave = 'S.Po...........S';
    const inputs = Array.from({ length: 15 }, () => 'right' as const);

    let stateA = caveFromLines(cave, { seed: 3 });
    let stateB = caveFromLines(cave, { seed: 3 });

    for (let i = 0; i < inputs.length; i++) {
      stateA = runTicks(stateA, 1, [inputs[i]]);
      stateB = runTicks(stateB, 1, [inputs[i]]);
      expect(asciiFromState(stateA)).toBe(asciiFromState(stateB));
    }
  });

  it('consumes no randomness on a blocked push — a later eligible push lands on the same outcome whether or not the blocked push was attempted first', () => {
    const cave = 'SBoPo.S';

    // Baseline: the eligible push (right) is the very first push attempted.
    const baseline = runTicks(caveFromLines(cave, { seed: SUCCEED_SEED }), 1, ['right']);

    // A blocked push (left, into an occupied beyond-cell) is attempted
    // first, then the same eligible push.
    const afterBlockedFirst = runTicks(caveFromLines(cave, { seed: SUCCEED_SEED }), 2, [
      'left',
      'right',
    ]);

    const expected = 'SBo.PoS';
    expectAscii(baseline, [expected]);
    expectAscii(afterBlockedFirst, [expected]);
  });

  it('a pushed boulder falls on a later tick because nothing is under its new cell', () => {
    const state = caveFromLines(
      `
      SSSSSS
      S.Po.S
      S....S
      SSSSSS
    `,
      { seed: SUCCEED_SEED }
    );
    const next = runTicks(state, 2, ['right', undefined]);
    expectAscii(
      next,
      `
      SSSSSS
      S..P.S
      S...oS
      SSSSSS
    `
    );
  });
});
