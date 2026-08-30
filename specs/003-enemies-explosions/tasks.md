---

description: "Task list for Fireflies, Butterflies, and Explosions"
---

# Tasks: Fireflies, Butterflies, and Explosions

**Input**: Design documents from `/specs/003-enemies-explosions/`

**Prerequisites**: [plan.md](./plan.md) (required), [spec.md](./spec.md) (required for user stories), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/sim-api.md](./contracts/sim-api.md), [quickstart.md](./quickstart.md)

**Tests**: Included — `CLAUDE.md` and this feature's spec (FR-035, FR-036) require every rule that changes the grid to ship an ASCII-cave `vitest` test, so test tasks are mandatory here, not optional.

**Organization**: Tasks are grouped by user story (spec.md priorities) so each story is independently implementable and testable. All sim work is plain TypeScript under `src/sim/`; nothing here touches `src/App.svelte` or `src/lib/render/canvas.ts` (see plan.md's Summary and Constitution Check).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task in this list)
- **[Story]**: US1–US4, matching spec.md's user stories
- Every task names its exact file path(s)

## Path Conventions

Single front-end project (unchanged from features 001/002): sim code under `src/sim/`, sim tests under `tests/sim/`, theme data under `src/lib/themes/`, theme tests under `tests/lib/themes/`, the shipped cave at `src/caves/starter.ts`.

---

## Phase 1: Setup

**Purpose**: Confirm the branch is a clean base for this feature before any code changes

- [X] T001 Run `npm test` on the current branch (build + full vitest suite) and confirm the feature-001/002 baseline passes with no failures, establishing the pre-change state this feature's work is measured against

**Checkpoint**: Baseline confirmed green. No source files touched yet.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The single-blast stamp, explosion lifecycle, and `dying`/`dead` state machine that every user story below calls into. Nothing here is independently player-visible; it is inert until Phase 3+ wires triggers into it.

**⚠️ CRITICAL**: No user story task can start until this phase is complete.

- [X] T002 Move the `Direction` type (`'up' | 'down' | 'left' | 'right'`) and its directional index/delta mapping from `src/sim/tick.ts` to `src/sim/grid.ts`; re-export `Direction` from `src/sim/tick.ts` so the existing import site (`tests/sim/helpers/ascii-cave.ts`, which imports `Direction` from `'../../../src/sim/tick'`) keeps working unchanged (data-model.md "Direction moves to grid.ts")
- [X] T003 [P] In `src/sim/grid.ts`, add a `facing: Uint8Array` (length `width*height`) to `Grid`, wired into `createGrid` and `cloneGrid` alongside `cells`/`movedThisTick`/`falling`, plus `getFacing(grid, x, y): Direction` / `setFacing(grid, x, y, dir: Direction)` helpers keyed by the existing `index()` function (depends on T002 for the `Direction` mapping; FR-003)
- [X] T004 [P] In `src/sim/grid.ts`, add `explosionRemaining: Uint8Array` and `explosionContent: Uint8Array` (length `width*height` each) to `Grid`, wired into `createGrid` and `cloneGrid`, plus `getExplosionRemaining`/`setExplosion`/`clearExplosion` helpers (FR-019; data-model.md "explosionRemaining"/"explosionContent")
- [X] T005 In `src/sim/cave.ts`: add `'dying'` to `CaveStatus` (now `'inPlay' | 'dying' | 'dead' | 'completed'`); add `pendingBlasts: readonly { x: number; y: number; content: 'empty' | 'diamond' }[]` to `CaveState`, initialized to `[]` in `parseCave`; in `parseCave`, set every `firefly`/`butterfly` cell's facing to `'left'` via `setFacing` (depends on T003; FR-007, FR-015, FR-023)
- [X] T006 [P] In `src/sim/cave.ts`, add read accessors `getEnemyFacing(state, x, y): Direction | undefined` (returns the facing only where the cell currently holds `firefly`/`butterfly`, else `undefined`) and `isExplosion(state, x, y): boolean` (depends on T003, T004; FR-033)
- [X] T007 In `src/sim/tick.ts`, implement `stampBlast(ctx, centerX, centerY, content: 'empty' | 'diamond')`: visits the 3x3 centered on `(centerX, centerY)`, clipped to grid bounds (FR-016); leaves `steelWall` and `exit` (open or closed) completely untouched (FR-017); when a visited cell holds `'player'` and `status === 'inPlay'`, sets `status` to `'dying'`; otherwise overwrites the cell to `explosion` with `explosionRemaining = 2` and `explosionContent = content` (depends on T004, T005; FR-016–FR-018, FR-021)
- [X] T008 In `src/sim/tick.ts`, add the once-per-tick explosion age/convert pass, run immediately after `clearMovedFlags` and before the main scan: for every cell where `explosionRemaining` is nonzero, decrement it by 1; where it reaches 0, convert the cell to `explosionContent` and, only when that content is `diamond`, mark the cell moved-this-tick so it does not fall/roll on its creation tick (depends on T004; FR-019, FR-020)
- [X] T009 In `src/sim/tick.ts`, amend `tick()`'s terminal short-circuit so it returns `state` unchanged (no clone, no scan) iff `getStatus(state) === 'dead' || getStatus(state) === 'completed'` — `'dying'` must NOT short-circuit and must keep advancing (depends on T005; FR-015.2, amends feature 002's FR-029)
- [X] T010 In `src/sim/tick.ts`, at the end of `tick()`, while `status === 'dying'`: scan `explosionRemaining` for any nonzero entry after this tick's age/convert pass and any stamps this tick performed; if none remain anywhere in the grid, set `status = 'dead'` (depends on T005, T008; FR-015.3)

