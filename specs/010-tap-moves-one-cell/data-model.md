# Phase 1 Data Model: One Tap, One Cell

No `SessionState` field, no `TickInput` field, no cell state, and no
element changes — this feature is entirely input-layer. The "entities"
below are the plain-value shapes introduced or touched in
`src/lib/input/**`, matching `spec.md`'s Key Entities section one-to-one.

## RepeatState

The tick-counted press state for one control (Key Entities: "Press State").

| Field | Type | Meaning |
|---|---|---|
| `ticksSincePress` | `number` (non-negative integer) | `0` when the control is not held. On the tick a press is first observed, becomes `1`. Increments by exactly one on every subsequent tick the control is still observed held. Reset to `0` immediately on release, and again on a fresh press replacing a different direction (FR-006, FR-007). Never a timestamp (FR-017). |

**Invariants**:
- `ticksSincePress` only ever changes by `advanceRepeat` (see
  `contracts/repeat-delay-api.md`); no source mutates it directly.
- `ticksSincePress === 0` if and only if the control is not currently
  tracked as held by its owning source.
- Monotonically increases by exactly 1 per tick while held; never
  decreases except the reset-to-0 transition on release/direction-change.

**Ownership** (per-source, per FR-018's "per-source state is expected"):

| Source | Storage shape | Why |
|---|---|---|
| `KeyboardInput` | `Map<Direction, RepeatState>`, one entry per direction currently present in the existing `held` stack | Keyboard already supports more than one direction held at once (arrow + WASD, or two arrows), and US2 AC4 requires a preempted direction's progress to survive being non-top-of-stack (research.md D2) |
| `TouchInput` | One `RepeatState` plus the last resolved `Direction \| undefined` | At most one pad zone can be live per touch identifier's direction at a time; the "last resolved direction" is what detects a fresh press when a finger slides between zones (research.md D3) |
| `GamepadInput` | One `RepeatState` plus the last merged `Direction \| undefined`, per tracked pad (alongside the existing `GamepadPadState`) | Mirrors touch: one merged direction per pad per tick already exists (`mergedDirection`); repeat state rides alongside it the same way `previousStickDirection`/`previousPressed` already do |

## REPEAT_DELAY_TICKS

A build-time constant, not a persisted or player-facing value (Key
Entities: "Repeat Delay"). Value: `1`. Expressed as a count of tick
intervals, never milliseconds (FR-003) — at the current 8 Hz tick rate this
is 125 ms, but the stored value is `1`, so if the tick rate ever changes
(out of scope for this feature, per spec Assumptions) the delay's *tick*
meaning does not silently change with it.

## Reported Direction

Unchanged in shape from before this feature (Key Entities: "Reported
Move" — `Direction | undefined`, the same type every `consumeDirection()`
already returns). This feature changes only how often a call returns a
defined value for a direction that remains held; it adds no new value to
the `Direction` union and no new field anywhere a `Direction` already
flows (`TickInput`, `resolveDirection`, `tickSession`).

## State transitions (per control, per source)

```text
                    release, or a different
                    direction becomes the one
                    being tracked
        ┌───────────────────────────────────────┐
        │                                        │
        ▼                                        │
  ticksSincePress = 0  ──press observed──▶  ticksSincePress = 1  (report = true)
        ▲                                        │
        │                                   held observed
        │                                   again next tick
        │                                        ▼
        │                              ticksSincePress = 2  (report = false)
        │                                        │
        │                                   held observed
        │                                   again next tick
        │                                        ▼
        └──────────────release───────  ticksSincePress = 3, 4, 5, …  (report = true, every tick)
```

This is the same diagram for all three sources; only how "press observed" /
"release" / "a different direction becomes the one being tracked" are
detected differs per source (discrete keyup/keydown events for keyboard;
resolved-value comparison for touch and gamepad — research.md D3).
