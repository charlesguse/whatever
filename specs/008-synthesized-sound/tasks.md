---

description: "Task list for Synthesized Sound, Per Theme, Always Mutable"
---

# Tasks: Synthesized Sound, Per Theme, Always Mutable

**Input**: Design documents from `/specs/008-synthesized-sound/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/,
quickstart.md — all present.

**Tests**: Requested explicitly. The spec's Independent Tests, quickstart.md,
and every contract require `vitest` coverage for every pure module
(`events.ts`, `priority.ts`, `mute.ts`, `availability.ts`,
`sound-table-completeness.test.ts`, plus extensions to `save.test.ts`,
`keyboard.test.ts`, `action-coverage.test.ts`, `TouchInput.test.ts`,
`GamepadInput.test.ts`). `engine.ts` is explicitly **excluded** from unit
testing (Principle VII, no `AudioContext` in node) — it is maintainer-
verified by ear per `spec.md`'s "What the maintainer listens for" checklist,
not by a task in this file.

**Organization**: Tasks are grouped by user story (P1–P4 from spec.md) so
each can be implemented and independently tested on its own.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US4)
- Every task names an exact file path.

## Path Conventions

Single Svelte/Vite project at the repository root: `src/`, `tests/`. This
feature is purely additive — no file under `src/sim/` is touched by any task
below (FR-002, FR-003).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish the new `src/lib/audio/` module boundary and its test
mirror before any story-specific logic is written. No behavior yet.

- [X] T001 Create the new `src/lib/audio/` directory alongside `src/lib/input/`, `src/lib/render/`, `src/lib/session/`, `src/lib/storage/`, `src/lib/themes/` (no file yet — empty scaffold is implicit; first real file lands in T002)
- [X] T002 [P] Create the new `tests/lib/audio/` directory mirroring `src/lib/audio/` (no file yet — first test file lands in Phase 3)

**Checkpoint**: Module boundary exists; nothing behavioral yet.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The closed event-id vocabulary and the theme sound-table type
extension are read by every other module (priority, engine, both themes) and
so must exist before any story-specific work begins.

**⚠️ CRITICAL**: No user story task can begin until this phase is complete.

- [X] T003 Define `SoundEventId` (the closed eight-id union: `dirtStep`, `fallStart`, `fallLand`, `diamondCollected`, `doorOpen`, `explosion`, `timeLow`, `bonusTally`) in `src/lib/audio/events.ts` (FR-001)
- [X] T004 Add `VoiceSpec` interface and `SoundTable = Readonly<Record<SoundEventId, VoiceSpec>>` type to `src/lib/themes/types.ts`, and add `sounds: SoundTable` as a new required field on the `Theme` interface (FR-034, FR-035; depends on T003 for `SoundEventId`)

**Checkpoint**: `SoundEventId` and `Theme.sounds`'s shape exist — every story
below can now compile against them.

---

## Phase 3: User Story 1 - The cave has a voice (Priority: P1) 🎯 MVP

**Goal**: A pure function derives the eight sound events from two consecutive
`SessionState` snapshots, and a pure priority cap bounds how many voices can
sound at once — both verifiable with no browser or audio device.

**Independent Test**: ASCII-cave `SessionState` pairs (via the existing
`tests/sim/helpers/ascii-cave.ts` harness) pin every event id's exact
per-tick trigger and the priority cap's deterministic drop order.

### Tests for User Story 1 ⚠️

> Write these tests FIRST, ensure they FAIL before implementation.

- [X] T005 [P] [US1] Write `tests/lib/audio/events.test.ts`: ASCII-cave `SessionState` pairs for every FR-004–FR-013 acceptance scenario and edge case — dirt-clearing step yields `dirtStep`, walking onto empty ground does not, a push does not, a blocked move does not; a single boulder's fall yields exactly one `fallStart` on the letting-go tick and no repeat while falling, exactly one `fallLand` on the stopping tick; a five-boulder collapse yields exactly one `fallLand`; a boulder rolling off another yields `fallStart`; a boulder that lands and immediately falls again yields `fallLand` then `fallStart` on consecutive ticks; a falling diamond produces the same `fallStart`/`fallLand` ids as a boulder; a diamond collection yields `diamondCollected`; a quota-meeting collection yields exactly one `doorOpen`, never repeated, re-armed by restart; one or more new explosion cells yield exactly one `explosion` regardless of blast size; remaining time at/below 10s yields exactly one `timeLow` per whole second, none above threshold, none while paused; the cave-complete tally yields `bonusTally` each tick until it finishes or the screen advances; no gameplay event fires on any non-playing screen and `bonusTally` is the only event on `caveComplete`; a death-plus-chime tick yields both `diamondCollected` and `explosion`; a quota met by a butterfly blast fires `doorOpen` only on the door-opening tick, not the diamond-appearance tick; replaying an identical cave/input sequence yields an identical event sequence (FR-013)
- [X] T006 [P] [US1] Write `tests/lib/audio/priority.test.ts`: assert `VOICE_PRIORITY_ORDER`'s full stated order (`explosion`, `diamondCollected`, `doorOpen`, `timeLow`, `bonusTally`, `fallStart`, `fallLand`, `dirtStep`); assert `applyVoiceCap` reorders to priority regardless of input order, truncates to `cap`, returns the input unchanged (reordered) when `cap` exceeds its length, and returns `[]` for an empty input; assert a player-caused `explosion`/`diamondCollected` is never dropped in favor of a `fallLand`/`fallStart`/`dirtStep` under an over-cap set (SC-008)

### Implementation for User Story 1

- [X] T007 [US1] Implement `deriveSoundEvents(prev: SessionState, next: SessionState): readonly SoundEventId[]` in `src/lib/audio/events.ts`, reading only `prev.screen`/`prev.caveState` and `next.screen`/`next.caveState`/`next.screenTicks` through the sim's existing read-only accessors (`getCollected`, `isDoorOpen`, `getCell`, `getPlayerPosition`, `isFalling`, `isExplosion`, `getRemainingSeconds`); implement each per-id rule per data-model.md's Sound Event table, including the `fallStart`/`fallLand` neighbor-check heuristic from research.md; screen-gate every id to `'playing'` except `bonusTally` to `'caveComplete'`; coalesce to at most one entry per id per tick; use plain nested loops with primitive booleans for the `explosion`/`fallStart`/`fallLand` grid scans, never a per-cell array or object (FR-001–FR-014, FR-019, FR-042a); depends on T003, T005
- [X] T008 [US1] Implement `VOICE_PRIORITY_ORDER`, `DEFAULT_VOICE_CAP = 6`, and `applyVoiceCap(events, cap)` in `src/lib/audio/priority.ts` — pure sort-by-fixed-rank-then-truncate, no arrival-order or scheduling-time tie-break (FR-020, FR-020a, FR-020b); depends on T003, T006

**Checkpoint**: Event derivation and the voice cap are both implemented and
independently tested — playable-in-principle sound events exist as pure data,
with no playback engine yet.

---

## Phase 4: User Story 2 - Mute that stays muted (Priority: P2)

**Goal**: A single global, persisted mute boolean, reachable from keyboard,
gamepad, and a new always-rendered on-screen control, that never perturbs the
sim.

**Independent Test**: Drive `resolveStoredMute`/`toggleMute` as pure
functions over literal inputs; assert the save record round-trips `muted`
last-write-wins; assert each input source's `consumeMute()` shape.

### Tests for User Story 2 ⚠️

- [X] T009 [P] [US2] Write `tests/lib/audio/mute.test.ts`: `resolveStoredMute`'s full defensive table (`true`→`true`, `false`→`false`, `undefined`/`null`/`'true'`/`1`→`false`); `toggleMute` applied N times lands on the parity of N
- [X] T010 [P] [US2] Extend `tests/lib/storage/save.test.ts`: `muted` round-trips through `writeSave`/`readSave`; `readSave` accepts `muted` only when `typeof === 'boolean'`, otherwise `undefined`; `writeSave` is last-write-wins (a call that omits `muted` leaves the stored value untouched, never `Math.max`); a throwing/absent store degrades to "works this session, nothing persisted, no throw" for `muted` exactly as it already does for `themeId`
- [X] T011 [P] [US2] Extend `tests/lib/input/keyboard.test.ts`: `MUTE_KEYS` is non-empty and disjoint from every other keyboard binding; `consumeMute()` is one-shot (fires once per press, cleared on read), shaped identically to `consumeCycleTheme()`
- [X] T012 [P] [US2] Extend `tests/lib/input/touch/TouchInput.test.ts`: `consumeMute()` always returns `false`
- [X] T013 [P] [US2] Extend `tests/lib/input/gamepad/GamepadInput.test.ts`: `consumeMute()` edge-triggers exactly once per press; holding `MUTE_BUTTON_INDEX` down does not repeat-toggle (FR-026)
- [X] T014 [US2] Extend `tests/lib/input/action-coverage.test.ts`: add `'consumeMute'` to the tracked named-action set and assert every input source (`KeyboardInput`, `TouchInput`, `GamepadInput`) declares it, matching the existing `consumeCycleTheme` coverage shape; depends on T011, T012, T013

### Implementation for User Story 2

- [X] T015 [P] [US2] Implement `resolveStoredMute(stored: unknown): boolean` and `toggleMute(muted: boolean): boolean` in `src/lib/audio/mute.ts` (FR-023, FR-032); depends on T009
- [X] T016 [P] [US2] Add `readonly muted?: boolean` to `SaveRecord` in `src/lib/storage/save.ts`; extend `readSave` to accept `muted` only when `typeof === 'boolean'`; extend `writeSave` to write `record.muted ?? current.muted` (last-write-wins, not grow-only) (FR-031, FR-032, FR-033); depends on T010
- [X] T017 [P] [US2] Add `MUTE_KEYS = new Set(['m', 'M'])` and `consumeMute(): boolean` (one-shot, shaped like `consumeCycleTheme()`) to `src/lib/input/keyboard.ts` (FR-024, FR-025); depends on T011
- [X] T018 [P] [US2] Add `consumeMute(): boolean` stub (always returns `false`) to `src/lib/input/touch/TouchInput.ts`, mirroring the existing `consumeCycleTheme()` stub; depends on T012
- [X] T019 [P] [US2] Add `MUTE_BUTTON_INDEX = 4` to `src/lib/input/gamepad/bindings.ts`, and add edge-triggered `consumeMute(): boolean` to `src/lib/input/gamepad/GamepadInput.ts` via the existing `mapOneShotButtons` machinery (FR-024, FR-026); depends on T013
- [X] T020 [US2] In `App.svelte`: add a `muted` `$state` boolean initialized via `resolveStoredMute` from the loaded save at startup; add `toggleMuted()` that calls `toggleMute`, updates `muted`, and calls `writeSave({ muted })` — never touching `session` (FR-030); read `orAll(keyboard.consumeMute(), touch.consumeMute(), gamepad.consumeMute())` in `stepTickInner()` at the same point `consumeCycleTheme()` is already read, before any screen branch, and call `toggleMuted()` when true; add one always-rendered `<button aria-pressed={muted}>` to the markup, styled like the theme-picker buttons, calling `toggleMuted()` on `click` (FR-024, FR-025, FR-027, FR-041); depends on T014, T015, T016, T017, T018, T019

**Checkpoint**: Mute is a complete, persisted, three-way-reachable state
machine that never touches the sim — independently testable and usable even
though no sound plays yet (playback lands in the next phases).

---

## Phase 5: User Story 3 - A theme you can hear (Priority: P3)

**Goal**: Every registered theme carries a complete, distinct, plain-data
sound table.

**Independent Test**: Registry completeness — every theme defines a voice for
every event id, in range, and Classroom/Classic differ per event id.

### Tests for User Story 3 ⚠️

- [X] T021 [US3] Write `tests/lib/themes/sound-table-completeness.test.ts`, mirroring `registry-completeness.test.ts`'s existing shape: iterate `listThemes()` and assert every registered theme defines a `VoiceSpec` for every one of the eight `SoundEventId`s (failure names both the theme id and the missing event id); assert every `VoiceSpec` field is in its declared range (`frequencyHz`/`frequencyEndHz` in `[20, 20000]`, `durationMs` in `(0, 2000]`, `attackMs`/`releaseMs >= 0` with their sum `<= durationMs`, `level`/`noiseMix` in `[0, 1]`); assert Classroom and Classic differ in at least one field for every event id (FR-039); assert every voice's `level` across both themes falls within one shared declared band (FR-039); depends on T004

### Implementation for User Story 3

- [X] T022 [P] [US3] Add `sounds: SoundTable` with all eight `VoiceSpec` entries to `src/lib/themes/classroom.ts` (FR-034, FR-035); depends on T004, T021
- [X] T023 [P] [US3] Add `sounds: SoundTable` with all eight `VoiceSpec` entries to `src/lib/themes/classic.ts`, with every event id's spec differing from Classroom's and every `level` within the same shared band as Classroom's (FR-039); depends on T004, T021

**Checkpoint**: Both shipped themes are fully and distinctly voiced; adding a
future theme now only requires one more `sounds` table plus its registry
entry (SC-007).

---

## Phase 6: User Story 4 - Silence is never a failure (Priority: P4)

**Goal**: Audio device creation is lazy, gesture-scoped, vendor-prefix-
tolerant, and every failure mode is silently swallowed; the game is fully
playable — including entirely by gamepad — with zero audible or visible
difference when audio is unavailable.

**Independent Test**: Drive `resolveAvailabilityAfterGesture` as a pure
function over injected outcome strings; assert device creation is wired only
to key/click/touch listeners, never gamepad polling.

### Tests for User Story 4 ⚠️

- [ ] T024 [P] [US4] Write `tests/lib/audio/availability.test.ts`: `resolveAvailabilityAfterGesture` maps `'noConstructor'`/`'throws'`/`'staysSuspended'`/`'resumeRejects'` to `'unavailable'` and `'healthy'` to `'available'` — the full outcome table, driven with literal strings, no `AudioContext`, no `Promise` timing, no DOM

### Implementation for User Story 4

- [ ] T025 [US4] Implement `AudioAvailability`, `AudioContextOutcome`, and `resolveAvailabilityAfterGesture(outcome): AudioAvailability` in `src/lib/audio/availability.ts` per the outcome table in contracts/audio-playback-api.md; depends on T024
- [ ] T026 [US4] Implement `createAudioEngine(): AudioEngine` in `src/lib/audio/engine.ts` — `unlock()` idempotent, attempts `new (window.AudioContext ?? (window as any).webkitAudioContext)()` and `.resume()` wrapped in `try`/`catch`/`.catch(() => {})` throughout, classifies the outcome via `resolveAvailabilityAfterGesture`; `play(events, sounds, muted)` no-ops with zero node allocation when `muted` or availability is not `'available'`, otherwise schedules one short oscillator/noise voice per event id from `sounds[eventId]`, entirely outside `tick()`, with every scheduling step failure-swallowed (FR-016, FR-017, FR-018, FR-019, FR-029, FR-043); no unit test — maintainer-verified per Principle VII; depends on T003, T004, T025
- [ ] T027 [US4] In `App.svelte`: instantiate one `AudioEngine` via `createAudioEngine()`; call `audioEngine.unlock()` inside the *existing* `onAnyKeyDown`/`onAnyClick`/`onAnyTouchStart` window listeners only — never from gamepad polling (FR-043); in `stepTick()`, capture the pre-tick session, and after `stepTickInner()` runs, call `audioEngine.play(applyVoiceCap(deriveSoundEvents(prevSession, session), DEFAULT_VOICE_CAP), theme.sounds, muted)` (FR-019, FR-020); depends on T007, T008, T020, T026

**Checkpoint**: All four user stories are complete. The game is audible, per-
theme, mutable, persisted, and silently degrades to feature-007 behavior
whenever audio is unavailable — with every pure module covered by `vitest`
and every impure device-lifecycle behavior left to the maintainer's
checklist.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final verification that the feature is additive-only and the
single-file build is intact.

- [ ] T028 [P] Run `npm test` (builds first, then the full suite) and confirm every existing feature-001–007 test still passes unchanged and `dist/` still holds exactly one self-contained `index.html` (SC-006); depends on T007, T008, T015–T020, T022, T023, T025, T026, T027
- [ ] T029 [P] Grep `src/sim/`, `src/lib/render/`, and `src/lib/audio/` for a theme-id branch (e.g. `theme ===`/`themeId ===` outside `src/lib/themes/`) and confirm none exists (FR-036); confirm `git diff`/the PR's file list touches no file under `src/sim/` (FR-002, FR-003)
- [ ] T030 Work through `spec.md`'s "What the maintainer listens for" checklist against a `npm run build` output of `dist/index.html` opened via `file://` (dirt step, fall start/land single and stacked, diamond collected, exit opening, explosion, low time, bonus tally, mute instant/no-tail/persists/unmute-plays-next, theme switch mid-cave, iOS Safari first-tap unlock, backgrounded/restored tab, controller-only session, off-camera events) — maintainer-only, not a `vitest` task; depends on T028

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup. **Blocks every user story.**
- **User Story 1 (Phase 3)**: Depends on Foundational (needs `SoundEventId`).
- **User Story 2 (Phase 4)**: Depends on Foundational only — does not need
  US1's event derivation to exist, since mute is a wholly separate state
  machine. Can proceed in parallel with US1 if staffed.
