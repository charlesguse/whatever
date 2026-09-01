# Quickstart: Synthesized Sound, Per Theme, Always Mutable

How to validate this feature end-to-end once implemented. See
[data-model.md](./data-model.md) for entity shapes and
[contracts/sound-events-api.md](./contracts/sound-events-api.md),
[contracts/mute-api.md](./contracts/mute-api.md),
[contracts/audio-playback-api.md](./contracts/audio-playback-api.md), and
[contracts/theme-sound-table-api.md](./contracts/theme-sound-table-api.md)
for the new module surfaces. This extends features 001–007's quickstarts —
their checks (single-file build, sim physics, the arcade shell's screens/
score/lives/persistence, the theme registry and switcher, touch/gamepad
input) still apply unchanged, and this feature adds no new check to any of
them beyond "still passes with zero modification" (FR-002, FR-003,
FR-034's disjointness from FR-018).

## Prerequisites

- `npm install` at the repo root (unchanged from features 001–007)

## Validate the sound model in isolation (no browser, no audio device)

```bash
npm test
```

**Expected outcome**: builds first, then the full `vitest` suite passes
with no browser, canvas, or `AudioContext` present, covering — per the
spec's Independent Tests — every case in the checklist below.

**Event derivation (User Story 1):**

- ASCII-cave `SessionState` pairs pin every event id's exact per-tick
  trigger: a dirt-clearing step yields `dirtStep`, walking onto already-
  empty ground does not; a single boulder's fall yields exactly one
  `fallStart` on the tick it lets go and no repeat while it keeps falling,
  exactly one `fallLand` on the tick it stops; a five-boulder collapse
  yields exactly one `fallLand` for the tick, not five; a boulder rolling
  off another boulder yields `fallStart` on the tick it leaves rest; a
  boulder that lands and immediately falls again yields `fallLand` then
  `fallStart` on consecutive ticks;
- a diamond collection yields `diamondCollected`; a quota-meeting
  collection yields exactly one `doorOpen`, never repeated for the rest of
  the attempt, and re-armed by a restart;
- one or more explosion cells appearing yields exactly one `explosion`
  regardless of blast size;
- remaining time at or below the low-time threshold yields exactly one
  `timeLow` per whole second, none above it, none while paused;
- the cave-complete tally yields `bonusTally` each tick until the tally
  finishes or the screen is skipped, whichever comes first;
- no gameplay event is ever produced on a non-playing screen, and
  `bonusTally` is the only event ever produced on `caveComplete`;
- replaying the same cave and input sequence produces the identical event
  sequence every time (FR-013).

**Voice priority (part of User Story 1 / User Story 4):**

- `VOICE_PRIORITY_ORDER`'s full stated order (FR-020a);
- `applyVoiceCap` over an over-cap event-id set resolves to the same
  surviving subset on every run, with a player-caused `explosion` or
  `diamondCollected` never dropped in favor of a `fallLand`, `fallStart`,
  or `dirtStep` (SC-008).

**Mute state machine (User Story 2):**

- `resolveStoredMute`'s full defensive table: `true`/`false` round-trip,
  every non-boolean input (`undefined`, `null`, a string, a number)
  resolves to `false`;
- `toggleMute` applied N times lands on the parity of N;
- `SaveRecord.muted` round-trips through `writeSave`/`readSave`, is
  last-write-wins (a call that omits `muted` never changes the stored
  value), and a throwing/absent store degrades to "works this session,
  nothing persisted, no throw" (mirroring the existing `save.test.ts`
  pattern for `themeId`);
- `MUTE_KEYS` is non-empty and disjoint from every other keyboard binding;
  `consumeMute()` is one-shot on `KeyboardInput` and `GamepadInput`
  (edge-triggered, never repeats while held), and always `false` on
  `TouchInput`;
- `action-coverage.test.ts`'s existing "every source's action is covered
  by keyboard" check passes with `consumeMute` included.

**Audio availability (User Story 4):**

- `resolveAvailabilityAfterGesture`'s full outcome table: no constructor,
  a throwing constructor, a context that stays suspended, and a rejected
  resume all resolve to `'unavailable'`; a healthy context resolves to
  `'available'` (US4 Independent Test).

**Theme sound table completeness (User Story 3):**

- every registered theme defines a `VoiceSpec` for every one of the eight
  event ids, with no gaps and no shared fallback table (FR-034, SC-002);
- every `VoiceSpec` field falls inside its declared range (FR-035);
- Classroom and Classic differ on every event id (FR-039);
- every voice's `level` across both themes falls within one shared
  declared range (FR-039's "not a volume jump");
- no file under `src/sim/`, no rendering module, and no `src/lib/audio/`
  module contains a theme-id branch (FR-036, grep-checkable).

**No regression (FR-002, FR-003, FR-034 disjointness):**

- every existing sim, session, storage, theme, and input test from
  features 001–007 passes unchanged;
- `git diff` (or the PR's file list) touches no file under `src/sim/`.

## Validate the build is still a single, dependency-free file

```bash
npm run build
```

**Expected outcome**: unchanged in shape — `dist/index.html` is the only
file play depends on, now with the audio engine's code inlined, no audio
asset added, no new runtime dependency, no external network request at
play time (FR-015, SC-006).

## Validate by ear (maintainer, per `spec.md`'s "What the maintainer listens for")

CI has no audio device — the sounds themselves, device-lifecycle behavior
on real platforms, and frame-rate-under-load are the maintainer's job at
review time. Run `npm run build`, open `dist/index.html` from disk via
`file://`, and work through `spec.md`'s numbered listening checklist
directly rather than a duplicate list here: dirt step, fall start/land (a
single boulder, then a stack), diamond collected, exit opening, explosion,
low time, bonus tally, mute (instant, no tail, persists across reload,
unmute plays only what's next), theme switch mid-cave, iOS Safari's first-
tap unlock, a backgrounded/restored tab, a controller-only session (silent
throughout, mute control still present and functional), and off-camera
events in a cave larger than the viewport.
