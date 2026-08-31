// Pure, total functions over plain numbers (FR-017, FR-019, FR-020) — no
// SessionState, no sim import (contracts/session-api.md).

// preCollected is the collected count *before* the collection that triggers
// this call, so the star that first raises collected to meet quota scores
// 10, not 15 — the boundary-star reading (research.md).
export function starValue(preCollected: number, quota: number): 10 | 15 {
  return preCollected >= quota ? 15 : 10;
}

// Identity: one point per second remaining, 0 seconds -> 0 bonus.
export function bonusFor(remainingSeconds: number): number {
  return remainingSeconds;
}
