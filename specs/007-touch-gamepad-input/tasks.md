---

description: "Task list for Touch Controls And Gamepad Support"
---

# Tasks: Touch Controls And Gamepad Support

**Input**: Design documents from `/specs/007-touch-gamepad-input/`

**Prerequisites**: [plan.md](./plan.md) (required), [spec.md](./spec.md) (required for user stories), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/input-merge-api.md](./contracts/input-merge-api.md), [contracts/touch-api.md](./contracts/touch-api.md), [contracts/gamepad-api.md](./contracts/gamepad-api.md), [contracts/visibility-api.md](./contracts/visibility-api.md), [quickstart.md](./quickstart.md)

**Tests**: Included — `CLAUDE.md`, the constitution's Principle VII, and this feature's own SC-014 require touch mapping, gamepad mapping, the deadzone/hysteresis, tie-breaking, edge-triggering, source merging, and the visibility decision to each ship as pure-function/pure-class unit tests over synthetic events, so test tasks are mandatory here, not optional. `src/App.svelte`'s markup (the reserved control region, capability detection, the safe-area probe element, window-level listener wiring) has no automated test today (no DOM/canvas/touchscreen/controller harness in this project) and gets none here either — it is verified by the maintainer at review time against `spec.md`'s Maintainer Review Notes, exactly as features 001–006's DOM wiring already is.

**Organization**: Tasks are grouped by user story (spec.md priorities) so each story is independently implementable and testable. This feature touches **zero files under `src/sim/`** (FR-033) and leaves `src/lib/input/keyboard.ts` and `src/lib/render/canvas.ts` byte-identical (FR-034) — no task below names a path under either.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task in this list)
- **[Story]**: US1–US4, matching spec.md's user stories
- Every task names its exact file path(s)

## Path Conventions

Single front-end project (unchanged from features 001–006): input sources and the merge/visibility layers under `src/lib/input/` (new `touch/` and `gamepad/` subfolders), their tests mirrored under `tests/lib/input/`; the one Svelte component at `src/App.svelte`, no test file (see **Tests** above); `index.html` for the viewport meta tag.

---

## Phase 1: Setup

**Purpose**: Confirm the branch is a clean base for this feature before any code changes

- [X] T001 Run `npm test` on the current branch (build + full vitest suite) and confirm the feature-001–006 baseline passes with no failures, establishing the pre-change state this feature's work is measured against

**Checkpoint**: Baseline confirmed green. No source files touched yet.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The one shared geometry primitive (`resolveDominantAxis`) and the one shared fan-in layer (`resolveDirection`/`orAll`) that both the touch source (US1) and the gamepad source (US2) are built on, per research.md's decision to write the tie-break rule once and the merge rule once rather than per-source

**⚠️ CRITICAL**: No user story task can start until this phase is complete

### Tests

- [X] T002 [P] Create `tests/lib/input/touch/axis.test.ts`: `resolveDominantAxis(dx, dy, tieBreakDirection?)` picks the larger-magnitude axis (horizontal and vertical, all four signs); an exact tie (`|dx| === |dy|`) with a `tieBreakDirection` matching one of the two tied directions returns that direction; an exact tie with a `tieBreakDirection` supplied but *not* one of the tied pair falls through to horizontal, same as no tie-break argument at all; an exact tie with no `tieBreakDirection` always resolves horizontal (contracts/touch-api.md)
- [X] T003 [P] Create `tests/lib/input/merge.test.ts`: `resolveDirection`'s full four-row precedence table (keyboard wins over both; touch wins over gamepad when keyboard reports nothing; gamepad used only when both above report nothing; all-`undefined` yields `undefined`) (FR-005); `orAll(...values)` is `true` iff at least one argument is `true`, including the "two sources fire the same one-shot on the same tick" case producing a single `true`, not a count (FR-006); `orAll` takes primitives, not callables, and never re-invokes anything passed to it — pinning the call-site discipline contracts/input-merge-api.md warns against short-circuiting `||`

