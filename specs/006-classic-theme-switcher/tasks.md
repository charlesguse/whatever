---

description: "Task list for Classic Theme And An In-Game Theme Switcher"
---

# Tasks: Classic Theme And An In-Game Theme Switcher

**Input**: Design documents from `/specs/006-classic-theme-switcher/`

**Prerequisites**: [plan.md](./plan.md) (required), [spec.md](./spec.md) (required for user stories), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/theme-registry-api.md](./contracts/theme-registry-api.md), [contracts/keyboard-api.md](./contracts/keyboard-api.md), [contracts/save-api.md](./contracts/save-api.md), [quickstart.md](./quickstart.md)

**Tests**: Included — `CLAUDE.md` and this feature's spec (each User Story's Independent Test, FR-029/SC-008) require the registry, the Classic theme, the save-record merge, and the new keyboard action to each ship a plain `vitest` test over plain data, so test tasks are mandatory here, not optional. `src/App.svelte`'s markup and focus/no-swallowed-input behavior has no automated test today (no DOM/component-test harness in this project) and gets none here either — it is verified by the maintainer at review time per `quickstart.md`'s `file://` playback checklist, same as features 001–005's keyboard/DOM wiring.

**Organization**: Tasks are grouped by user story (spec.md priorities) so each story is independently implementable and testable. This feature touches **zero files under `src/sim/`** (FR-012) — every task below is shell-owned code under `src/lib/` and `src/App.svelte`, per `CLAUDE.md`'s sim/shell line.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task in this list)
- **[Story]**: US1–US4, matching spec.md's user stories
- Every task names its exact file path(s)

## Path Conventions

Single front-end project (unchanged from features 001–005): theme data and the registry under `src/lib/themes/`, their tests under `tests/lib/themes/`; input under `src/lib/input/`, its tests under `tests/lib/input/`; storage under `src/lib/storage/`, its tests under `tests/lib/storage/`; the one Svelte component at `src/App.svelte`, no test file (see **Tests** above).

---

## Phase 1: Setup

**Purpose**: Confirm the branch is a clean base for this feature before any code changes

- [X] T001 Run `npm test` on the current branch (build + full vitest suite) and confirm the feature-001–005 baseline passes with no failures, establishing the pre-change state this feature's work is measured against

**Checkpoint**: Baseline confirmed green. No source files touched yet.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The registry surface every later story's tests and shell code call — `listThemes()`, `hasTheme()`, and the duplicate-id guard — with no theme-data or shell change yet

**⚠️ CRITICAL**: No user story task can start until this phase is complete

- [X] T002 In `src/lib/themes/registry.ts`, add `listThemes(): readonly Theme[]` returning `[...themes.values()]` (the internal `Map` already preserves insertion order, FR-001/FR-005), add `hasTheme(id: string): boolean` returning `themes.has(id)` (FR-004, non-throwing, total over any input), and change `registerTheme(theme)` to `throw new Error(...)` naming `theme.id` when that id is already registered, before the existing `.set()` call (FR-006), instead of silently overwriting. `getTheme(id)` stays unchanged.

**Checkpoint**: Registry has the enumeration/existence/duplicate-guard surface a real registry needs. `classroomTheme` is still the only registered theme; the build still compiles and the existing `classroom.test.ts` still passes.

---

## Phase 3: User Story 1 - Playing in a second look (Priority: P1) 🎯 MVP

**Goal**: A second complete theme, **Classic**, registered alongside Classroom in a real enumerable registry; an always-visible, keyboard-and-pointer-operable control in `App.svelte` lets the player pick either one, and the whole game — every element, the background, every player-facing string — changes costume immediately, with no sim file touched.

**Independent Test**: With no browser, assert the registry enumerates two themes; that Classic supplies an entry for all fourteen element ids plus the open-door and running-magic-wall appearances; that it supplies every player-facing string the contract declares; and that selecting it changes what the renderer is asked to draw for each element id.

### Tests for User Story 1

