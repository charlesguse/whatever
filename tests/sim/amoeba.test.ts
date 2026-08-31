import { describe, expect, it } from 'vitest';
import { asciiFromState } from '../../src/sim/ascii';
import { getCell, getPlayerPosition, getStatus } from '../../src/sim/cave';
import { caveFromLines, expectAscii, runTicks } from './helpers/ascii-cave';

describe('amoeba growth (FR-004–FR-006, FR-005a)', () => {
  it('grows into dirt, one cell per tick, over a fixed tick count', () => {
    const state = caveFromLines(['SPA#####S'], { amoebaGrowthRate: 1 });
    const next = runTicks(state, 3);
    expectAscii(next, ['SPAAAA##S']);
  });

  it('grows into empty space, one cell per tick, over a fixed tick count', () => {
    const state = caveFromLines(['SPA.....S'], { amoebaGrowthRate: 1 });
    const next = runTicks(state, 3);
    expectAscii(next, ['SPAAAA..S']);
  });

  it('refuses to grow into a body, always growing into one of the remaining open sides instead', () => {
    const state = caveFromLines(
      ['SSSSS', 'S.o.S', 'S.A.S', 'SP..S', 'SSSSS'],
      { amoebaGrowthRate: 1 }
    );
    const next = runTicks(state, 1);
    expect(asciiFromState(next).split('\n')[1]).toBe('S.o.S');
  });

  it('refuses to grow into a brick wall', () => {
    const state = caveFromLines(
      ['SSSSS', 'S.B.S', 'S.A.S', 'SP..S', 'SSSSS'],
      { amoebaGrowthRate: 1 }
    );
    const next = runTicks(state, 1);
    expect(asciiFromState(next).split('\n')[1]).toBe('S.B.S');
  });

  it('refuses to grow into a steel wall', () => {
    const state = caveFromLines(
      ['SSSSS', 'S.S.S', 'S.A.S', 'SP..S', 'SSSSS'],
      { amoebaGrowthRate: 1 }
    );
    const next = runTicks(state, 1);
    expect(asciiFromState(next).split('\n')[1]).toBe('S.S.S');
  });

  it('refuses to grow into the door', () => {
    const state = caveFromLines(
      ['SSSSS', 'S.X.S', 'S.A.S', 'SP..S', 'SSSSS'],
      { amoebaGrowthRate: 1 }
    );
    const next = runTicks(state, 1);
    expect(asciiFromState(next).split('\n')[1]).toBe('S.X.S');
  });

  it('refuses to grow into the kid', () => {
    const state = caveFromLines(
      ['SSSSS', 'S.P.S', 'S.A.S', 'S...S', 'SSSSS'],
      { amoebaGrowthRate: 1 }
    );
    const next = runTicks(state, 1);
    expect(getPlayerPosition(next)).toEqual({ x: 2, y: 1 });
  });

  it('refuses to grow into an enemy', () => {
    const state = caveFromLines(
      ['SSSSS', 'SSFSS', 'S.A.S', 'SP..S', 'SSSSS'],
      { amoebaGrowthRate: 1 }
    );
    const next = runTicks(state, 1);
    expect(asciiFromState(next).split('\n')[1]).toBe('SSFSS');
  });

  it('refuses to grow into an explosion', () => {
    const state = caveFromLines(
      ['SSSSS', 'S.!.S', 'S.A.S', 'SP..S', 'SSSSS'],
      { amoebaGrowthRate: 1 }
    );
    const next = runTicks(state, 1);
    expect(asciiFromState(next).split('\n')[1]).toBe('S.!.S');
  });

  it('refuses to grow off the grid edge', () => {
    const state = caveFromLines(['.A.', 'P..'], { amoebaGrowthRate: 1 });
    const next = runTicks(state, 1);
    // Growth must land on one of the three in-bounds neighbors — never
    // off-grid, which would throw rather than silently no-op.
    expect(asciiFromState(next).split('\n')[0].length).toBe(3);
  });

  it('a larger set of amoeba cells grows more cells in one tick than a smaller one, at the same rate — probability is per cell, not per blob (FR-005)', () => {
    const width = 13;
    const blank = 'S' + '.'.repeat(width - 2) + 'S';
    const setChars = (row: string, updates: ReadonlyArray<readonly [number, string]>): string => {
      let chars = row.split('');
      for (const [i, ch] of updates) chars[i] = ch;
      return chars.join('');
    };

    const state = caveFromLines(
      [
        'S'.repeat(width),
        setChars(blank, [[1, 'P']]),
        setChars(blank, [[3, 'A']]),
        blank,
        setChars(blank, [[3, 'A'], [8, 'A']]),
        blank,
        setChars(blank, [[3, 'A']]),
        'S'.repeat(width),
      ],
      { amoebaGrowthRate: 1 }
    );
    const before = asciiFromState(state);
    const beforeCount = (before.match(/A/g) ?? []).length;
    expect(beforeCount).toBe(4); // 1 lone cell + 3-cell cluster

    const next = runTicks(state, 1);
    const after = asciiFromState(next);
    const afterCount = (after.match(/A/g) ?? []).length;

    // Each of the 4 isolated amoeba cells has ample open room, so at
    // growthRate 1 every one of them grows exactly once this tick — the
    // total new-cell count equals the starting cell count, proving growth
    // scales with cell count rather than being a single per-blob event.
    expect(afterCount - beforeCount).toBe(4);
  });

  it('draws an identical growth sequence across two runs of the same seed, and diverges across two different seeds', () => {
    // A room large enough that 20 ticks at this rate cannot fill it (which
    // would make every seed converge on the same fully-sealed grid).
    const width = 27;
    const height = 15;
    const blank = 'S' + '.'.repeat(width - 2) + 'S';
    const withPlayer = 'S' + 'P' + '.'.repeat(width - 3) + 'S';
    const amoebaX = Math.floor(width / 2);
    const withAmoeba = 'S' + '.'.repeat(amoebaX - 1) + 'A' + '.'.repeat(width - amoebaX - 2) + 'S';
    const amoebaY = Math.floor(height / 2);
    const cave: string[] = [];
    for (let y = 0; y < height; y++) {
      if (y === 0 || y === height - 1) cave.push('S'.repeat(width));
      else if (y === 1) cave.push(withPlayer);
      else if (y === amoebaY) cave.push(withAmoeba);
      else cave.push(blank);
    }
    const ticks = 20;

    let stateA = caveFromLines(cave, { seed: 5, amoebaGrowthRate: 0.3, amoebaSizeLimit: 1000 });
    let stateB = caveFromLines(cave, { seed: 5, amoebaGrowthRate: 0.3, amoebaSizeLimit: 1000 });
    for (let i = 0; i < ticks; i++) {
      stateA = runTicks(stateA, 1);
      stateB = runTicks(stateB, 1);
      expect(asciiFromState(stateA)).toBe(asciiFromState(stateB));
    }

    let stateC = caveFromLines(cave, { seed: 99, amoebaGrowthRate: 0.3, amoebaSizeLimit: 1000 });
    for (let i = 0; i < ticks; i++) {
      stateC = runTicks(stateC, 1);
    }
    expect(asciiFromState(stateC)).not.toBe(asciiFromState(stateA));
  });

  it('a fully enclosed amoeba cell still spends its growth draws — a later push resolves identically whether the amoeba had room to grow or not (FR-005a, research.md Decision 4)', () => {
    // Variant A: the amoeba is boxed in on all four sides (zero eligible
    // neighbors). Variant B: the amoeba has room to grow. Both take exactly
    // one attempt draw plus one direction draw on tick 1 (growthRate 1
    // guarantees the attempt succeeds in both cases), so the generator's
    // state after tick 1 is bit-for-bit identical either way, and the push
    // resolved on tick 2 lands on the same outcome in both variants.
    const boxedCave = ['SBoP..S', 'SSASSSS', 'SSSSSSS'];
    const openCave = ['SBoP..S', 'S.ASSSS', 'SSSSSSS'];

    const boxed = runTicks(
      caveFromLines(boxedCave, { seed: 7, amoebaGrowthRate: 1 }),
      2,
      [undefined, 'right']
    );
    const open = runTicks(
      caveFromLines(openCave, { seed: 7, amoebaGrowthRate: 1 }),
      2,
      [undefined, 'right']
    );

    // Compare only the push-relevant row, since the amoeba cell itself
    // legitimately differs (boxed converts to a diamond when sealed; open
    // does not) — the point being pinned is the push's outcome, not the
    // amoeba's own fate.
    const boxedPushRow = asciiFromState(boxed).split('\n')[0];
    const openPushRow = asciiFromState(open).split('\n')[0];
    expect(boxedPushRow).toBe(openPushRow);
  });
});

