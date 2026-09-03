# Implementation Plan: One Tap, One Cell

**Branch**: `spec/010-tap-moves-one-cell` | **Date**: 2026-09-03 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/010-tap-moves-one-cell/spec.md`

## Summary

Today every input source reports a held direction on every tick it observes
the control down, with no distinction between "just pressed" and "still
held." At the sim's 8 Hz tick rate (125 ms/tick), a comfortable human tap
(80–150 ms) routinely straddles two tick boundaries and is reported twice,
so a tap that should move the kid one cell often moves two. The maintainer's
clarification on issue #30 settles the trade-off explicitly: add a
**one-tick repeat delay** — a fresh press reports on the first tick that
observes it, is suppressed on the second, and reports again on every tick
from the third onward for as long as it is held. This guarantees any press
released within 250 ms is exactly one cell at every tick phase, while held
movement pays a single 125 ms hitch before it gets going.

This is a shell-only, input-layer fix. No file under `src/sim/` changes; the
sim keeps taking one direction-or-nothing per tick and moving exactly one
cell per tick per direction, unchanged. The fix is one new pure, named,
separately testable module — `src/lib/input/repeat.ts` — in the same idiom
as the existing `merge.ts`, `visibility.ts`, and `audio/mute.ts`, called by
all three input sources (keyboard, touch, gamepad) so the rule cannot drift
between them (FR-018). Each source keeps its own per-control repeat state;
none reimplements the rule.

## Technical Context

**Language/Version**: TypeScript 5.x, compiled by Vite; Svelte 5 (runes) —
unchanged from features 001–009.

**Primary Dependencies**: Unchanged — Svelte 5, Vite,
`vite-plugin-singlefile`, `@sveltejs/vite-plugin-svelte`, vitest. No new
runtime dependency; this feature adds one pure TypeScript module and edits
three existing input classes.

**Storage**: N/A — no persisted state. The repeat delay is a build-time
constant (`REPEAT_DELAY_TICKS`), never a player-facing setting and never
written to `localStorage` (spec's Assumptions: "nothing persists").

**Testing**: vitest, run headless (`npm test`, builds first), no DOM/canvas/
gamepad-hardware/browser-automation packages — unchanged. The new
`src/lib/input/repeat.ts` gets a literal-value-table unit test
(`tests/lib/input/repeat.test.ts`) exactly like `mute.ts`/`visibility.ts`
today. `KeyboardInput`, `TouchInput`, and `GamepadInput`'s existing test
files gain press/hold/release sequences driven through fake timers-free,
tick-by-tick calls (`consumeDirection()`/`poll()`), matching their current
style. `tests/lib/input/action-coverage.test.ts` gains one more
cross-source parity assertion (US3, FR-018, FR-019): all three sources
resolve repeats through the one shared function, not through independent
per-source logic.

**Target Platform**: Any modern browser via `file://`, one build artifact —
unchanged. Gamepad manual verification is deferred for want of hardware
(spec's "What the maintainer checks by hand", item 7); the gamepad
requirement and its node-level test are not deferred.

**Project Type**: Single front-end project — unchanged. No new top-level
directory; one new file in the existing `src/lib/input/` folder, alongside
`merge.ts` and `visibility.ts`.

**Performance Goals**: Steady frame rate — 60fps target / 30fps floor
(constitution Principle VI), unchanged. The rule adds one small counter
comparison per held control per tick — no per-tick allocation, no per-frame
work beyond an integer increment (SC-008).

**Constraints**: Zero files under `src/sim/` touched (FR-011); tick rate
unchanged at 8 Hz (FR-012); the rule is a pure, total function of
press/release state and a tick count, with no wall-clock read and no timer
anywhere in the input path — `Date.now()`/`performance.now()` are explicitly
out of bounds (FR-017); the grab modifier and every one-shot action
(pause, restart, start/confirm, cycle-theme, mute) are untouched (FR-013);
cross-source direction precedence (`resolveDirection` in `merge.ts`) is
untouched (FR-014); `dist/` remains exactly one self-contained
`index.html` with no added runtime dependency (FR-016).

**Scale/Scope**: One new file (`src/lib/input/repeat.ts`, on the order of a
dozen lines of logic, matching `mute.ts`'s size); edits to three existing
classes (`KeyboardInput`, `TouchInput`, `GamepadInput`) to add per-control
repeat state and call the shared rule; zero new `SessionState` field, zero
new `TickInput` field, zero new UI, zero new theme field. The two existing
"held direction repeats every tick" assertions named by FR-020 (one in
`tests/lib/input/touch/TouchInput.test.ts`, one in
`tests/lib/input/gamepad/GamepadInput.test.ts`) are updated to the new
cadence; no other existing assertion changes (FR-021).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Status |
|---|---|---|
| I. One Self-Contained Page | No new runtime dependency; one new plain-TypeScript file bundled into the same single-file build; `dist/index.html` remains the sole artifact (FR-016, SC-007) | PASS |
| II. Deterministic, Tick-Based Sim | Zero files under `src/sim/` change (FR-011, SC-006); the sim continues to take one direction-or-nothing per tick and to move exactly one cell per tick per direction — this feature only changes how many ticks a single press is allowed to speak for, never what the sim does with a direction once handed one (FR-001–FR-010) | PASS |
| III. Themes Are Data, Not Code | Not implicated — no element, appearance, or theme-registry change of any kind | PASS |
| IV. Simple, Dependency-Light Svelte | `src/lib/input/repeat.ts` is plain TypeScript, no Svelte import, no DOM access, matching `merge.ts`/`visibility.ts`'s existing precedent exactly; no new runtime dependency | PASS |
| V. Keyboard-First Input | The rule applies identically to keyboard, touch, and gamepad (FR-004) — no input mode is exempt or treated as second-class; a tap means the same thing everywhere (US3) | PASS |
| VI. Performance Is A Feature | The rule is one integer counter per held control, compared once per tick; no per-tick allocation, no new per-frame work (FR-010 note, SC-008) | PASS |
| VII. Verifiable Without A Browser | The entire rule is pure and total over (press/release state, tick count) with no wall-clock read, so it is fully covered by node-only `vitest` tests (FR-017, FR-019); only feel (the 125 ms hitch, touch re-acquire, gamepad hardware) is left to the maintainer's manual checklist, matching Principle VII's existing precedent for input code | PASS |

No violations. Complexity Tracking is not needed.

## Project Structure

### Documentation (this feature)

```text
specs/010-tap-moves-one-cell/
├── plan.md                        # This file (/speckit-plan command output)
├── research.md                    # Phase 0 output (/speckit-plan command)
├── data-model.md                  # Phase 1 output (/speckit-plan command)
├── quickstart.md                  # Phase 1 output (/speckit-plan command)
├── contracts/                     # Phase 1 output (/speckit-plan command)
│   └── repeat-delay-api.md          # NEW — REPEAT_DELAY_TICKS, RepeatState,
│                                    #   advanceRepeat(), and each source's
│                                    #   integration contract (FR-001–FR-010,
│                                    #   FR-017, FR-018)
├── checklists/
│   └── requirements.md
└── tasks.md                       # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

Additive/edit-only over the feature-001–009 skeleton. One new file in the
existing `src/lib/input/` folder; no new top-level directory.

```text
src/
├── sim/                                  # UNCHANGED — FR-011: no file under
│                                          #   src/sim/ is touched, no new export added
├── lib/
│   ├── input/
│   │   ├── repeat.ts                        # NEW — pure: REPEAT_DELAY_TICKS,
│   │   │                                    #   RepeatState, INITIAL_REPEAT_STATE,
│   │   │                                    #   advanceRepeat(state, isHeldThisTick)
│   │   │                                    #   -> { state, report } (FR-001–FR-003,
│   │   │                                    #   FR-005–FR-008, FR-017, FR-018)
│   │   ├── keyboard.ts                       # EDIT — KeyboardInput tracks one
│   │   │                                     #   RepeatState per held Direction
│   │   │                                     #   (Map<Direction, RepeatState>),
│   │   │                                     #   advances every tracked direction
│   │   │                                     #   once per consumeDirection() call,
│   │   │                                     #   resets a direction's state on
│   │   │                                     #   keyup/re-keydown (FR-004, FR-006,
│   │   │                                     #   FR-007, FR-009 unaffected — the
│   │   │                                     #   pendingTap sub-tick path is untouched)
│   │   ├── touch/
│   │   │   └── TouchInput.ts                  # EDIT — TouchInput tracks one
│   │   │                                      #   RepeatState plus the last resolved
│   │   │                                      #   Direction; a changed direction
│   │   │                                      #   (including a slide between pad
│   │   │                                      #   zones) resets state as a fresh
│   │   │                                      #   press (FR-004, FR-020)
│   │   └── gamepad/
│   │       └── GamepadInput.ts                 # EDIT — GamepadInput tracks one
│   │                                           #   RepeatState plus the last merged
│   │                                           #   Direction per pad, advanced once
│   │                                           #   per poll() (FR-004, FR-020)
│   ├── audio/                                 # UNCHANGED
│   ├── render/                                # UNCHANGED
│   ├── session/                               # UNCHANGED — no new SessionState/
│   │                                          #   TickInput field
│   ├── storage/                               # UNCHANGED — no new persisted field
│   └── themes/                                # UNCHANGED
└── App.svelte                                 # UNCHANGED — stepTickInner() already
                                                # calls consumeDirection() exactly once
                                                # per source per tick (contracts/
                                                # repeat-delay-api.md's required call
                                                # discipline); no new call site

tests/
└── lib/
    └── input/
        ├── repeat.test.ts                       # NEW — literal-table unit test:
        │                                        #   tick 1 reports, tick 2 suppresses,
        │                                        #   tick 3+ reports, release resets to
        │                                        #   INITIAL_REPEAT_STATE, re-press is
        │                                        #   a fresh state (FR-001–FR-003,
        │                                        #   FR-005, FR-006, SC-001, SC-003, SC-004)
        ├── keyboard.test.ts                      # + press/hold/release sequences:
        │                                         #   sub-tick tap (FR-009, unchanged),
        │                                         #   tap at every tick offset up to two
        │                                         #   observed ticks (FR-001), held
        │                                         #   cadence over many ticks (FR-002,
        │                                         #   FR-003), release-then-re-press
        │                                         #   (FR-006), direction change while
        │                                         #   held (FR-007, US2 AC3/AC4)
        ├── touch/
        │   └── TouchInput.test.ts                 # CHANGE (FR-020) — the existing "every
        │                                          #   consumeDirection() call returns the
        │                                          #   held direction" assertion becomes
        │                                          #   the new one-tick-gap cadence; + the
        │                                          #   same tap/hold/release/direction-
        │                                          #   change sweep as keyboard.test.ts
        ├── gamepad/
        │   └── GamepadInput.test.ts                # CHANGE (FR-020) — same cadence update
        │                                           #   as touch, driven through poll()
        │                                           #   instead of a raw event; + the same
        │                                           #   tap/hold/release/direction-change
        │                                           #   sweep
        └── action-coverage.test.ts                  # + one more cross-source assertion
                                                       # (US3, FR-018, FR-019): keyboard,
                                                       # touch, and gamepad each resolve
                                                       # their repeat cadence by calling the
                                                       # same imported advanceRepeat(), not
                                                       # by an independently-shaped
                                                       # per-source implementation
```

**Structure Decision**: Same single Svelte/Vite project as features
001–009. The fix is entirely additive/edit-only inside the existing
`src/lib/input/` folder: one new pure module (`repeat.ts`) alongside its
existing siblings (`merge.ts`, `visibility.ts`), and small, mechanically
similar edits to the three existing `*Input` classes to hold one
`RepeatState` value (or one per direction, for keyboard's multi-key stack)
and call the shared function once per tick. No new directory, no new
top-level concept, no `App.svelte` change — the shell's per-tick call
discipline (`consumeDirection()` called exactly once per source per tick)
already matches what the rule requires. Tests continue to mirror `src/`
under `tests/`, with one new file (`tests/lib/input/repeat.test.ts`) and
edits to the four existing input test files named above.

## Complexity Tracking

*No violations — table not needed.*