- [X] T003 [P] [US1] Create `tests/lib/themes/registry.test.ts`: `listThemes()` returns every registered theme in registration order (after importing the real registration module, `classroom` first); `hasTheme()` returns `true` for a registered id and `false` for an unregistered one, without throwing; registering a second theme under an id already in the registry throws an error naming that id (FR-001, FR-004, FR-005, FR-006).
- [X] T004 [P] [US1] Create `tests/lib/themes/classic.test.ts`: an entry present for every one of the fourteen `ELEMENT_IDS`, plus `doorOpenEntry` and `magicWallActiveEntry`, plus every declared player-facing string field including `displayName` (FR-007, FR-010); `elements.exit` is byte-identical (`fillColor`/`glyph`/`label`) to `elements.steelWall` (FR-008); `doorOpenEntry` and `magicWallActiveEntry` are each visibly distinct (not equal) from their inert counterparts and from every other entry in the theme (FR-009); `title` and `displayName` contain no substring of the commercial original's trademarked name (FR-011).
- [X] T005 [P] [US1] Update `tests/lib/themes/classroom.test.ts` to assert `classroomTheme.displayName` is present and a non-empty string, alongside the existing per-element and string-field assertions (FR-003, FR-032 — no other wording change).

### Implementation for User Story 1

- [X] T006 [US1] In `src/lib/themes/types.ts`, add `readonly displayName: string;` to the `Theme` interface (FR-003) — the picker label, distinct from `id` (never shown to the player) and from `title` (the in-game name shown on the title screen, unchanged since feature 005).
- [X] T007 [US1] In `src/lib/themes/classroom.ts`, add `displayName: 'Classroom'` to `classroomTheme` (or equivalent wording at the maintainer's discretion) — every other field unchanged (FR-032). Depends on T006.
- [X] T008 [P] [US1] Create `src/lib/themes/classic.ts`: `id: 'classic'`, an original non-trademarked `displayName` and `title` (FR-011), and a full `Theme` implementation approximating the original — earth-brown `dirt`, grey `boulder`, glittering-white `diamond`, a `brickWall` and `steelWall` visually distinct from each other, `player` as Rockford, plus `firefly`, `butterfly`, `amoeba`, `magicWall`, `expandingWall`, `exit`, `explosion`, `empty` (FR-007); `elements.exit` identical to `elements.steelWall` (FR-008); `doorOpenEntry` and `magicWallActiveEntry` each visibly distinct from their inert counterparts and from every other entry (FR-009); every player-facing string field (`messages.dead`/`messages.completed`, `readout.template`, `caveIntro.template`, `lifeLost.label`, `gameOver.label`, `won.label`, `paused.label`, `hud.lives`/`hud.time`/`hud.score`/`hud.highScore`/`hud.furthestCave`, `caveComplete.label`) populated in classic-setting wording, using the same `{placeholder}` tokens as `classroom.ts`'s equivalent field (FR-010); a module-load self-check iterating `ELEMENT_IDS` and throwing on any missing entry, mirroring `classroom.ts`'s existing pattern. Depends on T006.
- [X] T009 [US1] Create `src/lib/themes/index.ts`: import `classroomTheme` and `classicTheme`, and call `registerTheme(classroomTheme)` then `registerTheme(classicTheme)` as the module's only side effect — the one place either shipped theme is registered, so `listThemes()[0].id === 'classroom'` (the constitution's default) and a third theme in the future is a one-line addition here only. Depends on T002, T007, T008.
- [X] T010 [US1] In `src/App.svelte`: replace `import { registerTheme, getTheme } from './lib/themes/registry'` + `registerTheme(classroomTheme)` + the `THEME_ID` constant with `import './lib/themes'` (for its registration side effect) + `import { getTheme } from './lib/themes/registry'` + `import { listThemes } from './lib/themes/registry'`; add `let activeThemeId: string = $state('classroom')` (US3, T021, replaces the literal with a storage-resolved value); change `theme = $derived(getTheme(THEME_ID))` to read `activeThemeId`; change the render loop's `getThemeId: () => THEME_ID` to `getThemeId: () => activeThemeId`; add `function selectTheme(id: string): void { if (id === activeThemeId) return; activeThemeId = id; }` (FR-018 — a no-op, no state change, when reselecting the active id; US3, T021, extends this function to also persist). Depends on T009.
- [X] T011 [US1] In `src/App.svelte`'s markup, add a theme-list control rendered unconditionally, outside every screen-conditional block, so it is present on all eight screens FR-021 names; one item per `listThemes()` result in registration order, showing that theme's `displayName` (never its `id`), with the currently active one visibly indicated; each item is a native, Tab-reachable, Enter/Space-activatable element (e.g. a `<button>`) calling `selectTheme(theme.id)` on activation or click, so the list is keyboard-operable (the guarantee, FR-017) and additionally pointer-operable (FR-034) through the same handler, with no keydown capture and no focus stolen from the game while a cave is running (FR-020); the whole control is hidden (not rendered, not disabled) when `listThemes().length < 2` (FR-019). Depends on T010.

