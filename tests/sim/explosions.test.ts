import { describe, expect, it } from 'vitest';
import { getCell, getStatus, isExplosion } from '../../src/sim/cave';
import { caveFromLines, expectAscii, runTicks } from './helpers/ascii-cave';

const AROUND_3_3 = [
  [2, 2], [3, 2], [4, 2],
  [2, 3], [3, 3], [4, 3],
  [2, 4], [3, 4], [4, 4],
] as const;

// An open interior far from any wall, so the full 3x3 resolves with nothing
// spared — isolating FR-018's "what a blast leaves behind" from FR-017's
// wall/door sparing (covered separately in Phase 5). The kid stands
// orthogonally adjacent to the enemy so contact detonation (FR-010) fires on
// the very first tick, with no other trigger needed.

describe('blast content (FR-018, SC-005)', () => {
  it('a butterfly leaves exactly a 3x3 of gold stars', () => {
    const state = caveFromLines(`
      SSSSSSS
      S.....S
      S.....S
      S..Y..S
      S..P..S
      S.....S
      S.....S
      SSSSSSS
    `);
    const resolved = runTicks(state, 3); // stamp tick + 2-tick lifetime
    expect(getStatus(resolved)).toBe('dead'); // the kid was caught in this same blast
    expectAscii(
      resolved,
      `
        SSSSSSS
        S.....S
        S.***.S
        S.***.S
        S.***.S
        S.....S
        S.....S
        SSSSSSS
      `
    );
  });

  it('a firefly leaves exactly a 3x3 of empty space', () => {
    const state = caveFromLines(`
      SSSSSSS
      S.....S
      S.....S
      S..F..S
      S..P..S
      S.....S
      S.....S
      SSSSSSS
    `);
    const resolved = runTicks(state, 3);
    expect(getStatus(resolved)).toBe('dead');
    expectAscii(
      resolved,
      `
        SSSSSSS
        S.....S
        S.....S
        S.....S
        S.....S
        S.....S
        S.....S
        SSSSSSS
      `
    );
  });
});

describe('the blast spares steel walls and the door (FR-017)', () => {
  it('leaves a steel wall and the classroom door untouched while destroying dirt, brick, an eraser, and a gold star elsewhere in the 3x3', () => {
    const state = caveFromLines(`
      SSSSSSSSS
      S.......S
      S.......S
      S..SBX..S
      S..#F*..S
      S..oP...S
      S.......S
      S.......S
      SSSSSSSSS
    `);
    const resolved = runTicks(state, 3); // contact detonation fires on tick 1
    expect(getStatus(resolved)).toBe('dead'); // the kid was caught in this blast too
    expectAscii(
      resolved,
      `
        SSSSSSSSS
        S.......S
        S.......S
        S..S.X..S
        S.......S
        S.......S
        S.......S
        S.......S
        SSSSSSSSS
      `
    );
  });
});

describe('the blast clips at the grid boundary, with no wrap and no error (FR-016)', () => {
  it('clips at a corner', () => {
    const state = caveFromLines(['YP.', '...', '...'], { name: 'corner-clip' });
    let resolved: ReturnType<typeof runTicks> | undefined;
    expect(() => {
      resolved = runTicks(state, 3);
    }).not.toThrow();
    expectAscii(resolved!, ['**.', '**.', '...']);
  });

  it('clips at an edge', () => {
    const state = caveFromLines(['.YP', '...', '...'], { name: 'edge-clip' });
    let resolved: ReturnType<typeof runTicks> | undefined;
    expect(() => {
      resolved = runTicks(state, 3);
    }).not.toThrow();
    expectAscii(resolved!, ['***', '***', '...']);
  });
});

describe('explosion lifetime (FR-019, SC-007)', () => {
  it('a 3x3 stays an explosion for exactly 2 ticks and converts on the expected tick, all cells at once', () => {
    const state = caveFromLines(`
      SSSSSSS
      S.....S
      S.....S
      S..Y..S
      S..P..S
      S.....S
      S.....S
      SSSSSSS
    `);

    const afterStamp = runTicks(state, 1);
    for (const [x, y] of AROUND_3_3) expect(isExplosion(afterStamp, x, y)).toBe(true);

    const afterOneMoreTick = runTicks(state, 2);
    for (const [x, y] of AROUND_3_3) expect(isExplosion(afterOneMoreTick, x, y)).toBe(true);

    const afterConvert = runTicks(state, 3);
    for (const [x, y] of AROUND_3_3) expect(isExplosion(afterConvert, x, y)).toBe(false);
  });
});

describe('a gold star created by a blast does not move on its creation tick (FR-020)', () => {
  it('waits one tick before it starts falling', () => {
    // The butterfly is boxed left/right so it can't patrol away before the
    // falling eraser reaches it; the kid is far away and never caught. The
    // cell below the blast's bottom-center, (3,5), starts and stays empty
    // until the produced gold star at (3,4) begins to fall into it.
    const state = caveFromLines(`
      SSSSSSS
      S..o..S
      S.....S
      S.SYS.S
      S.....S
      S.....S
      S....PS
      SSSSSSS
    `);

    // tick1: eraser falls into (3,2). tick2: it detonates the butterfly,
    // stamping remaining=2. tick3: ages to remaining=1. tick4: ages to 0 and
    // converts — the creation tick this test pins.
    const afterConvert = runTicks(state, 4);
    expect(getCell(afterConvert, 3, 4)).toBe('diamond');
    expect(getCell(afterConvert, 3, 5)).toBe('empty'); // has not fallen yet

    const afterOneMoreTick = runTicks(state, 5);
    expect(getCell(afterOneMoreTick, 3, 4)).toBe('empty');
    expect(getCell(afterOneMoreTick, 3, 5)).toBe('diamond'); // now falling normally
  });
});

describe('an explosion cell blocks everything while it lasts (FR-021)', () => {
  it('blocks the kid from moving into it', () => {
    const state = caveFromLines(`
      SSSSSSS
      S..o..S
      SP....S
      S.SYS.S
      S.....S
      S.....S
      SSSSSSS
    `);

    const stamped = runTicks(state, 2); // eraser falls, then detonates the butterfly
    const afterBlockedMove = runTicks(stamped, 1, ['right']);
    expect(getStatus(afterBlockedMove)).toBe('inPlay'); // the kid was never caught in this blast
    expectAscii(
      afterBlockedMove,
      `
        SSSSSSS
        S.....S
        SP!!!.S
        S.S!S.S
        S.!!!.S
        S.....S
        SSSSSSS
      `
    );
  });
});