describe('amoeba collective conversion (FR-007–FR-010)', () => {
  it('an enclosed (sealed) amoeba turns entirely to diamonds on the tick it becomes sealed (FR-008)', () => {
    const state = caveFromLines(['SSSSS', 'S.P.S', 'SSASS', 'SSSSS'], {
      amoebaSizeLimit: 1000,
    });
    const next = runTicks(state, 1);
    expectAscii(next, ['SSSSS', 'S.P.S', 'SS*SS', 'SSSSS']);
  });

  it('an amoeba grown past its size limit turns entirely to boulders on the tick the limit is exceeded (FR-007)', () => {
    const state = caveFromLines(['SSSSSS', 'SPA..S', 'SSSSSS'], {
      amoebaGrowthRate: 1,
      amoebaSizeLimit: 1,
    });
    const next = runTicks(state, 1);
    expectAscii(next, ['SSSSSS', 'SPoo.S', 'SSSSSS']);
  });

  it('an amoeba that is over its limit and sealed on the same tick becomes boulders, not diamonds (FR-009 precedence)', () => {
    const state = caveFromLines(['SSSSS', 'SPA.S', 'SSSSS'], {
      amoebaGrowthRate: 1,
      amoebaSizeLimit: 1,
    });
    const next = runTicks(state, 1);
    expectAscii(next, ['SSSSS', 'SPooS', 'SSSSS']);
  });

  it('a boulder created by an amoeba conversion does not fall on the tick it appears, then falls normally afterwards (FR-009)', () => {
    const state = caveFromLines(['SSSSSS', 'SPA..S', 'S....S', 'SSSSSS'], {
      seed: 1,
      amoebaGrowthRate: 1,
      amoebaSizeLimit: 1,
    });
    const afterConversion = runTicks(state, 1);
    // Converted this same tick — must not have fallen yet.
    expect(asciiFromState(afterConversion).split('\n')[2]).toBe('S....S');
    const afterFalling = runTicks(afterConversion, 1);
    // Falls normally on the following tick.
    expectAscii(afterFalling, ['SSSSSS', 'SP...S', 'S.oo.S', 'SSSSSS']);
  });

  it('two disconnected amoeba pockets convert together as one collective (FR-003)', () => {
    const state = caveFromLines(['SSSSS', 'S.P.S', 'SSASS', 'SSSSS', 'SSASS', 'SSSSS'], {
      amoebaSizeLimit: 1,
    });
    const next = runTicks(state, 1);
    expectAscii(next, ['SSSSS', 'S.P.S', 'SSoSS', 'SSSSS', 'SSoSS', 'SSSSS']);
  });

  it('a cave with zero amoeba cells runs no growth pass and draws no randomness (FR-010)', () => {
    // Reuses pushing.test.ts's documented fact: seed 7's first draw
    // succeeds a push. If the amoeba passes consumed a draw even with zero
    // amoeba cells present, this push would instead see seed 7's second
    // draw (documented there as a failure) and this would fail.
    const state = caveFromLines('S.Po.S', { seed: 7 });
    const next = runTicks(state, 1, ['right']);
    expectAscii(next, ['S..PoS']);
  });
});

