import { describe, expect, it } from 'vitest';
import { caveFromAscii } from '../../src/sim/ascii';
import { checkReachability } from '../../src/sim/reachability';

function def(rows: string[], quota: number) {
  return caveFromAscii({ name: 'reach', seed: 1, quota, rows });
}

describe('checkReachability (FR-035)', () => {
  it('counts stars reachable through empty/dirt/diamond/exit cells', () => {
    const result = checkReachability(def(['SSSSS', 'SP#*S', 'S...S', 'S..XS', 'SSSSS'], 1));
    expect(result.reachableStars).toBe(1);
    expect(result.attainable).toBe(true);
  });

  it('a star sealed behind a solid steel column, with no path around, is not counted', () => {
    const result = checkReachability(
      def(['SSSSSSSSS', 'SP...S*.S', 'S....S..S', 'S....S..S', 'SSSSSSSSS'], 1)
    );
    expect(result.reachableStars).toBe(0);
    expect(result.attainable).toBe(false);
  });

  it('a star sealed behind a solid brick-wall column (not diggable, unlike dirt) is not counted', () => {
    const result = checkReachability(
      def(['SSSSSSSSS', 'SP...B*.S', 'S....B..S', 'S....B..S', 'SSSSSSSSS'], 1)
    );
    expect(result.reachableStars).toBe(0);
  });

  it('a boulder does not block the fill from cells beyond it that are otherwise reachable', () => {
    // The boulder itself is a boundary, but the empty cell to its right,
    // reached the long way around, still counts.
    const result = checkReachability(def(['SSSSSS', 'SP...S', 'S.oS.S', 'S...*S', 'SSSSSS'], 1));
    expect(result.reachableStars).toBe(1);
  });

  it('a butterfly bordering the reachable region pays out 9 stars, counted once', () => {
    const result = checkReachability(def(['SSSSS', 'SP..S', 'S.Y.S', 'S...S', 'SSSSS'], 9));
    expect(result.reachableStars).toBe(9);
    expect(result.attainable).toBe(true);
  });

  it('a butterfly walled off entirely from the reachable region is not counted', () => {
    const result = checkReachability(
      def(['SSSSSSS', 'SP....S', 'S.SSS.S', 'S.SYS.S', 'S.SSS.S', 'S.....S', 'SSSSSSS'], 9)
    );
    expect(result.reachableStars).toBe(0);
    expect(result.attainable).toBe(false);
  });

  it('attainable is quota <= reachableStars', () => {
    const result = checkReachability(def(['SSSSS', 'SP**S', 'SSSSS'], 2));
    expect(result.reachableStars).toBe(2);
    expect(result.attainable).toBe(true);
    const overQuota = checkReachability(def(['SSSSS', 'SP**S', 'SSSSS'], 3));
    expect(overQuota.attainable).toBe(false);
  });
});
