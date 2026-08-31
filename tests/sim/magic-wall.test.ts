import { describe, expect, it } from 'vitest';
import { getMagicWallPhase } from '../../src/sim/cave';
import { caveFromLines, expectAscii, runTicks } from './helpers/ascii-cave';

describe('magic wall conversion and activation (FR-016–FR-018)', () => {
  it('a dormant wall activates on the first falling boulder, converting it to a diamond that emerges below the wall', () => {
    const state = caveFromLines(['SSSSS', 'S.o.S', 'SP..S', 'S.M.S', 'S...S', 'SSSSS']);
    const next = runTicks(state, 2); // tick1: falls; tick2: enters, converts
    expect(getMagicWallPhase(next)).toBe('active');
    expectAscii(next, ['SSSSS', 'S...S', 'SP..S', 'S.M.S', 'S.*.S', 'SSSSS']);
  });

  it('a falling diamond converts to a boulder, continuing to fall', () => {
    const state = caveFromLines(['SSSSS', 'S.*.S', 'SP..S', 'S.M.S', 'S...S', 'SSSSS']);
    const next = runTicks(state, 2);
    expect(getMagicWallPhase(next)).toBe('active');
    expectAscii(next, ['SSSSS', 'S...S', 'SP..S', 'S.M.S', 'S.o.S', 'SSSSS']);
  });

  it('a wall two cells thick emerges the body below the whole unbroken run', () => {
    const state = caveFromLines([
      'SSSSS',
      'S.o.S',
      'SP..S',
      'S.M.S',
      'S.M.S',
      'S...S',
      'SSSSS',
    ]);
    const next = runTicks(state, 2);
    expectAscii(next, [
      'SSSSS',
      'S...S',
      'SP..S',
      'S.M.S',
      'S.M.S',
      'S.*.S',
      'SSSSS',
    ]);
  });

  it('two bodies convert on the same tick in different columns, each resolved in fixed scan order', () => {
    const state = caveFromLines([
      'SSSSSSS',
      'S.o.o.S',
      'SP....S',
      'S.M.M.S',
      'S.....S',
      'SSSSSSS',
    ]);
    const next = runTicks(state, 2);
    expectAscii(next, [
      'SSSSSSS',
      'S.....S',
      'SP....S',
      'S.M.M.S',
      'S.*.*.S',
      'SSSSSSS',
    ]);
  });
});

describe('magic wall expiry and blocking (FR-019, FR-020, FR-018a)', () => {
  it('expires on the documented tick and the next body falling in stops on top of it unchanged, sharing one cave-wide countdown', () => {
    // Column A (x=2) activates the wall and converts on tick 2, spending the
    // duration-1 countdown; column B (x=4) is engineered to reach its own
    // wall cell exactly on tick 3, by which point the (shared, cave-wide)
    // countdown has already reached zero — it stops on top, unconverted.
    const state = caveFromLines(
      [
        'SSSSSSS',
        'S.o.o.S',
        'SP....S',
        'S.M...S',
        'S...M.S',
        'S.....S',
        'SSSSSSS',
      ],
      { magicWallDuration: 1 }
    );
    const next = runTicks(state, 3);
    expect(getMagicWallPhase(next)).toBe('dead');
    expectAscii(next, [
      'SSSSSSS',
      'S.....S',
      'SP....S',
      'S.M.o.S',
      'S...M.S',
      'S.*...S',
      'SSSSSSS',
    ]);
  });

  it('a wall that is never triggered behaves as solid wall for a long run', () => {
    const state = caveFromLines(['SSSSS', 'S.P.S', 'S.M.S', 'SSSSS']);
    const next = runTicks(state, 50);
    expect(getMagicWallPhase(next)).toBe('dormant');
    expectAscii(next, ['SSSSS', 'S.P.S', 'S.M.S', 'SSSSS']);
  });

  it('destroys a body with nothing emerging when the destination cell is occupied, but still activates and keeps the countdown running (FR-018a)', () => {
    const state = caveFromLines(['SSSSS', 'S.o.S', 'SP..S', 'S.M.S', 'S.o.S', 'SSSSS']);
    const next = runTicks(state, 2);
    expect(getMagicWallPhase(next)).toBe('active');
    expectAscii(next, ['SSSSS', 'S...S', 'SP..S', 'S.M.S', 'S.o.S', 'SSSSS']);
  });

  it('destroys a body with nothing emerging when the wall sits on the bottom row (off-grid destination) (FR-018a)', () => {
    const state = caveFromLines(['SSSSS', 'S.o.S', 'SP..S', 'S.M.S']);
    const next = runTicks(state, 2);
    expect(getMagicWallPhase(next)).toBe('active');
    expectAscii(next, ['SSSSS', 'S...S', 'SP..S', 'S.M.S']);
  });
});
