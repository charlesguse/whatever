import { describe, expect, it } from 'vitest';
import { nextPendingTime, STALL_BOUNDARY_TICK_INTERVALS } from '../../../src/lib/loop/stall';

const TICK_INTERVAL_MS = 125;
const BOUNDARY_MS = TICK_INTERVAL_MS * STALL_BOUNDARY_TICK_INTERVALS;

describe('nextPendingTime (FR-001, FR-002, FR-006, FR-007)', () => {
  it('carries a normal frame well under the boundary unchanged (FR-006)', () => {
    expect(nextPendingTime(0, 16.7, TICK_INTERVAL_MS)).toBeCloseTo(16.7);
  });

  it('carries a brief stutter at/under the boundary, to be spent as ticks (FR-006)', () => {
    expect(nextPendingTime(100, 50, TICK_INTERVAL_MS)).toBe(150);
  });

  it('carries pending time exactly at the boundary in full, spending two ticks, not one (FR-002, FR-017)', () => {
    const result = nextPendingTime(100, 150, TICK_INTERVAL_MS);
    expect(result).toBe(BOUNDARY_MS);
    expect(Math.floor(result / TICK_INTERVAL_MS)).toBe(2);
  });

  it('drops pending time one unit past the boundary to zero (FR-001, FR-005)', () => {
    expect(nextPendingTime(100, 151, TICK_INTERVAL_MS)).toBe(0);
  });

  it('drops a long stall to the same zero as a short one — tick count does not grow with stall length (FR-005, SC-003)', () => {
    expect(nextPendingTime(0, 10000, TICK_INTERVAL_MS)).toBe(0);
  });

  it('carries a zero gap unchanged', () => {
    expect(nextPendingTime(0, 0, TICK_INTERVAL_MS)).toBe(0);
  });

  it('never subtracts and never goes below zero for a clock jump backward (FR-007)', () => {
    expect(nextPendingTime(0, -40, TICK_INTERVAL_MS)).toBe(0);
  });

  it('returns a finite, non-negative result for a non-finite elapsed value (FR-007)', () => {
    expect(nextPendingTime(0, NaN, TICK_INTERVAL_MS)).toBe(0);
    expect(nextPendingTime(0, Infinity, TICK_INTERVAL_MS)).toBe(0);
  });

  it('sanitizes a negative pendingTime to zero before combining (FR-007)', () => {
    expect(nextPendingTime(-5, 10, TICK_INTERVAL_MS)).toBe(10);
  });
});
