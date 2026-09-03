---

description: "Task list template for feature implementation"
---

# Tasks: One Tap, One Cell

**Input**: Design documents from `/specs/010-tap-moves-one-cell/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/repeat-delay-api.md, quickstart.md

**Tests**: This feature is test-heavy by requirement (FR-019, FR-020, FR-021) — test tasks are included throughout, not optional.

**Organization**: Tasks are grouped by user story (US1, US2, US3 from spec.md) to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Single front-end project (unchanged from features 001–009). All new/edited
files live under `src/lib/input/` and `tests/lib/input/`, mirroring
`plan.md`'s Project Structure section. No file under `src/sim/` is touched
(FR-011).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: No project initialization is needed — this feature edits an
existing, already-configured Svelte/Vite/vitest project. This phase is a
no-op placeholder; proceed directly to Phase 2.

*(No tasks — the project, its build, and its test runner already exist and
are unchanged by this feature.)*

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Create the one shared, pure repeat-delay rule that every user
story's implementation and tests depend on (FR-018, contracts/repeat-delay-api.md).

**⚠️ CRITICAL**: No user story work can begin until this phase is complete — all three sources import from `repeat.ts`.

- [X] T001 Create `src/lib/input/repeat.ts` exporting `REPEAT_DELAY_TICKS = 1`, the `RepeatState` type (`{ readonly ticksSincePress: number }`), `INITIAL_REPEAT_STATE` (`{ ticksSincePress: 0 }`), and `advanceRepeat(state: RepeatState, isHeldThisTick: boolean): { state: RepeatState; report: boolean }` implementing the table in `specs/010-tap-moves-one-cell/contracts/repeat-delay-api.md` (not-held → reset to initial, not reported; `ticksSincePress` 0→1 held → report; 1→2 held → suppress; 2→3+ held → report every tick). Pure, total, no wall-clock read, no timer, no I/O, no randomness (FR-017).
- [X] T002 [P] Create `tests/lib/input/repeat.test.ts` as a literal-value table test of `advanceRepeat`: tick 1 reports, tick 2 suppresses, tick 3 and every tick after reports, release (`isHeldThisTick = false`) resets to `INITIAL_REPEAT_STATE` and does not report, and a fresh press after release reports again on its own first tick (FR-001–FR-003, FR-005, FR-006, SC-001, SC-003, SC-004).

**Checkpoint**: `repeat.ts` exists, is pure, and is pinned by its own test. User story implementation can now begin.

---

## Phase 3: User Story 1 - One tap, one cell (Priority: P1) 🎯 MVP

**Goal**: A press and release of the keyboard's direction controls observed
by no more than two consecutive ticks produces exactly one move, regardless
of tick phase (FR-001, FR-005, FR-009).

**Independent Test**: Drive `KeyboardInput.consumeDirection()` through an
interleaved sequence of keydown/keyup events and per-tick calls, for every
tap that spans zero, one, and two observed ticks, at every tick-boundary
offset, and assert exactly one reported direction per tap (spec.md US1
Independent Test).

### Implementation for User Story 1

- [ ] T003 [US1] Edit `src/lib/input/keyboard.ts`: add `private repeatStates = new Map<Direction, RepeatState>()` (importing `RepeatState`, `INITIAL_REPEAT_STATE`, `advanceRepeat` from `./repeat`). On `keydown` for a direction not already in `held`, `repeatStates.set(direction, INITIAL_REPEAT_STATE)`. On `keyup` for a direction, `repeatStates.delete(direction)`.
- [ ] T004 [US1] Edit `src/lib/input/keyboard.ts`'s `consumeDirection()`: before computing the return value, for every direction currently in `held`, call `advanceRepeat(repeatStates.get(d) ?? INITIAL_REPEAT_STATE, true)` exactly once and store the resulting state back into `repeatStates`. The direction ultimately picked (`held[held.length - 1]`, unchanged precedence) is returned only if that direction's `report` was `true` this call; otherwise return `undefined` for the held path. Leave the existing `pendingTap` sub-tick path untouched (FR-009, research.md D4).

### Tests for User Story 1

- [ ] T005 [US1] Edit `tests/lib/input/keyboard.test.ts`: add a tap-length/tick-offset sweep — for every tap that no more than two consecutive `consumeDirection()` calls observe down, including a tap spanning zero, one, and two observed ticks, assert exactly one reported direction, at every tick-boundary offset (FR-001, SC-001, SC-002).
- [ ] T006 [US1] Edit `tests/lib/input/keyboard.test.ts`: add an assertion that the existing sub-tick `pendingTap` guarantee still reports exactly one move for a press and release no tick observes down (FR-009), unaffected by the new repeat state.
- [ ] T007 [US1] Edit `tests/lib/input/keyboard.test.ts`: add an acceptance-scenario check that three consecutive taps in the same direction produce three reported moves (spec.md US1 AC5).

**Checkpoint**: At this point, User Story 1 is fully functional and testable independently on the keyboard — the reported defect is fixed.

---

## Phase 4: User Story 2 - Held still means "keep going" (Priority: P2)

**Goal**: A direction held across many ticks settles into the required
cadence — report, suppress, report, report, report, … — indefinitely, and
release, re-press, and direction-change behave exactly as FR-002,
FR-005–FR-008 require (spec.md US2).

**Independent Test**: Hold a direction across many consecutive per-tick
reads and assert the exact pattern: a move on the first observing tick,
nothing on the second, then that direction on every read thereafter with no
gaps, for an arbitrary number of ticks (spec.md US2 Independent Test).

### Implementation for User Story 2

- [ ] T008 [US2] Verify (and adjust if needed) `src/lib/input/keyboard.ts`'s `consumeDirection()` so that *every* direction currently in `held` — not only the one about to be returned — gets its `advanceRepeat` call each tick (research.md D2: a preempted-then-resumed direction's `ticksSincePress` must keep advancing while it is held but not top-of-stack, so it does not re-pay the one-tick hitch on resume). This task depends on T004's loop already covering all held directions; use it to confirm the loop shape, not to introduce a second one.

### Tests for User Story 2

- [ ] T009 [P] [US2] Edit `tests/lib/input/keyboard.test.ts`: add a held-cadence test — hold one direction across 100+ consecutive `consumeDirection()` calls and assert the pattern report/suppress/report×N with exactly one suppressed tick and no further gaps (FR-002, FR-003, SC-003, SC-004).
- [ ] T010 [P] [US2] Edit `tests/lib/input/keyboard.test.ts`: add a release-then-no-more-moves test (spec.md US2 AC2) and a release-then-immediate-re-press test asserting the second press is treated as fresh — reports on its own first tick, not a continuation (FR-006, spec.md US2 AC5).
- [ ] T011 [P] [US2] Edit `tests/lib/input/keyboard.test.ts`: add a direction-change-while-held test — press a second direction without releasing the first, assert the new direction reports on the very next tick (FR-007, spec.md US2 AC3), then release the second and assert the first direction resumes without re-paying the one-tick hitch (research.md D2, spec.md US2 AC4).
- [ ] T012 [P] [US2] Edit `tests/lib/input/keyboard.test.ts`: add an assertion that holding a direction while the grab modifier is also held leaves the grab modifier's own reporting unaffected (spec.md US2 AC6, FR-013).

**Checkpoint**: At this point, User Stories 1 AND 2 both work independently on the keyboard — taps are reliable and sustained holds keep their cadence.

---

## Phase 5: User Story 3 - The same tap on every control (Priority: P3)

**Goal**: Touch and gamepad resolve the identical repeat cadence as
keyboard, through the same shared `advanceRepeat` rule, with no
cross-source coupling (FR-004, FR-014, FR-018, spec.md US3).

**Independent Test**: Drive each source's direction reporter through the
identical press/hold/release sequence used in US1/US2 and assert an
identical sequence of reported directions; additionally assert all three
resolve repeats through the same shared function (spec.md US3 Independent
Test).

### Implementation for User Story 3

- [ ] T013 [US3] Edit `src/lib/input/touch/TouchInput.ts`: add `private repeatState: RepeatState = INITIAL_REPEAT_STATE` and `private lastDirection: Direction | undefined` (importing from `../repeat`). Inside `consumeDirection()`, resolve the raw pad direction exactly as today; if it differs from `lastDirection` (including transitions to/from `undefined`), reset `repeatState` to `INITIAL_REPEAT_STATE` first (research.md D3). Call `advanceRepeat(repeatState, rawDirection !== undefined)`, store the resulting state, set `lastDirection = rawDirection`, and return `rawDirection` only if `report` was `true`; otherwise return `undefined`.
- [ ] T014 [US3] Edit `src/lib/input/gamepad/GamepadInput.ts`: extend the per-pad `GamepadPadState` interface with `repeatState: RepeatState` and `lastDirection: Direction | undefined` (importing from `../repeat`), initialized to `INITIAL_REPEAT_STATE`/`undefined` alongside the existing `previousStickDirection`/`previousPressed`. Inside `poll()`, after computing `padDirection` for a pad, reset that pad's `repeatState` if `padDirection` differs from its stored `lastDirection`, then call `advanceRepeat`, store the result, update `lastDirection`, and only fold the direction into the cross-pad merge (`mergedDirection`) if `report` was `true`. Leave `consumeDirection()`'s signature and cached-return behavior unchanged.

### Tests for User Story 3

- [ ] T015 [P] [US3] Edit `tests/lib/input/touch/TouchInput.test.ts`: update the existing "held direction repeats every tick" assertion (FR-020) to the new cadence (tick 1 reports, tick 2 suppresses, tick 3+ reports), preserving its `describe`/`it` structure and `SC-003` cross-reference (research.md D5).
- [ ] T016 [P] [US3] Edit `tests/lib/input/touch/TouchInput.test.ts`: add the same tap-length/tick-offset sweep, sub-tick-equivalent, release/re-press, and direction-change (pad-zone slide) tests as `keyboard.test.ts` (T005, T006, T010, T011), adapted to touch's `consumeDirection()` call shape (FR-001, FR-006, FR-007, FR-009 equivalent, spec.md US3 AC1–AC2).
- [ ] T017 [P] [US3] Edit `tests/lib/input/gamepad/GamepadInput.test.ts`: update the existing "held direction repeats every tick" assertion (FR-020) to the new cadence, preserving its `describe`/`it` structure and `SC-003` cross-reference (research.md D5).
- [ ] T018 [P] [US3] Edit `tests/lib/input/gamepad/GamepadInput.test.ts`: add the same tap-length/tick-offset sweep, release/re-press, and direction-change (d-pad-to-stick or stick-sweep) tests as `keyboard.test.ts`, driven through `poll()` + `consumeDirection()` (FR-001, FR-006, FR-007, spec.md US3 AC1–AC2).
- [ ] T019 [US3] Edit `tests/lib/input/action-coverage.test.ts`: add a cross-source parity assertion that keyboard, touch, and gamepad each resolve their repeat cadence by calling the same imported `advanceRepeat` from `src/lib/input/repeat.ts`, not through independently-shaped per-source logic (FR-018, FR-019, spec.md US3 AC3).
- [ ] T020 [US3] Edit `tests/lib/input/action-coverage.test.ts` or the relevant per-source test file: add an assertion that two sources holding different directions on the same tick each track their own repeat state independently, and that the existing `resolveDirection` merge precedence in `merge.ts` is unchanged (FR-014, spec.md US3 AC4, AC5) — no new test needed in `merge.ts` itself if an equivalent precedence assertion already exists there; confirm and cross-reference rather than duplicate.

**Checkpoint**: All three user stories are independently functional — keyboard, touch, and gamepad share one rule and report identical cadences.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Confirm the feature-wide guarantees that span all three
stories (FR-011, FR-012, FR-015, FR-016, FR-021, SC-006, SC-007, SC-008).

- [ ] T021 [P] Run `npm test` (builds `dist/` first, then the full vitest suite) and confirm the suite is green, `dist/` holds exactly one self-contained `index.html`, and no file under `src/sim/` or `tests/sim/` shows a diff (FR-011, FR-012, SC-006, SC-007).
- [ ] T022 [P] Review the full diff against FR-021: confirm every test that passed before this feature still passes, except the two FR-020-named assertions in `TouchInput.test.ts` and `GamepadInput.test.ts`, and that no other assertion in those two files changed.
- [ ] T023 [P] Confirm no move is reported while the cave is not in play and none is owed on the first tick after play resumes (FR-015) — add a targeted test in `tests/lib/input/keyboard.test.ts` (or the existing session-transition test file, if one already exercises this path) if not already covered; otherwise cross-reference the existing coverage rather than duplicating it.
- [ ] T024 Update `specs/010-tap-moves-one-cell/quickstart.md`'s "Expected outcome" checklist against the actual final test file names if any diverged during implementation (keep in sync, no behavior change).
- [ ] T025 Perform the maintainer's manual checklist from `spec.md`'s "What the maintainer checks by hand" (items 1–6, 8–9; item 7 gamepad-hardware remains deferred) against a built `dist/index.html` opened via `file://`, and record the outcome for the PR/issue.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No tasks — nothing to wait on.
- **Foundational (Phase 2)**: T001–T002. BLOCKS all user stories — every source imports `repeat.ts`.
- **User Story 1 (Phase 3)**: Depends on Phase 2. No dependency on US2/US3.
- **User Story 2 (Phase 4)**: Depends on Phase 2. Builds on the keyboard edits T003–T004 from US1 (same file, `keyboard.ts`) but is independently testable once T003–T004 land — sequence US1 before US2 for the keyboard, since T008 confirms behavior T004 already introduces.
- **User Story 3 (Phase 5)**: Depends on Phase 2 only (T001–T002). Independent of US1/US2's keyboard edits — touch and gamepad are separate files. Can run in parallel with US1/US2 if staffed separately.
- **Polish (Phase 6)**: Depends on all three user stories being complete.

