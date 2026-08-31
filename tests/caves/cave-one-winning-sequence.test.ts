import { describe, expect, it } from 'vitest';
import { cave01 } from '../../src/caves/cave-01-dig-and-collect';
import { getCollected, getStatus, parseCave } from '../../src/sim/cave';
import { runTicks, type TickInputLike } from '../sim/helpers/ascii-cave';

// FR-036, SC-011: a recorded input sequence that takes cave one from tick
// zero all the way to 'completed' — quota met, then walking into the open
// door. Player starts at (2, 2); stars sit at (5, 2), (9, 3), (3, 5),
// (12, 5), and (7, 7); quota is 4, so the run below collects the first four
// (skipping the star at (7, 7)) and walks to the door at (14, 8).
const SEQUENCE: readonly TickInputLike[] = [
  // (2,2) -> (5,2): collects star 1.
  'right',
  'right',
  'right',
  // (5,2) -> (9,2)
  'right',
  'right',
  'right',
  'right',
  // (9,2) -> (9,3): collects star 2.
  'down',
  // (9,3) -> (9,5)
  'down',
  'down',
  // (9,5) -> (3,5): collects star 3.
  'left',
  'left',
  'left',
  'left',
  'left',
  'left',
  // (3,5) -> (12,5): collects star 4 (quota met).
  'right',
  'right',
  'right',
  'right',
  'right',
  'right',
  'right',
  'right',
  'right',
  // (12,5) -> (14,5)
  'right',
  'right',
  // (14,5) -> (14,8): the open door.
  'down',
  'down',
  'down',
];

describe('cave one winning sequence (FR-036)', () => {
  it('reaches status "completed" after meeting quota and walking into the door', () => {
    const initial = parseCave(cave01);
    const final = runTicks(initial, SEQUENCE.length, SEQUENCE);

    expect(getCollected(final)).toBeGreaterThanOrEqual(cave01.quota);
    expect(getStatus(final)).toBe('completed');
  });
});
