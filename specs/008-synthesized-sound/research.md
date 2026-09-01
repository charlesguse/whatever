# Phase 0 Research: Synthesized Sound, Per Theme, Always Mutable

The spec (`spec.md`) contains no literal `[NEEDS CLARIFICATION]` markers — its
own Assumptions section already resolves every open question the issue
raised (the low-time threshold, the mute key, default mute state, the
event set's exact scope, voice-cap tunability, the gamepad mute binding's
fallback). This document records the implementation-pattern decisions
needed to turn those resolved rules into code over the existing
features-001–007 sim/session/theme/input modules, with no new file under
`src/sim/` and no change to any existing sim behavior or test (FR-002,
FR-003, FR-036, FR-037). Four decisions below make a call the spec leaves
to this plan rather than stating directly; each is flagged and repeated in
the plan-stage issue comment as a decision made without further
clarification.

## Decisions

### Decision: Sound events are derived entirely in the shell, as a pure function of two consecutive `SessionState` snapshots read through the sim's *existing* accessors — no new file, field, or export under `src/sim/`

- **Rationale**: FR-002/FR-003 forbid a Svelte/DOM/audio import into `src/sim/`
  and forbid deriving events by changing any physics rule, cell state, or
  existing test's expected grid. Every signal the eight event ids need is
  already readable from outside `src/sim/` via feature 002's and 005's
  accessors: `getCollected`, `getQuota`/`isDoorOpen`, `getStatus`,
  `isFalling`, `getCell`, `getPlayerPosition`, `isExplosion`,
  `getRemainingSeconds`, plus `SessionState.screen`/`screenTicks` from
  feature 005. A new module, `src/lib/audio/events.ts`, exports
  `deriveSoundEvents(prev: SessionState, next: SessionState): readonly SoundEventId[]`,
  reading only `prev.screen`/`prev.caveState` and
  `next.screen`/`next.caveState`/`next.screenTicks` — never `score`,
  `lives`, or `caveIndex`, keeping it provably position- and
  session-metadata-free (FR-042a). Per-event rules, all comparisons
  between the two snapshots:
  - `dirtStep`: `getPlayerPosition(next) !== getPlayerPosition(prev)` (by
    value) **and** `getCell(prev, next player x, next player y) === 'dirt'`
    — the cell the kid moved *into*, read from *before* the move. A push
    moves the player into a cell that was `'empty'` before the push (a
    boulder only moves into empty space), so it never satisfies this rule;
    a blocked move never changes player position at all.
  - `diamondCollected`: `getCollected(next) > getCollected(prev)`.
  - `doorOpen`: `isDoorOpen(next) && !isDoorOpen(prev)` — naturally re-armed
    every restart/new cave because `collected` resets to 0 in a fresh
    `CaveState` (FR-007, the "restarting after the door opened" edge case).
  - `explosion`: at least one cell where `isExplosion(prev, x, y) === false`
    and `isExplosion(next, x, y) === true` (a newly appeared blast cell,
    not a cell still mid-countdown from an earlier tick).
  - `fallStart` / `fallLand`: see the dedicated decision below.
  - `timeLow`: `next.screen === 'playing'`, `getRemainingSeconds(next)` is
    defined and `<= 10`, and differs from `getRemainingSeconds(prev)` — the
    threshold (10) is the spec's own Assumptions-section value, and
    change-detection on the derived whole-second value is exactly "once
    per whole second" (`getRemainingSeconds` only changes once every
    `TICK_RATE_HZ` ticks).
  - `bonusTally`: `next.screen === 'caveComplete'` — see the dedicated
    decision below for why no additional screen-ticks bound is needed.
  - Every gameplay id (`dirtStep`/`fallStart`/`fallLand`/`diamondCollected`/
    `doorOpen`/`explosion`/`timeLow`) additionally requires
    `next.screen === 'playing'`, satisfying FR-012 even though
    `tickSession` already only advances the sim on that screen (belt and
    suspenders: derivation does not *trust* the caller to only invoke it
    while playing).