### User Story Dependencies

- **US1 (P1)**: Depends only on Foundational. Delivers the reported fix (keyboard).
- **US2 (P2)**: Depends on Foundational and, for its keyboard implementation task (T008), on US1's T003–T004 already existing in `keyboard.ts` (same file). Tests (T009–T012) are independently addable once T008 is confirmed.
- **US3 (P3)**: Depends only on Foundational (T001–T002). Touch (T013) and gamepad (T014) are independent of each other and of the keyboard work in US1/US2 — different files, no shared mutable state (FR-014).

### Within Each User Story

- Implementation before its own tests (tests assert the new implementation's behavior).
- T003 before T004 (state fields must exist before the `consumeDirection()` loop uses them).
- T013 and T014 are independent of each other ([P]-eligible against each other, not marked [P] here only because they are the sole implementation task in their respective sub-scopes — safe to run in parallel).

### Parallel Opportunities

- T002 (Foundational test) can be written in parallel with reviewing T001, but must run after T001 exists to import from it — treat as sequential in solo execution, parallel only if one author writes the implementation while another drafts the test against the contract table.
- T009, T010, T011, T012 (all in `tests/lib/input/keyboard.test.ts`, different `it` blocks, no shared mutable fixture) can be developed in parallel by different contributors, then merged into the one file.
- T015/T016 (touch tests) and T017/T018 (gamepad tests) can run in parallel with each other — different files.
- T013 (touch implementation) and T014 (gamepad implementation) can run in parallel — different files.
- T021, T022, T023 in Polish can run in parallel — read-only verification tasks over the finished diff.

---

## Parallel Example: User Story 3

```bash
# Launch touch and gamepad implementation together (different files):
Task: "Edit src/lib/input/touch/TouchInput.ts to add repeat-state tracking calling advanceRepeat"
Task: "Edit src/lib/input/gamepad/GamepadInput.ts to add per-pad repeat-state tracking calling advanceRepeat"

# Launch touch and gamepad test updates together (different files):
Task: "Update tests/lib/input/touch/TouchInput.test.ts cadence assertion and add sweep tests"
Task: "Update tests/lib/input/gamepad/GamepadInput.test.ts cadence assertion and add sweep tests"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 2: Foundational (`repeat.ts` + its unit test).
2. Complete Phase 3: User Story 1 (keyboard repeat delay).
3. **STOP and VALIDATE**: Run `npm test`; manually tap keyboard keys per `spec.md` maintainer check item 1. This alone fixes the reported issue #30 defect.

### Incremental Delivery

1. Foundational → shared rule ready and pinned by its own test.
2. Add US1 → keyboard taps are reliable → validate → this is the MVP.
3. Add US2 → keyboard held-movement cadence and edge cases pinned → validate.
4. Add US3 → touch and gamepad share the same rule, cross-source parity asserted → validate.
5. Polish → full-suite regression check, `dist/` single-file check, manual maintainer pass.

### Parallel Team Strategy

With multiple contributors, after Phase 2 (Foundational) completes:
- Contributor A: US1 → US2 (both touch `keyboard.ts`, sequence to avoid conflicts).
- Contributor B: US3's touch half (`TouchInput.ts` + its tests).
- Contributor C: US3's gamepad half (`GamepadInput.ts` + its tests).
- All three converge on Phase 6 Polish once their stories are individually green.

---

## Notes

- [P] tasks = different files, no dependencies on incomplete same-phase work.
- [Story] label maps task to specific user story for traceability (US1/US2/US3).
- Zero tasks touch `src/sim/` (FR-011) — verified explicitly in T021.
- `keyboard.ts` is shared between US1 (T003–T004) and US2 (T008–T012); sequence those within the file rather than parallelizing implementation edits.
- `TouchInput.ts` and `GamepadInput.ts` are touched only in US3 — safe to parallelize against the keyboard work in US1/US2.
- Commit after each task or logical group; stop at any checkpoint to validate a story independently.
- Avoid: reimplementing `advanceRepeat`'s logic per source (FR-018) — every source task (T003–T004, T013, T014) imports and calls the one function from `repeat.ts`.
