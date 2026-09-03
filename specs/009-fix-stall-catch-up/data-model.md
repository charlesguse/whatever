# Phase 1 Data Model: Drop The Tick Backlog On A Stall

This feature adds no persisted state, no session field, no sim entity, and
no theme field (spec Assumptions: "No new persisted state, no new input, no
new theme field"). Its only "data" is the three plain numbers that flow
through the new pure function and the one constant that names the rule's
threshold. They are documented here because the spec's Key Entities section
calls them out explicitly, not because they are stored anywhere.

## Entities

### Pending simulation time

- **Type**: `number` (milliseconds)
- **Meaning**: simulated time owed but not yet spent as ticks, carried from
  frame to frame. In code today this is `App.svelte`'s local `accumulator`
  variable; this feature changes how it is updated each frame, not what it
  represents or where it lives.
- **Invariants**:
  - Always finite and non-negative after `nextPendingTime` runs, for any
    input (FR-007).
  - At or below the stall boundary: equals `pendingTime + elapsed` exactly
    (FR-006 — byte-identical to today's `Math.min` result whenever the sum
    is under the old five-tick clamp and at or under the new two-tick
    boundary; the two rules only diverge above two tick intervals).
  - Above the stall boundary: exactly `0` (FR-001, FR-005) — a stall drops
    the entire backlog, not part of it.
- **Lifecycle**: reset implicitly to `0` at loop start (`accumulator = 0`
  module-level initializer, unchanged by this feature); updated once per
  `requestAnimationFrame` callback; decremented by `TICK_INTERVAL_MS` once
  per `stepTick()` call inside `tickLoop`'s existing `while` loop (also
  unchanged).

### Stall

- **Type**: not a stored value — a derived condition, true for exactly one
  frame each time it occurs.
- **Meaning**: a frame whose pending simulation time (carried-forward time
  plus the elapsed gap since the previous frame) exceeds the stall
  boundary. `nextPendingTime` does not return a boolean "was this a stall"
  flag — FR-001 through FR-008 only ever talk about the *pending time that
  survives*, and the caller (`tickLoop`) never needs to branch on "was this
  a stall," only on the returned number. No stall flag is modeled.
- **Cause-agnostic**: derived from elapsed time alone (FR-003) — carries no
  information about *why* the gap was long (hidden tab, sleep/wake, GC
  pause, debugger). The data model has no field for cause because the rule
  has no branch on cause.

### Stall boundary

- **Type**: `number`, a count of tick intervals (dimensionless multiplier
  on `tickIntervalMs`), not a millisecond constant.
- **Value**: `2` (`STALL_BOUNDARY_TICK_INTERVALS`, exported from
  `src/lib/loop/stall.ts`), confirmed by the requester on issue #26 — see
  research.md and the spec's Assumptions section for the derivation.
- **Relationship**: the boundary in milliseconds is always
  `tickIntervalMs * STALL_BOUNDARY_TICK_INTERVALS`, computed inside
  `nextPendingTime` from the `tickIntervalMs` parameter the caller passes
  in — never stored or hard-coded independently of the tick rate (FR-002).

## Function contract (summary — full contract in `contracts/stall-rule-api.md`)

| Input | Type | Notes |
|---|---|---|
| `pendingTime` | `number` | carried-forward pending time; non-finite or negative treated as `0` |
| `elapsed` | `number` | ms since previous frame; non-finite or negative treated as `0` |
| `tickIntervalMs` | `number` | caller-supplied, derived from `TICK_RATE_HZ` — never hard-coded inside the function |

| Output | Type | Notes |
|---|---|---|
| next pending time | `number` | always finite, always `>= 0`; either `pendingTime + elapsed` (sanitized) or `0` |

No state transitions beyond this single input → output mapping exist for
this feature; `tickLoop`'s existing `while (accumulator >= TICK_INTERVAL_MS)`
loop and `stepTick()` call are unchanged (FR-009 through FR-013 forbid
touching sound derivation, the sim, or per-tick behavior).