- **Alternatives considered**: Exposing a per-tick event list from the
  sim's own `tick()` (rejected — Principle VI requires the hot loop stay
  allocation-free, and accumulating a list of "what happened" objects
  inside `tick()`'s single top-to-bottom scan is exactly the per-cell
  object/array building that principle forbids; it would also duplicate
  the read-only-accessor pattern features 002/005 already established for
  crossing the sim/shell boundary). Adding new `CaveState` fields that
  record "cells that started/stopped falling this tick" (rejected for the
  same reason — writing them is `tick()`'s own hot-path work, and the
  facts they'd record are already fully reconstructible from the falling
  flag's existing semantics, which is what the next decision does).

### Decision (flagged): `fallStart`/`fallLand` are derived from a single grid scan comparing `isFalling`/`getCell` at matched and neighboring positions, using the invariant that a cell newly holding a falling boulder/diamond was always empty in `prev` at that exact position

- **Rationale**: `tick.ts`'s falling/rolling state machine (`processBody`)
  always *moves* a body into the same operation that marks it falling —
  `moveContent` followed immediately by `setFallingIndex` on the
  destination, for both a straight fall (`(x, y) -> (x, y+1)`) and a roll
  (`(x, y) -> (x±1, y)`). That means the position holding a *newly*
  falling body in `next` is never the position it held in `prev` — a
  fixed-position `isFalling(prev, x, y)` vs. `isFalling(next, x, y)`
  comparison cannot see a fall/roll *start* the way it cleanly sees a
  *landing* (a body that stops falling always stops in the cell it already
  occupied — `processBody`'s roll-failure path ends in
  `clearFallingIndex(grid, x, y)` at the same `(x, y)` it was called with,
  never a move). So the two events use different comparisons:
  - **`fallLand`**: exists `(x, y)` where `getCell(prev, x, y)` is
    boulder/diamond, `isFalling(prev, x, y)` is true, `getCell(next, x, y)`
    is the *same* boulder/diamond id, and `isFalling(next, x, y)` is
    false. Requiring the element id to match in both snapshots is what
    excludes a falling body that crushed something this tick: crushing
    overwrites the body's own cell with `'explosion'` content (see
    `stampBlast`), which fails the "same id in `next`" check, so a
    crush never double-fires as a land.
  - **`fallStart`**: exists `(x, y)` where `getCell(next, x, y)` is
    boulder/diamond, `isFalling(next, x, y)` is true, `getCell(prev, x, y)`
    is `'empty'` (the destination-was-empty invariant, true for every fall
    *and* every roll *and* magic-wall emergence, since all three require
    an empty destination), **and** at least one of its three plausible
    physics-predecessor cells — `(x, y-1)` for a straight fall, `(x-1, y)`
    and `(x+1, y)` for a roll — held a *resting* (not falling)
    boulder/diamond in `prev`. A predecessor that was *already falling* in
    `prev` explains the move as a continuation of an existing fall/roll,
    not a new one, and is excluded. Because `fallStart`/`fallLand` are
    booleans coalesced per tick (FR-011) — not per-body identities — this
    only needs to answer "did at least one such transition happen
    anywhere," which the three-neighbor check answers correctly for every
    acceptance scenario and edge case the spec states (a single boulder
    letting go, a five-boulder stack landing together, a boulder rolling
    off another, a boulder that lands and immediately falls again). A
    magic-wall emergence (a diamond/boulder appearing already-falling at
    the bottom of a wall run) has no resting predecessor among its three
    neighbors (the cell above it was `'magicWall'`, not a resting
    boulder/diamond) and so is correctly treated as a continuation of the
    fall that entered the wall, not a second `fallStart` — consistent with
    the spec's Assumptions section scoping magic-wall activity out of this
    feature's event set.
  - This is flagged because the spec states the *observable* rule (FR-005,
    the acceptance scenarios, the rolling/re-falling edge cases) but not an
    algorithm; the neighbor-check heuristic above is this plan's concrete
    choice for satisfying it without new sim surface. Implementation must
    pin it with the exact ASCII-cave fixtures the spec's Independent Tests
    and Edge Cases already describe (a single fall, a five-boulder
    collapse, a roll-off, land-then-immediately-refall) before it is
    considered correct — those fixtures are the actual spec, this
    heuristic is only this plan's way of computing it.