**Checkpoint**: Blast stamping, explosion aging/conversion, and the `dying`→`dead` transition all work and are tested indirectly — but nothing calls `stampBlast` yet. User story work can now begin.

---

## Phase 3: User Story 1 - The tunnels are inhabited, and the inhabitants are lethal (Priority: P1) 🎯 MVP

**Goal**: Fireflies and butterflies patrol their walls on a fixed wall-follower loop, and touching either one kills the kid in a visible bloom rather than a silent freeze — including the amended crushing death, since every death in the game blooms.

**Independent Test**: Load a cave with a firefly on a simple rectangular loop and a butterfly on another, run a fixed number of ticks with no input, and confirm each walks its loop in the documented turning direction and returns to where it started. Then walk the kid into reach of one and confirm the kid dies in a visible bloom and the cave settles into `dead` once that bloom has burned out.

### Tests for User Story 1

- [X] T011 [P] [US1] Write ASCII-cave tests in `tests/sim/enemies.test.ts` covering: a firefly patrolling a simple rectangular loop for several ticks, cell by cell, returning to its exact starting cell and facing after a full circuit (SC-001); a butterfly patrolling the same loop mirrored (right-turn preference); each of the three step outcomes (preferred-turn move, straight-ahead move, blocked-turn-in-place) at a corner, for both enemy types (FR-004); the cadence — one step per two ticks, checked at ticks 1, 2, and 3 (FR-002, SC-002); an enemy blocked on every side turning in place without moving, over many ticks; an enemy refusing to enter dirt, a body, either wall, the classroom door, and another enemy (FR-006, FR-007)
- [X] T012 [P] [US1] Write ASCII-cave tests in `tests/sim/detonation.test.ts` covering: the kid dying on contact with each enemy type from each of the four orthogonal directions, and not dying when the only adjacency is diagonal (FR-010, SC-003)
- [X] T013 [P] [US1] Update `tests/sim/crushing.test.ts` to feature 002's amended expected grid (FR-038): a falling body crushing the kid now leaves a 3x3 bloom that resolves to empty space with the body consumed by the blast, rather than a silent death (FR-013)

### Implementation for User Story 1

- [X] T014 [US1] In `src/sim/tick.ts`'s main scan, dispatch a wall-follower enemy step for every `firefly`/`butterfly` cell not yet moved this tick, gated by cadence (`(state.tick + 1) % 2 === 1`): first check the four orthogonal neighbors for the kid and call `stampBlast` centered on the enemy's own cell with its type's content instead of moving if found (FR-010); otherwise, if the cell on the preferred-turn side (left for firefly, right for butterfly) is `empty`, face and move into it; otherwise, if the cell straight ahead is `empty`, move into it keeping facing; otherwise stay in place and turn 90° toward the non-preferred side — reading/writing `facing` only via the T003 helpers, never recomputing it (depends on T003, T007, T014's own file; FR-001–FR-009)
- [X] T015 [US1] In `src/sim/tick.ts`'s `processBody`, replace the existing direct kid-crush behavior: when a falling body's target cell holds the kid, call `stampBlast` centered on the kid's cell with content `'empty'` instead of moving the body onto that cell, and let the body be destroyed as part of the same blast (depends on T007, T014; FR-013, amends feature 002's FR-010)

