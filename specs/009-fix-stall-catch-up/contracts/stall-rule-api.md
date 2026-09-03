# Stall Rule Contract: `src/lib/loop/stall.ts` (new)

This is the one file that encodes FR-001, FR-002, FR-002a, FR-003, FR-005,
FR-006, FR-007, and FR-008 — how much pending simulation time survives a
gap between frames. `App.svelte`'s `tickLoop` is the only caller; the sim
(`src/sim/**`) never sees this function or its inputs (FR-013).

```ts
export const STALL_BOUNDARY_TICK_INTERVALS = 2;

export function nextPendingTime(
  pendingTime: number,
  elapsed: number,
  tickIntervalMs: number
): number;
```

## `nextPendingTime` (FR-001, FR-002, FR-006, FR-007)

| pendingTime | elapsed | tickIntervalMs | boundary (ms) | result | why |
|---|---|---|---|---|---|
| `0` | `16.7` | `125` | `250` | `16.7` | normal frame, well under boundary — sum carried unchanged (FR-006) |
| `100` | `50` | `125` | `250` | `150` | brief stutter at/under boundary — carried and later spent as ticks (FR-006) |
| `100` | `150` | `125` | `250` | `250` | exactly at the boundary — carried in full, spends two ticks (FR-002, FR-017) |
| `100` | `151` | `125` | `250` | `0` | one ms past the boundary — a stall, dropped in full (FR-001, FR-005) |
| `0` | `10000` | `125` | `250` | `0` | a long stall (seconds) — same as a short stall past the boundary (FR-005, SC-003) |
| `0` | `-40` | `125` | `250` | `0` | clock jumps backward — never negative, never subtracts (FR-007, Edge Cases) |
| `0` | `NaN` | `125` | `250` | `0` | non-finite gap — total over its inputs (FR-007) |
| `0` | `Infinity` | `125` | `250` | `0` | unbounded gap — still finite, still zero, never drives an unbounded tick count (FR-007) |
| `-5` | `10` | `125` | `250` | `10` | a negative carried-forward value (should never occur from the one call site, but the function does not trust it) is treated as `0` before combining |

Implementation shape: sanitize both `pendingTime` and `elapsed` to `0` if
either is non-finite or negative, sum them, and return `0` if the sum is
strictly greater than `tickIntervalMs * STALL_BOUNDARY_TICK_INTERVALS`,
otherwise return the sum unchanged. The boundary is *never* a hard-coded
millisecond literal inside this file (FR-002) — it is always
`tickIntervalMs * STALL_BOUNDARY_TICK_INTERVALS`, computed from the
caller-supplied tick interval.

The boundary is stated in one direction only: **strictly greater than**
drops, **at or below** carries (Edge Cases — "A stall that ends exactly at
the boundary"). This is why the boundary-itself row above returns the full
sum, not zero.

## The call-site rule this contract depends on (research.md Decision 4)

`tickLoop` calls this function once per `requestAnimationFrame` callback in
place of the old clamp, and the old bound is deleted — not left alongside
the new one (FR-008: exactly one rule):

```ts
// CORRECT — the only bound on pending time is nextPendingTime:
accumulator = nextPendingTime(accumulator, elapsed, TICK_INTERVAL_MS);
while (accumulator >= TICK_INTERVAL_MS) {
  stepTick();
  accumulator -= TICK_INTERVAL_MS;
}

// WRONG — a second, independently stated bound can silently diverge from
// the first the next time either one is edited (FR-008):
accumulator = Math.min(nextPendingTime(accumulator, elapsed, TICK_INTERVAL_MS), MAX_ACCUMULATED_MS);
```

`stepTick()` itself, the `while` loop's shape, and everything it calls
(sound derivation, voice cap, session/sim advancement) are unchanged — this
contract governs only the value fed into the `while` loop's condition, not
what happens inside it (FR-009 through FR-013).

## What is explicitly NOT part of this contract

- Whether a given frame "was a stall" as a named boolean — no such flag is
  produced or consumed anywhere (see data-model.md's Stall entity note).
  The caller only ever branches on the numeric return value.
- Anything about *why* elapsed time was large — no page-visibility, focus,
  or `document.hidden` read appears in this file or is passed into this
  function, by design (FR-003).
- Sound event derivation, voice capping, or muting — untouched, in
  `src/lib/audio/events.ts` and `src/lib/audio/priority.ts` (FR-009,
  FR-010).
- A per-frame cap on the number of ticks run — FR-020 explicitly forbids
  adding one; the `while` loop's own condition is unchanged by this
  feature.