- **Alternatives considered**: Tracking body identity across ticks with a
  synthetic id per boulder/diamond (rejected — the sim has no such id
  today, and inventing one would mean either a new `CaveState` field
  (against FR-002's "no new cell state" spirit for a feature that only
  *observes*) or shell-side identity inference no more reliable than the
  neighbor-check above, at much higher complexity). A global
  falling-cell-count delta (`countFalling(next) - countFalling(prev)`)
  (rejected — a body that lands while a *different* body starts falling in
  the same tick nets to zero, silently losing both events; the neighbor
  check correctly reports both as independent booleans).

### Decision: `bonusTally` needs no explicit screen-ticks upper bound — `next.screen === 'caveComplete'` is already exactly "the tally is still in progress"

- **Rationale**: `App.svelte`'s `stepTickInner()` only ever holds the
  session on `'caveComplete'` while `screenTicks < SCREEN_AUTO_ADVANCE_TICKS`
  — the same step that would push `screenTicks` to the cap instead calls
  `advanceScreen`, moving the screen away in that same tick (see
  `session.ts`'s `advanceScreen`'s `'caveComplete'` branch). So "screen is
  `'caveComplete'`" and "the tally has not yet reached its final value or
  been skipped" are the same condition by construction, with no need to
  import or duplicate `SCREEN_AUTO_ADVANCE_TICKS` (currently a local
  constant in `App.svelte`) into the audio module. Skipping the screen
  (pressing confirm) advances the screen away in the same tick the press
  is processed, so `bonusTally` simply stops being produced from the very
  next call — matching the spec's "Skipping the tally" edge case with no
  special-case code.
- **Alternatives considered**: Relocating `SCREEN_AUTO_ADVANCE_TICKS` into
  `session.ts` and having `deriveSoundEvents` re-check `screenTicks`
  against it directly (rejected as redundant — it would duplicate a
  invariant `session.ts` already guarantees, for no behavioral gain, and
  would need `session.ts` edited for a feature that otherwise touches no
  session file).

### Decision (flagged): FR-019's "per-tick event derivation MUST NOT allocate per cell or build a new array per tick" is read as *no allocation proportional to grid size* — a bounded, at-most-8-element result list built once per tick is not the array FR-019 forbids

- **Rationale**: `deriveSoundEvents` must return *something* enumerable
  each tick for `App.svelte` to act on; a literal zero-allocation
  reading of FR-019 would make that impossible. Read alongside Principle
  VI ("no per-cell objects, no per-tick array building" — stated about the
  *sim's* hot loop) and the constitution's actual concern (a chain
  reaction must not degrade frame rate), the operative constraint is: the
  `width × height` grid scans inside `deriveSoundEvents` (for `explosion`
  and `fallStart`/`fallLand`) must use plain nested loops and primitive
  boolean accumulators — never `.map()`/`.filter()` building a
  cell-sized array, never a new object per cell visited — while the
  function's *return value* is a small fixed-upper-bound list (at most one
  entry per event id, so at most 8) built with plain array literal/`push`
  calls, the same shape `merge.ts`'s `orAll(...values)` already treats as
  acceptable per-tick allocation in feature 007. `applyVoiceCap` (next
  decision) similarly returns a slice of at most `cap` entries, never
  rebuilding anything proportional to grid size.
- **Alternatives considered**: A reused, module-level mutable output array
  that `deriveSoundEvents` clears and refills each call instead of
  returning a fresh array (rejected as premature — 8 booleans and a tiny
  array is not a measurable allocation source next to a full grid scan of
  primitives in the same function; reusing a buffer here would only make
  the pure-function contract harder to test, since two calls could not be
  compared by value without the caller copying the result first).

