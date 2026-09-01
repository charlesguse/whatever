# Phase 1 Data Model: Synthesized Sound, Per Theme, Always Mutable

Entities below extend feature 007's data model
([`specs/007-touch-gamepad-input/data-model.md`](../007-touch-gamepad-input/data-model.md)),
which itself extends features 001–006's. Sim entities (Element, Grid, Cave
Definition/State, the cave clock, `Screen`, `SessionState`, Score), the
Named Action / Input Source / merge / visibility model, and the touch/
gamepad geometry/binding model are all unchanged and not repeated — this
feature touches no file under `src/sim/`, adds no field to `SessionState`
or `TickInput`, and adds no new touch hit-test control. It adds: a closed
sound-event vocabulary and its pure derivation, a voice-priority cap, a
mute state, an audio-availability state, and a per-theme voice/sound-table
model.

## Sound Event (`src/lib/audio/events.ts`)

| Field | Type | Notes |
|---|---|---|
| `SoundEventId` | `'dirtStep' \| 'fallStart' \| 'fallLand' \| 'diamondCollected' \| 'doorOpen' \| 'explosion' \| 'timeLow' \| 'bonusTally'` | the closed set from FR-001; adding a ninth id is a spec change |

No payload beyond the id (Key Entities: "no position, no magnitude, no
count") — every consumer (priority cap, theme sound table, the playback
engine) keys off the id alone.

### `deriveSoundEvents(prev: SessionState, next: SessionState): readonly SoundEventId[]`

