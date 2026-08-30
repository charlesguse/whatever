import { describe, expect, it } from 'vitest';
import { asciiFromState } from '../../src/sim/ascii';
import { getEnemyFacing, getStatus } from '../../src/sim/cave';
import { caveFromLines, expectAscii, runTicks } from './helpers/ascii-cave';

// A ring-shaped patrol loop, walled on the outside and around a single
// interior pillar, with an isolated player nook (columns 5-6) that never
// touches the ring so contact detonation never fires in these tests.
const RING_CAVE = `
  SSSSSSS
  S...SSS
  S.S.SPS
  S...SSS
  SSSSSSS
`;

function ringCaveWith(enemyChar: string, x: number, y: number): string {
  const lines = RING_CAVE.trim().split('\n').map((l) => l.trim());
  const row = lines[y];
  lines[y] = row.slice(0, x) + enemyChar + row.slice(x + 1);
  return lines.join('\n');
}

describe('enemy patrol (FR-001–FR-009)', () => {
  it('a firefly completes a full circuit of a rectangular loop and returns to its start (SC-001)', () => {
    const cave = ringCaveWith('F', 1, 1);
    const state = caveFromLines(cave);
    const afterOneLoop = runTicks(state, 16); // 8 steps, 2 ticks per step
    expect(getEnemyFacing(afterOneLoop, 1, 1)).toBe('left');
    expectAscii(afterOneLoop, cave);
  });

  it('a butterfly completes a full circuit of the same loop, mirrored (right-turn preference)', () => {
    const cave = ringCaveWith('Y', 3, 1);
    const state = caveFromLines(cave);
    const afterOneLoop = runTicks(state, 24); // 12 steps (extra turn-in-place at each corner)
    expect(getEnemyFacing(afterOneLoop, 3, 1)).toBe('left');
    expectAscii(afterOneLoop, cave);
  });

  it('steps at a cadence of one step per two ticks, checked at ticks 1, 2, and 3 (FR-002, SC-002)', () => {
    const cave = ringCaveWith('F', 1, 1);
    const state = caveFromLines(cave);

    const afterTick1 = runTicks(state, 1);
    expect(getEnemyFacing(afterTick1, 1, 2)).toBe('down'); // preferred-turn move
    expectAscii(
      afterTick1,
      `
        SSSSSSS
        S...SSS
        SFS.SPS
        S...SSS
        SSSSSSS
      `
    );

    const afterTick2 = runTicks(state, 2);
    expect(asciiFromState(afterTick2)).toBe(asciiFromState(afterTick1)); // no step on an even tick — unchanged

    const afterTick3 = runTicks(state, 3);
    expect(getEnemyFacing(afterTick3, 1, 3)).toBe('down'); // straight-ahead move
    expectAscii(
      afterTick3,
      `
        SSSSSSS
        S...SSS
        S.S.SPS
        SF..SSS
        SSSSSSS
      `
    );
  });

  it('a butterfly takes a preferred-turn move when its right-turn side is open', () => {
    const state = caveFromLines(`
      S.SS
      SYSS
      SSPS
      SSSS
    `);
    const next = runTicks(state, 1);
    expect(getEnemyFacing(next, 1, 0)).toBe('up');
    expectAscii(
      next,
      `
        SYSS
        S.SS
        SSPS
        SSSS
      `
    );
  });

  it('an enemy blocked on every side turns in place without ever moving (FR-006)', () => {
    const cave = `
      SSSS
      SFSS
      SSPS
      SSSS
    `;
    const state = caveFromLines(cave);
    const next = runTicks(state, 25);
    expect(getStatus(next)).toBe('inPlay');
    expectAscii(next, cave);
  });

  it('an enemy never enters dirt, a body, the classroom door, or another enemy (FR-006, FR-007)', () => {
    const cave = `
      SSSSSS
      SS#SSS
      SXFYSS
      SSoSSS
      SSSSPS
    `;
    const state = caveFromLines(cave);
    const next = runTicks(state, 9);
    expect(getStatus(next)).toBe('inPlay');
    expectAscii(next, cave);
  });

  it('never detonates on diagonal-only adjacency to the kid', () => {
    const cave = `
      SSSSS
      SFSSS
      SSPSS
      SSSSS
    `;
    const state = caveFromLines(cave);
    const next = runTicks(state, 20);
    expect(getStatus(next)).toBe('inPlay');
  });
});
