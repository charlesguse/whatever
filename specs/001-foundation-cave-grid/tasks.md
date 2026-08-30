---

description: "Task list template for feature implementation"
---

# Tasks: Foundation — Cave Grid, Deterministic Tick, Themed Renderer, Digging Player

**Input**: Design documents from `/specs/001-foundation-cave-grid/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/sim-api.md, quickstart.md

**Tests**: This feature's spec explicitly requires an automated ASCII-cave test suite as its own user story (US3) and functional requirements (FR-038–FR-042), and the constitution mandates a pinning test for every physics rule. Test tasks below are therefore mandatory deliverables, not optional scaffolding.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story, in the priority order from spec.md (US1 P1, US2 P2, US3 P2, US4 P3).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

Single Svelte/Vite project at the repository root, per plan.md's Project Structure — no monorepo, no separate frontend/backend. `src/sim/**` is plain TypeScript (no Svelte, no DOM, no `Math.random`, no `Date.now`); everything else under `src/` is shell. Tests live under `tests/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Stand up the project skeleton — this is the first feature in the repo, so there is no `src/`, `package.json`, or build yet.

- [X] T001 Create `package.json` with `dev`, `build`, and `test` scripts and dependencies limited to Svelte 5, Vite, `@sveltejs/vite-plugin-svelte`, `vite-plugin-singlefile`, vitest, and TypeScript (constitution Principle IV — no other runtime dependency)
- [X] T002 Create `vite.config.ts` wiring `@sveltejs/vite-plugin-svelte` and `vite-plugin-singlefile` for the build, and configuring vitest to run headless with no DOM/browser environment
- [X] T003 [P] Create `tsconfig.json` for a Svelte 5 + TypeScript project
- [X] T004 Create `index.html` as the Vite entry point that mounts the Svelte app
- [X] T005 [P] Create `src/main.ts` — Svelte app bootstrap that mounts `App.svelte`
- [X] T006 [P] Create `src/App.svelte` as an empty top-level shell skeleton (canvas element placeholder only; loops and input wired in later phases)

**Checkpoint**: `npm install`, `npm run build`, and `npm test` all run (even with nothing under test yet) before any sim code is written.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core sim building blocks every user story depends on — the element vocabulary, the grid, the PRNG, the ASCII format, and the theme contract shape.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T007 [P] Create the element id vocabulary and the single shared character mapping in `src/sim/elements.ts` (all 14 declared element ids per FR-002; only 5 have behavior, the rest are valid, inert grid contents per FR-003)
- [X] T008 [P] Create the typed-array grid module in `src/sim/grid.ts` — cell contents, per-cell moved-this-tick flags cleared each tick (FR-004), and read-only accessors for cell contents and player position (FR-005), with dimensions read from cave data rather than hardcoded (FR-036)
- [X] T009 [P] Create the seeded PRNG in `src/sim/prng.ts` — a small deterministic generator (e.g. mulberry32/xorshift) owned entirely by the sim, seeded from cave data, with no `Math.random` (FR-008, FR-009)
- [X] T010 Create ASCII↔grid helpers in `src/sim/ascii.ts` — `caveFromAscii` and `asciiFromState` per `contracts/sim-api.md`, built on the character mapping from `src/sim/elements.ts` (FR-032) (depends on T007, T008)
- [X] T011 Create the cave definition parser/validator in `src/sim/cave.ts` — `parseCave` per `contracts/sim-api.md`, validating rectangular rows, declared-vs-actual dimensions, recognized characters, and exactly one player, throwing with cave name and offending coordinates on failure and never returning a partial grid (FR-031, FR-033) (depends on T007, T008, T009, T010)
- [X] T012 [P] Create the theme entry/theme contract types in `src/lib/themes/types.ts` — `ThemeEntry` (fill color, glyph, label) and `Theme` (per-element-id entries plus a cave background) per data-model.md (FR-025)

**Checkpoint**: Foundation ready — `src/sim/` has a parseable, typed-array cave state with no tick behavior yet; user story implementation can now begin.

---

## Phase 3: User Story 1 - Dig around the starter cave (Priority: P1) 🎯 MVP

**Goal**: A player opens the page, sees the starter cave, and can walk and dig through it with crisp one-cell grid-locked steps, stopped by walls and the cave boundary, with the view scrolling to follow them.

**Independent Test**: Open the page, press each of the four direction keys, confirm the kid steps one cell per step, clears dirt, leaves corridors behind, and is stopped by both wall types; hold a key and confirm steady-cadence walking; walk toward a far corner and confirm the view scrolls and stops at the boundary.

### Implementation for User Story 1

- [X] T013 [US1] Implement the tick function in `src/sim/tick.ts` — `tick(state, input) -> state'` per `contracts/sim-api.md`: fixed top-to-bottom/left-to-right scan clearing moved-flags first (FR-007), player moves at most one cell in one of four directions (FR-011, FR-012), empty/dirt/wall/boundary/no-input rules (FR-013–FR-017), pure and side-effect-free (depends on T007, T008, T009, T011)
- [X] T014 [P] [US1] Create keyboard input tracking in `src/lib/input/keyboard.ts` — arrows and WASD mapped to the same four directions (FR-018), held-key state tracked from key-down/key-up with "most recently pressed still-held direction wins" (FR-020), one direction-or-nothing reported per tick with taps between ticks not lost (FR-019), `preventDefault` on the game's movement keys (FR-022), no OS key-repeat reliance (FR-021)
- [X] T015 [P] [US1] Create the dead-zone scrolling camera in `src/lib/render/camera.ts` — pure function of `(playerPos, caveDims, viewportSize, prevCameraPos) -> nextCameraPos`, follows the player only once they leave a central dead zone, clamps at cave edges, centers without scrolling when the whole cave fits (FR-029)
- [X] T016 [P] [US1] Create the theme registry in `src/lib/themes/registry.ts` — a registry keyed by theme id (FR-027) (depends on T012)
- [X] T017 [US1] Create the Classroom theme data in `src/lib/themes/classroom.ts` — one `ThemeEntry` per declared element id (all 14, FR-026), with dirt as notebook paper, brick wall as cinder brick, steel wall as a locker door, and the player as a kid with a backpack, plus a cave background (depends on T007, T012)
- [X] T018 [US1] Create the starter cave in `src/caves/starter.ts` — 40×22 (FR-036), enclosed by an indestructible border (FR-035), using only the 5 behavioral elements, expressed in the shared ASCII cave format with a name and seed (FR-031, FR-034) (depends on T010, T011)
- [X] T019 [US1] Implement the canvas render loop in `src/lib/render/canvas.ts` — its own fixed-timestep loop independent of the tick loop (FR-023), reads sim state only through the read-only accessors, draws uniform square cells sized to adapt to window size without distortion (FR-030), looks up every color/glyph/label from the active theme via the registry and the camera's viewport with no literal color/glyph/label at any drawing site and no branching on which theme is active (FR-024) (depends on T008, T015, T016, T017)
- [X] T020 [US1] Wire the fixed-timestep tick loop (with accumulator clamped to avoid catch-up bursts after a backgrounded tab), the render loop, keyboard input, and the starter cave together in `src/App.svelte`, so the game starts directly in the starter cave on load with no click-to-start step (depends on T013, T014, T018, T019)

**Checkpoint**: User Story 1 is fully functional — the maintainer can validate movement, digging, walls, boundaries, and camera scrolling manually per quickstart.md (browser-only checks, per constitution Principle VII).

---

## Phase 4: User Story 2 - Play it from a file on disk (Priority: P2)

**Goal**: The built page runs correctly when opened directly from the filesystem with no server, no install step, and zero network requests.

**Independent Test**: Run the build, open the emitted file directly from the filesystem with no server running and the network disabled, and confirm the cave renders and responds to the keyboard.

### Implementation for User Story 2

- [X] T021 [US2] Verify and, if needed, adjust `vite.config.ts` so the build emits exactly one self-contained `dist/index.html` with all JS/CSS inlined and no sibling script, style, image, font, or audio file referenced at play time (FR-043, SC-008)
- [X] T022 [US2] Add an automated build-output check at `tests/build/single-file.test.ts` that inspects the built `dist/index.html` and asserts it contains no external `<script src>`, `<link href>`, or other network-dependent resource reference (depends on T021)

**Checkpoint**: `npm run build` followed by opening `dist/index.html` from disk with the network disabled plays correctly (maintainer-verified per quickstart.md, since real `file://` playback needs a browser).

---

## Phase 5: User Story 3 - Behavior pinned by ASCII cave tests (Priority: P2)

**Goal**: A contributor-facing test harness that builds grids from ASCII, runs ticks, and asserts ASCII output, plus the suite of tests it enables — covering grid construction, cave parsing, every movement interaction, and determinism.

**Independent Test**: Run the suite in a plain terminal (no browser present), and confirm it covers grid construction, cave parsing, each movement interaction, and a replay that asserts two identical runs produce identical grids.

### Tests for User Story 3

- [ ] T023 [US3] Create the ASCII cave test harness in `tests/sim/helpers/ascii-cave.ts` — build-a-grid-from-inline-ASCII, run-N-ticks (optionally driven by a per-tick input sequence), and assert-ASCII-equals reporting failures as side-by-side readable actual/expected grids rather than raw cell values (FR-038–FR-040) (depends on T010, T011, T013)
- [ ] T024 [P] [US3] Write grid construction tests in `tests/sim/grid.test.ts` (FR-041)
- [ ] T025 [P] [US3] Write cave parsing tests in `tests/sim/cave-parsing.test.ts` covering every rejection case: unequal row lengths, row/column count disagreeing with declared dimensions, an unrecognized character, zero players, and more than one player, each asserting the error names the cave and the offending coordinates (FR-033, FR-041)
- [ ] T026 [P] [US3] Write movement tests in `tests/sim/movement.test.ts` covering movement into empty, dirt, brick wall, steel wall, and the grid boundary; a tick with no input; a sustained run of the same direction over consecutive ticks standing in for a held key (FR-021); and a cave whose dimensions differ from the starter cave's, proving no size is hardcoded (FR-036, FR-041)
- [ ] T027 [P] [US3] Write a determinism replay test in `tests/sim/determinism.test.ts` — the same starting cave, seed, and input sequence run twice over at least 100 ticks produces byte-for-byte identical grids at every tick (FR-010, SC-005, FR-041)

**Checkpoint**: `npm test` runs the full suite with no browser, canvas, or audio device, covering everything FR-041 lists (SC-007).

---

## Phase 6: User Story 4 - Classroom appearance comes from a theme table (Priority: P3)

**Goal**: Confirm every visual attribute drawn on screen is looked up from the Classroom theme table by element id, with no literal colors/glyphs/labels and no theme branching in drawing code.

**Independent Test**: Search the drawing code for literal colors, glyphs, and labels; confirm every one comes from the theme table, and that the Classroom theme has an entry for every declared element id.

### Tests for User Story 4

- [ ] T028 [US4] Write a theme-completeness test at `tests/lib/themes/classroom.test.ts` that iterates the full declared element set from `src/sim/elements.ts` and asserts the Classroom theme in `src/lib/themes/classroom.ts` has a `ThemeEntry` for every one, including the 9 with no behavior yet (FR-025, FR-026) (depends on T007, T017)

### Implementation for User Story 4

- [ ] T029 [US4] Audit `src/lib/render/canvas.ts` and `src/App.svelte` for any literal color, glyph, or label value or any branch on which theme is active, and replace findings with theme-table lookups through `src/lib/themes/registry.ts` (FR-024, SC-009) (depends on T019)

**Checkpoint**: All four user stories are independently functional; a hypothetical second theme would require only a new registry entry (SC-009).

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final verification across all stories.

- [ ] T030 Run `npm run build` and `npm test` together as the merge gate and confirm both pass in an environment with no browser installed (FR-044, FR-045)
- [ ] T031 Execute the maintainer's manual browser validation checklist from `specs/001-foundation-cave-grid/quickstart.md` — `file://` playback, movement feel, camera dead-zone/clamp feel, window resize, and backgrounded-tab recovery — and record results at review (spec's "Verified by the maintainer at review time")

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational. No dependency on other stories.
- **User Story 2 (Phase 4)**: Depends on Foundational and on the build config from Setup; independent of US1/US3/US4 in substance, though a real end-to-end check benefits from US1 existing.
- **User Story 3 (Phase 5)**: Depends on Foundational and on `src/sim/tick.ts` (T013, from US1) to have something to test — the harness itself (T023) is generic, but the movement tests (T026) pin US1's behavior.
- **User Story 4 (Phase 6)**: Depends on Foundational and on the Classroom theme and renderer built in US1 (T017, T019).
- **Polish (Phase 7)**: Depends on all four user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational — no dependency on other stories. This is the MVP.
- **User Story 2 (P2)**: Can start after Foundational/Setup; verifies build shape rather than sim behavior, so it does not require US1's code to exist, only the build config.
- **User Story 3 (P2)**: Can start after Foundational; its harness (T023) only needs T010/T011/T013, so it can proceed in parallel with US2, but its movement tests (T026) assume US1's tick rules are implemented.
- **User Story 4 (P3)**: Can start after Foundational; its test (T028) only needs T007/T017 (theme data), and its audit (T029) needs US1's renderer (T019) to exist to audit.

### Parallel Opportunities

- Setup: T003, T005, T006 can run in parallel once T001/T002/T004 land.
- Foundational: T007, T008, T009, T012 can run in parallel; T010 depends on T007+T008; T011 depends on T007+T008+T009+T010.
- User Story 1: T014, T015, T016 can run in parallel with each other and with T013; T017 depends on T007+T012; T019 depends on T008+T015+T016+T017; T020 depends on T013+T014+T018+T019.
- User Story 3: T024, T025, T026, T027 can all run in parallel once T023 exists.
- Different user stories (US1, US2, US3, US4) can be staffed in parallel once Foundational is complete, keeping in mind the cross-story dependencies noted above (US3's movement tests and US4's audit are downstream of US1's implementation).

---

## Parallel Example: Foundational Phase

```bash
# Launch independent foundational modules together:
Task: "Create element vocabulary + character mapping in src/sim/elements.ts"
Task: "Create typed-array grid module in src/sim/grid.ts"
Task: "Create seeded PRNG in src/sim/prng.ts"
Task: "Create theme entry/theme contract types in src/lib/themes/types.ts"
```

## Parallel Example: User Story 1

```bash
# Launch independent US1 modules together, alongside tick.ts:
Task: "Implement tick function in src/sim/tick.ts"
Task: "Create keyboard input tracking in src/lib/input/keyboard.ts"
Task: "Create dead-zone scrolling camera in src/lib/render/camera.ts"
Task: "Create theme registry in src/lib/themes/registry.ts"
```

## Parallel Example: User Story 3

```bash
# Launch all US3 test files together once the harness exists:
Task: "Write grid construction tests in tests/sim/grid.test.ts"
Task: "Write cave parsing tests in tests/sim/cave-parsing.test.ts"
Task: "Write movement tests in tests/sim/movement.test.ts"
Task: "Write determinism replay test in tests/sim/determinism.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories).
3. Complete Phase 3: User Story 1.
4. **STOP and VALIDATE**: Manually test User Story 1 per quickstart.md in a browser.
5. This is the playable vertical slice — the entire visible product of this feature.

### Incremental Delivery

1. Setup + Foundational → sim skeleton ready, nothing playable yet.
2. Add User Story 1 → the game is playable end to end (MVP!).
3. Add User Story 2 → confirms the exact shipping shape (`file://`, zero network).
4. Add User Story 3 → pins US1's behavior with an automated suite, unblocking every later physics feature.
5. Add User Story 4 → confirms the theme-table discipline holds, unblocking future themes with zero sim/render changes.
6. Polish → final merge-gate run and maintainer browser checklist.

### Suggested Team Split

With multiple contributors, after Foundational completes:

- Contributor A: User Story 1 (the core sim + shell).
- Contributor B: User Story 3's harness and tests, once T013 lands (or building the harness against a stub first).
- Contributor C: User Story 2's build verification and User Story 4's theme audit, both light-weight once Setup/US1 exist.

---

## Notes

- [P] tasks = different files, no dependencies.
- [Story] label maps task to specific user story for traceability.
- Scan order and the falling-vs-resting distinction from `CLAUDE.md` are not yet exercised by this feature (no falling bodies exist yet) but the moved-this-tick flag (T008) and fixed scan order (T013) lay the groundwork later physics features rely on — do not "simplify" them away.
- Commit after each task or logical group.
- Stop at any checkpoint to validate a story independently.
- Avoid: literal colors/glyphs in drawing code, hardcoded 40×22 dimensions outside cave data, `Math.random`/`Date.now` inside `src/sim/`, and Svelte imports inside `src/sim/`.