**Checkpoint**: User Story 1 is independently functional — enemies patrol predictably, and the kid dies visibly on contact or by crushing, settling into `dead`.

---

## Phase 4: User Story 2 - Drop an eraser on a paper airplane and make quota (Priority: P1)

**Goal**: A falling eraser or gold star landing on a butterfly detonates it into a 3x3 of gold stars (collectible toward quota); landing on a firefly detonates it into a 3x3 of empty space. A resting body over either does nothing. Cave data whose quota needs a butterfly's payout to be reachable is no longer rejected at parse time.

**Independent Test**: In a cave with one butterfly, one firefly, and an eraser above each, dig each eraser loose, and confirm the airplane leaves a 3x3 of gold stars, the sharpener leaves a 3x3 of empty space, and the erasers are gone. Collect the new stars and confirm they count toward quota and open the door.

### Tests for User Story 2

- [X] T016 [P] [US2] Add ASCII-cave tests to `tests/sim/detonation.test.ts` covering: a falling eraser detonating each enemy type, and a falling gold star doing the same (FR-011); a resting (non-falling) eraser above each enemy type detonating nothing over many ticks (FR-011)
- [X] T017 [P] [US2] Add ASCII-cave tests to `tests/sim/explosions.test.ts` covering: a butterfly's blast leaving exactly a 3x3 of gold stars, counted exactly; a firefly's blast leaving exactly a 3x3 of empty space (FR-018, SC-005)
- [X] T018 [P] [US2] Add an ASCII-cave test to `tests/sim/quota-and-door.test.ts` covering: gold stars produced by a blast are collectible and count toward quota exactly like drawn ones, opening the door (FR-018, SC-009)
- [X] T019 [P] [US2] Add cave-parsing tests to `tests/sim/cave-parsing.test.ts` covering: a cave whose quota exceeds its drawn gold stars but is within `diamondCount + 9 * butterflyCount` loads successfully; one that exceeds even that allowance is rejected at parse time with a message naming the cave, the quota, the diamond count, and the butterfly count (FR-025, SC-010)

### Implementation for User Story 2

- [X] T020 [US2] In `src/sim/tick.ts`'s `processBody`, add a sibling to the existing "is the cell below me the kid" check: when a falling body's target cell holds a `firefly`/`butterfly`, call `stampBlast` centered on the enemy's cell with that enemy's blast content instead of moving into it, and let the body be destroyed as part of the same blast (depends on T007; FR-011)
- [X] T021 [US2] In `src/sim/cave.ts`'s `parseCave`, tally a `butterflyCount` in the existing per-cell parse loop and change the quota validation to reject only when `quota > diamondCount + 9 * butterflyCount`, naming the cave, quota, diamond count, and butterfly count on failure (FR-025, amends feature 002's FR-027)
- [X] T022 [US2] Rework the shipped cave in `src/caves/starter.ts`: add at least one firefly on a patrol loop a player can watch and learn, and at least one butterfly positioned so a dug eraser can fall onto it; ensure no enemy starts orthogonally adjacent to the kid, and the quota remains reachable without detonating the butterfly (depends on T014, T020, T021; FR-026, FR-027, FR-028)

**Checkpoint**: User Stories 1 AND 2 both work independently — the signature scoring trick is playable end to end.

---

## Phase 5: User Story 3 - Blasts reshape the cave, and they chain (Priority: P2)

**Goal**: A blast is a thing in its own right — a 3x3 that spares steel walls and the door, persists for exactly 2 ticks, and blocks everything while it lasts. Enemies caught in a blast detonate too, one link per tick, so a chain visibly cascades across the cave. The kid's own death, mid-chain, lets the cascade finish before the cave freezes.

**Independent Test**: Detonate an enemy adjacent to a steel wall and to a mixed neighborhood of paper, brick, erasers, and stars; confirm the wall and the door are untouched and everything else is gone. Then detonate one enemy in a line of enemies and confirm every enemy in reach goes off, one link per tick.

### Tests for User Story 3

