import { describe, it } from 'vitest';
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

  it('leaves an inert element (firefly) unchanged and does not throw (FR-003)', () => {
    // boulder/diamond graduated from inert to behavioral in feature 002
    // (data-model.md Element) — firefly stays genuinely inert, so it's the
    // element this pinning test now exercises.
    const state = caveFromLines(`
      ....
      .P.F
      ....
    `);
    const next = runTicks(state, 2, ['right', 'down']);
    expectAscii(
      next,
      `
      ....
      ...F
      ..P.
    `
    );
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
