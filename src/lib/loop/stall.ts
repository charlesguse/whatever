// The tick loop's only bound on how much pending simulation time survives a
// frame gap (FR-001, FR-002, FR-008). Pending time above the boundary means
// the gap was a stall, not a stutter, and is dropped in full rather than
// spent as catch-up ticks.
export const STALL_BOUNDARY_TICK_INTERVALS = 2;

function sanitize(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function nextPendingTime(
  pendingTime: number,
  elapsed: number,
  tickIntervalMs: number
): number {
  const sum = sanitize(pendingTime) + sanitize(elapsed);
  const boundary = tickIntervalMs * STALL_BOUNDARY_TICK_INTERVALS;
  return sum > boundary ? 0 : sum;
}
