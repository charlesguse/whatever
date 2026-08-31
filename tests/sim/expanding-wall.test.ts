import { describe, expect, it } from 'vitest';
import { asciiFromState } from '../../src/sim/ascii';
import { caveFromLines, expectAscii, runTicks } from './helpers/ascii-cave';

describe('expanding wall growth (FR-024–FR-027)', () => {
  it('grows into empty space on both sides, exactly one cell per tick per side, stopping at the grid edge', () => {
    const state = caveFromLines(['SP.....E.....S']);
    const next1 = runTicks(state, 1);
    expectAscii(next1, ['SP....EEE....S']);
    const next2 = runTicks(next1, 1);
    expectAscii(next2, ['SP...EEEEE...S']);
  });

  it('stops dead against a wall on one side while continuing to grow on the open side', () => {
    const state = caveFromLines(['SPBE.....S']);
    const next = runTicks(state, 5);
    // Blocked to the left by the brick wall from tick 1; grows rightward
    // until it meets the steel border.
    expectAscii(next, ['SPBEEEEEES']);
  });

  it('stops dead against an eraser', () => {
    const state = caveFromLines('SP.oE....S');
    const next = runTicks(state, 4);
    expectAscii(next, ['SP.oEEEEES']);
  });

  it('stops dead against the kid', () => {
    const state = caveFromLines('SPE......S');
    const next = runTicks(state, 6);
    // Blocked to the left by the kid himself; grows rightward to the edge.
    expectAscii(next, ['SPEEEEEEES']);
  });

  it('refuses to grow into dirt', () => {
    const state = caveFromLines('SPBE#....S');
    const next = runTicks(state, 5);
    expectAscii(next, ['SPBE#....S']);
  });

  it('never grows vertically', () => {
    const state = caveFromLines(['S.P.S', 'S.E.S', 'S...S', 'SSSSS']);
    const next = runTicks(state, 3);
    expect(asciiFromState(next).split('\n')[1][2]).toBe('E'); // unchanged
    expect(asciiFromState(next).split('\n')[2][2]).toBe('.'); // never grew down
    expect(asciiFromState(next).split('\n')[0][2]).toBe('P'); // never grew up
  });

  it('a cell created by growth does not grow again until the following tick (FR-026)', () => {
    const state = caveFromLines(['SP.E....S']);
    const next = runTicks(state, 1);
    // Only one cell of growth on each side this tick, not a cascading fill.
    expectAscii(next, ['SPEEE...S']);
  });
});