### Implementation

- [X] T004 [P] Create `src/lib/input/touch/axis.ts`: `export function resolveDominantAxis(dx: number, dy: number, tieBreakDirection?: Direction): Direction` per contracts/touch-api.md — compares `Math.abs(dx)` vs `Math.abs(dy)`, sign picks the direction, exact-tie resolution as specified above. Depends on T002.
- [X] T005 [P] Create `src/lib/input/merge.ts`: `export function resolveDirection(keyboard, touch, gamepad): Direction | undefined` as `keyboard ?? touch ?? gamepad`; `export function orAll(...values: boolean[]): boolean` as `values.some(Boolean)`. Depends on T003.

**Checkpoint**: The shared tie-break primitive and the shared fan-in rule are built and unit-tested. Nothing observable yet — neither is wired into `App.svelte`.

---

## Phase 3: User Story 1 - A whole cave with two thumbs (Priority: P1) 🎯 MVP

**Goal**: A touch-only player sees an on-screen four-way pad, grab, pause, and restart, sized and placed for thumbs, laid out in a reserved area that never overlaps the drawn cave, respecting safe-area insets in both orientations; the page never scrolls/zooms/bounces/selects/callouts on any touch; the whole game is playable from title to win screen with two thumbs alone.

**Independent Test**: With no browser, drive the touch mapping as pure functions — a pad geometry plus a touch coordinate resolves to exactly one direction or none; a coordinate in the pad's dead area resolves to none; a coordinate outside the pad resolves to none; concurrent touch points on the pad and the grab button both register; the resulting per-tick action set matches the equivalent keyboard presses.

### Tests for User Story 1

- [X] T006 [P] [US1] Create `tests/lib/input/visibility.test.ts`: `nextLastInputSource`'s full reducer table over its three defined event types from each of the three states (contracts/visibility-api.md — `'none'`/`'touch'`/`'discrete'` × `'keydown'`/`'click'`/`'touchstart'`, including the two no-op rows); `shouldShowTouchControls`'s full `(hasTouch, lastInputSource)` six-row table (SC-011b) — `hasTouch: false` yields `false` regardless of `lastInputSource` (FR-027), `hasTouch: true` yields `true` for `'none'`/`'touch'` and `false` for `'discrete'` (FR-027a)
- [X] T007 [P] [US1] Create `tests/lib/input/touch/layout.test.ts`: `computeOrientation` returns `'portrait'` when `height >= width`, else `'landscape'`; `computeTouchControlLayout` — for a representative sample of inset boxes and both orientations — never produces a `reservedRect`/`caveRect` pair that intersect (SC-011a), and both rects stay fully inside `insetBox` (SC-011, FR-031a); every pad zone and the grab button are at least 64 CSS px in both dimensions, pause and restart at least 44 (FR-009); `resolveTouchPoint`'s resolution order — a point inside `grabButton`/`pauseButton`/`restartButton` wins over the pad even near the pad's outer radius; inside the dead radius resolves `{ kind: 'pad', direction: undefined }`; inside the pad but outside the dead radius resolves a zone via `resolveDominantAxis`; outside the outer radius resolves `{ kind: 'none' }`
- [X] T008 [P] [US1] Create `tests/lib/input/touch/TouchInput.test.ts` with a hand-rolled synthetic `TouchList`/`Touch`-shaped fixture (mirroring `tests/lib/input/keyboard.test.ts`'s `fakeTarget()` style): a `touchstart` against a set layout assigns each new identifier to its `resolveTouchPoint` result (pad/grab/pause/restart/none); sliding a pad-assigned identifier between zones on `touchmove` re-targets with no gap and no diagonal; sliding a pad-assigned identifier outside the outer radius reports no direction while outside and re-acquires on return, with no special-cased state; a `touchend`/`touchcancel` clears exactly the ended identifier without disturbing a concurrent pad+grab pair (FR-011); a touch assigned `'none'` at `touchstart` (never resolved again) never produces or cancels a direction, even with several such touches active at once (palm-on-glass); `consumeStart()` is set by any `touchstart` while `layout` is `undefined` and is never set by a `touchstart` while a real `layout` is set (tap-to-confirm only outside a control layout, per research.md); a held pad direction produces the identical per-tick action (one direction, no repeat, no acceleration) that a held keyboard key produces for the same number of ticks (SC-003's touch half)

