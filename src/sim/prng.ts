// A small deterministic PRNG (mulberry32) owned entirely by the sim (FR-008,
// FR-009). No Math.random anywhere in src/sim/ — every random draw here is a
// pure function of the previous state, so a cave plus a recorded input
// sequence always replays identically (FR-010).
export type PrngState = number; // uint32

export function seedPrng(seed: number): PrngState {
  return seed >>> 0;
}

// Advances the generator and returns the new state plus a float in [0, 1).
export function nextPrng(state: PrngState): { state: PrngState; value: number } {
  let t = (state + 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t = (t + Math.imul(t ^ (t >>> 7), t | 61)) ^ t;
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { state: t >>> 0, value };
}
