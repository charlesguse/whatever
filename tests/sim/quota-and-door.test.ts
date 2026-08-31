import { describe, expect, it } from 'vitest';
import { caveFromAscii } from '../../src/sim/ascii';
import { getCollected, getStatus, isDoorOpen, parseCave } from '../../src/sim/cave';
import { caveFromLines, expectAscii, runTicks } from './helpers/ascii-cave';

describe('quota and door (FR-017–FR-018, FR-022–FR-027)', () => {
  it('collecting a gold star by walking into it increases the count by exactly one', () => {
    const state = caveFromLines('S.P*.S', { quota: 1 });
    const next = runTicks(state, 1, ['right']);
    expect(getCollected(next)).toBe(1);
  });

  it('the door is solid and behaves exactly like a wall below quota', () => {
    // The diamond sits off the kid's path (row 1), so it stays uncollected
    // while the kid walks toward the door along row 0.
    const state = caveFromLines(
      `
      SS.P.XS
      S..*..S
    `,
      { quota: 1 }
    );
    const next = runTicks(state, 2, ['right', 'right']);
    expect(getStatus(next)).toBe('inPlay');
    expectAscii(
      next,
      `
      SS..PXS
      S..*..S
    `
    );
  });

  it('the door becomes enterable once the quota is met', () => {
    const state = caveFromLines('S.P*XS', { quota: 1 });
    const afterCollect = runTicks(state, 1, ['right']);
    expect(getCollected(afterCollect)).toBe(1);
    const afterEnter = runTicks(afterCollect, 1, ['right']);
    expect(getStatus(afterEnter)).toBe('completed');
  });

  it('entering the open door completes the cave', () => {
    const state = caveFromLines('S.P*XS', { quota: 1 });
    const next = runTicks(state, 2, ['right', 'right']);
    expect(getStatus(next)).toBe('completed');
    expectAscii(next, ['S...PS']);
  });

  it('rejects a cave whose quota exceeds its diamond count, naming the cave and both numbers', () => {
    const def = caveFromAscii({
      name: 'Room 9',
      seed: 1,
      quota: 3,
      rows: ['S.P*.S'],
    });
    expect(() => parseCave(def)).toThrowError(/Room 9/);
    expect(() => parseCave(def)).toThrowError(/quota 3/);
    expect(() => parseCave(def)).toThrowError(/1 diamond/);
  });

  it('a quota of zero leaves the door open from tick zero', () => {
    const state = caveFromLines('S.P.XS', { quota: 0 });
    const next = runTicks(state, 2, ['right', 'right']);
    expect(getStatus(next)).toBe('completed');
  });

  it('a gold star produced by a blast is collectible and counts toward quota, opening the door (FR-018, SC-009)', () => {
    // The butterfly is boxed on three sides so it can't patrol away before
    // the falling eraser reaches it; the kid waits clear of the blast, then
    // walks around to one of the resulting gold stars once it has resolved.
    const state = caveFromLines(
      `
      SSSSSSS
      S..o..S
      S.....S
      S.SYS.S
      S.SSS.S
      S.....S
      S....PS
      SSSSSSS
    `,
      { quota: 1 }
    );

    const resolved = runTicks(state, 4); // fall, stamp, then the 2-tick lifetime
    expect(isDoorOpen(resolved)).toBe(false);

    const collected = runTicks(resolved, 5, ['up', 'up', 'up', 'up', 'left']);
    expect(getCollected(collected)).toBe(1);
    expect(isDoorOpen(collected)).toBe(true);
  });

  it('a diamond produced by a magic-wall conversion counts toward quota once collected, opening the door (FR-022)', () => {
    // The decoy diamond at (4,2) satisfies the quota-vs-diamonds-on-the-grid
    // validation without ever being reachable from the player's path — the
    // door only opens once the wall-produced diamond is actually collected.
    const state = caveFromLines(
      ['SSSSSS', 'S.o..S', 'S...*S', 'S.M..S', 'SP...S', 'SSSSSS'],
      { quota: 1 }
    );
    const beforeCollect = runTicks(state, 3); // fall, convert+emerge, rest
    expect(isDoorOpen(beforeCollect)).toBe(false);

    const collected = runTicks(beforeCollect, 1, ['right']);
    expect(getCollected(collected)).toBe(1);
    expect(isDoorOpen(collected)).toBe(true);
  });
});