### Implementation for User Story 1

- [X] T009 [P] [US1] Create `src/lib/input/visibility.ts`: `LastInputSource` (`'none' | 'discrete' | 'touch'`), `PlatformCapabilities` (`{ readonly hasTouch: boolean }`), `nextLastInputSource(current, eventType)`, `shouldShowTouchControls(capabilities, lastInputSource)` per contracts/visibility-api.md. Depends on T006.
- [X] T010 [P] [US1] Create `src/lib/input/touch/layout.ts`: `InsetBox`/`Orientation`/`Rect`/`PadZone`/`TouchControlLayout`/`ControlHit` types; `computeOrientation(insetBox)`; `computeTouchControlLayout(insetBox, orientation)` (portrait: reserved band along the bottom edge, cave rect above it; landscape: reserved margins on both sides, cave rect the vertical strip between them — both shapes present from this function's first version per FR-031); `resolveTouchPoint(layout, x, y)` in the button-then-pad order data-model.md specifies, using `resolveDominantAxis` from T004 for zone resolution. Depends on T004, T007.
- [X] T011 [US1] Create `src/lib/input/touch/TouchInput.ts`: `assignments: Map<number, ControlHit>`, `grabTouchId`, `restartPending`/`pausePending`/`startPending`, `layout: TouchControlLayout | undefined`, `setLayout(layout)`, `attach(target = document)`/`detach(target = document)` wiring `touchstart`/`touchmove`/`touchend`/`touchcancel` per data-model.md's "Touch Input State" event-handling summary; `consumeDirection`/`consumeGrab`/`consumeRestart`/`consumeStart`/`consumePause`/`consumeCycleTheme` (the last always `false` — no on-screen theme control this feature adds, per data-model.md); the gesture-suppression listeners from contracts/touch-api.md (`document`-level `touchmove` with `{ passive: false }` calling `preventDefault()` unconditionally, `gesturestart`, `contextmenu`, `dblclick`), all attached by the same `attach()` call. Depends on T010, T008.
- [X] T012 [P] [US1] In `index.html`, add `viewport-fit=cover` and `maximum-scale=1, user-scalable=no` to the `<meta name="viewport">` tag (FR-013, FR-038) — still one inline tag, no new file.
- [X] T013 [US1] In `src/App.svelte`: add `hasTouch` capability check at mount (`'ontouchstart' in window || navigator.maxTouchPoints > 0`, FR-029); add `lastInputSource` as plain `$state<LastInputSource>('none')` (mirroring `activeThemeId`'s existing pattern), advanced by three window-level `keydown`/`click`/`touchstart` listeners that each call `nextLastInputSource` and assign the result — no fourth listener, so pointer movement structurally cannot change it; add a hidden four-sided-padding probe `<div>` styled with `padding: env(safe-area-inset-*)`, read via `getComputedStyle` into a plain `InsetBox` at mount and again on `resize`/`orientationchange`; create a `TouchInput` instance, `attach()`/`detach()` it in `onMount`/`onDestroy` alongside the existing `keyboard` calls. Depends on T009, T011.
- [X] T014 [US1] In `src/App.svelte`'s `stepTickInner()`: replace every direct `keyboard.consume*()` read that builds `TickInput` or checks a screen's start/restart/pause/cycleTheme condition with `resolveDirection(keyboard.consumeDirection(), touch.consumeDirection(), undefined)` and `orAll(keyboard.consumeX(), touch.consumeX(), false)` (the `undefined`/`false` gamepad placeholders land for real in US2, T021) — every source's `consume*()` computed as a separate expression before the call, per the call-site-discipline contracts/input-merge-api.md and T003 pin against short-circuiting `||`; the title-screen start/direction/grab check and the non-playing-screen tap-to-confirm check both now also read `touch.consumeStart()`/`touch.consumeDirection()`/`touch.consumeGrab()` through the same merge calls. Depends on T005, T013.
- [X] T015 [US1] In `src/App.svelte`'s markup and `<style>`: render the reserved control region (four-way pad, grab, pause, restart) only when `hasTouch && shouldShowTouchControls(capabilities, lastInputSource) && (session.screen === 'playing' || session.screen === 'paused')` (FR-008, FR-027, FR-027a); call `touchInput.setLayout(...)` with the current `computeTouchControlLayout(insetBox, computeOrientation(insetBox))` result whenever it is shown, and `setLayout(undefined)` whenever it is not; CSS-size the `<canvas>`/cave container from `layout.caveRect` on every layout recompute so `computeViewportCells()` in `src/lib/render/canvas.ts` needs no change; add global `touch-action: none` and `user-select: none` CSS to the document/canvas/control elements (FR-012); position the reserved region so it never overlaps the existing `.theme-picker`/`.readout` elements (FR-015). Depends on T014.

**Checkpoint**: A touch-only player can start, move, grab, pause, restart, switch themes, and finish all eight caves with two thumbs, with no stray gesture affecting the page. This is the MVP.

---

## Phase 4: User Story 2 - A whole cave with a controller (Priority: P2)

**Goal**: A connected controller drives the game — d-pad or left stick to move at the sim's one-cell-per-tick cadence, a face button for grab, Start for pause, Back/Select for restart, a shoulder button to cycle the theme — with no on-screen affordance ever appearing.

**Independent Test**: With no browser, drive the gamepad mapping as pure functions over synthetic gamepad snapshots — axis pairs resolve through the deadzone to exactly one direction or none; a button index table resolves to named actions; held buttons produce exactly one one-shot fire per press; a held direction produces exactly one direction per tick.

### Tests for User Story 2

- [ ] T016 [P] [US2] Create `tests/lib/input/gamepad/mapping.test.ts`: `resolveDpadDirection` returns the first of up/down/left/right whose bound index is `.pressed`, and never throws against a `buttons` array shorter than the highest bound index (FR-018's best-effort clause); `resolveStickDirection`'s hysteresis table from contracts/gamepad-api.md — below release → `undefined` even if `previous` was engaged; in the band with a `previous` → holds `previous`; in the band with no `previous` → `undefined` (never engages purely from the band); at/above engage → `resolveDominantAxis(x, y, previous)`, including the exact-diagonal-at-engage case with and without a `previous` (SC-004, SC-005); `resolveDirection(dpad, stick)` is `dpad ?? stick` — the d-pad wins whenever both report (FR-021); `mapOneShotButtons` fires an index's edge exactly once on the poll it first becomes pressed, not again while held across many polls, and again after a release-then-repress (FR-023, SC-006), independently per tracked index
- [ ] T017 [P] [US2] Create `tests/lib/input/gamepad/GamepadInput.test.ts`: two simultaneously-present synthetic pads merge so either one's held direction/grab drives the result and neither cancels the other's (FR-024); `poll()` never calls `navigator.getGamepads` and never throws when `typeof navigator.getGamepads !== 'function'` (FR-028); `consumeGrab()` (a level read) and `consumeConfirm()` (an edge read) against the same face-button index coexist without interfering — holding the button keeps `consumeGrab()` `true` across many polls while `consumeConfirm()` fires only on the poll it was first pressed

### Implementation for User Story 2

- [ ] T018 [P] [US2] Create `src/lib/input/gamepad/bindings.ts`: `DPAD_BUTTON_INDEX`, `FACE_BUTTON_GRAB_CONFIRM_INDEX`, `PAUSE_BUTTON_INDEX`, `RESTART_BUTTON_INDEX`, `CYCLE_THEME_BUTTON_INDEX`, `STICK_X_AXIS_INDEX`/`STICK_Y_AXIS_INDEX`, `STICK_ENGAGE_THRESHOLD`/`STICK_RELEASE_THRESHOLD` — the exact values from contracts/gamepad-api.md, as plain exported `const`s (FR-018).
- [ ] T019 [US2] Create `src/lib/input/gamepad/mapping.ts`: `resolveDpadDirection`, `resolveStickDirection` (using `resolveDominantAxis` from T004 for its tie-break), `resolveDirection`, `mapOneShotButtons` per contracts/gamepad-api.md. Depends on T004, T018, T016.
- [ ] T020 [US2] Create `src/lib/input/gamepad/GamepadInput.ts`: `padStates: Map<number, GamepadPadState>` (`{ previousStickDirection, previousPressed }`, reused in place per tick — FR-037); `poll()` — no-op when unsupported, otherwise reads `navigator.getGamepads()` once, lazily creates a pad's state entry on first sight of its index, computes each connected pad's direction/one-shot edges via T019's functions, merges across pads in index order (FR-024); `consumeDirection`/`consumeGrab`/`consumeConfirm`/`consumeRestart`/`consumePause`/`consumeCycleTheme` all read this tick's already-computed merged result. Depends on T019, T017.
- [ ] T021 [US2] In `src/App.svelte`: add `gamepadSupported = typeof navigator.getGamepads === 'function'` at mount; create a `GamepadInput` instance; call `gamepad.poll()` once per tick in `stepTick()`, before any `consume*()` call, gated on `gamepadSupported`; extend every `resolveDirection`/`orAll` call site from T014 to pass the real `gamepad.consumeX()` reads instead of the `undefined`/`false` placeholders; on the title screen and the non-playing-screen advance check, additionally read `gamepad.consumeConfirm()` alongside `keyboard.consumeStart()`/`touch.consumeStart()` (gamepad has no `consumeStart()` — its confirm is edge-triggered separately per research.md's dual-read decision); the theme cycle button reaches `selectTheme` through the same `orAll(keyboard.consumeCycleTheme(), touch.consumeCycleTheme(), gamepad.consumeCycleTheme())` call T014 already added. Depends on T014, T020.

**Checkpoint**: US1 and US2 together — keyboard, touch, and gamepad all drive the same tick through one merge layer, with no on-screen change when a controller connects.

---

## Phase 5: User Story 3 - Absent where unsupported, unchanged where it already worked (Priority: P3)

**Goal**: On a platform reporting no touch capability, no on-screen control exists at all; where the Gamepad API is unavailable, nothing is polled and nothing errors; the keyboard path — every key, every behavior — is unchanged; no named action is reachable from touch or gamepad alone.

**Independent Test**: With no browser, assert the visibility decision is a pure function of capabilities and last input source (already pinned by T006); assert the full keyboard binding table is unchanged from feature 006 and every named action is reachable from the keyboard alone; assert no action is reachable from touch or gamepad without also being reachable from keyboard.

### Tests for User Story 3

- [ ] T022 [P] [US3] Create `tests/lib/input/action-coverage.test.ts` (SC-012): construct one instance of each of `KeyboardInput`, `TouchInput`, `GamepadInput` and assert keyboard alone declares all six named actions (`consumeDirection`, `consumeGrab`, `consumeRestart`, `consumeStart`, `consumePause`, `consumeCycleTheme`, all backed by a non-empty key table); assert `TouchInput.consumeCycleTheme()` always returns `false` (its only theme route is the existing theme-picker tap, not a new control) and `TouchInput` has no `consumeConfirm()`; assert `GamepadInput` has no `consumeStart()` (its confirm route is the edge-triggered `consumeConfirm()` instead); assert nothing in either new source's declared surface reaches a named action keyboard's own tables do not also cover (FR-035).

### Verification for User Story 3 (no new production code — structural/regression checks against US1/US2's work)

- [ ] T023 [US3] Confirm `tests/lib/input/keyboard.test.ts` passes unmodified and that `git diff`/the PR's file list shows `src/lib/input/keyboard.ts` and `src/lib/render/canvas.ts` byte-identical to their pre-feature state (FR-033, FR-034, SC-008); confirm T015's `{#if}` gate renders the touch control region as absent — not `display: none`, not `disabled` — when `hasTouch` is `false` (FR-027); confirm T020's `gamepadSupported` gate means `GamepadInput.poll()` is structurally never called on a platform without the Gamepad API (FR-028), per T017's existing absence test. Depends on T013, T015, T020, T021, T022.

**Checkpoint**: The governing rule of the whole feature holds — nothing new is visible or reachable where the platform can't support it, and the keyboard-only path from features 001–006 is provably untouched.

---

## Phase 6: User Story 4 - The controller that arrives or vanishes mid-cave (Priority: P3)

**Goal**: A controller connected mid-run drives the game from the next tick with no reload; a controller that disconnects mid-run releases its held direction and grab immediately without pausing the cave or touching any session-state field; a reconnect carries no stale state.

**Independent Test**: With no browser, feed a synthetic connect and disconnect into the gamepad source between ticks and assert: after connect, the next tick reads the new pad; after disconnect while a direction and grab were held, the next tick reports no direction and no grab; the session state (score, lives, cave index, timer, pause state, tick count) is untouched by either event.

### Tests for User Story 4

- [ ] T024 [US4] Extend `tests/lib/input/gamepad/GamepadInput.test.ts`: connecting a synthetic pad between two simulated `poll()` calls — the very next `poll()`'s merged result reflects it, with no dependency on a `'gamepaddisconnected'`/`'gamepadconnected'` event ever firing (US4 AC1, since `poll()`'s own scan is the source of truth per contracts/gamepad-api.md); disconnecting mid-run while a direction and grab are held — dispatching a synthetic `'gamepaddisconnected'` then calling `poll()` again reports no direction and no grab for that pad on the very next tick (US4 AC2); a reconnect under the same `Gamepad.index` after a disconnect starts with no `previousStickDirection`/`previousPressed` carried over — an exact-diagonal stick pushed immediately on reconnect resolves via the tie-break's `undefined`-previous branch, not a stale held direction (US4 AC4); assert `GamepadInput`'s own source contains no reference to `SessionState`, score, lives, cave index, the timer, or pause state anywhere (US4 AC3, FR-025 — the isolation is structural, so this is checkable by construction: the class imports nothing from `src/lib/session/`). Depends on T017.

### Implementation for User Story 4

- [ ] T025 [US4] In `src/lib/input/gamepad/GamepadInput.ts`, add `attach(target: Window = window)`/`detach(target: Window = window)`: `attach()` registers a `'gamepaddisconnected'` listener that deletes that event's `Gamepad.index` from `padStates` immediately (not waiting for the next `poll()`), pruning any stale `previousStickDirection`/`previousPressed` before a later reconnect could read it; `'gamepadconnected'` is registered too but is a no-op handler, since `poll()`'s own lazy-creation scan already handles connect (including a pad present before the listener ever attaches). Depends on T020, T024.
- [ ] T026 [US4] In `src/App.svelte`, call `gamepad.attach()` in `onMount` and `gamepad.detach()` in `onDestroy`, alongside the existing `keyboard`/`touch` attach/detach calls from T013/T021. Depends on T021, T025.

**Checkpoint**: A controller can be plugged in or unplugged mid-cave — including mid-fall, with a direction and grab held — with no reload, no lost tick, no auto-pause, and no stale input surviving a reconnect.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Full-suite regression, the sim/keyboard/canvas-untouched acceptance check this feature is built around, and the final headless/build gate

- [ ] T027 [P] Run `npm test` (builds `dist/` first, then the full vitest suite) and confirm every existing sim/session/caves/themes/keyboard test from features 001–006 passes unchanged (FR-033, FR-034), alongside every new suite this feature adds (T002, T003, T006, T007, T008, T016, T017, T022, T024) (SC-014).
- [ ] T028 [P] Review the full diff this feature produces (or the PR's file list) and confirm: zero files under `src/sim/` are touched (FR-033); `src/lib/input/keyboard.ts` and `src/lib/render/canvas.ts` are untouched (FR-034, and the plan's explicit claim that `computeViewportCells()` needs no change); no new runtime dependency was added to `package.json` (Principle IV); `index.html`/`App.svelte` remain the only files carrying the new viewport/gesture/layout configuration, with no second HTML page or external asset (FR-038).
- [ ] T029 Maintainer-only (not automatable, per quickstart.md and Principle VII): run `npm run build`, open `dist/index.html` via `file://`, and work through `spec.md`'s Maintainer Review Notes checklist in full — a tablet/phone in both orientations (two-thumb play, zone-sliding, gesture-suppression stress test, mid-cave rotation, control/thumb never covering the cave, the theme picker still tappable, a full title-to-win run with no keyboard); a desktop with a controller (d-pad and stick feel, shallow-diagonal steadiness, pause-holds-once, unplug-mid-fall-does-not-pause, a second controller, no on-screen control ever appears); a touchscreen laptop (controls present before any input, gone instantly on a keydown, back instantly on a touch, no flicker from mouse/trackpad movement, uninterrupted alternation between touch and keyboard); a plain desktop with neither (pixel-identical to before this feature, no console error, every keyboard behavior unchanged).

**Checkpoint**: `npm test` green, diff confirmed sim/keyboard/canvas-untouched and dependency-free, maintainer sign-off recorded.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — run first
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS every user story (T004's `resolveDominantAxis` is what both `touch/layout.ts` (US1) and `gamepad/mapping.ts` (US2) call; T005's `resolveDirection`/`orAll` is what every `App.svelte` call site in US1/US2/US3 uses to combine sources)
- **User Stories (Phase 3–6)**: All depend on Foundational completion
  - US1 (P1) has no dependency on any other story and is the MVP — touch alone, keyboard's existing behavior untouched
  - US2 (P2) depends on US1's `App.svelte` wiring (T013's capability/listener scaffolding, T014's merge call sites) to extend rather than duplicate
  - US3 (P3) depends on US1 (the `{#if}` absence gate, T015) and US2 (the `gamepadSupported` poll gate, T020/T021) to verify, and stands alone otherwise
  - US4 (P3) depends on US2's `GamepadInput` (T020) and is explicitly "smaller than US2 and dependent on it" per spec.md
- **Polish (Phase 7)**: Depends on all four user stories being complete

### Within Each Story

- Tests are written before implementation (write the test, confirm it fails, then implement)
- `src/App.svelte` gains capability detection/listeners/probe/`TouchInput` in US1 (T013), gains the merge call sites in US1 (T014) and extends them in US2 (T021), gains markup in US1 (T015), gains hotplug listeners in US4 (T026) — additive edits in story order, never re-rewritten
- `src/lib/input/gamepad/GamepadInput.ts` is created in US2 (T020, steady-state poll/merge) and extended in US4 (T025, connect/disconnect listeners) — the same file, two additive passes

### Parallel Opportunities

- All "Tests for USn" tasks marked [P] within one story's phase can run together — independent files or independent cases
- T002 (`axis.test.ts`) and T003 (`merge.test.ts`) can be written in parallel — independent files
- T004 (`axis.ts`) and T005 (`merge.ts`) can proceed in parallel once their respective tests exist — no interdependency
- T006, T007, T008 (`visibility.test.ts`, `touch/layout.test.ts`, `touch/TouchInput.test.ts`) can be written in parallel — three independent files
- T009 (`visibility.ts`), T010 (`touch/layout.ts`), and T012 (`index.html`) can proceed in parallel — independent files; T011 (`TouchInput.ts`) waits on T010
- T016 (`gamepad/mapping.test.ts`) and T017 (`gamepad/GamepadInput.test.ts`) can be written in parallel — independent files
- T018 (`gamepad/bindings.ts`) can proceed in parallel with the Foundational/US1 work — no dependency on either

---

## Parallel Example: User Story 1

```bash
# Launch all US1 test-writing tasks together (independent files):
Task: "Visibility reducer/table tests in tests/lib/input/visibility.test.ts"
Task: "Touch layout geometry/resolveTouchPoint tests in tests/lib/input/touch/layout.test.ts"
Task: "TouchInput event-sequence tests in tests/lib/input/touch/TouchInput.test.ts"

# Then implement (visibility.ts and layout.ts in parallel; TouchInput.ts waits on layout.ts):
Task: "Create src/lib/input/visibility.ts"
Task: "Create src/lib/input/touch/layout.ts"
Task: "Create src/lib/input/touch/TouchInput.ts"

# Then sequentially in App.svelte (each depends on the one before):
Task: "Wire capability detection, lastInputSource, the safe-area probe, and TouchInput into App.svelte"
Task: "Consume touch through merge.ts in stepTickInner()"
Task: "Add the reserved control region markup/CSS, gated on visibility and screen"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks every story)
3. Complete Phase 3: User Story 1 (a touch-only player can finish the whole game)
4. **STOP and VALIDATE**: `npm test`, then a manual `file://` pass on a real touchscreen per the Maintainer Review Notes' first section
5. This is the MVP: a whole class of device (tablets) that could not play the game at all now can

### Incremental Delivery

1. Setup + Foundational → the shared tie-break and merge primitives exist, nothing observable yet
2. Add User Story 1 → touch controls appear, work, and are gesture-safe — **MVP**
3. Add User Story 2 → a connected controller drives the game with no on-screen change
4. Add User Story 3 → the absence/unchanged-keyboard guarantee is verified across both new sources
5. Add User Story 4 → hotplug connect/disconnect is safe mid-cave
6. Polish → full regression, the sim/keyboard/canvas-untouched acceptance check, maintainer's `file://` pass

### Parallel Team Strategy

With multiple developers, after Foundational lands:

- Developer A: User Story 1 (touch geometry, `TouchInput`, `App.svelte`'s capability/listener/merge/markup wiring) — US2 and US3 depend on A's `App.svelte` scaffolding
- Developer B: starts User Story 2's pure pieces (`gamepad/bindings.ts`, `gamepad/mapping.ts`) in parallel with A, since neither touches `App.svelte`; `GamepadInput.ts` and its `App.svelte` wiring (T021) wait on A's T013/T014
- Developer C: starts User Story 3's `action-coverage.test.ts` (T022) as soon as `KeyboardInput`/`TouchInput` exist, ahead of `GamepadInput` if a stub confirms the shape; the verification task (T023) waits on both A and B
- User Story 4 (T024–T026) is the natural next task for whoever finishes User Story 2's `GamepadInput.ts` (T020) first

---

## Notes

- [P] tasks touch different files (or independent additive regions of the same file) and have no unmet dependency within this list
- [Story] labels map every phase-3+ task to its user story for traceability
- This feature adds zero new `TickInput` fields, zero new `SessionState` fields, and touches zero files under `src/sim/` — no task in this list names a path under `src/sim/` (FR-033)
- `src/lib/input/keyboard.ts` is never edited by any task in this list (FR-034) — every new source is an additional file, never a modification to the existing one
