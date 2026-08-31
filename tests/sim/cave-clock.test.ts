import { describe, expect, it } from 'vitest';
import { getRemainingSeconds, getStatus, TICK_RATE_HZ } from '../../src/sim/cave';
import { caveFromLines, expectAscii, runTicks } from './helpers/ascii-cave';

describe('the cave clock falls at TICK_RATE_HZ ticks per second (FR-010, FR-012, SC-002)', () => {
  it('reports the full time limit at tick zero', () => {
    const state = caveFromLines(['SSS', 'SPS', 'SSS'], { timeLimitSeconds: 5 });
    expect(getRemainingSeconds(state)).toBe(5);
  });

  it('falls by exactly one second per TICK_RATE_HZ ticks', () => {
    const state = caveFromLines(['SSS', 'SPS', 'SSS'], { timeLimitSeconds: 5 });
    const afterOneSecond = runTicks(state, TICK_RATE_HZ);
    expect(getRemainingSeconds(afterOneSecond)).toBe(4);
    const afterTwoSeconds = runTicks(state, TICK_RATE_HZ * 2);
    expect(getRemainingSeconds(afterTwoSeconds)).toBe(3);
  });

  it('never goes negative once it reaches zero', () => {
    const state = caveFromLines(['SSS', 'SPS', 'SSS'], { timeLimitSeconds: 1 });
    const longAfter = runTicks(state, TICK_RATE_HZ * 3);
    expect(getRemainingSeconds(longAfter)).toBe(0);
  });
});

describe('timeout death (FR-013)', () => {
  it('kills the kid with no explosion on the tick the clock reaches zero', () => {
    const state = caveFromLines(['SSS', 'SPS', 'SSS'], { timeLimitSeconds: 1 });
    const atExpiry = runTicks(state, TICK_RATE_HZ);
    expect(getStatus(atExpiry)).toBe('dead');
    // No explosion cell anywhere — the grid is untouched but for status.
    expectAscii(atExpiry, ['SSS', 'SPS', 'SSS']);
  });
});

describe('the clock freezes once the cave leaves inPlay (FR-011)', () => {
  it('does not advance while the cave is dying, dead, or completed', () => {
    // A crushing death (crushing.test.ts's shape) freezes the clock at
    // whatever it was when the kid started dying, even though the
    // explosion takes several more ticks to resolve to dead.
    const state = caveFromLines(
      `
        SSSSS
        S.o.S
        S...S
        S.P.S
        SSSSS
      `,
      { timeLimitSeconds: 100 }
    );
    const dying = runTicks(state, 2);
    expect(getStatus(dying)).toBe('dying');
    const dyingRemaining = getRemainingSeconds(dying);

    const dead = runTicks(state, 4); // FR-019: explosion persists 2 ticks after the stamp tick
    expect(getStatus(dead)).toBe('dead');
    expect(getRemainingSeconds(dead)).toBe(dyingRemaining);
  });
});

describe('a cave with no declared time limit never times out (FR-009, FR-052)', () => {
  it('getRemainingSeconds is undefined and the cave runs indefinitely', () => {
    const state = caveFromLines(['SSS', 'SPS', 'SSS']);
    expect(getRemainingSeconds(state)).toBeUndefined();
    const longRun = runTicks(state, 1000);
    expect(getRemainingSeconds(longRun)).toBeUndefined();
    expect(getStatus(longRun)).toBe('inPlay');
  });
});

describe('completion beats expiry (FR-014)', () => {
  it('a cave whose door opens the same tick the clock would reach zero ends completed, not dead', () => {
    const state = caveFromLines(['SSSS', 'SP*X', 'SSSS'], {
      quota: 1,
      timeLimitSeconds: 1, // TICK_RATE_HZ ticks
    });
    // tick 1: collect the diamond (opens the door); ticks 2-7: no input,
    // draining the clock; tick 8 (== TICK_RATE_HZ): step into the open
    // door on the exact tick the clock would otherwise reach zero.
    const inputs = ['right', undefined, undefined, undefined, undefined, undefined, undefined, 'right'] as const;
    expect(inputs.length).toBe(TICK_RATE_HZ);
    const final = runTicks(state, TICK_RATE_HZ, inputs);
    expect(getStatus(final)).toBe('completed');
  });
});

describe('determinism (FR-051, SC-002)', () => {
  it('the same cave, seed, and inputs time out on exactly the same tick across two runs', () => {
    const build = () => caveFromLines(['SSS', 'SPS', 'SSS'], { timeLimitSeconds: 2 });
    const runA = runTicks(build(), TICK_RATE_HZ * 2);
    const runB = runTicks(build(), TICK_RATE_HZ * 2);
    expect(getStatus(runA)).toBe('dead');
    expect(getStatus(runB)).toBe('dead');
    expect(runA.tick).toBe(runB.tick);
  });
});