Pure; reads only `prev.screen`/`prev.caveState` and
`next.screen`/`next.caveState`/`next.screenTicks` via the sim's existing
read-only accessors (`getCollected`, `getQuota`/`isDoorOpen`, `getCell`,
`getPlayerPosition`, `isFalling`, `isExplosion`, `getRemainingSeconds`) —
never `score`, `lives`, `caveIndex`, or any camera/viewport/scroll state
(FR-042a). Returns each id **at most once** (FR-011), in `SoundEventId`
declaration order; the grid scans it performs (for `explosion` and
`fallStart`/`fallLand`) use plain nested loops over primitive booleans,
never a per-cell array or object (research.md's FR-019 interpretation).

| Event | Condition (see research.md for full rationale) |
|---|---|
| `dirtStep` | `next.screen === 'playing'`, player position changed between `prev`/`next`, and `getCell(prev, newX, newY) === 'dirt'` |
| `fallStart` | `next.screen === 'playing'`; exists `(x,y)`: `getCell(next,x,y)` is boulder/diamond, `isFalling(next,x,y)`, `getCell(prev,x,y) === 'empty'`, and at least one of `(x,y-1)`, `(x-1,y)`, `(x+1,y)` held a *resting* boulder/diamond in `prev` |
| `fallLand` | `next.screen === 'playing'`; exists `(x,y)`: `getCell(prev,x,y)` is boulder/diamond and falling, `getCell(next,x,y)` is the *same* id, and no longer falling |
| `diamondCollected` | `next.screen === 'playing'` and `getCollected(next) > getCollected(prev)` |
| `doorOpen` | `next.screen === 'playing'` and `isDoorOpen(next) && !isDoorOpen(prev)` |
| `explosion` | `next.screen === 'playing'`; exists `(x,y)`: `isExplosion(prev,x,y) === false` and `isExplosion(next,x,y) === true` |
| `timeLow` | `next.screen === 'playing'`, `getRemainingSeconds(next) !== undefined`, `<= 10`, and differs from `getRemainingSeconds(prev)` |
| `bonusTally` | `next.screen === 'caveComplete'` (screenTicks bound is already enforced by `session.ts`'s own advance-away rule — research.md) |

## Voice Priority (`src/lib/audio/priority.ts`)

| Constant / Function | Shape | Rule |
|---|---|---|
| `VOICE_PRIORITY_ORDER` | `readonly SoundEventId[]` | `['explosion', 'diamondCollected', 'doorOpen', 'timeLow', 'bonusTally', 'fallStart', 'fallLand', 'dirtStep']` (FR-020a, highest first) |
| `DEFAULT_VOICE_CAP` | `number` | `6` (research.md, flagged, maintainer-tunable) |
| `applyVoiceCap` | `(events: readonly SoundEventId[], cap: number) => readonly SoundEventId[]` | sorts `events` by `VOICE_PRIORITY_ORDER` rank ascending, returns the first `cap` — pure, no scheduling/audio dependency (FR-020b) |

`App.svelte` calls `applyVoiceCap(deriveSoundEvents(prevSession, session), DEFAULT_VOICE_CAP)`
every tick and hands the result — never the raw derived list — to the
playback engine.

## Mute State (`src/lib/audio/mute.ts`, `src/lib/storage/save.ts`)

| Field / Function | Type | Notes |
|---|---|---|
| `muted` | `boolean`, `App.svelte` plain `$state` | mirrors `activeThemeId`'s existing plain-`$state` pattern; never part of `SessionState` (FR-030) |
| `resolveStoredMute` | `(stored: unknown) => boolean` | total, never throws; anything not literally `typeof === 'boolean'` resolves to `false` (FR-032) |
| `toggleMute` | `(muted: boolean) => boolean` | `!muted` — named/exported so the parity-of-N independent test drives it directly |
| `SaveRecord.muted` | `boolean \| undefined` | new optional field, alongside `themeId`; `readSave` validates `typeof === 'boolean'` only; `writeSave` is last-write-wins (`record.muted ?? current.muted`), **not** grow-only like `highScore`/`furthestCave` |

## Mute Reachability (extends the Named Action / Input Source model)

| Source | Mechanism | Mirrors |
|---|---|---|
| Keyboard | `MUTE_KEYS = new Set(['m', 'M'])`; `KeyboardInput.consumeMute()`, one-shot | `CYCLE_THEME_KEYS`/`consumeCycleTheme()` shape exactly |
| Gamepad | `MUTE_BUTTON_INDEX` (flagged, `4`, left shoulder/bumper) in `gamepad/bindings.ts`; `GamepadInput.consumeMute()`, edge-triggered via the existing `mapOneShotButtons` machinery | `CYCLE_THEME_BUTTON_INDEX`/`consumeCycleTheme()` shape exactly |
| Touch / pointer | A new always-rendered `<button aria-pressed={muted}>` in `App.svelte`'s markup, calling `toggleMuted()` on `click` — not routed through `TouchInput`'s pad/hit-test system | The theme picker's own buttons (feature 006) |

`TouchInput.consumeMute()` is added as a stub returning `false` always,
mirroring `consumeCycleTheme()`'s existing stub — kept for
`action-coverage.test.ts`'s "every source declares a keyboard-covered
method" shape, not because touch routes mute through hit-testing.

`App.svelte`'s `stepTickInner()` reads
`orAll(keyboard.consumeMute(), touch.consumeMute(), gamepad.consumeMute())`
unconditionally, at the same point `consumeCycleTheme()` is already read
(before any screen branch) — so a mute press works from every screen and
never also starts/advances/pauses/restarts anything (FR-025, Acceptance
Scenario US2#6).

## Audio Availability (`src/lib/audio/availability.ts`, `src/lib/audio/engine.ts`)

| Type / Function | Shape | Notes |
|---|---|---|
| `AudioAvailability` | `'notCreated' \| 'available' \| 'unavailable'` | never surfaced to the player (Key Entities); internal to `engine.ts` |
| `AudioContextOutcome` | `'noConstructor' \| 'throws' \| 'staysSuspended' \| 'resumeRejects' \| 'healthy'` | what the impure `unlock()` observed when it actually tried to construct/resume a context |
| `resolveAvailabilityAfterGesture` | `(outcome: AudioContextOutcome) => AudioAvailability` | pure: `'healthy' -> 'available'`, every other outcome `-> 'unavailable'` — the function US4's Independent Test drives directly with injected outcomes |

`engine.ts` (impure, un-unit-tested per Principle VII — covered by the
maintainer checklist instead):

- `unlock()`: idempotent; on the first call while `AudioAvailability ===
  'notCreated'`, attempts `new (window.AudioContext ??
  (window as any).webkitAudioContext)()` (FR-017's vendor-prefix fallback)
  and `.resume()`, wrapped in `try`/`catch`/`.catch(() => {})` throughout;
  classifies the outcome and calls `resolveAvailabilityAfterGesture`.
  Called from the *existing* `onAnyKeyDown`/`onAnyClick`/`onAnyTouchStart`
  window listeners (feature 007) — never from gamepad polling (FR-043).
- `play(events: readonly SoundEventId[], sounds: SoundTable, muted: boolean)`:
  no-ops immediately (no node allocation) when `muted` or availability is
  not `'available'` (FR-018, FR-029); otherwise schedules one short
  oscillator/noise voice per event id from `sounds[eventId]`, entirely
  outside `tick()` (FR-019).

## Voice Specification / Theme Sound Table (`src/lib/themes/types.ts`)

| Field | Type | Declared range |
|---|---|---|
| `waveform` | `'sine' \| 'square' \| 'triangle' \| 'sawtooth' \| 'noise'` | — |
| `frequencyHz` | `number` | `[20, 20000]` |
| `frequencyEndHz` | `number \| undefined` | `[20, 20000]`; omitted = constant pitch, present = a pitch sweep from `frequencyHz` to `frequencyEndHz` |
| `durationMs` | `number` | `(0, 2000]` (FR-021 — short enough to be over before masking the next same-id event at the game's tick rate) |
| `attackMs` / `releaseMs` | `number` | `>= 0`, and `attackMs + releaseMs <= durationMs` |
| `level` | `number` | `[0, 1]` peak gain |
| `noiseMix` | `number` | `[0, 1]` — `0` pure oscillator, `1` pure generated noise |

`SoundTable = Readonly<Record<SoundEventId, VoiceSpec>>`. `Theme.sounds:
SoundTable` is a new **required** field (FR-034 — TypeScript itself
refuses to compile a theme missing it). `classroom.ts` and `classic.ts`
each define all eight, with every event id's `VoiceSpec` differing between
the two themes (FR-039) and every `level` within one shared declared
range across both themes (also FR-039).

`tests/lib/themes/sound-table-completeness.test.ts` mirrors
`registry-completeness.test.ts`'s existing shape: every registered theme
is checked against the full `SoundEventId` list (a missing id fails
naming both the theme and the id), every field's declared range is
asserted per theme/event pair, and Classroom vs. Classic are compared
pairwise per event id.
