import { describe, expect, it } from 'vitest';
import { asciiFromState } from '../../src/sim/ascii';
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
});
