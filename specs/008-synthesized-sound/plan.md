# Implementation Plan: Synthesized Sound, Per Theme, Always Mutable

**Branch**: `spec/008-synthesized-sound` | **Date**: 2026-09-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/008-synthesized-sound/spec.md`

## Summary

Features 001–007 built a deterministic sim with read-only accessors
(002/005), a theme registry where appearance is plain data keyed by
element id (006), and a fixed named-action vocabulary reachable from
keyboard, touch, and gamepad (007). This feature closes the constitution's
last unbuilt Product Constraint line — synthesized, per-theme, always-
mutable sound — by adding one more **observation layer** (not a sim
change): a pure function that watches two consecutive `SessionState`
snapshots through the sim's existing accessors and emits a closed set of
eight sound event ids (`dirtStep`, `fallStart`, `fallLand`,
`diamondCollected`, `doorOpen`, `explosion`, `timeLow`, `bonusTally`), one
more **named action** (mute — reachable from keyboard, gamepad, and a new
dedicated on-screen button, exactly like cycle-theme's existing three-way
split), one more **themed field family** (`Theme.sounds`, a required plain-
data table of oscillator/noise voice specs keyed by event id), and one
impure, WebAudio-facing **playback engine** that is lazily created inside a
real user gesture, swallows every failure, and is verified by the
maintainer's ear rather than by CI.

`src/sim/**` is untouched throughout (FR-002, FR-003, FR-036, FR-037): the
event-derivation module reads only what features 002/005 already exposed
read-only, adds no new accessor, and changes no cell state, physics rule,
or existing test's expected grid. Mute is a plain boolean, not a
`SessionState` field (FR-030): toggling it can never perturb the cave,
score, clock, or tick count. The playback engine's own device-lifecycle
logic is un-unit-testable (no `AudioContext` in node) and is instead
covered by the maintainer checklist already written into `spec.md`'s "What
the maintainer listens for," matching Principle VII's existing precedent
for canvas/DOM-touching code.

## Technical Context

**Language/Version**: TypeScript 5.x, compiled by Vite; Svelte 5 (runes) —
unchanged from features 001–007.

**Primary Dependencies**: Unchanged — Svelte 5, Vite,
`vite-plugin-singlefile`, `@sveltejs/vite-plugin-svelte`, vitest. No new
runtime dependency: every sound is synthesized from the platform
`AudioContext`/`webkitAudioContext`, `OscillatorNode`, `GainNode`, and a
generated noise buffer (`AudioBufferSourceNode` fed by
`AudioContext.createBuffer` filled with sample values computed in code) —
no audio file, no audio library, no polyfill (FR-015).

**Storage**: `localStorage` via `src/lib/storage/save.ts`, extended by one
new optional field, `muted?: boolean`, alongside the existing `themeId?`
field — persisted last-write-wins like `themeId`, not grow-only like
`highScore`/`furthestCave` (research.md, FR-031, FR-032, FR-033).

**Testing**: vitest, run headless (`npm test`, builds first), no DOM/
canvas/audio-device/browser-automation packages — unchanged. New pure
functions follow the existing pattern: `deriveSoundEvents`/`applyVoiceCap`
are exercised over `SessionState` pairs built with the existing
`tests/sim/helpers/ascii-cave.ts` harness; `resolveStoredMute`/
`toggleMute`/`resolveAvailabilityAfterGesture` are exercised with literal
inputs, exactly like `resolveStoredThemeId`/`cycleThemeId` today. The
impure playback engine (`src/lib/audio/engine.ts`) has **no** `vitest`
coverage — no `AudioContext` exists in the node test environment — and is
instead verified by the maintainer against `spec.md`'s listening checklist
(Principle VII's existing precedent).

**Target Platform**: Any modern browser via `file://`, one build artifact —
unchanged. Sound code paths are written so a platform with no `AudioContext`
at all (or one that throws, stays suspended, or rejects `.resume()`) sees
zero behavioral change from feature 007 — same caves, same speed, same
screens, nothing logged or shown (FR-018, User Story 4).

**Project Type**: Single front-end project — unchanged. No new top-level
directory beyond `src/lib/audio/`. `App.svelte` remains the only `.svelte`
file; its markup gains one new always-rendered mute button, and its script
gains one `AudioEngine` instance, one `muted` `$state`, and a per-tick
derive→cap→play call sequence.

**Performance Goals**: Steady frame rate — 60fps target / 30fps floor
(constitution Principle VI) — held during a large chain reaction with
sound on, indistinguishable from the same run muted (SC-005). Event
derivation's grid scans (for `explosion` and `fallStart`/`fallLand`) use
plain nested loops over primitive booleans, never a per-cell object or
array (research.md's FR-019 interpretation); the returned event list and
the capped list are both bounded at ≤8 and ≤`DEFAULT_VOICE_CAP` elements
respectively, built once per tick. All WebAudio node creation happens
outside `tick()`, in the shell's per-tick playback call, never inside the
sim's hot loop (FR-019).

**Constraints**: Zero network requests at play time (FR-015); zero audio
files added to the build (`dist/` still holds exactly one self-contained
`index.html`, SC-006); zero files under `src/sim/` touched (FR-002,
FR-003); zero new runtime dependency (Principle IV); the audio device is
created only inside a key/click/touch gesture, never at module or page
load, and never from gamepad input (FR-016, FR-043); every audio failure
is swallowed with nothing thrown, logged, or shown (FR-018); sound is
never the only signal for any game state — every event's on-screen
equivalent is unchanged (FR-022).

**Scale/Scope**: One new directory, `src/lib/audio/` (`events.ts`,
`priority.ts`, `mute.ts`, `availability.ts`, `engine.ts`); one extended
theme field (`Theme.sounds`) populated for both shipped themes (16 total
`VoiceSpec` entries); one new optional save field; three small input-layer
additions (a keyboard key set, a gamepad button index, a `TouchInput`
stub) mirroring feature 007's cycle-theme precedent exactly; one new
always-rendered UI control in `App.svelte`. No new `SessionState` field,
no new `TickInput` field, no new cave, no new element id.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Status |
|---|---|---|
| I. One Self-Contained Page | Every voice is synthesized at runtime from `AudioContext` oscillators/generated noise — no audio file added, no network request at play time, no new runtime dependency; `dist/index.html` remains the single artifact (FR-015, SC-006) | PASS |
| II. Deterministic, Tick-Based Sim | Zero files under `src/sim/` change (FR-002, FR-003); event derivation only *reads* existing accessors across two already-computed `SessionState`s, never calls `tick()` itself, never introduces randomness or a wall-clock read (FR-013); mute is not a `SessionState` field, so toggling it cannot perturb the grid, score, clock, or tick count (FR-030, checked by a byte-identical-run test) | PASS |
| III. Themes Are Data, Not Code | `Theme.sounds` is one more required, plain-data field family alongside `elements`/`doorOpenEntry`/etc.; no file under `src/sim/`, no rendering module, and no `src/lib/audio/` module branches on a theme id (FR-034, FR-036); adding a theme touches only that theme's file and its registry entry (FR-037, SC-007) | PASS |
| IV. Simple, Dependency-Light Svelte | No new runtime dependency — WebAudio is a platform API, not a library; `src/lib/audio/events.ts`/`priority.ts`/`mute.ts`/`availability.ts` are plain TypeScript with no Svelte import, mirroring `src/lib/input/`'s existing precedent; only `engine.ts` and `App.svelte` touch the DOM/`AudioContext`, and neither runs in the sim's hot path | PASS |
| V. Keyboard-First Input | Mute is reachable from keyboard (new disjoint key), gamepad (new disjoint button, edge-triggered), and a dedicated always-rendered on-screen control — no input mode is the only way to reach it (FR-024, FR-025), matching cycle-theme's existing three-way split exactly | PASS |
| VI. Performance Is A Feature | Event-derivation grid scans use primitive-only nested loops, never per-cell allocation; the sim's own `tick()` is untouched and stays allocation-free; all WebAudio node creation happens outside the tick loop, capped at `DEFAULT_VOICE_CAP` voices per tick so a large chain reaction cannot degrade frame rate or clip into distortion (FR-019, FR-020, SC-005) | PASS |
| VII. Verifiable Without A Browser | Every requirement testable without a real device is: event derivation (ASCII-cave `SessionState` pairs), the voice-priority cap (literal event-id lists), the mute state machine and its persistence, the audio-availability resolver (injected outcome strings), and per-theme sound-table completeness/ranges/distinctness — all plain `vitest`, no DOM/canvas/audio device. Everything that genuinely needs a real `AudioContext`, a real gesture, or a real ear is an explicit "What the maintainer listens for" checklist item already in `spec.md`. No browser-automation infrastructure is added | PASS |

No violations. Complexity Tracking is not needed.

## Project Structure

### Documentation (this feature)

```text
specs/008-synthesized-sound/
├── plan.md                        # This file (/speckit-plan command output)
├── research.md                    # Phase 0 output (/speckit-plan command)
├── data-model.md                  # Phase 1 output (/speckit-plan command)
├── quickstart.md                  # Phase 1 output (/speckit-plan command)
├── contracts/                     # Phase 1 output (/speckit-plan command)
│   ├── sound-events-api.md          # NEW — SoundEventId, deriveSoundEvents,
│   │                                 #   VOICE_PRIORITY_ORDER, applyVoiceCap
│   ├── mute-api.md                   # NEW — resolveStoredMute, toggleMute,
│   │                                 #   SaveRecord.muted, three-source reachability
│   ├── audio-playback-api.md          # NEW — AudioAvailability, engine.ts's
│   │                                  #   unlock()/play() contract, maintainer-only items
│   └── theme-sound-table-api.md        # NEW — VoiceSpec, SoundTable, Theme.sounds,
│                                        #   completeness/distinctness/range rules
├── checklists/
│   └── requirements.md
└── tasks.md                             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

Additive over the feature-001–007 skeleton. One new top-level directory,
`src/lib/audio/`, sitting alongside `src/lib/input/`, `src/lib/render/`,
`src/lib/session/`, `src/lib/storage/`, and `src/lib/themes/`.

```text
src/
├── sim/                                 # UNCHANGED — FR-002, FR-003: no file under
│                                        #   src/sim/ is touched, no new export added
├── lib/
│   ├── audio/                            # NEW top-level folder
│   │   ├── events.ts                       # NEW — pure: SoundEventId; deriveSoundEvents
│   │   │                                   #   (prev: SessionState, next: SessionState)
│   │   │                                   #   -> readonly SoundEventId[] (FR-001–FR-014)
│   │   ├── priority.ts                      # NEW — pure: VOICE_PRIORITY_ORDER,
│   │   │                                    #   DEFAULT_VOICE_CAP, applyVoiceCap
│   │   │                                    #   (FR-020, FR-020a, FR-020b)
│   │   ├── mute.ts                           # NEW — pure: resolveStoredMute, toggleMute
│   │   │                                     #   (FR-023, FR-032)
│   │   ├── availability.ts                    # NEW — pure: AudioAvailability,
│   │   │                                       #   AudioContextOutcome,
│   │   │                                       #   resolveAvailabilityAfterGesture
│   │   │                                       #   (US4 Independent Test)
│   │   └── engine.ts                            # NEW — impure, no unit test: createAudioEngine()
│   │                                            #   -> { unlock(), play(events, sounds, muted) };
│   │                                            #   vendor-prefix fallback (FR-017); every step
│   │                                            #   try/catch-swallowed (FR-018); no node
│   │                                            #   allocation when muted/unavailable (FR-029)
│   ├── input/
│   │   ├── keyboard.ts                        # + MUTE_KEYS = new Set(['m','M']);
│   │   │                                      #   consumeMute(), shaped like consumeCycleTheme()
│   │   ├── touch/
│   │   │   └── TouchInput.ts                   # + consumeMute() stub, always false — mirrors
│   │   │                                       #   consumeCycleTheme()'s existing stub; the real
│   │   │                                       #   route is App.svelte's new on-screen button
│   │   └── gamepad/
│   │       ├── bindings.ts                      # + MUTE_BUTTON_INDEX (flagged, 4 — left
│   │       │                                     #   shoulder/bumper)
│   │       └── GamepadInput.ts                   # + consumeMute(), edge-triggered via the
│   │                                             #   existing mapOneShotButtons machinery
│   ├── storage/
│   │   └── save.ts                              # + SaveRecord.muted?: boolean; readSave/
│   │                                             #   writeSave extended, last-write-wins
│   │                                             #   (not grow-only), FR-031–FR-033
│   ├── session/                                  # UNCHANGED — no new SessionState/TickInput
│   │                                             #   field; deriveSoundEvents reads
│   │                                             #   SessionState by its existing shape only
│   └── themes/
│       ├── types.ts                               # + VoiceSpec, SoundTable; Theme.sounds
│       │                                          #   (new required field)
│       ├── classroom.ts                            # + sounds: SoundTable (8 VoiceSpecs)
│       └── classic.ts                               # + sounds: SoundTable (8 VoiceSpecs,
│                                                     #   every id audibly distinct from
│                                                     #   classroom's per FR-039)
└── App.svelte                                        # + createAudioEngine() instance; +
                                                        # muted $state (resolveStoredMute at
                                                        # init); + toggleMuted() (writeSave,
                                                        # never touches session); + audioEngine
                                                        # .unlock() calls added inside the
                                                        # *existing* onAnyKeyDown/onAnyClick/
                                                        # onAnyTouchStart listeners (feature
                                                        # 007) — never wired to gamepad; +
                                                        # stepTickInner() reads
                                                        # orAll(keyboard.consumeMute(),
                                                        # touch.consumeMute(),
                                                        # gamepad.consumeMute()) alongside the
                                                        # existing cycle-theme check, before
                                                        # any screen branch; + stepTick()
                                                        # captures the pre-tick session,
                                                        # after stepTickInner() calls
                                                        # applyVoiceCap(deriveSoundEvents(prev,
                                                        # session), DEFAULT_VOICE_CAP) and
                                                        # hands the result to
                                                        # audioEngine.play(...,
                                                        # theme.sounds, muted); + markup gains
                                                        # one always-rendered
                                                        # <button aria-pressed={muted}>,
                                                        # styled like the theme-picker buttons

tests/
└── lib/
    ├── audio/                                # NEW top-level test folder, mirrors src/lib/audio/
    │   ├── events.test.ts                      # NEW — ASCII-cave SessionState pairs pin every
    │   │                                       #   FR-004–FR-013 acceptance scenario and edge
    │   │                                       #   case (single fall, five-boulder collapse,
    │   │   #   roll-off, land-then-refall, dirt vs. push vs. blocked move,
    │   │   #   quota-met-by-blast doorOpen timing, screen gating, determinism
    │   │   #   over a replayed input sequence)
    │   ├── priority.test.ts                     # NEW — VOICE_PRIORITY_ORDER's full order;
    │   │                                        #   applyVoiceCap never drops a player-caused
    │   │                                        #   explosion/diamondCollected in favor of a
    │   │                                        #   fallLand/fallStart/dirtStep (SC-008)
    │   ├── mute.test.ts                          # NEW — resolveStoredMute's total defensive
    │   │                                         #   table; toggleMute's parity-of-N property
    │   └── availability.test.ts                   # NEW — resolveAvailabilityAfterGesture's full
    │                                              #   outcome table (US4 Independent Test)
    ├── themes/
    │   └── sound-table-completeness.test.ts        # NEW — mirrors registry-completeness.test.ts:
    │                                               #   every theme x every SoundEventId present,
    │                                               #   every field's declared range holds,
    │                                               #   Classroom/Classic differ per event id,
    │                                               #   every level within one shared band
    │                                               #   (FR-034, FR-035, FR-039, FR-040, SC-002)
    ├── storage/
    │   └── save.test.ts                             # + muted round-trip, last-write-wins
    │                                                 #   (not grow-only), malformed-value cases
    └── input/
        ├── keyboard.test.ts                          # + MUTE_KEYS non-empty, consumeMute()
        │                                             #   one-shot shape, disjoint from every
        │                                             #   other key set
        ├── action-coverage.test.ts                    # + 'consumeMute' added to NAMED_ACTIONS;
        │                                              #   every source's consumeMute() covered
        │                                              #   by keyboard's (SC-012's existing shape)
        ├── touch/
        │   └── TouchInput.test.ts                      # + consumeMute() always returns false
        └── gamepad/
            └── GamepadInput.test.ts                     # + consumeMute() edge-triggers exactly
                                                          #   once per press, held button does
                                                          #   not repeat (FR-026)
```

**Structure Decision**: Same single Svelte/Vite project as features
001–007; one new top-level directory, `src/lib/audio/`, grouping every
sound-specific pure module (events, priority, mute, availability) plus the
one impure playback engine the way `src/lib/input/` already groups
touch/gamepad geometry and mapping. Every other new surface is additive to
an existing file at its existing precedent (a new key set in
`keyboard.ts`, a new button index in `gamepad/bindings.ts`, a new required
field in `themes/types.ts`). Tests continue to mirror `src/` under
`tests/`, with a new `tests/lib/audio/` folder and one new file under the
existing `tests/lib/themes/`. `App.svelte` remains the single
orchestration point — the only file that knows about `session.screen`,
every input source, the render loop, and now the audio engine at once —
exactly as it already is for keyboard/touch/gamepad/theme.

## Complexity Tracking

*No violations — table not needed.*