describe('amoeba detonation (FR-011, FR-012)', () => {
  it('a falling body detonates amoeba into empty space via the existing 3x3 blast', () => {
    const state = caveFromLines(['SSSSS', 'S.P.S', 'S.o.S', 'S...S', 'S.A.S', 'S...S', 'SSSSS']);
    // Tick 1: falls into the empty cell above the amoeba. Tick 2: falling
    // body reaches the amoeba and detonates. Ticks 3-4: the blast ages out.
    const next = runTicks(state, 4);
    expectAscii(next, ['SSSSS', 'S.P.S', 'S...S', 'S...S', 'S...S', 'S...S', 'SSSSS']);
  });

  it('a resting body above amoeba detonates nothing, over many ticks', () => {
    const state = caveFromLines([
      'SSSSSSSSSS',
      'S.P......S',
      'S..o.....S',
      'S..A.....S',
      'S........S',
      'S........S',
      'S........S',
      'SSSSSSSSSS',
    ]);
    const next = runTicks(state, 20);
    expect(getCell(next, 3, 2)).toBe('boulder');
    expect(getCell(next, 3, 3)).toBe('amoeba');
    expect(getStatus(next)).toBe('inPlay');
  });

  it('amoeba caught in an unrelated blast is destroyed like any other destructible content, without chaining (FR-012)', () => {
    const state = caveFromLines(['SSSSS', 'S.o.S', 'S...S', 'SAPAS', 'SSSSS']);
    // Tick 1: falls. Tick 2: crushes the kid, catching both flanking
    // amoeba cells in the same 3x3 blast. Ticks 3-4: the blast ages out.
    const next = runTicks(state, 4);
    expect(getStatus(next)).toBe('dead');
    expectAscii(next, ['SSSSS', 'S...S', 'S...S', 'S...S', 'SSSSS']);
    // No further blast appears on a fifth tick — the amoeba cells never
    // queued a chain link.
    const settled = runTicks(next, 1);
    expectAscii(settled, ['SSSSS', 'S...S', 'S...S', 'S...S', 'SSSSS']);
  });
});
