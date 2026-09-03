---

description: "Task list template for feature implementation"
---

# Tasks: Drop The Tick Backlog On A Stall

**Input**: Design documents from `/specs/009-fix-stall-catch-up/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/stall-rule-api.md, quickstart.md

**Tests**: This feature's own tests are mandatory, not optional — FR-016 through FR-018 require the rule to ship as a pure, total function with a node-only vitest suite, and FR-006/SC-005 require every existing test to keep passing untouched. No new browser-automation infrastructure is added (FR-018); the manual restore pass is the maintainer's to run at review time (FR-019), not a task here.

**Organization**: This defect spec has exactly one functional user story (US1, P1) delivering the fix. US2 (P2) and US3 (P3) are non-regression and verification properties of the same change, not separate implementation work — they are covered by tasks in Foundational/US1 plus a dedicated verification phase, per their own Independent Test sections in spec.md.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Single project (per plan.md's Project Structure): `src/lib/loop/stall.ts` (new), `src/App.svelte` (edited), `tests/lib/loop/stall.test.ts` (new).

---

## Phase 1: Setup

**Purpose**: Confirm the current baseline before touching it — this is a defect fix, so "what exists today" must be pinned before it is replaced.

- [X] T001 Run `npm test` on the current branch and confirm it is green (build succeeds, full vitest suite passes) before any change, establishing the SC-005 baseline to diff against later.

**Checkpoint**: Baseline confirmed green. No source files touched yet.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Create the new pure-function module and its test file — both are prerequisites for the call-site edit in US1, since `tickLoop` cannot call a function that does not exist yet.

**⚠️ CRITICAL**: T002 and T003 MUST both land before T004 (the call-site edit) — `App.svelte` cannot import `nextPendingTime` until it is exported.

- [X] T002 Create `src/lib/loop/stall.ts` exporting `STALL_BOUNDARY_TICK_INTERVALS = 2` and `nextPendingTime(pendingTime: number, elapsed: number, tickIntervalMs: number): number`, per `contracts/stall-rule-api.md`: sanitize `pendingTime` and `elapsed` to `0` when either is non-finite or negative (research.md Decision 3), sum them, and return `0` when the sum is strictly greater than `tickIntervalMs * STALL_BOUNDARY_TICK_INTERVALS`, otherwise return the sum unchanged. No Svelte import, no `src/sim/` import, no DOM reference — a plain function of three numbers (FR-016, Principle IV).
- [X] T003 [P] Create `tests/lib/loop/stall.test.ts` (mirrors `src/lib/loop/stall.ts`, matching `tests/lib/audio/mute.test.ts`'s idiom) asserting every row of the contract table in `contracts/stall-rule-api.md` and every case in FR-017: a normal frame well under the boundary is carried unchanged; a stutter at/under the boundary is carried and later spends its ticks; pending time landing exactly on the boundary (two tick intervals) is carried in full and spends two ticks, not one (FR-002, FR-017 — assert this explicitly, do not infer it); pending time one unit past the boundary drops to `0`; a long stall (e.g. 10000ms elapsed) drops to the same `0` as a short one, showing tick count does not grow with stall length (FR-005, SC-003); a zero gap; a negative `elapsed` (clock jumps backward) never goes below `0` and never subtracts (FR-007); a non-finite `elapsed` (`NaN`, `Infinity`) returns a finite non-negative result (FR-007); a negative `pendingTime` is sanitized to `0` before combining (FR-007, research.md Decision 3). Run this file alone (e.g. `npx vitest run tests/lib/loop/stall.test.ts`) and confirm every case fails against a stub or passes against the real implementation from T002 — both files land together since one has no meaning without the other.

**Checkpoint**: `nextPendingTime` exists, is exported, and is pinned by a passing node-only test suite, independent of `App.svelte`. This is the artifact US3's Independent Test describes.

---

## Phase 3: User Story 1 - Coming back to a stalled game is quiet (Priority: P1) 🎯 MVP

**Goal**: Replace `App.svelte`'s five-tick `Math.min` clamp with a call to `nextPendingTime`, so a stall of any length drops its backlog to zero pending time and the frame that follows runs no catch-up ticks — on every screen, for every stall cause.

**Independent Test**: With `nextPendingTime` unit-tested in isolation (Phase 2), the only remaining claim to verify here is that `tickLoop` actually calls it in place of the old clamp, and that the old clamp is gone. This is a code-review-level check plus `npm test` staying green — no new integration test is needed, since the loop's `while` condition and `stepTick()` call are unchanged (FR-009 through FR-013) and every screen already goes through the same `tickLoop`, so FR-004 (applies on every screen) is automatically satisfied by there being exactly one call site.

- [X] T004 [US1] In `src/App.svelte`, import `nextPendingTime` from `src/lib/loop/stall.ts` and replace the `accumulator = Math.min(accumulator + elapsed, MAX_ACCUMULATED_MS);` line (currently line 271, inside `tickLoop`) with `accumulator = nextPendingTime(accumulator, elapsed, TICK_INTERVAL_MS);`, per `contracts/stall-rule-api.md`'s "CORRECT" call-site example. Do not wrap the result in an additional `Math.min` or any other second bound (FR-008).
- [X] T005 [US1] In `src/App.svelte`, delete the `MAX_ACCUMULATED_MS` constant and its preceding comment (currently lines 48–50, immediately after `TICK_INTERVAL_MS`), since FR-008 requires exactly one rule for how much pending time survives a frame and research.md Decision 4 calls for deleting the old bound rather than leaving it as dead code. Leave `TICK_INTERVAL_MS` itself untouched — `nextPendingTime` still takes it as a parameter.
- [X] T006 [US1] Run `npm test` and confirm it is still green (build + full vitest suite, including the new `tests/lib/loop/stall.test.ts`), and inspect `git diff` to confirm it touches only `src/lib/loop/stall.ts` (new), `tests/lib/loop/stall.test.ts` (new), and `src/App.svelte` (the call-site edit and the deleted constant) — no file under `src/sim/**`, no theme file, no sound-derivation or voice-cap file (quickstart.md's "What done looks like").

**Checkpoint**: The fix is in place. `tickLoop` has exactly one rule bounding pending time, and it is the tested one. This is the MVP — stop here and it is a complete, shippable defect fix.

---

## Phase 4: Verification — non-regression and totality (Priority: P2/P3)

**Purpose**: Confirm the two properties spec.md calls out as their own user stories (US2: the fix costs nothing in ordinary play; US3: the rule is pinned by a test, not a listening pass) hold against the actual change, beyond what T003's unit tests and T006's full-suite run already establish. These are verification tasks over the artifact Phase 2/3 already produced, not new implementation.

- [ ] T007 [P] [US2] Confirm `nextPendingTime`'s normal-frame case (pendingTime=0, elapsed well under one tick interval) returns a value byte-identical to `accumulator + elapsed` — the same value today's `Math.min(accumulator + elapsed, MAX_ACCUMULATED_MS)` would have returned for the same inputs, since the sum in that case never approaches either bound (FR-006, spec Acceptance Scenario US2-1). This is already asserted by a T003 test case; this task is to re-read that assertion against this specific claim and confirm no other test file's expectations needed updating.
- [ ] T008 [P] [US2] Confirm via `npm test`'s output that every pre-existing suite passes unchanged: `tests/sim/**` (all sim grid tests, FR-013), `tests/lib/audio/events.test.ts` (sound-derivation, FR-009/FR-010), `tests/lib/audio/priority.test.ts` (voice-cap), `tests/lib/audio/mute.test.ts`, `tests/lib/audio/availability.test.ts`, and every theme sound-table test — none of these files should appear in `git diff` and none should show a changed assertion count (SC-005).
- [ ] T009 [US3] Re-read `tests/lib/loop/stall.test.ts` against FR-017's checklist end to end (normal frame, sub-boundary stutter, boundary-itself, past-boundary, long-stall-equals-short-stall, zero/negative/non-finite totality) and confirm each is a distinct, separately named `it`/`it.each` case rather than folded into a single loose assertion, so a future change that widens the boundary or restores a second clamp fails a specific, legible test (SC-006, FR-017 Acceptance Scenario 4).

**Checkpoint**: All three user stories' Independent Tests are satisfied. Ready for the maintainer's manual listening pass (FR-019, out of scope for this task list per quickstart.md).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — run first to establish the baseline.
- **Foundational (Phase 2)**: Depends on Setup. BLOCKS Phase 3 — `App.svelte` cannot call a function that does not exist.
- **User Story 1 (Phase 3)**: Depends on Foundational completion. This is the MVP; it is also the only phase that touches `App.svelte`.
- **Verification (Phase 4)**: Depends on Phase 3 completion — these tasks re-examine the artifacts Phase 2 and Phase 3 produced against the full suite.

### Within Each Phase

- T002 (implementation) and T003 (test) in Phase 2 land together — one has no meaning without the other, though T003 is marked [P] since it is a different file from T002.
- T004 and T005 in Phase 3 are both edits to `src/App.svelte` and MUST be done sequentially in the same file, not in parallel.
- T007, T008 in Phase 4 are independent checks over already-produced output and can run in parallel; T009 is a review of T003's file and can run alongside them.

### Parallel Opportunities

- T003 can be written in parallel with T002 being reviewed, though both must be complete before Phase 3 begins (the test only has meaning once the implementation exists to run it against).
- T007, T008, and T009 in Phase 4 are all read/verify tasks over distinct evidence (a specific test case, the full suite's pass/fail state, and the test file's structure) and can be done in any order or in parallel.

---

## Parallel Example: Phase 2 (Foundational)

```bash
# T002 and T003 touch different files and can be drafted in parallel,
# but both must be complete and green before Phase 3 starts:
Task: "Create src/lib/loop/stall.ts exporting nextPendingTime and STALL_BOUNDARY_TICK_INTERVALS"
Task: "Create tests/lib/loop/stall.test.ts covering every FR-017 case"
```

---

## Implementation Strategy

### MVP First (and only) — this is a small, single-purpose defect fix

1. Complete Phase 1: Setup (confirm baseline).
2. Complete Phase 2: Foundational (the new module and its test — this is where nearly all the design work lives).
3. Complete Phase 3: User Story 1 (the two-line call-site edit that actually fixes the bug).
4. **STOP and VALIDATE**: `npm test` green, `git diff` matches quickstart.md's "what done looks like."
5. Complete Phase 4: Verification (confirm US2/US3's properties hold, using evidence already produced).
6. Hand off to the maintainer for the manual listening pass (FR-019) — outside this task list's scope.

### Notes

- There is no incremental "ship US1, then later add US2, then later add US3" delivery here — unlike a typical multi-story feature, US2 and US3 are properties of the *same* single change (the call-site edit in Phase 3), not separable increments. Phase 4 exists to verify those properties explicitly rather than to build anything new.
- Total scope, per plan.md: one new ~10–15 line pure-function module, one new test file, a two-line edit plus a three-line deletion in `App.svelte`. Nine tasks reflects that size — this is not a multi-week feature broken artificially into more pieces than it has.
