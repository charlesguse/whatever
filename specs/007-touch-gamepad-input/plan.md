# Implementation Plan: Touch Controls And Gamepad Support

**Branch**: `007-touch-gamepad-input` | **Date**: 2026-08-31 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-touch-gamepad-input/spec.md`

## Summary

Features 001–006 built one input source (`KeyboardInput`) that reduces raw
key events to a fixed vocabulary of named actions — move, grab, pause,
restart, start/confirm, cycle theme — and one consumption point,
`App.svelte`'s `stepTickInner()`, that reads it once per tick. Feature 006
made the last of those actions (cycle theme) a first-class named action
specifically so this feature would not have to reopen that code (006
FR-033). This feature adds two more **sources** of that same fixed
vocabulary — touch and gamepad — plus a **merge layer** that combines all
three by a fixed rule (FR-005 direction precedence: keyboard, then touch,
then gamepad; FR-006 logical OR for grab and every one-shot), and a
**visibility layer** that decides, as a pure function of reported
capabilities and the player's last discrete input, whether the touch
controls exist in the page at all.

Both new sources are shaped like `KeyboardInput` already is: a small
stateful class with `consumeDirection()`/`consumeGrab()`/`consumeRestart()`/
`consumeStart()`/`consumePause()`/`consumeCycleTheme()`, each backed by pure
mapping functions that take plain values (a touch coordinate and a pad
geometry; a `Gamepad` snapshot and a binding table) and return a named
action or nothing — so every rule in the spec that must be testable without
a browser (touch zone resolution, the dead area, multi-touch tracking,
stick deadzone-with-hysteresis, tie-breaking, edge-triggering, source
merging, the visibility table) is a plain function or a plain class driven
by synthetic events/snapshots in `vitest`, with no DOM, canvas, or
browser-automation dependency added (Principle VII).

The on-screen controls occupy a **reserved layout area**, never an overlay
(FR-031): a new pure geometry module computes, from a safe-area inset box
and an orientation, the reserved control rect, the pad's center/zones/dead
radius, the three buttons' rects, and the rectangle left over for the cave
— the same rectangle the canvas element is then CSS-sized to, so
`src/lib/render/canvas.ts`'s existing `computeViewportCells()` needs no
change: it already treats `canvas.clientWidth`/`clientHeight` as the whole
drawable area, and that area is now smaller by construction rather than by
a new parameter. `src/sim/**` is untouched throughout (FR-033): both new
sources terminate at the same `TickInput { direction?, grab? }` shape
`tick()` already accepts, and pause/restart/start/cycle-theme are resolved
in the shell exactly where they are resolved today, before the sim is
consulted at all.

## Technical Context

**Language/Version**: TypeScript 5.x, compiled by Vite; Svelte 5 (runes) —
unchanged from features 001–006

**Primary Dependencies**: Unchanged — Svelte 5, Vite, `vite-plugin-singlefile`,
`@sveltejs/vite-plugin-svelte`, vitest. No new runtime dependency: touch
handling uses the platform `TouchEvent`/`PointerEvent` and CSS
(`touch-action`, `env(safe-area-inset-*)`) APIs already available in any
target browser; gamepad handling uses the platform `Gamepad` API
(`navigator.getGamepads()`, `gamepadconnected`/`gamepaddisconnected`).
Neither needs a polyfill or library — both are feature-detected and the
absence path (FR-027, FR-028) is a capability check, never a caught
exception.

**Storage**: Unchanged — `localStorage` via `src/lib/storage/save.ts`. This
feature adds no persisted field: touch visibility is derived fresh each
load from capability plus in-session last-input-source (FR-030), never
stored, per the Out-of-Scope section's rejection of a persisted
show/hide preference.

**Testing**: vitest, run headless (`npm test`, builds first), no DOM/
canvas/audio-device/browser-automation packages — unchanged. New pure
functions and classes follow `tests/lib/input/keyboard.test.ts`'s existing
pattern exactly: a hand-rolled `fakeTarget()`/stub-event style for
touch (synthetic `TouchList`-shaped objects), a hand-rolled fake
`Gamepad` snapshot array for gamepad, and plain assertions over the
`consume*()` surface — no `@testing-library`, no headless browser, no
real `TouchEvent`/`Gamepad` construction (Principle VII).

**Target Platform**: Any modern browser via `file://`, one build artifact
— unchanged. Touch and gamepad code paths are written so that a platform
lacking either API sees zero behavior change from feature 006 (no
listener attached, no polling loop, no rendered control), verified by the
absence tests in User Story 3 and the maintainer's plain-desktop review
pass.

**Project Type**: Single front-end project — unchanged. No router, no
second HTML page, no new build target. `src/App.svelte` remains the only
`.svelte` file; its markup gains conditionally-rendered control elements
and its script gains two new input-source instances plus the merge/
visibility plumbing that already-established pattern (keyboard consumed
once per tick in `stepTickInner()`) extends naturally to.

**Performance Goals**: Steady frame rate — 60fps target / 30fps floor
(constitution Principle VI) — held with touch controls shown and at least
one controller polled every tick (FR-037, SC-013). Gamepad polling is one
`navigator.getGamepads()` call per tick (the sim's cadence, not the
render loop's), reading into a **reused** `Map<number, GamepadPadState>`
keyed by gamepad index rather than rebuilding arrays/objects; touch
bookkeeping is a reused `Map<number, TouchAssignment>` keyed by
`Touch.identifier`. Neither hot path allocates a new collection per tick,
matching the existing `{ direction, grab }` per-tick literal's already-
accepted allocation shape (unchanged from feature 001).

**Constraints**: Zero network requests at play time; zero new image/font/
audio files; zero files under `src/sim/` touched (FR-033); zero new
runtime dependency (Principle IV); the shipped artifact remains one
self-contained `dist/index.html` that runs from `file://`, including
whatever viewport (`viewport-fit=cover`, pinch-zoom suppression) and
gesture-suppression (`touch-action: none`, `touchmove`/`gesturestart`
prevention) configuration this feature needs — all of it inline in the
one HTML/CSS/JS bundle, per Principle I (FR-038). No input mode may be
the only way to reach any feature (FR-035) — the keyboard's declared
action coverage remains the superset every other source is checked
against (SC-012).

**Scale/Scope**: Two new stateful input-source classes
(`TouchInput`, `GamepadInput`) matching `KeyboardInput`'s existing shape;
five new small pure modules (`merge.ts`, `visibility.ts`, `touch/layout.ts`,
`touch/axis.ts` shared with gamepad stick resolution, `gamepad/mapping.ts`
+ `gamepad/bindings.ts`); one new reserved-layout region in `App.svelte`'s
markup and CSS; one new safe-area-inset read at mount/resize; no new
top-level directory beyond `src/lib/input/touch/` and
`src/lib/input/gamepad/`. No new element ids, no new caves, no new
`SessionState` field, no new `TickInput` field.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Status |
|---|---|---|
| I. One Self-Contained Page | Touch/gamepad code is inline TS/CSS in the existing single-page bundle; no new asset, no new page, no CDN/network call; viewport and `touch-action` configuration is inline markup/CSS in `index.html`/`App.svelte`, not an external manifest | PASS |
| II. Deterministic, Tick-Based Sim | Zero files under `src/sim/` change (FR-033); both new sources terminate at the existing `TickInput { direction?, grab? }` shape; pause/restart/start/cycle-theme resolve in the shell before `tick()`/`tickSession()` is ever called, exactly as keyboard's do today; a hardware connect/disconnect event never mutates `SessionState` (FR-025, checked by US4's pure tests) | PASS |
| III. Themes Are Data, Not Code | Untouched — this feature adds no rendering logic and no theme field; the reserved control area is shell layout, not a themed element, and renders with fixed chrome (not per-theme colors) unless a later spec says otherwise | PASS (N/A) |
| IV. Simple, Dependency-Light Svelte | No new runtime dependency; `TouchInput`/`GamepadInput` are plain TypeScript classes with no Svelte import, mirroring `KeyboardInput`'s existing precedent exactly; `App.svelte` gains markup, CSS, and thin per-tick plumbing only | PASS |
| V. Keyboard-First Input | This is the principle's second half, delivered exactly as it requires: touch and gamepad are additional sources feeding the same named-action vocabulary (FR-002), both feature-detected and absent (not disabled) where unsupported (FR-027, FR-028), and the keyboard binding table and every keyboard behavior is provably unchanged (FR-034, SC-008) | PASS |
| VI. Performance Is A Feature | Gamepad polling and touch bookkeeping reuse persistent `Map`s rather than allocating per tick (FR-037); the reserved-area layout function runs only on mount/resize/orientation-change, not per tick or per frame; the render loop's per-frame work is unchanged in shape, only in the `canvas.clientWidth`/`clientHeight` it measures | PASS |
| VII. Verifiable Without A Browser | Every requirement this feature adds is either a pure-function/pure-class-over-synthetic-events unit test (touch mapping, gamepad mapping, deadzone/hysteresis, tie-breaking, edge-triggering, source merging, the visibility table — SC-014) or an explicit Maintainer Review Notes item (feel on a real device, safe-area correctness on a real notch, gesture suppression on a real touchscreen) already enumerated in the spec. No browser-automation infrastructure is added | PASS |

No violations. Complexity Tracking is not needed.

## Project Structure

### Documentation (this feature)

```text
specs/007-touch-gamepad-input/
├── plan.md                       # This file (/speckit-plan command output)
├── research.md                    # Phase 0 output (/speckit-plan command)
├── data-model.md                   # Phase 1 output (/speckit-plan command)
├── quickstart.md                    # Phase 1 output (/speckit-plan command)
├── contracts/                        # Phase 1 output (/speckit-plan command)
│   ├── input-merge-api.md              # NEW — the shared InputSource shape,
│   │                                    #   direction precedence, one-shot OR
│   ├── touch-api.md                     # NEW — touch layout geometry + TouchInput
│   ├── gamepad-api.md                    # NEW — binding table + mapping + GamepadInput
│   └── visibility-api.md                  # NEW — capabilities + last-input-source
│                                           #   → shown/hidden pure function
├── checklists/
│   └── requirements.md
└── tasks.md                                # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

Additive over the feature-001–006 skeleton. No new top-level directories
beyond two new subfolders under the existing `src/lib/input/`.

```text
src/
├── sim/                              # UNCHANGED — FR-033, no file under src/sim/ is touched
├── lib/
│   ├── input/
│   │   ├── keyboard.ts                 # UNCHANGED — FR-034; every existing key, method, and
│   │   │                               #   test continues to pass with no modification
│   │   ├── merge.ts                     # NEW — pure: resolveDirection(keyboard, touch, gamepad)
│   │   │                                #   (FR-005 precedence); orAll(...booleans) (FR-006);
│   │   │                                #   the one place the three-source fan-in rule is written
│   │   ├── visibility.ts                 # NEW — pure: type LastInputSource; nextLastInputSource
│   │   │                                 #   (current, eventType) (FR-027a's reducer, touchstart
│   │   │                                 #   → 'touch', keydown/click → 'discrete', nothing else
│   │   │                                 #   ever calls it, which is what keeps pointer movement
│   │   │                                 #   structurally incapable of changing it); pure
│   │   │                                 #   shouldShowTouchControls(hasTouchSupport,
│   │   │                                 #   lastInputSource) (FR-030)
│   │   ├── touch/
│   │   │   ├── axis.ts                     # NEW — pure: resolveDominantAxis(dx, dy,
│   │   │   │                               #   tieBreakDirection?) -> Direction; the single
│   │   │   │                               #   "larger-magnitude axis, deterministic tie-break"
│   │   │   │                               #   primitive shared with gamepad/mapping.ts (FR-020
│   │   │   │                               #   for the stick, FR-010's no-diagonal-zone shape for
│   │   │   │                               #   the pad) — one tie-break rule, one test suite,
│   │   │   │                               #   two call sites
│   │   │   ├── layout.ts                    # NEW — pure geometry: computeOrientation(insetBox);
│   │   │   │                                #   computeTouchControlLayout(insetBox, orientation)
│   │   │   │                                #   -> { reservedRect, caveRect, pad, grabButton,
│   │   │   │                                #   pauseButton, restartButton } (FR-009, FR-013,
│   │   │   │                                #   FR-031, FR-031a); resolveTouchPoint(layout, x, y)
│   │   │   │                                #   -> ControlHit (FR-010, FR-011)
│   │   │   └── TouchInput.ts                 # NEW — stateful, mirrors KeyboardInput's shape:
│   │   │                                     #   per-identifier assignment Map (FR-011), fixed
│   │   │                                     #   control-kind-per-touch assignment, pad-only
│   │   │                                     #   re-targeting on move (FR-010), grab held while
│   │   │                                     #   its touch is down, pause/restart one-shot on
│   │   │                                     #   touchstart, a document-level playfield-tap
│   │   │                                     #   listener feeding consumeStart() (FR-014) that is
│   │   │                                     #   only ever consumed while no controls are laid
│   │   │                                     #   out, by construction (data-model.md)
│   │   └── gamepad/
│   │       ├── bindings.ts                    # NEW — plain data: standard-layout button index ->
│   │       │                                   #   action table; ENGAGE/RELEASE deadzone constants
│   │       │                                   #   (0.5 / 0.35, FR-019); the shipped defaults
│   │       │                                   #   (FR-018) as a table, not comparisons
│   │       ├── mapping.ts                      # NEW — pure: resolveStickDirection(x, y, previous,
│   │       │                                    #   thresholds) (FR-019, FR-020, using
│   │       │                                    #   touch/axis.ts's resolveDominantAxis for the
│   │       │                                    #   tie-break); resolveDpadDirection(buttons,
│   │       │                                    #   table); resolveDirection(dpad, stick) (FR-021,
│   │       │                                    #   d-pad wins); mapOneShotButtons(buttons,
│   │       │                                    #   previousPressed, table) (FR-023, edge-trigger)
│   │       └── GamepadInput.ts                  # NEW — stateful: poll() reads
│   │                                             #   navigator.getGamepads() once (called from
│   │                                             #   stepTick, FR-017); a reused
│   │                                             #   Map<number, GamepadPadState> per connected
│   │                                             #   pad holds the previous stick direction (for
│   │                                             #   hysteresis) and previous button-pressed bits
│   │                                             #   (for edge-triggering); merges all connected
│   │                                             #   pads (FR-024); a 'gamepaddisconnected'
│   │                                             #   listener deletes that pad's map entry so
│   │                                             #   nothing stays held (FR-025); consumeGrab()
│   │                                             #   (held) and consumeConfirm() (edge) both read
│   │                                             #   the same bottom-face-button index, per
│   │                                             #   FR-018's dual mapping (research.md)
│   └── render/
│       └── canvas.ts                            # UNCHANGED — computeViewportCells() already
│                                                 #   treats canvas.clientWidth/clientHeight as the
│                                                 #   whole drawable area; that area is smaller by
│                                                 #   construction once App.svelte CSS-sizes the
│                                                 #   canvas element to layout.caveRect, so no
│                                                 #   parameter or call site here changes
└── App.svelte                                    # + hasTouchSupport / gamepadSupported capability
                                                  # checks made once at mount (FR-029: capability
                                                  # only, no UA/device/screen-size sniff); +
                                                  # lastInputSource as plain $state, advanced by
                                                  # nextLastInputSource() from window-level
                                                  # keydown/click/touchstart listeners (mirrors
                                                  # activeThemeId's existing plain-$state pattern
                                                  # from feature 006); + a TouchInput and a
                                                  # GamepadInput instance alongside the existing
                                                  # KeyboardInput; + an insetBox read from a probe
                                                  # element's computed env(safe-area-inset-*)
                                                  # padding, recomputed on resize/orientationchange
                                                  # (research.md); stepTickInner() now consumes all
                                                  # three sources every tick and merges them via
                                                  # merge.ts before calling tickSession() or
                                                  # evaluating a screen's start/confirm check;
                                                  # markup gains the reserved control region
                                                  # (pad, grab, pause, restart) shown only while
                                                  # hasTouchSupport && shouldShowTouchControls(...)
                                                  # && screen is 'playing' or 'paused' (FR-008,
                                                  # FR-027, FR-027a), and the canvas/cave container
                                                  # is CSS-sized from layout.caveRect every layout
                                                  # recompute; index.html's viewport meta and
                                                  # global CSS gain touch-action/gesture
                                                  # suppression (FR-012, FR-038)

tests/
└── lib/
    └── input/
        ├── keyboard.test.ts                     # UNCHANGED — re-run to confirm FR-034/SC-008's
        │                                         #   no-regression guarantee; no test here changes
        ├── merge.test.ts                          # NEW — direction precedence table (FR-005,
        │                                          #   including "lower-precedence source used
        │                                          #   whenever higher ones report nothing");
        │                                          #   orAll's OR-not-XOR behavior, including "both
        │                                          #   sources fire the same one-shot on the same
        │                                          #   tick" firing once (FR-006)
        ├── visibility.test.ts                      # NEW — nextLastInputSource's three-outcome
        │                                           #   reducer; shouldShowTouchControls as the
        │                                           #   full (capability, lastInputSource) table
        │                                           #   (FR-030, SC-011b), including "no touch
        │                                           #   capability" always false regardless of
        │                                           #   lastInputSource (FR-027)
        ├── touch/
        │   ├── axis.test.ts                         # NEW — dominant-axis selection, the exact-tie
        │   │                                         #   case with and without a tie-break
        │   │                                         #   direction supplied, horizontal-wins
        │   │                                         #   default (shared FR-020/FR-010 primitive)
        │   ├── layout.test.ts                        # NEW — reserved rect vs. cave rect never
        │   │                                         #   intersect (SC-011a), every control fully
        │   │                                         #   inside the inset box in both orientations
        │   │                                         #   (SC-011), resolveTouchPoint's pad zones/
        │   │                                         #   dead area/outside-pad/button hits (FR-010)
        │   └── TouchInput.test.ts                    # NEW — synthetic touch-event sequences: slide
        │                                             #   between pad zones (no gap, no diagonal),
        │                                             #   pad+grab concurrent identifiers (FR-011),
        │                                             #   release clears exactly one identifier,
        │                                             #   a touch landing on no control is ignored
        │                                             #   (edge case), playfield-tap-to-confirm only
        │                                             #   fires when no control layout is active
        └── gamepad/
            ├── mapping.test.ts                       # NEW — deadzone engage/release hysteresis at
            │                                         #   the boundary (SC-004), exact-diagonal tie
            │                                         #   (SC-005), d-pad-beats-stick (FR-021), one
            │                                         #   direction per held tick (FR-022), one-shot
            │                                         #   edge-trigger across a held span (SC-006),
            │                                         #   non-standard button count never throwing
            │                                         #   (FR-018's best-effort clause)
            └── GamepadInput.test.ts                   # NEW — synthetic Gamepad snapshots across
                                                        #   ticks: connect mid-run (US4 AC1), held
                                                        #   direction+grab released on disconnect
                                                        #   with no session-state field touched
                                                        #   (US4 AC2/AC3, FR-025), reconnect carries
                                                        #   no stale state (US4 AC4), two simultaneous
                                                        #   pads merge without cancellation (FR-024),
                                                        #   Gamepad API absent -> poll() never calls
                                                        #   navigator.getGamepads() and never throws
                                                        #   (FR-028)
```

**Structure Decision**: Same single Svelte/Vite project as features
001–006; no new top-level directories. Every new pure module and stateful
class lands under the existing `src/lib/input/` folder, in two new
subfolders (`touch/`, `gamepad/`) that group each source's geometry/
mapping/state together the way `src/lib/themes/` already groups a
contract, a registry, and concrete data. Tests continue to mirror `src/`
under `tests/`, with new files landing in `tests/lib/input/touch/` and
`tests/lib/input/gamepad/` rather than new top-level test directories.
`App.svelte` remains the single orchestration point — the only file that
knows about `session.screen`, all three input sources, and the render
loop at once — exactly as it already is for keyboard.

## Complexity Tracking

*No violations — table not needed.*
