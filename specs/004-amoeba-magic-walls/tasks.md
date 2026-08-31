---

description: "Task list for Amoeba, Magic Wall, and Expanding Wall"
---

# Tasks: Amoeba, Magic Wall, and Expanding Wall

**Input**: Design documents from `/specs/004-amoeba-magic-walls/`

**Prerequisites**: [plan.md](./plan.md) (required), [spec.md](./spec.md) (required for user stories), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/sim-api.md](./contracts/sim-api.md), [quickstart.md](./quickstart.md)

**Tests**: Included — `CLAUDE.md` and this feature's spec (FR-038, FR-039) require every rule that changes the grid to ship an ASCII-cave `vitest` test, so test tasks are mandatory here, not optional.

**Organization**: Tasks are grouped by user story (spec.md priorities) so each story is independently implementable and testable. All sim work is plain TypeScript under `src/sim/`; the only shell work is the theme data addition and one `resolveEntry` branch in `src/lib/render/canvas.ts` (see plan.md's Summary and Constitution Check). `src/App.svelte` is untouched.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task in this list)
- **[Story]**: US1–US3, matching spec.md's user stories
- Every task names its exact file path(s)

## Path Conventions

Single front-end project (unchanged from features 001–003): sim code under `src/sim/`, sim tests under `tests/sim/`, theme data under `src/lib/themes/`, theme tests under `tests/lib/themes/`, the shipped cave at `src/caves/starter.ts`.

---

## Phase 1: Setup

**Purpose**: Confirm the branch is a clean base for this feature before any code changes

- [X] T001 Run `npm test` on the current branch (build + full vitest suite) and confirm the feature-001/002/003 baseline passes with no failures, establishing the pre-change state this feature's work is measured against

**Checkpoint**: Baseline confirmed green. No source files touched yet.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The cave-scoped parameters and state every user story below needs — `CaveDefinition`/`CaveState` fields, the magic wall's cave-wide phase/countdown machinery, the ASCII pass-through plumbing tests need to set them, and the one-line movement block shared by all three new elements. Nothing here is independently player-visible yet; it is inert until Phase 3+ wires triggers into it.

**⚠️ CRITICAL**: No user story task can start until this phase is complete.

- [X] T002 In `src/sim/cave.ts`: add `export type MagicWallPhase = 'dormant' | 'active' | 'dead'`; add optional `amoebaGrowthRate?: number`, `amoebaSizeLimit?: number`, `magicWallDuration?: number` to `CaveDefinition`; add `amoebaGrowthRate: number`, `amoebaSizeLimit: number`, `magicWallDuration: number`, `magicWallPhase: MagicWallPhase`, `magicWallCountdown: number` to `CaveState`; in `parseCave`, copy the three definition fields onto the returned state with documented defaults when omitted (`amoebaGrowthRate` → `0.03`, `amoebaSizeLimit` → `200`, `magicWallDuration` → `40`), and initialize `magicWallPhase: 'dormant'` and `magicWallCountdown: 0` (FR-028, data-model.md Cave State/Cave Definition)
- [X] T003 In `src/sim/cave.ts`'s `parseCave`, add validation (alongside the existing checks, same failure discipline — throws naming the cave and the offending value, no partial grid): `amoebaSizeLimit` and `magicWallDuration`, if present in the definition, must each be a positive whole number; `amoebaGrowthRate`, if present, must be a number greater than `0` and at most `1` (FR-029). Depends on T002.
- [X] T004 In `src/sim/cave.ts`, add the read accessor `getMagicWallPhase(state: CaveState): MagicWallPhase` returning `state.magicWallPhase`, alongside the existing accessors (FR-036). Depends on T002.
- [X] T005 [P] In `src/sim/ascii.ts`, add optional `amoebaGrowthRate?: number`, `amoebaSizeLimit?: number`, `magicWallDuration?: number` to `AsciiCave`, forwarded into the `CaveDefinition` returned by `caveFromAscii` (contracts/sim-api.md ASCII helpers). Depends on T002.
- [X] T006 [P] In `tests/sim/helpers/ascii-cave.ts`, add matching optional `amoebaGrowthRate?: number`, `amoebaSizeLimit?: number`, `magicWallDuration?: number` to `CaveOptions`, forwarded through `caveFromAscii` in `caveFromLines` so ASCII-cave tests can set the three cave-scoped parameters without hand-building a `CaveDefinition`. Depends on T005.
- [X] T007 In `src/sim/tick.ts`'s `tick()`, add the magic-wall countdown pass, run once per tick immediately after `ageExplosions` and before the `pendingBlasts` stamping loop: if `magicWallPhase === 'active'`, decrement `magicWallCountdown` by 1, and if it reaches `0`, set `magicWallPhase = 'dead'`; runs unconditionally, including while `status === 'dying'` (FR-019, research.md Decision 2). Depends on T002.
- [X] T008 In `src/sim/tick.ts`'s `movePlayer`, extend the existing wall-block check (`destId === 'brickWall' || destId === 'steelWall'`) to also refuse `amoeba`, `magicWall`, and `expandingWall`, in every phase of the magic wall (FR-002, FR-014, FR-023, research.md Decision 7)
- [X] T009 [P] Add cave-parsing tests to `tests/sim/cave-parsing.test.ts` covering: a cave that sets `amoebaGrowthRate`/`amoebaSizeLimit`/`magicWallDuration` explicitly loads with those exact values on `CaveState`; a cave that omits all three loads with the documented defaults (`0.03`/`200`/`40`); a cave with a non-positive or non-whole `amoebaSizeLimit` is rejected, naming the cave and the offending value; likewise for a non-positive or non-whole `magicWallDuration`; likewise for an `amoebaGrowthRate` that is `0`, negative, or greater than `1` (FR-028, FR-029). Depends on T002, T003.

**Checkpoint**: Cave parameters, magic wall phase/countdown plumbing, the read accessor, and the shared movement block all work and are tested. User story work can now begin.

---

## Phase 3: User Story 1 - The glue spreads, and the player decides when to seal it (Priority: P1) 🎯 MVP

**Goal**: A blob of amoeba grows one cell at a time into empty space and dirt, at a per-cell per-tick probability that makes a bigger blob spread faster, then resolves into gold stars if sealed or boulders if it exceeds its size limit — whichever fires first — and detonates when a falling body lands on it.

**Independent Test**: Load a small cave with a blob of glue surrounded by paper and open floor, run a fixed number of ticks with no input, and confirm the blob has grown into both paper and floor and nowhere else. Then run a cave where the blob is sealed on every side and confirm it becomes gold stars; then one where it is given room past its limit and confirm it becomes erasers. Run each cave twice from the same seed and confirm the two runs are identical grid for grid.

### Tests for User Story 1

- [X] T010 [P] [US1] Write ASCII-cave tests in `tests/sim/amoeba.test.ts` covering growth: growing into dirt, and into empty space, over a fixed tick count (FR-006); refusing to grow into a body, either wall, the door, the kid, an enemy, an explosion, and off the grid edge (FR-006); a larger blob growing faster than a smaller one at the same rate, pinning that the probability is per cell and not per blob (FR-005); amoeba growth being identical across two runs of the same cave and seed, and differing between two different seeds, over enough ticks for a drift of one draw to show (FR-005a, SC-004); a fully enclosed blob still taking its one growth draw per cell, pinned by a cave in which a push later in the same run resolves identically whether the blob had anywhere to grow or not (FR-005a, research.md Decision 4)
- [X] T011 [P] [US1] Write ASCII-cave tests in `tests/sim/amoeba.test.ts` covering collective conversion: an enclosed amoeba turning entirely to diamonds on the expected tick (FR-008); an amoeba grown past its size limit turning entirely to boulders on the expected tick (FR-007); the precedence of FR-009 — an amoeba that is over its limit and sealed on the same tick becomes boulders; a diamond or boulder created by an amoeba conversion not moving on the tick it appears, then falling normally afterwards (FR-009); two disconnected blobs converting together as one collective (FR-003); a cave with zero amoeba cells running no growth pass and drawing no randomness (FR-010)
- [X] T012 [P] [US1] Write ASCII-cave tests in `tests/sim/amoeba.test.ts` covering detonation: a falling eraser or gold star detonating amoeba into empty space via the existing 3x3 blast, and a resting body above amoeba detonating nothing, over many ticks (FR-011); amoeba caught in a blast destroyed like any other destructible content without chaining (FR-012)
- [X] T013 [P] [US1] In `tests/sim/movement.test.ts`, replace the "leaves an inert element (amoeba) unchanged" case (~line 113) with an assertion that the kid is blocked from moving into an amoeba cell and is unharmed by adjacency/contact (FR-002, FR-041)
- [X] T014 [P] [US1] Add a case to `tests/sim/pushing.test.ts` confirming a push toward an amoeba cell fails, and a case to `tests/sim/grab.test.ts` confirming a grab toward an amoeba cell is a no-op (plan.md completeness cases; research.md Decision 7)

### Implementation for User Story 1

- [X] T015 [US1] In `src/sim/tick.ts`, implement `growAmoeba(ctx, x, y)` and dispatch it from the main scan's `else if` chain for every `amoeba` cell not yet moved this tick: take one PRNG draw, succeeding iff the value is less than `amoebaGrowthRate`; on success, build the eligible-neighbor list in fixed order `up, down, left, right` (in-bounds cells currently holding `empty` or `dirt` only); take one further draw always on a successful attempt; if the list is nonempty, `index = floor(draw * list.length)` selects the target, which becomes `amoeba` and is marked moved-this-tick; the source cell is unchanged either way (FR-004–FR-006, FR-005a, research.md Decisions 1 and 4). Depends on T002 (cave-scoped `amoebaGrowthRate`).
- [X] T016 [US1] In `src/sim/tick.ts`, implement the end-of-scan amoeba collective conversion pass, run once after the main scan finishes: one linear scan counts cells currently holding `amoeba` and tracks whether any has an eligible (`empty`/`dirt`) orthogonal neighbor; if the count exceeds `amoebaSizeLimit`, a second linear scan converts every remaining `amoeba` cell to `boulder`, each marked moved-this-tick and not falling; otherwise, if the count is nonzero and no cell has an eligible neighbor, a second scan converts every remaining `amoeba` cell to `diamond`, likewise marked; a count of zero does nothing and draws no randomness (FR-007–FR-010, research.md Decision 3). Depends on T015.
- [X] T017 [US1] In `src/sim/tick.ts`'s `processBody`, add the falling-body-into-amoeba branch alongside the existing kid/enemy checks: if a *falling* boulder/diamond's cell below holds `amoeba`, call `stampBlast` centered on the amoeba cell with content `'empty'` instead of moving into it, with the body destroyed as part of the same blast; a resting body above amoeba triggers nothing; the amoeba cell is never appended to `nextPendingBlasts`, so it does not chain (FR-011, FR-012)

**Checkpoint**: User Story 1 is independently functional — the glue grows, seals or overgrows, and detonates, all replayably.

---

## Phase 4: User Story 2 - Feed the wall while it runs (Priority: P1)

**Goal**: A magic wall lies dormant until the first falling boulder or diamond enters it, then converts anything falling in to its opposite for a fixed number of ticks before dying permanently and indistinguishably from how it looked before it ever activated.

**Independent Test**: Drop an eraser into a wall and confirm a gold star lands below it; drop a gold star in and confirm an eraser lands below. Run the wall past its duration and confirm the next thing dropped in simply stops on top of it. Drop an eraser into an active wall with no room underneath and confirm the eraser is simply gone. Load a cave whose wall is never triggered and confirm it behaves as solid wall for the entire cave.

### Tests for User Story 2

- [X] T018 [P] [US2] Write ASCII-cave tests in `tests/sim/magic-wall.test.ts` covering conversion and activation: a dormant wall activating on the first falling boulder/diamond, with that same body converted and emerging below the wall (FR-016, FR-017); a falling boulder converting to a diamond and a falling diamond converting to a boulder, each continuing to fall (FR-018); a wall two or more cells thick, with the body emerging below the whole unbroken run (FR-018); two bodies converting on the same tick in different columns, resolved in fixed scan order
- [X] T019 [P] [US2] Write ASCII-cave tests in `tests/sim/magic-wall.test.ts` covering expiry and blocking: the wall expiring on the documented tick and the next body falling in stopping on top of it unchanged (FR-019, FR-020); a wall that is never triggered behaving as solid wall for a long run (FR-016, FR-020); the blocked-destination case (FR-018a) — a body falling into an active wall whose destination cell is occupied, and one falling into a wall on the bottom row, each destroyed with nothing emerging and the countdown still running
- [X] T020 [P] [US2] Add a case to `tests/sim/movement.test.ts` confirming the kid is blocked by a magic wall cell in each of its three phases — dormant, active, and dead (FR-014)
- [X] T021 [P] [US2] Add a case to `tests/sim/quota-and-door.test.ts` confirming a diamond produced by a magic-wall conversion counts toward quota once collected, exactly like a drawn diamond, and opens the door (FR-022)
- [X] T022 [P] [US2] Add a case to `tests/sim/pushing.test.ts` confirming a push toward a magic wall cell fails, and a case to `tests/sim/grab.test.ts` confirming a grab toward a magic wall cell is a no-op
- [X] T023 [P] [US2] Update `tests/lib/themes/classroom.test.ts` to assert the `magicWall` entry's label is exactly `"Sticker Machine"` (replacing the current `"Trophy Case"` placeholder), and that `Theme` carries a `magicWallActiveEntry` field that is visually distinguishable from `elements.magicWall` and from every other entry at the shipped cell size (FR-032, FR-033, FR-034)

### Implementation for User Story 2

- [X] T024 [US2] In `src/sim/tick.ts`'s `processBody`, add the falling-body-into-magicWall branch alongside the amoeba/kid/enemy checks: if a *falling* boulder/diamond's cell below holds `magicWall`: if `magicWallPhase === 'dead'`, the body simply comes to rest (clear its falling flag, leave its content unchanged); otherwise (`'dormant'` or `'active'`) — if `'dormant'`, set `magicWallPhase = 'active'` and `magicWallCountdown = magicWallDuration` unconditionally, before computing the destination; walk down from the entry point while each cell currently holds `magicWall` to find the first non-`magicWall` cell as the destination; if that destination is off-grid or does not hold `empty`, remove the body from its origin and destroy it with nothing emerging (FR-018a); otherwise remove the body from its origin and place the opposite element (`boulder` ↔ `diamond`) at the destination, marked falling and moved-this-tick (FR-016–FR-020, research.md Decision 5). Depends on T002, T007.
- [X] T025 [US2] In `src/lib/themes/types.ts`, add `magicWallActiveEntry: ThemeEntry` to the `Theme` interface, parallel to the existing `doorOpenEntry` (FR-033)
- [X] T026 [US2] In `src/lib/themes/classroom.ts`, relabel the `magicWall` entry's `label` from `"Trophy Case"` to `"Sticker Machine"` (FR-032); add a `magicWallActiveEntry` with a distinct glyph/color/label that reads as "running" and is distinguishable from `elements.magicWall` and every other entry (FR-033, FR-034). Depends on T025.
- [X] T027 [US2] In `src/lib/render/canvas.ts`'s `resolveEntry`, add one branch: if `elementId === 'magicWall'` and `getMagicWallPhase(state) === 'active'`, return `theme.magicWallActiveEntry`; every other magic wall cell (dormant or dead) continues to resolve to `theme.elements.magicWall`, so drawing logic never distinguishes dormant from dead (FR-033, FR-034a, SC-013). Depends on T004, T025.

**Checkpoint**: User Stories 1 AND 2 (both P1) work independently — the full MVP is playable: the glue decision and the wall decision both work end to end.

---

## Phase 5: User Story 3 - The bookshelf closes the route behind you (Priority: P2)

**Goal**: An expanding wall grows one cell per tick into open floor on both sides, forever, never eating paper, never crushing anything, and never growing up or down.

**Independent Test**: Put a single expanding wall cell in the middle of an open corridor, run a handful of ticks, and confirm it has grown exactly one cell per tick in each direction and stopped dead against the obstruction at each end.

### Tests for User Story 3

- [ ] T028 [P] [US3] Write ASCII-cave tests in `tests/sim/expanding-wall.test.ts` covering: growth into empty space on both sides, exactly one cell per tick per side, stopping at a wall, an eraser, the kid, or the grid edge (FR-024, FR-025, SC-009); refusing to grow into dirt and refusing to grow vertically (FR-025); a cell created by growth not growing again until the following tick (FR-026)
- [ ] T029 [P] [US3] Add a case to `tests/sim/movement.test.ts` confirming the kid is blocked by an expanding wall cell (FR-023)
- [ ] T030 [P] [US3] Add a case to `tests/sim/pushing.test.ts` confirming a push toward an expanding wall cell fails, and a case to `tests/sim/grab.test.ts` confirming a grab toward an expanding wall cell is a no-op

### Implementation for User Story 3

- [ ] T031 [US3] In `src/sim/tick.ts`, implement `growExpandingWall(ctx, x, y)` and dispatch it from the main scan's `else if` chain for every `expandingWall` cell not yet moved this tick: independently, if the cell immediately to the left currently holds `empty`, it becomes `expandingWall` and is marked moved-this-tick; independently, if the cell immediately to the right currently holds `empty`, likewise; both may happen on the same tick from the same source cell; no randomness is consumed (FR-024–FR-027, research.md Decision 1)

**Checkpoint**: All three user stories are independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: The shipped cave (which needs all three elements together), full-suite replay determinism, and a final regression pass across every feature-001/002/003 test

- [ ] T032 [P] Rework the shipped cave in `src/caves/starter.ts`: add at least one amoeba, one magic wall (with an eraser a player can plausibly drop into it), and one expanding wall; set `amoebaGrowthRate`, `amoebaSizeLimit`, and `magicWallDuration` explicitly rather than leaving them to defaults; place all three so the cave stays winnable without using any of them, the amoeba cannot reach the kid's spawn or seal the route to the door before a player of ordinary speed can pass, and nothing kills or traps the kid at tick zero (FR-031). Depends on T002, T005, T015, T024, T031.
- [ ] T033 [P] Extend `tests/sim/determinism.test.ts` so a full replay — same cave, seed, and ordered inputs — produces an identical grid, collected count, status, amoeba extent, magic wall phase and countdown, and expanding wall extent after a run of at least 100 ticks that includes amoeba growth, a magic wall conversion, and expanding wall growth; a different seed diverges (FR-037, FR-042, FR-043, SC-004, SC-010). Depends on T004, T015, T024, T031.
- [ ] T034 Re-run `tests/sim/falling.test.ts`, `rolling.test.ts`, `crushing.test.ts`, `enemies.test.ts`, `detonation.test.ts`, `explosions.test.ts`, `quota-and-door.test.ts`, `stack-resolution.test.ts`, `terminal-and-restart.test.ts`, `grid.test.ts`, and `elements.test.ts`, and confirm every assertion still passes unchanged against the new tick phases and grid contents (FR-041, SC-011)
- [ ] T035 Run `npm test` (builds `dist/` first, then the full vitest suite) and confirm every case in FR-039/quickstart.md's checklist passes headless, with no browser/canvas/audio dependency, and that the build still emits exactly one self-contained `dist/index.html` (SC-011, SC-014)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — run first
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS every user story (T002's `CaveState`/`CaveDefinition` fields and T007's countdown pass are read by US2's implementation; T008's movement block is exercised by every story's movement test)
- **User Stories (Phase 3–5)**: All depend on Foundational completion
  - US1 and US2 (both P1) have no dependency on each other and can proceed in parallel once Foundational is done
  - US3 (P2) depends only on Foundational — it does not require US1 or US2's tasks
- **Polish (Phase 6)**: T032 and T033 depend on all three stories' implementation tasks (T015, T024, T031); T034/T035 depend on everything above

### Within Each Story

- Tests are written before implementation (write the test, watch it fail, then implement)
- Amoeba growth (T015) before the collective conversion pass (T016), since the pass reads the grid growth just wrote
- `processBody`'s magic-wall branch (T024) depends on the countdown pass (T007) already existing so `'dead'` is decided before the branch reads it
- The theme field (T025) before the theme data using it (T026) before the renderer branch reading it (T027)

### Parallel Opportunities

- All Foundational tasks marked [P] (T005+T006, T009) can run once their own prerequisites land
- Within each story's test phase, tasks marked [P] touch different files (or independent regions of the same file) and can run together
- US1, US2, and US3 can be staffed in parallel once Foundational is done; the starter-cave rework (T032) and the full-replay test (T033) are the only tasks that need all three finished

---

## Parallel Example: User Story 1

```bash
# Launch all US1 test-writing tasks together (same file, independent describe blocks, plus two other files):
Task: "Write growth tests in tests/sim/amoeba.test.ts"
Task: "Write collective-conversion tests in tests/sim/amoeba.test.ts"
Task: "Write detonation tests in tests/sim/amoeba.test.ts"
Task: "Update the inert-amoeba case in tests/sim/movement.test.ts"
Task: "Add push/grab completeness cases for amoeba"

# Then implement sequentially (same file, T016/T017 depend on T015):
Task: "Implement growAmoeba in src/sim/tick.ts"
Task: "Implement the amoeba collective conversion pass in src/sim/tick.ts"
Task: "Wire the falling-body-into-amoeba detonation into processBody in src/sim/tick.ts"
```

---

## Implementation Strategy

### MVP First (User Stories 1 and 2 — both P1)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks every story)
3. Complete Phase 3: User Story 1 (the glue grows, seals, overgrows, detonates)
4. Complete Phase 4: User Story 2 (the wall activates, converts, expires, and gets its distinct look)
5. **STOP and VALIDATE**: `npm test`, then the maintainer's browser checklist in quickstart.md items 1–8
6. This is the MVP: both of the feature's real decisions — when to seal the glue, and what to feed the wall — are playable

### Incremental Delivery

1. Setup + Foundational → cave parameters and shared plumbing exist, nothing observable yet
2. Add User Story 1 → the glue grows and resolves, testable and watchable on its own
3. Add User Story 2 → the wall activates and converts, with its distinct running look → **MVP**
4. Add User Story 3 → the bookshelf grows, closing routes
5. Polish → the shipped cave gains all three, full-replay determinism, and a regression pass across every earlier feature's tests

### Parallel Team Strategy

With multiple developers, after Foundational lands:

- Developer A: User Story 1
- Developer B: User Story 2
- Developer C: User Story 3 (needs only Foundational)
- Whoever finishes last coordinates the starter-cave rework (T032), since it needs all three

---

## Notes

- [P] tasks touch different files (or independent regions of the same file) and have no unmet dependency within this list
- [Story] labels map every phase-3+ task to its user story for traceability
- This feature adds zero new `Grid` typed arrays (research.md Decision 1) — no task touches `src/sim/grid.ts`
- No task touches `src/sim/elements.ts` or `src/sim/prng.ts` — both are explicitly unchanged per plan.md's Project Structure; `amoeba`/`magicWall`/`expandingWall` are already valid ASCII characters from feature 001
- No task touches `src/App.svelte` — no new input, no new HUD field
- Every task that changes the grid ships or updates an ASCII-cave test in the same story phase (FR-038)
- Verify each new test fails before its paired implementation task, then passes after
- Commit after each task or logical group; stop at any checkpoint to validate a story independently
