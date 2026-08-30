import { describe, expect, it } from 'vitest';
import { asciiFromState } from '../../src/sim/ascii';
import { getCollected, getStatus } from '../../src/sim/cave';
import { tick, type Direction } from '../../src/sim/tick';
import { caveFromLines } from './helpers/ascii-cave';

const TICK_COUNT = 120; // SC-005: at least 100 ticks

function buildInputSequence(count: number): (Direction | undefined)[] {
  const cycle: (Direction | undefined)[] = ['right', 'down', 'left', 'up', undefined];
  return Array.from({ length: count }, (_, i) => cycle[i % cycle.length]);
}

describe('determinism', () => {
  it('replays byte-for-byte identically at every tick given the same seed and inputs (FR-010, SC-005)', () => {
    const cave = `
      SSSSSSSSSS
      S.P......S
      S.#.BS...S
      S........S
      SSSSSSSSSS
    `;
    const inputs = buildInputSequence(TICK_COUNT);

    let stateA = caveFromLines(cave, { seed: 42 });
    let stateB = caveFromLines(cave, { seed: 42 });

    for (let i = 0; i < TICK_COUNT; i++) {
      stateA = tick(stateA, { direction: inputs[i] });
      stateB = tick(stateB, { direction: inputs[i] });
      expect(asciiFromState(stateA)).toBe(asciiFromState(stateB));
    }
  });

  it('replays a scenario covering falls, rolls, a held push, a collection, and a death identically across two runs (FR-049, SC-009)', () => {
    // A hand-built cave and a fixed input sequence engineered so that, over
    // the run, a boulder falls/rolls to rest, a diamond is collected, a
    // held push against a resting eraser both succeeds and fails (seed 7's
    // first draw succeeds, second fails), and finally the kid is crushed —
    // verified once by hand (see the tasks.md history for this feature) and
    // pinned here purely as a byte-for-byte replay comparison.
    const cave = `
      SSSSSSSSSSSSSSS
      S.o........o..S
      S..........#..S
      S.P...........S
      S.............S
      S.............S
      S.............S
      S...*....o....S
      SSSSSSSSSSSSSSS
    `;

    type Input = { direction?: Direction; grab?: boolean };
    const scripted: Input[] = [
      { direction: 'down' },
      { direction: 'down' },
      { direction: 'down' },
      { direction: 'down' },
      { direction: 'right' },
      { direction: 'right' }, // walks into the diamond at (4,7) — collects it
      { direction: 'right' },
      { direction: 'right' },
      { direction: 'right' },
      { direction: 'right' },
      { direction: 'right' }, // eligible push — succeeds (seed 7's first draw)
      { direction: 'right' }, // eligible push — fails (seed 7's second draw)
      { direction: 'up' },
      { direction: 'up' },
      { direction: 'up' },
      { direction: 'up' },
      { direction: 'right' },
      { direction: 'right' }, // arrives below the death-trap boulder's dirt support
      { grab: true, direction: 'up' }, // clears the dirt without moving
    ];
    const inputs: Input[] = Array.from(
      { length: TICK_COUNT },
      (_, i) => scripted[i] ?? {}
    );

    let stateA = caveFromLines(cave, { seed: 7, quota: 1 });
    let stateB = caveFromLines(cave, { seed: 7, quota: 1 });

    for (let i = 0; i < TICK_COUNT; i++) {
      stateA = tick(stateA, inputs[i]);
      stateB = tick(stateB, inputs[i]);
      expect(asciiFromState(stateA)).toBe(asciiFromState(stateB));
      expect(getCollected(stateA)).toBe(getCollected(stateB));
      expect(getStatus(stateA)).toBe(getStatus(stateB));
    }

    // Sanity: the scripted scenario actually exercised what it claims to.
    expect(getCollected(stateA)).toBe(1);
    expect(getStatus(stateA)).toBe('dead');
  });
});