- [X] T023 [P] [US3] Add ASCII-cave tests to `tests/sim/explosions.test.ts` covering: a blast sparing a steel wall and the classroom door inside its 3x3 while destroying dirt, brick, an eraser, and a gold star elsewhere in it (FR-017, SC-006); a blast clipped at an edge and at a corner of the grid with no wrap and no error (FR-016); the explosion lifetime — a 3x3 stays explosion for exactly 2 ticks and converts on the expected tick, all cells at once (FR-019, SC-007); a gold star created by a blast not moving on its creation tick, then falling normally afterward (FR-020); an explosion cell blocking the kid, an enemy, and a resting body above it, which does not roll off it (FR-021)
- [X] T024 [P] [US3] Add ASCII-cave tests to `tests/sim/detonation.test.ts` covering: a chain reaction through several enemies — including a mixed chain of both types leaving both gold stars and empty space — pinned tick by tick to show exactly one link detonating per tick, with no enemy detonating twice (FR-023, SC-008); the kid caught in a blast started by something else, entering `dying` (FR-012, FR-015); the kid dying to the first link of a chain, with the rest of the cascade still resolving afterward and a final grid showing the whole chain completed (FR-024, SC-016)
- [X] T025 [P] [US3] Add tests to `tests/sim/terminal-and-restart.test.ts` covering: restart pressed during the `dying` state taking effect exactly as it does once `dead` (FR-015.4); the cave becoming `dead` and freezing on the first tick with no explosion cell left anywhere in the grid, with the resolved grid unchanged on further ticks (FR-015.3, SC-016)

### Implementation for User Story 3

- [X] T026 [US3] In `src/sim/tick.ts`'s `tick()`, add the pending-blast stamping phase: right after the explosion age/convert pass and before the main scan, stamp every entry of `state.pendingBlasts` (carried from the previous tick) via `stampBlast`, in queued order, then start this tick's own pending list empty (depends on T007, T008; FR-023)
- [X] T027 [US3] Extend `stampBlast` in `src/sim/tick.ts` so that, when it is about to overwrite a non-center cell that currently holds `firefly`/`butterfly`, it appends `{ x, y, content }` for that enemy to the *next* tick's pending-blast list (rebuilt fresh each tick, never appended-to across ticks) before overwriting the cell to `explosion`, so the enemy's own blast is stamped one tick later, centered on the cell it stood in (depends on T007, T026; FR-012, FR-023, FR-024)

**Checkpoint**: All P1/P2 gameplay stories work — chains cascade, and the resolution order (FR-022) falls out of stamp order automatically.

---

## Phase 6: User Story 4 - The classroom calls them by their right names (Priority: P2)

**Goal**: Correct the Classroom theme's placeholder enemy labels now that both have behavior — firefly is "Pencil Sharpener", butterfly is "Paper Airplane" — as theme data only.

**Independent Test**: Read the Classroom theme entries for the two enemies and confirm the labels and glyphs; confirm by inspection of the change that no file under `src/sim/` and no drawing logic was touched.

### Tests for User Story 4

- [X] T028 [P] [US4] Update `tests/lib/themes/classroom.test.ts` to assert the firefly's label is exactly `"Pencil Sharpener"` and the butterfly's label is exactly `"Paper Airplane"`, and that the two entries remain mutually distinguishable and distinguishable from every other element at the shipped cell size (FR-029)

### Implementation for User Story 4

- [X] T029 [US4] In `src/lib/themes/classroom.ts`, relabel the `firefly` entry to `"Pencil Sharpener"` and the `butterfly` entry to `"Paper Airplane"`, adjusting glyph/color only as needed for distinguishability; touch no other file (FR-029, FR-030, SC-014)

**Checkpoint**: All four user stories independently functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Full-suite regression and determinism coverage across every story above

