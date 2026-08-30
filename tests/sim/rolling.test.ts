import { describe, it } from 'vitest';
import { caveFromLines, expectAscii, runTicks } from './helpers/ascii-cave';

// Every cave below parks the kid (P) in a corner well clear of the rolling
// column under test, since parseCave requires exactly one player character;
// the kid never moves (no input) and stays put throughout.

describe('rolling (FR-007–FR-009)', () => {
  it('rolls off another body when both the side and its diagonal-below are empty', () => {
    const state = caveFromLines(`
      SSSSSS
      SP.o.S
      S..o.S
      S..#.S
      SSSSSS
    `);
    const next = runTicks(state, 2);
    expectAscii(
      next,
      `
      SSSSSS
      SP...S
      S.oo.S
      S..#.S
      SSSSSS
    `
    );
  });

  it('rolls off a brick wall', () => {
    const state = caveFromLines(`
      SSSSSS
      SP.o.S
      S..B.S
      S....S
      SSSSSS
    `);
    // Tick 1: rolls sideways off the brick wall (same row). Tick 2: falls
    // one cell now that it's clear of the brick wall.
    const next = runTicks(state, 2);
    expectAscii(
      next,
      `
      SSSSSS
      SP...S
      S.oB.S
      S....S
      SSSSSS
    `
    );
  });

  it('does not roll off a steel wall', () => {
    const state = caveFromLines(`
      SSSSSS
      SP.o.S
      S..S.S
      S....S
      SSSSSS
    `);
    const next = runTicks(state, 3);
    expectAscii(
      next,
      `
      SSSSSS
      SP.o.S
      S..S.S
      S....S
      SSSSSS
    `
    );
  });

  it('does not roll off dirt', () => {
    const state = caveFromLines(`
      SSSSSS
      SP.o.S
      S..#.S
      S....S
      SSSSSS
    `);
    const next = runTicks(state, 3);
    expectAscii(
      next,
      `
      SSSSSS
      SP.o.S
      S..#.S
      S....S
      SSSSSS
    `
    );
  });

  it('does not roll when the diagonal-below is occupied even though the side is empty', () => {
    // Right side is blocked trivially (a wall directly beside the boulder);
    // left side is empty, but its diagonal-below is occupied — isolating
    // the diagonal-below check as the reason neither roll happens.
    const state = caveFromLines(`
      SSSSSSS
      SP.oS.S
      SSSBS.S
      SS....S
      SSSSSSS
    `);
    const next = runTicks(state, 3);
    expectAscii(
      next,
      `
      SSSSSSS
      SP.oS.S
      SSSBS.S
      SS....S
      SSSSSSS
    `
    );
  });

  it('prefers rolling left when both sides qualify', () => {
    const state = caveFromLines(`
      SSSSSS
      SP.o.S
      S..B.S
      S....S
      SSSSSS
    `);
    // After the leftward roll (tick 1), only the left cell is occupied
    // (by the boulder's new resting-in-progress position); the right cell
    // stays empty, confirming left was chosen over right.
    const next = runTicks(state, 1);
    expectAscii(
      next,
      `
      SSSSSS
      SPo..S
      S..B.S
      S....S
      SSSSSS
    `
    );
  });
});
