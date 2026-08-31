import { describe, expect, it } from 'vitest';
import { getCollected, getPlayerPosition } from '../../src/sim/cave';
import { caveFromLines, expectAscii, runTicks } from './helpers/ascii-cave';

describe('grab (FR-019–FR-021)', () => {
  it('clears dirt without moving the kid', () => {
    const state = caveFromLines('S.P#.S');
    const next = runTicks(state, 1, [{ direction: 'right', grab: true }]);
    expect(getPlayerPosition(next)).toEqual({ x: 2, y: 0 });
    expectAscii(next, ['S.P..S']);
  });

  it('collects a gold star and increases the count without moving the kid', () => {
    const state = caveFromLines('S.P*.S', { quota: 1 });
    const next = runTicks(state, 1, [{ direction: 'right', grab: true }]);
    expect(getPlayerPosition(next)).toEqual({ x: 2, y: 0 });
    expect(getCollected(next)).toBe(1);
    expectAscii(next, ['S.P..S']);
  });

  it('does nothing against a resting eraser — never pushes', () => {
    const state = caveFromLines('S.Po.S');
    const next = runTicks(state, 1, [{ direction: 'right', grab: true }]);
    expect(getPlayerPosition(next)).toEqual({ x: 2, y: 0 });
    expectAscii(next, ['S.Po.S']);
  });

  it('does nothing against amoeba — never grabs or pushes (research.md Decision 7)', () => {
    const state = caveFromLines('S.PA.S');
    const next = runTicks(state, 1, [{ direction: 'right', grab: true }]);
    expect(getPlayerPosition(next)).toEqual({ x: 2, y: 0 });
    expectAscii(next, ['S.PA.S']);
  });

  it('does nothing against a wall', () => {
    const state = caveFromLines('S.PS.S');
    const next = runTicks(state, 1, [{ direction: 'right', grab: true }]);
    expect(getPlayerPosition(next)).toEqual({ x: 2, y: 0 });
    expectAscii(next, ['S.PS.S']);
  });

  it('does nothing against the closed door', () => {
    // Both diamonds sit on row 1, untouched, so the quota of 2 is never met
    // and the door stays closed for the whole test.
    const state = caveFromLines(
      `
      S.PXS
      S.**S
    `,
      { quota: 2 }
    );
    const next = runTicks(state, 1, [{ direction: 'right', grab: true }]);
    expect(getCollected(next)).toBe(0);
    expect(getPlayerPosition(next)).toEqual({ x: 2, y: 0 });
    expectAscii(
      next,
      `
      S.PXS
      S.**S
    `
    );
  });

  it('does nothing against the open door — never enters it', () => {
    const state = caveFromLines('S.P*XS', { quota: 1 });
    const next = runTicks(state, 2, [
      { direction: 'right', grab: true },
      { direction: 'right', grab: true },
    ]);
    expect(getCollected(next)).toBe(1);
    expect(getPlayerPosition(next)).toEqual({ x: 2, y: 0 });
    expectAscii(next, ['S.P.XS']);
  });

  it('does nothing past the cave boundary', () => {
    const state = caveFromLines('P.S');
    const next = runTicks(state, 1, [{ direction: 'left', grab: true }]);
    expect(getPlayerPosition(next)).toEqual({ x: 0, y: 0 });
    expectAscii(next, ['P.S']);
  });
});
