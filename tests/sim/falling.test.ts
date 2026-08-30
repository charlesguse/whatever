import { describe, it } from 'vitest';
import { caveFromLines, expectAscii, runTicks } from './helpers/ascii-cave';

// Every cave below parks the kid (P) in a corner well clear of the falling
// column under test, since parseCave requires exactly one player character;
// the kid never moves (no input) and stays put throughout.

describe('falling (FR-001–FR-006)', () => {
  it('falls one cell when the cell below is empty', () => {
    const state = caveFromLines(`
      SSSSSS
      SP.o.S
      S....S
      SSSSSS
    `);
    const next = runTicks(state, 1);
    expectAscii(
      next,
      `
      SSSSSS
      SP...S
      S..o.S
      SSSSSS
    `
    );
  });

  it('continues falling over several ticks', () => {
    const state = caveFromLines(`
      SSSSSS
      SP.o.S
      S....S
      S....S
      S....S
      SSSSSS
    `);
    const next = runTicks(state, 3);
    expectAscii(
      next,
      `
      SSSSSS
      SP...S
      S....S
      S....S
      S..o.S
      SSSSSS
    `
    );
  });

  it('stops falling and rests on dirt', () => {
    const state = caveFromLines(`
      SSSSSS
      SP.o.S
      S..#.S
      SSSSSS
    `);
    const next = runTicks(state, 3);
    expectAscii(
      next,
      `
      SSSSSS
      SP.o.S
      S..#.S
      SSSSSS
    `
    );
  });

  it('stops falling and rests on a wall', () => {
    const state = caveFromLines(`
      SSSSSS
      SP.o.S
      SSSSSS
    `);
    const next = runTicks(state, 3);
    expectAscii(
      next,
      `
      SSSSSS
      SP.o.S
      SSSSSS
    `
    );
  });

  it('stops falling and rests on another body (no room to roll off either side)', () => {
    const state = caveFromLines(`
      SSSSSS
      SPSoSS
      SSS.SS
      SSSoSS
      SSSSSS
    `);
    const next = runTicks(state, 3);
    expectAscii(
      next,
      `
      SSSSSS
      SPS.SS
      SSSoSS
      SSSoSS
      SSSSSS
    `
    );
  });

  it('kills the kid when a falling body lands on them', () => {
    const state = caveFromLines(`
      SSSSS
      S.o.S
      S...S
      S.P.S
      SSSSS
    `);
    const next = runTicks(state, 2);
    expectAscii(
      next,
      `
      SSSSS
      S...S
      S...S
      S.o.S
      SSSSS
    `
    );
  });

  it('does not kill the kid when a resting body sits directly above them, over many ticks', () => {
    const state = caveFromLines(`
      SSSSS
      S.o.S
      S.P.S
      SSSSS
    `);
    const next = runTicks(state, 20);
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
});
