# Contract: Repeat Delay API

`src/lib/input/repeat.ts` — the "one shared, named, separately testable
unit" FR-018 requires. All three input sources (`KeyboardInput`,
`TouchInput`, `GamepadInput`) import and call this module; none
reimplements its logic.

## Exports

### `REPEAT_DELAY_TICKS: number`

The number of ticks a repeat is suppressed for after a direction's first
reported tick. Fixed at `1` for this feature (FR-003). Consumers MUST NOT
hardcode `1` where they mean "the repeat delay" — they reference this
constant, so a future spec that wants a different value changes one place.

### `interface RepeatState { readonly ticksSincePress: number }`

Opaque to callers beyond passing it back into `advanceRepeat`. `0` means
"not currently held."

### `INITIAL_REPEAT_STATE: RepeatState`

The value of `RepeatState` for a control that is not held —
`{ ticksSincePress: 0 }`. Every source starts a new direction/control at
this value.

### `advanceRepeat(state: RepeatState, isHeldThisTick: boolean): { state: RepeatState; report: boolean }`

The single rule (FR-001–FR-003, FR-005–FR-008). A **total, pure** function:
no wall-clock read, no timer, no I/O, no randomness (FR-017). Called at
most once per tick per control a source is tracking.

**Contract**:

| `state.ticksSincePress` (in) | `isHeldThisTick` | `state.ticksSincePress` (out) | `report` (out) |
|---|---|---|---|
| any | `false` | `0` | `false` |
| `0` | `true` | `1` | `true` |
| `1` | `true` | `2` | `false` |
| `2` | `true` | `3` | `true` |
| `n ≥ 2` | `true` | `n + 1` | `true` |

In words:
- Not held ⇒ next state is the initial state, never reported.
- Freshly held (coming from not-held) ⇒ reports immediately, this tick
  (FR-005: "no press ever waits out the delay before its first move").
- Held for a second consecutive tick after that first report ⇒ suppressed
  (the one tick of delay, FR-003).
- Held for a third or later consecutive tick ⇒ reports every tick from
  here on, indefinitely (FR-002).

**Callers are responsible for**:
- Deciding what "isHeldThisTick" means for their control (keyup/keydown
  presence for keyboard; hit-test result for touch; button/axis threshold
  for gamepad) — `advanceRepeat` has no opinion on input devices.
- Resetting to `INITIAL_REPEAT_STATE` themselves (by passing
  `isHeldThisTick = false` for at least one tick, or by discarding the
  state and starting fresh) whenever FR-006/FR-007 require it: on release,
  and when a different direction becomes the one being tracked in that
  control's slot. `advanceRepeat` cannot detect "this is a different
  direction than last time" on its own — it only sees a boolean.
- Calling this at most once per tick per control. Calling it more than
  once in the same tick, or skipping a tick while a control remains held,
  produces an incorrect tick count; there is no internal safeguard against
  either misuse (matching every other pure module in `src/lib/input/`,
  which trust their one call site — `App.svelte`'s `stepTickInner()` — to
  call `consumeDirection()`/`poll()` exactly once per tick per source,
  already documented at that call site).

## Per-source integration contract

Each source continues to expose the same public methods it does today
(`consumeDirection()` for keyboard/touch, `poll()` + `consumeDirection()`
for gamepad); this feature changes their *internal* bookkeeping only. No
signature changes.

### `KeyboardInput`

- Keeps its existing `held: Direction[]` stack and `pendingTap` field
  unchanged — these decide *which* direction would be reported, exactly as
  today (FR-014's precedent: most-recently-pressed-still-held wins).
- Adds `private repeatStates = new Map<Direction, RepeatState>()`.
- On `keydown` for a direction not already in `held`: sets
  `repeatStates.set(direction, INITIAL_REPEAT_STATE)` (a fresh press,
  FR-006).
- On `keyup` for a direction: `repeatStates.delete(direction)`.
- Inside `consumeDirection()`, before computing the return value: for every
  direction currently in `held`, call `advanceRepeat(repeatStates.get(d) ??
  INITIAL_REPEAT_STATE, true)` exactly once and store the resulting state
  back. The direction ultimately returned (today: `held[held.length - 1]`)
  is only returned if that direction's `report` was `true` this call;
  otherwise `consumeDirection()` returns `undefined` for the held path
  (the `pendingTap` sub-tick path is untouched — research.md D4).

### `TouchInput`

- Adds `private repeatState: RepeatState = INITIAL_REPEAT_STATE` and
  `private lastDirection: Direction | undefined`.
- Inside `consumeDirection()`: resolve the raw pad direction exactly as
  today (scanning `assignments` for a `'pad'` hit). If that raw direction
  differs from `lastDirection` (including a transition to/from
  `undefined`), reset `repeatState` to `INITIAL_REPEAT_STATE` first
  (research.md D3 — a slide between zones is a fresh press). Call
  `advanceRepeat(repeatState, rawDirection !== undefined)`, store the
  resulting state, set `lastDirection = rawDirection`, and return
  `rawDirection` only if `report` was `true`; otherwise return `undefined`.

### `GamepadInput`

- Extends the existing per-pad `GamepadPadState` interface with
  `repeatState: RepeatState` and `lastDirection: Direction | undefined`
  (alongside the existing `previousStickDirection`/`previousPressed`).
- Inside `poll()`, after computing `padDirection` (the existing
  dpad-or-stick merge) for a pad: if `padDirection` differs from that pad's
  stored `lastDirection`, reset that pad's `repeatState` first. Call
  `advanceRepeat`, store the result, update `lastDirection`, and only fold
  the direction into `direction` (the cross-pad merge that becomes
  `mergedDirection`) if `report` was `true`.
- `consumeDirection()`'s signature and behavior (return the cached
  `mergedDirection`) are unchanged; the gating happens inside `poll()`,
  which already runs once per tick per FR-017's existing comment ("polled
  once per tick, before any `consume*()` call").

## What this contract does not change

- `resolveDirection` / `orAll` in `merge.ts` — untouched (FR-014).
- The grab modifier and every one-shot action's `consume*()` method on all
  three classes — untouched (FR-013).
- `App.svelte`'s call sites — already call `consumeDirection()` exactly
  once per source per tick; no new call, no changed call shape.
