import { describe, expect, it } from 'vitest';
import { getPlayerPosition, getStatus } from '../../src/sim/cave';
import { caveFromLines, expectAscii, runTicks } from './helpers/ascii-cave';

describe('movement', () => {
  it('moves into an empty cell, leaving the origin empty (FR-013)', () => {
    const state = caveFromLines(`
      ...
      .P.
      ...
    `);
    const next = runTicks(state, 1, ['right']);
    expectAscii(
      next,
      `
      ...
      ..P
      ...
    `
    );
  });

  it('moves into dirt, clearing it permanently (FR-014)', () => {
    const state = caveFromLines(`
      ....
      .P#.
      ....
    `);
    const next = runTicks(state, 1, ['right']);
    expectAscii(
      next,
      `
      ....
      ..P.
      ....
    `
    );
  });

  it('does not move into a brick wall (FR-015)', () => {
    const state = caveFromLines(`
      ....
      .PB.
      ....
    `);
    const next = runTicks(state, 1, ['right']);
    expectAscii(
      next,
      `
      ....
      .PB.
      ....
    `
    );
  });

  it('does not move into a steel wall (FR-015)', () => {
    const state = caveFromLines(`
      ....
      .PS.
      ....
    `);
    const next = runTicks(state, 1, ['right']);
    expectAscii(
      next,
      `
      ....
      .PS.
      ....
    `
    );
  });

  it('does not move past the grid boundary (FR-016)', () => {
    const state = caveFromLines(['P.']);
    const next = runTicks(state, 1, ['left']);
    expectAscii(next, ['P.']);
  });

  it('does not move on a tick with no input (FR-017)', () => {
    const state = caveFromLines(`
      ...
      .P.
      ...
    `);
    const next = runTicks(state, 1, [undefined]);
    expectAscii(
      next,
      `
      ...
      .P.
      ...
    `
    );
  });

  it('advances one cell per tick over a sustained same-direction run, standing in for a held key (FR-021)', () => {
    const state = caveFromLines(`
      .......
      .P.....
      .......
    `);
    const next = runTicks(state, 3, ['right', 'right', 'right']);
    expectAscii(
      next,
      `
      .......
      ....P..
      .......
    `
    );
  });

  it('is blocked from moving into an amoeba cell, and unharmed by adjacency or a blocked attempt (FR-002, FR-041)', () => {
    // Feature 004 gives amoeba real behavior — this test now pins that the
    // kid is blocked by it exactly like a wall, never harmed by touching it.
    const state = caveFromLines(`
      ....
      .PA.
      ....
    `);
    const next = runTicks(state, 2, [undefined, 'right']);
    expect(getPlayerPosition(next)).toEqual({ x: 1, y: 1 });
    expect(getStatus(next)).toBe('inPlay');
  });

  it('works on a cave whose dimensions differ from the starter cave, proving no size is hardcoded (FR-036)', () => {
    const state = caveFromLines(`
      SSSSS
      S.P.S
      S...S
      SSSSS
    `);
    const next = runTicks(state, 1, ['down']);
    expectAscii(
      next,
      `
      SSSSS
      S...S
      S.P.S
      SSSSS
    `
    );
  });
});
