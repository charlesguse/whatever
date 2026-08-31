import { describe, expect, it } from 'vitest';
import { bonusFor, starValue } from '../../../src/lib/session/scoring';

describe('starValue (FR-017)', () => {
  it('is worth 10 below the quota', () => {
    expect(starValue(0, 5)).toBe(10);
    expect(starValue(3, 5)).toBe(10);
  });

  it('is worth 15 at or above the quota', () => {
    expect(starValue(5, 5)).toBe(15);
    expect(starValue(9, 5)).toBe(15);
  });

  it('scores the boundary star — the one that first meets the quota — at the pre-quota value', () => {
    // preCollected === quota - 1: this collection is the one that first
    // raises collected to meet quota, and still reads the pre-collection
    // count, so it scores 10, not 15.
    expect(starValue(4, 5)).toBe(10);
  });
});

describe('bonusFor (FR-019, spec Edge Cases)', () => {
  it('is the identity — one point per second remaining', () => {
    expect(bonusFor(1)).toBe(1);
    expect(bonusFor(42)).toBe(42);
  });

  it('is zero when zero seconds remain', () => {
    expect(bonusFor(0)).toBe(0);
  });
});
