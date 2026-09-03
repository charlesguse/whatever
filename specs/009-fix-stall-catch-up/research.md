# Phase 0 Research: Drop The Tick Backlog On A Stall

Spec.md contains no `[NEEDS CLARIFICATION]` markers — the stall boundary
(two tick intervals) is already settled in the spec's Assumptions section,
confirmed by the requester on issue #26. This document instead records the
implementation-level decisions the plan needed to make, each with rationale
and rejected alternatives, so a reviewer can see why the shape was chosen
without re-deriving it.

## Decision 1: Where the new pure function lives

**Decision**: `src/lib/loop/stall.ts`, a new directory alongside
`src/lib/audio/`, `src/lib/input/`, `src/lib/session/`, etc.

**Rationale**: The spec (FR-016) requires the rule to match "the pure-
function-plus-node-test idiom the shell already uses for input merging,
touch-control visibility, audio availability, and mute" — all four live at
`src/lib/<concern>/<file>.ts` with a mirrored test at
`tests/lib/<concern>/<file>.test.ts`, one exported concern per file, no
Svelte or DOM import. The stall rule is a new concern (frame-to-tick timing)
that does not fit inside `audio/`, `input/`, or `session/` — those already
have a distinct meaning in this codebase (sound content, control reading,
game-state transition). A new `loop/` directory names the concern precisely
and keeps the convention intact rather than overloading an existing one.

**Alternatives considered**:
- *Inline the function inside `App.svelte`*: this is exactly what FR-017's
  acceptance scenario 4 and the spec's overall framing forbid — "the rule is
  not an inline expression inside the app component with no test of its
  own." Rejected outright.
- *Put it in `src/lib/session/`*: session already owns `tickSession` (sim
  advancement) and `scoring.ts`; folding frame timing in there would make
  "session" mean both "one simulated tick" and "how many ticks a frame
  runs," which are different concerns at different layers (sim-adjacent vs.
  rAF-adjacent). Rejected to keep the module boundary legible.
- *Put it under `src/sim/`*: forbidden by FR-013 and Principle II — the sim
  must not learn about wall-clock time or frame gaps, and this function's
  whole job is to consume elapsed wall-clock time.

## Decision 2: Function signature

**Decision**:

```ts
export const STALL_BOUNDARY_TICK_INTERVALS = 2;

export function nextPendingTime(
  pendingTime: number,
  elapsed: number,
  tickIntervalMs: number
): number;
```

**Rationale**: FR-016 specifies the inputs as "(pending time carried
forward, time elapsed since the previous frame)" and the output as "the
pending time that survives" — a two-argument function would satisfy that
literally, but FR-002 additionally requires the boundary to be "expressed in
tick intervals so that the tick rate remains the single source of truth for
it, and never as a hard-coded number of milliseconds." Since `TICK_RATE_HZ`
lives in `src/sim/cave.ts` and the shell derives `TICK_INTERVAL_MS` from it
locally in `App.svelte`, the only way for the boundary to be computed in
tick intervals without a second, independent constant is for the function to
take the tick interval as a parameter and multiply by
`STALL_BOUNDARY_TICK_INTERVALS` internally. This keeps `TICK_RATE_HZ` (via
the caller-computed `TICK_INTERVAL_MS`) as the single source of truth, per
FR-002, while keeping the function itself free of any import from
`src/sim/` or `App.svelte` — it stays a plain function of three numbers.

**Alternatives considered**:
- *Two-argument function with the boundary hard-coded in milliseconds
  inside `stall.ts`*: directly contradicts FR-002's "never as a hard-coded
  number of milliseconds."
- *Two-argument function that imports `TICK_INTERVAL_MS` from `App.svelte`
  or `TICK_RATE_HZ` from `src/sim/cave.ts` directly*: would make the pure
  function depend on the sim module or the Svelte component, which is an
  unnecessary coupling for a function whose contract is "three numbers in,
  one number out" — the existing idiom's functions (e.g.
  `shouldShowTouchControls(capabilities, lastInputSource)`) take everything
  they need as parameters rather than importing it. Rejected for
  consistency and testability (the test file should not need to import
  `src/sim/cave.ts` just to exercise a timing rule).

## Decision 3: How totality (FR-007) is implemented

**Decision**: Guard both `pendingTime` and `elapsed` with
`Number.isFinite(x) && x > 0 ? x : 0` before combining, rather than
validating only `elapsed`.

**Rationale**: FR-007 requires a zero, negative, or non-finite *gap*
(elapsed) to always produce a finite, non-negative result, and the edge
case "a clock that jumps backward" requires a negative gap to never reduce
pending time below zero. Guarding `pendingTime` the same way costs nothing
(the accumulator is always a valid non-negative number in the current
caller, so the guard is a no-op in practice) and makes the function total
over *both* arguments rather than trusting the caller to only ever pass a
sane accumulator — matching `resolveStoredMute`'s "Total, never throws"
style of not assuming a well-formed input even where the current single
call site happens to provide one.

**Alternatives considered**: Validate only `elapsed` and trust
`pendingTime` from the caller. Rejected — it would make the "total over its
inputs" claim in FR-007 true only by accident of the one call site that
exists today, not true of the function itself.

## Decision 4: What happens to `MAX_ACCUMULATED_MS`

**Decision**: Delete the constant entirely; `tickLoop` calls
`nextPendingTime(accumulator, elapsed, TICK_INTERVAL_MS)` in place of
`Math.min(accumulator + elapsed, MAX_ACCUMULATED_MS)`.

**Rationale**: FR-008 requires exactly one rule for how much pending time
survives a frame — a second, separately stated bound left in place
alongside the new function would risk producing a different answer from it
(e.g. if someone later changes one bound and not the other). The spec's own
Assumptions section states this folding-in is a planning call as long as
observable behavior matches the spec; deleting the old constant is the only
way to guarantee no second bound can silently diverge.

**Alternatives considered**: Keep `MAX_ACCUMULATED_MS` as dead code or
repurpose it as `STALL_BOUNDARY_TICK_INTERVALS`. The former violates
FR-008's spirit (a stale unused bound inviting confusion); the plan instead
introduces `STALL_BOUNDARY_TICK_INTERVALS` fresh, inside `stall.ts`, named
for what it now means (a count of tick intervals, not a millisecond clamp)
rather than reusing the old name for a different concept.
