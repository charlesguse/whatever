---

description: "Task list template for feature implementation"
---

# Tasks: Rock Physics — Falling, Rolling, Pushing, Crushing, and the Exit

**Input**: Design documents from `/specs/002-rock-physics-exit/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/sim-api.md, quickstart.md

**Tests**: FR-045/FR-046 require an ASCII-cave pinning test for every physics rule this feature adds, and the constitution (Principle VII) makes this mandatory, not optional. Test tasks below are required deliverables.

**Organization**: Tasks are grouped by user story in the priority order from spec.md (US1 P1, US2 P1, US3 P2, US4 P2).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

Single Svelte/Vite project at the repository root, additive over feature 001's skeleton — no new top-level directories. `src/sim/**` stays plain TypeScript (no Svelte, no DOM, no `Math.random`, no `Date.now`); everything else under `src/` is shell. Tests live under `tests/`.

---

## Phase 1: Setup

**Purpose**: Nothing new to scaffold — feature 001 already created `package.json`, `vite.config.ts`, and the project skeleton. This phase is empty by design; proceed to Foundational.

**Checkpoint**: N/A — no setup tasks for this feature.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The shared grid/state/RNG plumbing every user story's tick rules build on — the `falling` flag, the new `CaveState`/`CaveDefinition`/`TickInput` fields, and the ASCII-cave helper extensions. No physics rule (falling, rolling, pushing, grabbing, the door) can be implemented before these land.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T001 [P] Add the `falling` parallel `Uint8Array` flag to `Grid` in `src/sim/grid.ts` — sized `width*height`, cloned in `cloneGrid` alongside `cells`/`movedThisTick`, with `isFallingIndex`/`setFallingIndex`/`clearFallingIndex` accessors; unlike `movedThisTick`, MUST NOT be cleared by `clearMovedFlags` or at tick start (FR-002, data-model.md Grid/Cave State)
- [X] T002 Add `collected`, `quota`, and `status: 'inPlay' | 'dead' | 'completed'` fields to `CaveState`, and a `quota` field to `CaveDefinition`, in `src/sim/cave.ts`; `parseCave` MUST initialize `collected` to `0` and `status` to `'inPlay'`, copy `quota` from `def.quota`, reject a cave whose `quota` exceeds its parsed diamond count (naming the cave and both numbers, no partial grid), and reject a cave with more than one `exit` character the same way it already rejects more than one player (FR-018, FR-022, FR-027, FR-028, data-model.md Cave State/Cave Definition) (depends on T001)
- [X] T003 [P] Add `grab?: boolean` to `TickInput` in `src/sim/tick.ts`, alongside the existing `direction` field, with no behavior yet (FR-021, data-model.md Tick Input)
- [X] T004 Add read-only accessors `getCollected`, `getQuota`, `isDoorOpen` (`collected >= quota`), `getStatus`, and `isFalling(state, x, y)` to `src/sim/cave.ts`, per `contracts/sim-api.md` (FR-043) (depends on T001, T002)
- [X] T005 [P] Extend `caveFromAscii` in `src/sim/ascii.ts` to accept and pass through a `quota: number` field into the returned `CaveDefinition`, per `contracts/sim-api.md`'s ASCII helpers section (FR-036) (depends on T002)
- [X] T006 [P] Extend the ASCII test harness in `tests/sim/helpers/ascii-cave.ts`: `CaveOptions` gains an optional `quota`, `caveFromLines` passes it through to `caveFromAscii`; `runTicks` accepts an optional per-tick `grab` alongside `direction` (e.g. a richer per-tick input array/tuple) so tests can drive held pushes and grabs (depends on T003, T005)

**Checkpoint**: `src/sim/` compiles with the new state shape and accessors, all inert (no tick behavior reads them yet); `npm test` still passes unchanged (feature 001's suite is unaffected by additive fields).

---

## Phase 3: User Story 1 - The cave turns dangerous (Priority: P1) 🎯 MVP

**Goal**: Erasers (and gold stars, sharing the same rule) fall when unsupported, roll off other bodies and cinder brick, kill the kid only while falling, and can be pushed sideways one cell on a fixed per-tick chance drawn from the cave's seeded generator.

**Independent Test**: Dig out from under an eraser and watch it fall; stand in its path and die; stand under a resting eraser and survive; drop an eraser onto a stack and watch it roll off; hold a direction against one with open space beyond it until it gives, and against one facing a wall until it never does.

### Implementation for User Story 1

- [X] T007 [US1] Implement the per-body falling/crushing/rolling state machine in `src/sim/tick.ts`, run inside the existing top-to-bottom, left-to-right scan for every `boulder`/`diamond` cell not yet processed this tick, in this fixed order per research.md: (1) cell below empty → move down, mark falling (FR-001, FR-003); (2) else cell below is the kid → kill the kid (`status = 'dead'`) only if this body is currently marked falling, otherwise do nothing (FR-005, FR-008, FR-010, FR-011); (3) else check roll surfaces (`boulder`, `diamond`, `brickWall`) left-first then right — if the side cell and its diagonal-below are both empty, move that direction and mark falling (FR-007, FR-009); (4) otherwise clear the falling flag — the body is at rest (FR-004). A body never rolls off `steelWall`, `dirt`, the kid, `exit` (open or closed), or any inert element (FR-008) (depends on T001, T002, T004)
- [X] T008 [US1] Add the `PUSH_CHANCE` named constant (`1/8`) and push-resolution branch to `movePlayer` in `src/sim/tick.ts`: when the player presses left/right into a resting (non-falling) `boulder` whose beyond-cell in that direction is in-grid and `empty`, draw exactly once from `state.rngState` via `nextPrng` and compare against `PUSH_CHANCE` — on success move the boulder into the beyond-cell (to be picked up as falling by T007 next tick) and the kid into the boulder's old cell, both this tick; on failure neither moves but the new `rngState` is kept. Every other press against a boulder (vertical, beyond-cell occupied/off-grid, boulder currently falling) MUST fail with **zero** calls to `nextPrng`, passing `rngState` through byte-identical (FR-012–FR-016, research.md Push Resolution) (depends on T007)
- [X] T009 [P] [US1] Write falling tests in `tests/sim/falling.test.ts`: a body falling one cell and continuing over several ticks; stopping on dirt, on a wall, and on another body; a falling body killing the kid; a resting body directly above the kid not killing them over many ticks (FR-001–FR-006, FR-046) (depends on T007)
- [X] T010 [P] [US1] Write rolling tests in `tests/sim/rolling.test.ts`: rolling off another body and off a brick wall; not rolling off a steel wall and not rolling off dirt; not rolling when the diagonal-below is occupied even though the side is empty; the left-first preference where both sides qualify (FR-007–FR-009, FR-046) (depends on T007)
- [X] T011 [P] [US1] Write crushing tests in `tests/sim/crushing.test.ts`: a falling body killing the kid, a falling diamond killing the kid too, and a resting body directly above the kid never killing them regardless of tick count (FR-010–FR-011, FR-046) (depends on T007)
- [X] T012 [P] [US1] Write pushing tests in `tests/sim/pushing.test.ts`: a successful push under a seed/input sequence chosen to succeed; a push blocked by each kind of obstruction (occupied beyond-cell, off-grid beyond-cell, falling eraser); a rejected vertical push; an eligible push held for many ticks under a fixed seed producing an identical sequence of successes/failures on every run; a blocked push consuming **no** randomness — verified by checking a later eligible push lands on the same tick whether or not the blocked push was attempted first; a pushed eraser that then falls because nothing is under its new cell (FR-012–FR-016, FR-046 — the "most likely to rot" case) (depends on T008)
- [X] T013 [US1] Write the stack-resolution test in `tests/sim/stack-resolution.test.ts`: a vertical stack of bodies whose support is removed resolves over several ticks rather than all at once, pinning the scan-order behavior `CLAUDE.md` and constitution Principle II require (FR-046, Edge Cases) (depends on T007)

**Checkpoint**: User Story 1 is fully functional and independently testable — falling, rolling, crushing, and pushing all work and are pinned by tests; the cave is a real hazard even with no exit or gold stars yet.

---

## Phase 4: User Story 2 - Collect the quota and leave (Priority: P1)

**Goal**: Walking into a gold star collects it and increases a per-cave count; once the count reaches the cave's declared quota, the classroom door — until then identical to a locker — becomes enterable and ends the cave in the completed state when entered.

**Independent Test**: In a cave with a known number of gold stars and a known quota, collect fewer than the quota and confirm the door stays solid; collect the last one and confirm the door opens; walk into it and confirm completion.

### Implementation for User Story 2

- [ ] T014 [US2] Implement collecting in `movePlayer` in `src/sim/tick.ts`: moving into a `diamond` removes it, moves the kid in, and increments `state.collected` by exactly 1 (FR-017–FR-018) (depends on T002, T004)
- [ ] T015 [US2] Implement the door in `movePlayer` in `src/sim/tick.ts`: while `!isDoorOpen(state)`, `exit` blocks the kid exactly like `steelWall` (cannot be entered, cannot be dug); once `isDoorOpen(state)`, moving into `exit` moves the kid in and sets `status = 'completed'` (FR-023–FR-026) (depends on T004, T014)
- [ ] T016 [P] [US2] Add the terminal-status short-circuit to `tick` in `src/sim/tick.ts`: if `getStatus(state) !== 'inPlay'`, return `state` unchanged with no clone and no scan — nothing falls, rolls, or moves (FR-029) (depends on T004)
- [ ] T017 [P] [US2] Write quota-and-door tests in `tests/sim/quota-and-door.test.ts`: collecting a gold star by walking into it increases the count by exactly one; the door is solid and indistinguishable in behavior below quota; the door becomes enterable at quota; entering it completes the cave; a cave whose quota exceeds its diamond count is rejected at parse time naming the cave and both numbers; a quota of zero leaves the door open from tick zero (FR-017–FR-018, FR-022–FR-027, FR-046) (depends on T014, T015)
- [ ] T018 [P] [US2] Write terminal-state tests in `tests/sim/terminal-and-restart.test.ts` (status portion): both terminal states (`dead`, `completed`) freeze the cave across further ticks — nothing falls, rolls, or moves (FR-028–FR-030, FR-046) (depends on T016)

**Checkpoint**: User Stories 1 and 2 together make a complete, winnable, losable cave — hazards plus an objective — independently of grab (US3) and restart (US4).

---

## Phase 5: User Story 3 - Reach past a cell without stepping into it (Priority: P2)

**Goal**: Holding the grab modifier and pressing a direction clears dirt or collects a gold star in that direction without moving the kid, and never pushes an eraser or enters the door.

**Independent Test**: Hold grab and press each direction against dirt, a gold star, an eraser, a wall, and the cave boundary; confirm the kid never moves while paper and stars still disappear as appropriate.

### Implementation for User Story 3

- [ ] T019 [US3] Implement the grab branch in `src/sim/tick.ts`, checked ahead of the normal move/push logic per research.md: when `input.grab` is true, act on the neighboring cell in the pressed direction without moving the kid — `dirt` is cleared, a `diamond` is collected and counted (`state.collected += 1`), and every other content (empty, `boulder`, either wall, `exit` open or closed, out-of-grid) is left untouched; grab never pushes and never enters the door (FR-019–FR-021) (depends on T003, T014)
- [ ] T020 [P] [US3] Write grab tests in `tests/sim/grab.test.ts`: grabbing dirt clears it without moving the kid; grabbing a gold star collects it and increases the count without moving the kid; grab does nothing against an eraser (never pushes), a wall, the closed door, the open door, and the cave boundary (FR-017–FR-021, FR-046) (depends on T019)

**Checkpoint**: All three physics-facing stories (US1, US2, US3) are functional; grab makes US1's hazards survivable without changing US1 or US2's rules.

---

## Phase 6: User Story 4 - Failing is visible and recoverable (Priority: P2)

**Goal**: Death and completion each show a themed message while leaving the page responsive, and a restart key rebuilds the current cave from its definition — same layout, same seed, collected count back to zero — from mid-play or from either terminal state.

**Independent Test**: Die on purpose, confirm a message appears and the page still responds; press restart and confirm the cave is back exactly as it started; repeat by completing the cave.

### Implementation for User Story 4

- [ ] T021 [US4] Add `doorOpenEntry: ThemeEntry`, `messages: { dead: string; completed: string }`, and `readout: { template: string }` to the `Theme` interface in `src/lib/themes/types.ts` (FR-038, data-model.md Theme)
- [ ] T022 [US4] Add the new fields to the Classroom theme in `src/lib/themes/classroom.ts`: `doorOpenEntry` (visibly distinct from the closed-door/`elements.exit` entry), `messages.dead`, `messages.completed`, and `readout.template` (e.g. `"{count} / {quota} Gold Stars"`); ensure `elements.exit` stays visually identical to `elements.steelWall` (fillColor, glyph, label all equal) (FR-024, FR-038, FR-040) (depends on T021)
- [ ] T023 [US4] Add a restart key to `src/lib/input/keyboard.ts`'s `KeyboardInput`, reported the same way direction state already is (e.g. `consumeRestart()` returning and clearing a one-shot flag set on key-down), so it works both from a terminal state and during play (FR-031, Assumptions: "the restart key is likewise a maintainer choice") (depends on nothing new — same module as feature 001)
- [ ] T024 [US4] Wire grab and restart into `src/App.svelte`: read `keyboard`'s held-grab state into `TickInput.grab` each tick (mirroring how `direction` is already consumed); on a restart key-press call `parseCave(starterCave)` again and replace `caveState`, exactly mirroring the initial load (no new sim entry point, per research.md); display `getStatus(caveState)`'s `messages.dead`/`messages.completed` from the active theme when non-`'inPlay'`, and stop advancing ticks in that state while keeping input (especially restart) responsive (FR-030–FR-032) (depends on T004, T022, T023)
- [ ] T025 [US4] Add the collected/quota readout to `src/App.svelte`, reading `getCollected`/`getQuota` every frame and formatting the active theme's `readout.template` — no local tracking of the count, no literal wording (FR-041) (depends on T004, T022)
- [ ] T026 [US4] Add door-flash rendering to `src/lib/render/canvas.ts`: once `isDoorOpen(state)`, alternate between `theme.elements.exit` and `theme.doorOpenEntry` on the render loop's own frame timer (e.g. `Math.floor(performance.now() / FLASH_INTERVAL_MS) % 2`), with no phase field read from or written to `CaveState` (FR-039) (depends on T004, T022)
- [ ] T027 [P] [US4] Write the terminal/restart portion of `tests/sim/terminal-and-restart.test.ts`: a restart mid-play and a restart from each terminal state (via re-parsing the same `CaveDefinition`), each followed by the same input sequence, produce the same grid, collected count, status, and push outcomes as the original run (FR-031–FR-032, FR-046) (depends on T002)
- [ ] T028 [P] [US4] Extend `tests/sim/cave-parsing.test.ts` with the quota-exceeds-diamonds rejection case and the more-than-one-`exit` rejection case, alongside the existing feature-001 rejection cases (FR-027, data-model.md Cave Definition validation rules) (depends on T002)
- [ ] T029 [P] [US4] Extend `tests/sim/determinism.test.ts` with a replay covering falls, rolls, a held push, a collection, and a death over at least 100 ticks, asserting identical grid, collected count, status, and push-outcome sequence across two runs of the same seed and inputs (FR-049, SC-009) (depends on T007, T008, T014, T015)

**Checkpoint**: All four user stories are independently functional; death and completion are visible and recoverable; determinism and non-regression are pinned across the whole feature.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Cave data, non-regression, and final verification across all stories.

- [ ] T030 Rework the starter cave in `src/caves/starter.ts`: add erasers, gold stars, a declared quota, and exactly one classroom door, keeping it a hand-authored ASCII grid with parameters (no simulation file edits); ensure it is winnable, does not kill or trap the kid at tick zero (no body directly above the kid with an empty cell between them), the door is reachable once the quota is met, and it contains at least one more gold star than its quota (FR-033–FR-036) (depends on T005, T007, T008, T014, T015)
- [ ] T031 [P] Confirm every feature-001 test (`movement.test.ts`, `cave-parsing.test.ts`, `determinism.test.ts`, `grid.test.ts`, `elements.test.ts`) still passes unchanged against the extended `Grid`/`CaveState`/`TickInput` shapes (FR-048)
- [ ] T032 [P] Audit `src/lib/render/canvas.ts` and `src/App.svelte` for literal color/glyph/label/message/readout values or any branch on which theme or element is active; confirm every visual/text attribute resolves through the theme table (FR-037, SC-014) (depends on T026, T024, T025)
- [ ] T033 Run `npm test` (build + full vitest suite) and confirm it passes with no browser, canvas, or audio device present, covering every case in FR-046 (SC-011, SC-012)
- [ ] T034 Execute the maintainer's manual browser validation checklist from `specs/002-rock-physics-exit/quickstart.md` — falling feel, death clarity, push feel, door flash, readout legibility, restart from every state, frame rate with many bodies falling, and the reworked starter cave's teaching order — and record results at review (spec's "Verified by the maintainer at review time") — **left for the maintainer**: this run has no browser

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Empty — nothing to do.
- **Foundational (Phase 2)**: No dependencies beyond feature 001's existing code — BLOCKS all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational. No dependency on other stories. This is the MVP.
- **User Story 2 (Phase 4)**: Depends on Foundational. Independent of US1 in substance (collecting/door logic doesn't need falling/pushing to exist), though the shipped starter cave (Phase 7) needs both.
- **User Story 3 (Phase 5)**: Depends on Foundational and on collecting (T014, from US2) for the grab-collects-a-star case.
- **User Story 4 (Phase 6)**: Depends on Foundational; its restart/determinism tests exercise US1+US2's rules, and its rendering wiring (T024, T026) needs the theme fields it adds itself (T021, T022).
- **Polish (Phase 7)**: Depends on all four user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational — no dependency on other stories.
- **User Story 2 (P1)**: Can start after Foundational — no dependency on US1's falling/rolling/pushing rules, only on the shared `movePlayer`/`tick` scaffolding from Phase 2.
- **User Story 3 (P2)**: Can start after Foundational; its "grab collects a star" case depends on US2's T014.
- **User Story 4 (P2)**: Can start after Foundational for the theme/restart plumbing; its determinism test (T029) depends on US1's T007/T008 and US2's T014/T015 existing to have something to replay.

### Parallel Opportunities

- Foundational: T001, T003 can run in parallel; T002 depends on T001; T004 depends on T001+T002; T005 depends on T002; T006 depends on T003+T005.
- User Story 1: T009, T010, T011, T012 can all run in parallel once T007/T008 land; T013 depends on T007 only.
- User Story 2: T016 can run in parallel with T014/T015; T017, T018 can run in parallel once their respective implementation tasks land.
- User Story 3: T020 depends only on T019.
- User Story 4: T021 first; T022 depends on T021; T023 is independent of both; T024/T025/T026 depend on T022; T027, T028, T029 can run in parallel once their prerequisites land.
- Different user stories (US1, US2, US3, US4) can be staffed in parallel once Foundational is complete, keeping the cross-story dependencies above in mind.

---

## Parallel Example: Foundational Phase

```bash
# Launch independent foundational modules together:
Task: "Add falling flag to Grid in src/sim/grid.ts"
Task: "Add grab field to TickInput in src/sim/tick.ts"
```

## Parallel Example: User Story 1

```bash
# Launch all US1 test files together once tick.ts's falling/rolling/pushing lands:
Task: "Write falling tests in tests/sim/falling.test.ts"
Task: "Write rolling tests in tests/sim/rolling.test.ts"
Task: "Write crushing tests in tests/sim/crushing.test.ts"
Task: "Write pushing tests in tests/sim/pushing.test.ts"
```

## Parallel Example: User Story 4

```bash
# Launch independent US4 test files together:
Task: "Extend cave-parsing.test.ts with quota/exit rejection cases"
Task: "Extend determinism.test.ts with a falls/rolls/push/collect/death replay"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 2: Foundational (CRITICAL — blocks all stories).
2. Complete Phase 3: User Story 1.
3. **STOP and VALIDATE**: Run `tests/sim/falling.test.ts`, `rolling.test.ts`, `crushing.test.ts`, `pushing.test.ts`, `stack-resolution.test.ts`. The cave is already a real hazard.

### Incremental Delivery

1. Foundational → shared state shape ready, no new behavior yet.
2. Add User Story 1 → the cave is dangerous (MVP for this feature).
3. Add User Story 2 → the cave is winnable and losable — a complete game loop.
4. Add User Story 3 → hazards become survivable with skill (grab).
5. Add User Story 4 → failure and success are visible and recoverable.
6. Polish → rework the starter cave, confirm non-regression, run the full merge gate, maintainer browser pass.

### Suggested Team Split

With multiple contributors, after Foundational completes:

- Contributor A: User Story 1 (falling/rolling/crushing/pushing) — the core of this feature.
- Contributor B: User Story 2 (collecting/quota/door) in parallel — independent of US1's rules.
- Contributor C: User Story 3 (grab) once US2's T014 lands, then User Story 4's theme/restart wiring.

---

## Notes

- [P] tasks = different files, no dependencies.
- [Story] label maps task to specific user story for traceability.
- Scan order and the falling-vs-resting distinction are the load-bearing subtlety here (`CLAUDE.md`) — T007's ordered per-body check and T013's stack-resolution test exist specifically to pin that a body moving into an already-scanned cell resumes next tick, not simultaneously.
- Commit after each task or logical group.
- Stop at any checkpoint to validate a story independently.
- Avoid: a second stored "door open" boolean (derive from `collected >= quota`), a sim-owned door-flash phase, drawing a push draw for an ineligible push, and hardcoding the starter cave's dimensions/quota/seed outside `src/caves/starter.ts`.