### Decision: Voice priority is one exported, total order plus a pure `applyVoiceCap(events, cap)` sort-and-truncate — no arrival-order or scheduling-time tie-break anywhere

- **Rationale**: FR-020a states a fixed order (`explosion`,
  `diamondCollected`, `doorOpen`, `timeLow`, `bonusTally`, `fallStart`,
  `fallLand`, `dirtStep`) and FR-020b requires it be verifiable as a pure
  function from an over-cap id set to the surviving subset. Because
  `deriveSoundEvents` already coalesces to at most one entry per id per
  tick (FR-011), `applyVoiceCap` never needs to break a tie *within* one
  id — it only orders *distinct* ids by their fixed rank and takes the
  first `cap`. This is exported from a new `src/lib/audio/priority.ts` and
  called by `App.svelte` immediately after `deriveSoundEvents`, before
  handing the surviving ids to the (impure, un-unit-tested) playback
  engine — so the cap is enforced in the same pure, node-testable layer as
  derivation, and the engine never sees more than `cap` ids to schedule.
- **Flagged**: the spec leaves the cap's *size* a tuning value (Assumptions:
  "a tuning value the maintainer may change after listening"). This plan
  picks **6** as the shipped default — enough for a large multi-boulder
  collapse (`explosion` + `diamondCollected` + a couple of `fallLand`s) to
  read as a chain rather than a single clipped voice, per the maintainer
  listening note "a butterfly chain does not stack into noise" — reassignable
  as a one-line constant, exactly like the low-time threshold and the
  touch-control sizing constants from earlier features.