- **User Story 3 (Phase 5)**: Depends on Foundational (needs `Theme.sounds`'s
  shape from T004). Independent of US1/US2's runtime behavior.
- **User Story 4 (Phase 6)**: Depends on US1 (T007, T008 — `play()`'s call
  site needs `deriveSoundEvents`/`applyVoiceCap`) and US2 (T020 — needs
  `muted` state and the existing key/click/touch listeners) for its final
  `App.svelte` wiring task (T027); `availability.ts` itself (T024, T025) has
  no story dependency and could start as soon as Foundational is done.
- **Polish (Phase 7)**: Depends on all four stories being complete.

### User Story Dependencies

- US1: No dependency on other stories.
- US2: No dependency on other stories.
- US3: No dependency on other stories.
- US4: Depends on US1 and US2 for its `App.svelte` integration task only;
  its own pure `availability.ts` module is independent.

### Parallel Opportunities

- T001/T002 in parallel.
- Within Phase 3: T005 and T006 in parallel (different files); T007 and T008
  are independent implementations but each gated on its own test.
- Within Phase 4: T009–T013 (five test files) all in parallel; T015–T019
  (five implementation files) all in parallel once their respective tests
  exist.
- Within Phase 5: T022 and T023 in parallel (different theme files).
- Phases 3, 4, and 5 can all proceed in parallel once Phase 2 is done, if
  staffed — they touch disjoint files until Phase 6's `App.svelte` task
  (T027) integrates all three.
