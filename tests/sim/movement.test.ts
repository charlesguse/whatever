import { describe, expect, it } from 'vitest';
import { getMagicWallPhase, getPlayerPosition, getStatus } from '../../src/sim/cave';
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

  it('is blocked by a magic wall cell in each of its three phases — dormant, active, and dead (FR-014)', () => {
    // The player sits directly right of the wall the whole run; a separate
    // boulder falls into the wall to drive it through its phases while the
    // player repeatedly presses toward the (always-blocking) wall cell.
    let next = caveFromLines(
      ['SSSSS', 'S.o.S', 'S...S', 'S.MPS', 'S...S', 'SSSSS'],
      { magicWallDuration: 2 }
    );
    // Tick 1: boulder falls one row; wall still dormant — blocked.
    next = runTicks(next, 1, ['left']);
    expect(getPlayerPosition(next)).toEqual({ x: 3, y: 3 });
    expect(getMagicWallPhase(next)).toBe('dormant');
    // Tick 2: boulder enters and activates the wall this same tick — blocked.
    next = runTicks(next, 1, ['left']);
    expect(getPlayerPosition(next)).toEqual({ x: 3, y: 3 });
    expect(getMagicWallPhase(next)).toBe('active');
    // Tick 3: still active (duration 2 covers this tick too) — blocked.
    next = runTicks(next, 1, ['left']);
    expect(getPlayerPosition(next)).toEqual({ x: 3, y: 3 });
    expect(getMagicWallPhase(next)).toBe('active');
    // Tick 4: countdown reaches zero before the scan — dead — still blocked.
    next = runTicks(next, 1, ['left']);
    expect(getPlayerPosition(next)).toEqual({ x: 3, y: 3 });
    expect(getMagicWallPhase(next)).toBe('dead');
  });

  it('is blocked from moving into an expanding wall cell (FR-023)', () => {
    const state = caveFromLines('S.PE.S');
    const next = runTicks(state, 1, ['right']);
    expect(getPlayerPosition(next)).toEqual({ x: 2, y: 0 });
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