**Checkpoint**: At this point, two complete themes are registered and selectable; the registry, Classic's completeness, and Classroom's `displayName` are unit-tested. The control's keyboard/pointer operability and live re-render are verified by the maintainer in a browser (Principle VII) — no DOM harness exists in this project to automate it.

---

## Phase 4: User Story 2 - Switching mid-cave, live and lossless (Priority: P2)

**Goal**: A dedicated, named `cycleTheme` input action — sharing no key with any gameplay action — lets the player cycle themes from any screen, including mid-play with a boulder in flight, without perturbing the sim, dropping a tick, or swallowing a held gameplay key; and it is inert on the title screen's "any key starts the game" path.

**Independent Test**: Drive a fixture cave for a fixed number of ticks in a headless run, switching the active theme at a chosen tick, and assert the resulting grid, tick count, timer value, score, diamond count, and lives are identical to the same run with no switch at all.

### Tests for User Story 2

- [X] T012 [P] [US2] Create `tests/lib/input/keyboard.test.ts` (no prior test file exists for `KeyboardInput`): `consumeCycleTheme()` reports `true` exactly once per `t`/`T` keydown and `false` otherwise, ignoring `event.repeat` the same way `consumeRestart()`/`consumePause()` do; a held direction key's `consumeDirection()` report is unaffected by an interleaved `cycleTheme` keydown/keyup (the two actions are independent); and `CYCLE_THEME_KEYS` shares no member with the keys `KEY_TO_DIRECTION`, `GRAB_KEYS`, `RESTART_KEYS`, `START_KEYS`, or `PAUSE_KEYS` declare, checked by comparing the declared sets directly (SC-011).
- [X] T013 [P] [US2] Create `tests/lib/themes/selection.test.ts`: `cycleThemeId(currentId, order)` returns the id immediately after `currentId` in `order`; wraps to `order[0]` when `currentId` is the last entry, and also when `currentId` is not found in `order` at all; returns `currentId` unchanged when `order.length < 2`.

### Implementation for User Story 2