- T028 and T029 in parallel.

---

## Parallel Example: Phase 4 (User Story 2)

```bash
# Launch all Story 2 tests together:
Task: "Write tests/lib/audio/mute.test.ts"
Task: "Extend tests/lib/storage/save.test.ts for muted"
Task: "Extend tests/lib/input/keyboard.test.ts for MUTE_KEYS/consumeMute"
Task: "Extend tests/lib/input/touch/TouchInput.test.ts for consumeMute stub"
Task: "Extend tests/lib/input/gamepad/GamepadInput.test.ts for consumeMute edge-trigger"

# Then launch all Story 2 implementations together:
Task: "Implement src/lib/audio/mute.ts"
Task: "Extend src/lib/storage/save.ts for muted"
Task: "Extend src/lib/input/keyboard.ts for MUTE_KEYS/consumeMute"
Task: "Extend src/lib/input/touch/TouchInput.ts for consumeMute stub"
Task: "Extend src/lib/input/gamepad/bindings.ts + GamepadInput.ts for MUTE_BUTTON_INDEX/consumeMute"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational (`SoundEventId`, `Theme.sounds` shape).
3. Complete Phase 3: User Story 1 (event derivation + priority cap).
4. **STOP and VALIDATE**: `npm test` passes; `events.test.ts`/`priority.test.ts`
   pin every acceptance scenario. This alone is "the thing the issue asks
   for" per spec.md's own Why-this-priority note — sound events exist as
   correct, tested, pure data, hard-wired and ready for playback wiring.

### Incremental Delivery

1. Setup + Foundational → foundation ready.
2. Add User Story 1 → event derivation + cap, independently tested.
3. Add User Story 2 → mute state machine, independently tested and usable
   even with no sound yet.
4. Add User Story 3 → both themes fully voiced, independently tested.
5. Add User Story 4 → wire `engine.ts` and `App.svelte`'s per-tick
   derive→cap→play call, gesture-scoped unlock, and the on-screen mute
   button — this is the phase where sound actually becomes audible.
6. Polish → full-suite regression check, sim-boundary grep, maintainer
   listening pass.

### Parallel Team Strategy

With multiple developers, after Foundational:

- Developer A: User Story 1 (events + priority).
- Developer B: User Story 2 (mute — all five input-surface files).
- Developer C: User Story 3 (both theme sound tables).
- Once A, B, and C land, one developer completes User Story 4's `engine.ts`
  and `App.svelte` integration, since it is the single point that touches
  every other story's output.

---

## Notes

- [P] tasks touch different files with no unfinished dependency.
- [Story] labels map every phase-3-through-6 task to its user story for
  traceability.
- No task in this file touches any file under `src/sim/` — FR-002/FR-003 are
  structural constraints on every task above, not just T029's final check.
- `engine.ts` (T026) and the maintainer listening pass (T030) are the only
  two tasks with no `vitest` coverage, by design (Principle VII) — every
  other task pairs an implementation task with a preceding test task.
- Commit after each task or logical group; stop at any checkpoint to
  validate a story independently before moving on.