- **Alternatives considered**: Enforcing the cap inside the playback engine
  itself, after scheduling has already started (rejected — FR-020b
  requires the cap to be testable with no audio device at all; enforcing
  it before the engine is ever invoked is what makes that possible, and
  keeps the engine's only job "play what you're told, or don't").

### Decision: Mute is one boolean, persisted like `themeId` (optional, last-write-wins, resolved defensively at read time) rather than like `highScore`/`furthestCave` (grow-only)

- **Rationale**: FR-023/FR-031/FR-032 describe a single on/off preference
  that can move in either direction and must degrade to `false` (unmuted)
  on anything missing or malformed — the same shape `themeId` already has
  in `save.ts`/`selection.ts` (`resolveStoredThemeId`'s "anything not a
  registered string resolves to the fallback" pattern), not the
  monotonic-`Math.max` shape `highScore`/`furthestCave` use. `SaveRecord`
  gains one optional field, `readonly muted?: boolean`; `readSave` accepts
  it only when `typeof === 'boolean'` (otherwise `undefined`, exactly like
  `themeId`'s `typeof === 'string'` check); `writeSave` writes
  `record.muted ?? current.muted` (replace-if-provided, untouched
  otherwise — never `Math.max`, which is meaningless for a boolean). A new
  `src/lib/audio/mute.ts` exports `resolveStoredMute(stored: unknown): boolean`
  (mirrors `resolveStoredThemeId`'s total, never-throws shape; any
  non-boolean resolves to `false`, satisfying FR-032's "first-time player
  is unmuted" default) and `toggleMute(muted: boolean): boolean` (`!muted`
  — trivial, but named and exported so the "N toggles land on the parity
  of N" independent test has a pure function to drive directly rather than
  reimplementing negation in the test file).
- **Reachability**: mirrors feature 007's cycle-theme three-way split
  exactly (FR-024, "matching how the theme cycle is reachable today"):
  - **Keyboard**: a new one-shot key set, `MUTE_KEYS = new Set(['m', 'M'])`,
    disjoint from every existing binding (FR-025), with `consumeMute()`
    shaped identically to `consumeCycleTheme()`.
  - **Gamepad**: a new one-shot button index, `MUTE_BUTTON_INDEX`, edge-
    triggered in `GamepadInput` exactly like `CYCLE_THEME_BUTTON_INDEX`
    (FR-026 — fires once per press, never repeats while held, because
    edge-triggering is the same `mapOneShotButtons` machinery feature 007
    already built).
  - **Touch/pointer**: unlike cycle-theme (which reuses the *existing*
    theme-picker tap), mute has no existing on-screen control to piggyback
    on, so this feature adds one: an always-rendered `<button
    aria-pressed={muted}>` in `App.svelte`'s markup, styled like the
    theme-picker's own buttons, calling `toggleMuted()` directly on
    `click` — a native button element, which already receives both mouse
    clicks and touch taps with no custom hit-testing (the same reason the
    theme picker needed no `TouchInput` involvement in feature 006/007).
    `TouchInput.consumeMute()` is added as a stub that always returns
    `false`, mirroring `consumeCycleTheme()`'s existing "the real control
    is a native element, not this class's hit-test system" stub, so
    `action-coverage.test.ts`'s "every source declares a keyboard-covered
    method" shape stays uniform across all three sources.
- **Flagged**: `MUTE_BUTTON_INDEX`'s exact value. This plan picks **4**
  (the left shoulder/bumper) — the standard mapping's other bumper, since
  5 (right) is already cycle-theme (feature 007) — reassignable as a
  one-line edit in `gamepad/bindings.ts`, exactly like 007's own flagged
  shoulder-button choice.
- **Alternatives considered**: Giving mute a volume-slider or per-category
  shape (rejected outright by FR-023 — "no volume slider, no per-category
  mutes"). Routing the on-screen control through `TouchInput`'s
  pad/button hit-test system instead of a plain DOM button (rejected —
  that system exists for controls that must work *without* lifting a
  finger to find a precise screen element blind (the d-pad), which does
  not apply to a single always-visible labeled toggle; a native button is
  simpler, gets built-in accessibility semantics for free, and is the
  established precedent from the theme picker).

### Decision: Audio device creation is one impure module (`src/lib/audio/engine.ts`) wrapping a pure availability resolver (`src/lib/audio/availability.ts`); the *existing* window-level key/click/touch listeners from feature 007 (already gesture-scoped and already gamepad-excluded) are reused to call `unlock()`, rather than adding new listeners

- **Rationale**: FR-016/FR-017/FR-043 require device creation on the first
  key/click/touch and never on gamepad input — exactly the three event
  types feature 007's `onAnyKeyDown`/`onAnyClick`/`onAnyTouchStart`
  listeners already exist to observe (they currently only update
  `lastInputSource`; this feature adds one more call, `audioEngine.unlock()`,
  inside each). Because those listeners are wired to `window`
  `keydown`/`click`/`touchstart` only — never to gamepad polling — FR-043's
  "gamepad input MUST NOT be wired to device creation" is satisfied
  structurally, the same way feature 007 made "pointer movement never
  changes `lastInputSource`" structural rather than a filtered runtime
  case. `unlock()` is idempotent (a no-op once availability has already
  resolved to `'available'` or `'unavailable'`) and wraps every step —
  `new (window.AudioContext ?? window.webkitAudioContext)`, `.resume()` —
  in `try`/`catch` and `.catch(() => {})`, feeding the outcome to
  `resolveAvailabilityAfterGesture` (pure: maps `'noConstructor' |
  'throws' | 'staysSuspended' | 'resumeRejects'` to `'unavailable'`,
  `'healthy'` to `'available'`). This split is what makes US4's
  Independent Test possible without a real `AudioContext`: the pure
  resolver is exercised directly with injected outcome strings in
  `tests/lib/audio/availability.test.ts`; the impure half (actually
  constructing `AudioContext`, feature-detecting the vendor prefix per
  FR-017) is un-unit-testable and is covered instead by the maintainer
  checklist ("iOS Safari," "controller only") already in `spec.md`, per
  Principle VII's existing precedent for canvas/DOM-touching code.
  `engine.ts`'s `play(events, soundTable, muted)` no-ops immediately (no
  node allocation) whenever `muted` is true or availability is not
  `'available'`, satisfying FR-018's "every audio failure is swallowed,
  nothing shown or thrown" and FR-029's "muted events are dropped, not
  buffered."
- **Alternatives considered**: A dedicated `pointerdown`/`touchstart`
  listener private to the audio module (rejected — it would duplicate
  exactly the gesture-scoping feature 007 already built and tested, and
  create a second source of truth for "what counts as a real user
  gesture" that could drift from `visibility.ts`'s definition over time).
  Attempting device creation eagerly at first render and catching the
  inevitable autoplay-policy rejection (rejected outright by FR-016 — "never
  at module load or page load").

### Decision: `Theme.sounds` is a new required field, `Readonly<Record<SoundEventId, VoiceSpec>>`, plain data with declared numeric ranges, completeness-checked the same way `registry-completeness.test.ts` already checks element/string-field completeness

- **Rationale**: FR-034/FR-035/FR-036 require every theme to define every
  event id as plain data (no functions, no theme-id branches), consistent
  with the existing `ThemeEntry`/`elements` pattern. `VoiceSpec` is
  `{ waveform: 'sine' | 'square' | 'triangle' | 'sawtooth' | 'noise';
  frequencyHz: number; frequencyEndHz?: number; durationMs: number;
  attackMs: number; releaseMs: number; level: number; noiseMix: number }` —
  `frequencyEndHz` (omitted for a constant pitch) gives every voice the
  "pitch or pitch sweep" the Key Entities section names; `noiseMix`
  (0 = pure oscillator, 1 = pure noise) covers the noise-based voices
  (`explosion`, `dirtStep`'s scuff) without a separate noise-only
  waveform kind; `attackMs`/`releaseMs` is the declared envelope.
  `frequencyHz`/`frequencyEndHz` in `[20, 20000]`, `durationMs` in
  `(0, 2000]`, `attackMs`/`releaseMs >= 0` with `attackMs + releaseMs <=
  durationMs`, `level`/`noiseMix` in `[0, 1]` are the declared ranges
  FR-035/SC-002 need a test to assert. A new
  `tests/lib/themes/sound-table-completeness.test.ts` mirrors
  `registry-completeness.test.ts`'s existing shape exactly: every
  registered theme is checked against the full `SOUND_EVENT_IDS` list
  (missing an id fails naming both the theme and the id, same as a
  missing element id today), every field's range is asserted per theme,
  and Classroom/Classic are compared pairwise to assert every event id's
  `VoiceSpec` differs between them (FR-039) and that every voice's `level`
  falls inside one shared declared range (also FR-039 — "not a volume
  jump" between themes).
- **Alternatives considered**: A separate top-level sound-table registry
  keyed by theme id, parallel to but independent from `Theme` (rejected —
  it would let a theme exist without a matching sound entry, exactly the
  "gaps, shared fallback table" FR-034 forbids; making `sounds` a required
  field of `Theme` itself means TypeScript already refuses to compile a
  theme missing it, before any test even runs).

## Outstanding Unknowns

None beyond the four flagged decisions above, repeated here and in the
plan-stage issue comment as decisions made without further clarification:

1. The `fallStart`/`fallLand` neighbor-check heuristic (the spec states
   the observable per-tick behavior; the algorithm that reconstructs it
   from existing accessors with no new sim surface is this plan's call).
2. FR-019's "no array per tick" read as "no grid-proportional allocation,"
   permitting a bounded ≤8-element per-tick result list.
3. The default voice cap size (**6**) — the spec states only that it is a
   tunable value.
4. The gamepad `MUTE_BUTTON_INDEX` (**4**, left shoulder/bumper) — the
   spec states only that mute needs *a* gamepad binding, matching feature
   007's own precedent of flagging its shoulder-button pick the same way.