- [X] T030 [P] Extend `tests/sim/determinism.test.ts` so a full replay — same cave, seed, and ordered inputs — produces an identical grid, collected count, status, enemy positions/facings, and explosion state after a run of at least 100 ticks that includes patrols, a chain reaction, and a death (FR-040, SC-011)
- [X] T031 Re-run `tests/sim/movement.test.ts`, `falling.test.ts`, `rolling.test.ts`, `pushing.test.ts`, `grab.test.ts`, `stack-resolution.test.ts`, `grid.test.ts`, and `elements.test.ts` and confirm every assertion still passes unchanged against the new `Grid` fields and tick phases (FR-038, FR-039, SC-012)
- [X] T032 Run `npm test` (builds `dist/` first, then the full vitest suite) and confirm every case in FR-036/quickstart.md's checklist passes headless, with no browser/canvas/audio dependency and no per-tick allocation growth beyond the bounded `pendingBlasts` array (SC-013, SC-015)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — run first
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS every user story (T007's `stampBlast` and T008's explosion aging are called by every story's implementation tasks)
- **User Stories (Phase 3–6)**: All depend on Foundational completion
  - US1 and US2 (both P1) have no dependency on each other and can proceed in parallel once Foundational is done, except T022 (starter cave) which needs both US1's enemy movement (T014) and US2's detonation/quota work (T020, T021)
  - US3 (P2) depends only on Foundational — it does not require US1 or US2's tasks, though its tests are more meaningful once contact/falling triggers exist
  - US4 (P2) is fully independent of US1–US3 — pure theme data
- **Polish (Phase 7)**: Depends on all four user stories being complete

### Within Each Story

- Tests are written before implementation (FR-035 pins the rule; write the test, watch it fail, then implement)
- Enemy movement (T014) before the crush-amendment wiring (T015) and before the starter cave rework (T022), since both read/observe enemy behavior
- `stampBlast` (T007) before anything that calls it (T014, T015, T020, T026, T027)
- Pending-blast stamping phase (T026) before extending `stampBlast` to populate it (T027)

### Parallel Opportunities

- All Foundational tasks marked [P] (T003, T004, T006) can run together once their own prerequisites (T002, T003+T004) land
- Within each story's test phase, tasks marked [P] touch different files and can run together
- US1, US2, US3, and US4 can be staffed in parallel once Foundational is done, with the one cross-story dependency noted above (T022)

---

## Parallel Example: User Story 1

```bash
# Launch all three US1 test-writing tasks together (different files):
Task: "Write ASCII-cave tests in tests/sim/enemies.test.ts for patrol, turning, cadence, and blocking"
Task: "Write ASCII-cave tests in tests/sim/detonation.test.ts for contact death"
Task: "Update tests/sim/crushing.test.ts for the amended crush-bloom grid"

# Then implement sequentially (same file, T015 depends on T014):
Task: "Implement the wall-follower enemy step in src/sim/tick.ts"
Task: "Wire the crush amendment into processBody in src/sim/tick.ts"
```

---

## Implementation Strategy

### MVP First (User Stories 1 and 2 — both P1)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks every story)
3. Complete Phase 3: User Story 1 (enemies patrol, kid dies visibly)
4. Complete Phase 4: User Story 2 (the eraser-on-airplane trick, quota relaxation, shipped cave)
5. **STOP and VALIDATE**: `npm test`, then the maintainer's browser checklist in quickstart.md items 1–6, 14
6. This is the MVP: a playable cave with lethal, patrolling enemies and the game's signature scoring trick

### Incremental Delivery

1. Setup + Foundational → inert blast engine, nothing observable yet
2. Add User Story 1 → patrol and lethal contact/crush, testable and watchable on its own
3. Add User Story 2 → the scoring trick, quota relaxation, the real shipped cave → **MVP**
4. Add User Story 3 → chains cascade, full blast rule coverage (steel wall/door sparing, clipping, lifetime)
5. Add User Story 4 → correct Classroom names (pure data, zero risk to physics)
6. Polish → regression pass across every feature-001/002 test plus new determinism coverage

### Parallel Team Strategy

With multiple developers, after Foundational lands:

- Developer A: User Story 1
- Developer B: User Story 2 (coordinate with A only on T022, the shared starter-cave rework)
- Developer C: User Story 3 (needs only Foundational)
- Developer D: User Story 4 (fully independent, can start and finish any time after Foundational)

---

## Notes

- [P] tasks touch different files and have no unmet dependency within this list
- [Story] labels map every phase-3+ task to its user story for traceability
- No task in this feature touches `src/App.svelte`, `src/lib/render/canvas.ts`, `src/sim/elements.ts`, `src/sim/prng.ts`, or `src/sim/ascii.ts` — all are explicitly unchanged per plan.md's Project Structure
- Every task that changes the grid ships or updates an ASCII-cave test in the same story phase (FR-035)
- Verify each new test fails before its paired implementation task, then passes after
- Commit after each task or logical group; stop at any checkpoint to validate a story independently