- [X] T014 [P] [US2] In `src/lib/input/keyboard.ts`, add `const CYCLE_THEME_KEYS = new Set(['t', 'T']);` (research.md's flagged default — disjoint from every existing key set), a private `cycleThemePending = false` field, handling in `onKeyDown` alongside `RESTART_KEYS`/`PAUSE_KEYS` (`event.preventDefault()`, set the pending flag only when `!event.repeat`), and `consumeCycleTheme(): boolean` mirroring `consumeRestart()` exactly (FR-033).
- [X] T015 [P] [US2] Create `src/lib/themes/selection.ts` with `export function cycleThemeId(currentId: string, order: readonly string[]): string` per contract — plain TypeScript, no Svelte import.
- [X] T016 [US2] In `src/App.svelte`'s `stepTickInner()`, consume `keyboard.consumeCycleTheme()` unconditionally, at the very top — before the existing `keyboard.consumeRestart()` check — and on a press call `selectTheme(cycleThemeId(activeThemeId, listThemes().map((t) => t.id)))`. Because this runs before the `session.screen === 'title'` branch's `consumeStart()`/`consumeDirection()`/`consumeGrab()` checks, and `CYCLE_THEME_KEYS` is disjoint from those actions' keys, a `cycleTheme` press is never evaluated as a start/direction/grab press (FR-035) and reaches every screen without a per-screen special case (FR-021, FR-020). Depends on T010, T011, T014, T015.

**Checkpoint**: Pressing the cycle key from any screen switches the theme; from the title screen it never starts the game; a held movement key survives a switch (verified by `keyboard.test.ts`'s independence assertion). No sim file is touched, so the tick/grid/timer/score/lives-identical guarantee holds structurally — confirmed by the unchanged existing `tests/sim/**` and `tests/lib/session/**` suites (checked in Polish, T023/T024) rather than a new fixture test, since nothing in `tick()` or `tickSession()` takes a theme parameter to begin with.

---

## Phase 5: User Story 3 - The game remembers your look (Priority: P3)

**Goal**: The chosen theme id joins the existing `recess-rocks:save` record (not a second storage key), last-write-wins, restored on load with a silent fallback to Classroom for anything unregistered, non-string, or absent — and every storage failure degrades silently without costing the player their high score or furthest cave.

**Independent Test**: With a stubbed storage surface, write a record naming each of: a registered theme, an unregistered theme, a non-string value, and nothing at all; confirm the restored theme is the stored one in the first case and Classroom in the other three, and that the high score and furthest cave survive every case unchanged.

### Tests for User Story 3

- [X] T017 [P] [US3] Update `tests/lib/storage/save.test.ts`: `readSave()` returns `themeId: undefined` for a missing, unreadable, or non-string stored `themeId` (a number, an object, `null`); `writeSave({ themeId: 'a' })` followed by `writeSave({ highScore: 5 })` (no `themeId` in the second call) leaves the stored `themeId` as `'a'` — the per-field merge, not a full-record overwrite; `writeSave({ themeId: 'z-later' })` followed by `writeSave({ themeId: 'a-earlier' })` results in `'a-earlier'` stored — last-write-wins, not `Math.max`-shaped (FR-027); every existing `highScore`/`furthestCave` grow-only case re-run unmodified to confirm no regression (FR-031-by-analogy).
- [X] T018 [P] [US3] Add `resolveStoredThemeId` cases to `tests/lib/themes/selection.test.ts`: a registered id is returned unchanged; an unregistered id, a non-string value (number, object, `null`), and `undefined` all resolve to the given `fallbackId` (FR-025).

### Implementation for User Story 3

- [X] T019 [P] [US3] In `src/lib/storage/save.ts`: add `readonly themeId?: string;` to `SaveRecord`; in `readSave()`, include `themeId: typeof record?.themeId === 'string' ? record.themeId : undefined` in the returned record (no registry-awareness in this module — only "is this a string" is validated here); change `writeSave`'s parameter type to `Partial<SaveRecord>` and its merge from one object-literal `Math.max` call to per-field — `highScore`/`furthestCave` keep `Math.max(current.x, record.x ?? current.x)` (unchanged behavior), `themeId: record.themeId ?? current.themeId` (new, last-write-wins, FR-025/FR-027).
- [X] T020 [P] [US3] Add `export function resolveStoredThemeId(stored: unknown, registeredIds: readonly string[], fallbackId: string): string` to `src/lib/themes/selection.ts` per contract — returns `stored` only if it is a `string` present in `registeredIds`, otherwise `fallbackId`, total and never throwing (FR-025).
- [X] T021 [US3] In `src/App.svelte`: initialize `activeThemeId` from `resolveStoredThemeId(readSave().themeId, listThemes().map((t) => t.id), 'classroom')` instead of the literal `'classroom'` (T010's placeholder); extend `selectTheme` (T010) to also call `writeSave({ themeId: id })` immediately after updating `activeThemeId` (FR-028 — persisted at the moment of change, not deferred to the next score/cave-progress write), still skipped entirely when reselecting the already-active id (FR-018). Depends on T010, T019, T020.

**Checkpoint**: Theme choice survives a reload; an unregistered/corrupt/absent stored value opens in Classroom with the high score and furthest cave intact; a throwing or disabled `localStorage` degrades silently and still lets the switch apply for the session.

---

## Phase 6: User Story 4 - A future theme cannot ship with holes (Priority: P3)

**Goal**: An automated check that iterates every currently *registered* theme against the full element-id list and every required string field, failing — and naming the theme and the missing piece — on any gap, so a new element or a new theme cannot ship incomplete unnoticed.

**Independent Test**: A check that iterates every registered theme against the full list of element ids and required appearance entries and fails on any gap; verified by asserting it fails for a deliberately incomplete fixture theme and passes for both shipped themes.

### Implementation for User Story 4

- [X] T022 [US4] Create `tests/lib/themes/registry-completeness.test.ts`: import `../../../src/lib/themes` (the real registration side effect, T009) and, for every theme `listThemes()` returns, assert an entry exists for every id in `ELEMENT_IDS` (`src/sim/elements.ts`) with no extra keys, `doorOpenEntry`/`magicWallActiveEntry` are present, and every declared string field (`displayName`, `title`, `messages.dead`, `messages.completed`, `readout.template`, `caveIntro.template`, `lifeLost.label`, `gameOver.label`, `won.label`, `paused.label`, `hud.lives`, `hud.time`, `hud.score`, `hud.highScore`, `hud.furthestCave`, `caveComplete.label`) is present and non-empty — this passes for the two shipped themes (Acceptance Scenario 1). Also write the same per-theme check as a local test-only function and exercise it directly against: a deliberately incomplete fixture `Theme` object (missing one element entry, constructed inline, never registered) to prove the check fails and names both the fixture's id and the missing element id (Acceptance Scenario 2); and a fixture element-id list with one extra id, run through the per-element portion of the check against a real shipped theme, to prove it fails for every registered theme when a new element id has no matching theme entry yet (Acceptance Scenario 3, FR-029, SC-008). Depends on T009 (real registration), T008 (Classic must exist and be complete for the shipped-themes-pass case).

**Checkpoint**: The completeness check passes for Classroom and Classic today, and is proven to fail loudly — naming the theme and the missing piece — for an incomplete fixture and for an unthemed new element id.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Full-suite regression, the sim-untouched acceptance test this feature is named for, and the final headless/build gate

- [ ] T023 [P] Run `npm test` (builds `dist/` first, then the full vitest suite) and confirm every existing sim/session/caves test from features 001–005 passes unchanged (FR-031), alongside the new registry, Classic, selection, save, keyboard, and completeness suites this feature adds (SC-001–SC-011).
- [ ] T024 [P] Review the full diff this feature produces (or the PR's file list, FR-016) and confirm: zero files under `src/sim/` are touched (FR-012); no rendering or shell logic anywhere compares against a theme id or theme name (FR-013) — the acceptance test the spec is built around (SC-002).
- [ ] T025 Maintainer-only (not automatable, per quickstart.md and Principle VII): run `npm run build`, open `dist/index.html` via `file://`, and work through quickstart.md's `file://` playback checklist — theme control listing both themes by display name with the active one indicated, full keyboard operability plus additive pointer operability, a live mid-cave switch with a boulder in flight and a held movement key, the closed exit genuinely indistinguishable from the steel wall under both themes, the title-screen cycle key cycling without starting a cave while every other key still starts one, reselecting the active theme producing no flicker, a reload restoring the chosen theme, and the frame rate holding across a switch.

**Checkpoint**: `npm test` green, diff confirmed sim-untouched and theme-id-comparison-free, maintainer sign-off recorded.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — run first
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS every user story (T002's `listThemes()`/`hasTheme()`/duplicate-guard surface is what `themes/index.ts` (US1), the theme control (US1), the cycle handler (US2), and the completeness check (US4) all call)
- **User Stories (Phase 3–6)**: All depend on Foundational completion
  - US1 (P1) has no dependency on any other story and is the MVP — the second theme, the real registry contents, and the control
  - US2 (P2) depends on US1's `App.svelte` state (`activeThemeId`, `selectTheme`, T010–T011) to have something to cycle
  - US3 (P3) depends on US1's `selectTheme` (T010) to extend with a persistence call, and stands alone otherwise
  - US4 (P3) depends on US1's `classic.ts` (T008) and `themes/index.ts` (T009) so the "passes for both shipped themes" half of its check has a real, complete second theme to check
- **Polish (Phase 7)**: Depends on all four user stories being complete

### Within Each Story

- Tests are written before implementation (write the test, confirm it fails, then implement)
- `src/lib/themes/selection.ts` is created in US2 (`cycleThemeId`) and extended in US3 (`resolveStoredThemeId`) — the same file, two additive functions, never rewritten
- `src/App.svelte` gains `activeThemeId`/`selectTheme`/the control in US1 (T010–T011), gains the cycle-key consumption in US2 (T016), and gains storage-backed initialization/persistence in US3 (T021) — three small, additive edits to the same file, in story order, never re-rewritten
- `src/lib/storage/save.ts`'s merge (T019) and `src/lib/themes/classic.ts`'s completeness (T008, exercised again by T022) are each touched exactly once

### Parallel Opportunities

- All "Tests for USn" tasks marked [P] within one story's phase can run together — they are independent files or independent cases
- T003 (registry.test.ts), T004 (classic.test.ts), and T005 (classroom.test.ts) can be written in parallel — three independent files
- T007 (classroom.ts) and T008 (classic.ts) can proceed in parallel once T006 (types.ts) lands — different theme files, same new field
- T014 (keyboard.ts) and T015 (selection.ts) can proceed in parallel — different files, no interdependency
- T019 (save.ts) and T020 (selection.ts) can proceed in parallel — different files, no interdependency

---

## Parallel Example: User Story 1

```bash
# Launch all US1 test-writing tasks together (independent files):
Task: "Registry enumeration/hasTheme/duplicate-guard tests in tests/lib/themes/registry.test.ts"
Task: "Classic completeness/distinctness/no-trademark tests in tests/lib/themes/classic.test.ts"
Task: "Classroom displayName test in tests/lib/themes/classroom.test.ts"

# Then implement (types.ts first; classroom.ts and classic.ts then proceed in parallel):
Task: "Add displayName to Theme in src/lib/themes/types.ts"
Task: "Add displayName to classroomTheme in src/lib/themes/classroom.ts"
Task: "Create src/lib/themes/classic.ts"

# Then sequentially (each depends on the one before):
Task: "Create src/lib/themes/index.ts"
Task: "Wire activeThemeId/selectTheme into src/App.svelte"
Task: "Add the theme-list control markup to src/App.svelte"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks every story)
3. Complete Phase 3: User Story 1 (Classic exists, the registry is real, the control switches costume live)
4. **STOP and VALIDATE**: `npm test`, then a manual `file://` pass on the control's keyboard/pointer operability
5. This is the MVP: the constitution's "at least two themes and an in-game theme selector" is proven, once

### Incremental Delivery

1. Setup + Foundational → the registry has the surface a real registry needs, nothing observable yet
2. Add User Story 1 → two themes exist and are selectable, live — **MVP**
3. Add User Story 2 → a dedicated key cycles themes from any screen, including mid-play, without perturbing the sim or the title screen's start path
4. Add User Story 3 → the choice survives a reload, degrading silently on storage failure
5. Add User Story 4 → a future incomplete theme or unthemed element fails the build loudly instead of shipping a blank square
6. Polish → full regression, the sim-untouched/no-theme-id-comparison acceptance test, maintainer's `file://` pass

### Parallel Team Strategy

With multiple developers, after Foundational lands:

- Developer A: User Story 1 (the registry contents, Classic, the control) — every other story depends on this one
- Developer B: starts User Story 2's pure pieces (`keyboard.ts`'s `cycleTheme` action, `selection.ts`'s `cycleThemeId`) in parallel with A, since neither touches `App.svelte`; the `App.svelte` wiring (T016) waits on A's T010/T011
- Developer C: starts User Story 3's pure pieces (`save.ts`'s per-field merge, `selection.ts`'s `resolveStoredThemeId`) in parallel with A and B, for the same reason; the `App.svelte` wiring (T021) waits on A's T010
- User Story 4 (T022) is the natural next task for whoever finishes first, once Classic (A's T008) exists

---

## Notes

- [P] tasks touch different files (or independent additive regions of the same file) and have no unmet dependency within this list
- [Story] labels map every phase-3+ task to its user story for traceability
- This feature adds zero new `ElementId`s, zero new `Grid` typed arrays, and touches zero files under `src/sim/` — no task in this list names a path under `src/sim/` (FR-012, FR-031)
