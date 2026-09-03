---

description: "Task list template for feature implementation"
---

# Tasks: Taps Never Hide The Touch Controls

**Input**: Design documents from `/specs/011-fix-touch-tap-visibility/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/visibility-api.md, quickstart.md

**Tests**: This feature's own tests are mandatory, not optional — FR-010 requires the browser-less suite to assert the full origin × current decision table, including a tap-synthesized row and a genuine-mouse row with opposite outcomes, and requires the existing 007 `shouldShowTouchControls` assertions to keep passing unchanged. The player-facing manual pass (SC-001 through SC-003, SC-007) is the maintainer's job at review time per Principle VII, not a task here.

**Organization**: Three user stories share one underlying mechanism (reclassifying where `lastInputSource` comes from), so Foundational carries the pure-function change and its core test coverage, US1 (P1) wires the fix into `App.svelte`, and US2 (P2) / US3 (P3) are verification phases over the artifact US1 produces — matching each story's own Independent Test section in spec.md, which reads as "confirm X holds" rather than "build Y."

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Single project (per plan.md's Project Structure): `src/lib/input/visibility.ts` (edited), `src/App.svelte` (edited), `tests/lib/input/visibility.test.ts` (edited), `docs/manual-verification.md` (edited). No file under `src/sim/`, no theme file (FR-011).

---

## Phase 1: Setup

**Purpose**: Confirm the current baseline before touching it — this is a defect fix, so "what exists today" must be pinned before it is replaced.

- [X] T001 Run `npm test` on the current branch and confirm it is green (build succeeds, full vitest suite passes) before any change, establishing the SC-006 baseline to diff against later.

**Checkpoint**: Baseline confirmed green. No source files touched yet.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Change the pure reducer's signature and prove its new table correct in isolation — every user story's call-site work depends on `InputOrigin` and the new `nextLastInputSource(current, origin)` existing first.

**⚠️ CRITICAL**: T002 and T003 MUST both land before T004 (the `App.svelte` call-site edit) — the existing listeners currently pass `'keydown' | 'click' | 'touchstart'`, which will no longer type-check once the signature changes; `App.svelte` does not compile again until Phase 3 updates it.

- [ ] T002 In `src/lib/input/visibility.ts`, add `export type InputOrigin = 'touch' | 'mouse' | 'keyboard' | 'pen' | 'unknown';` and change `nextLastInputSource`'s second parameter from `eventType: 'keydown' | 'click' | 'touchstart'` to `origin: InputOrigin`, implementing the table from `contracts/visibility-api.md`: `'touch'` and `'pen'` always resolve `'touch'`; `'keyboard'` and `'mouse'` always resolve `'discrete'`; `'unknown'` returns `current` unchanged (a no-op, per research.md Decision 2) — a total function of its two arguments, no clock, no timer (FR-007). Update the file's leading comment and the FR-027a comment above the function to describe origin-based classification instead of raw DOM event types. `shouldShowTouchControls` is unchanged (data-model.md, research.md Decision 5).
- [ ] T003 [P] In `tests/lib/input/visibility.test.ts`, replace the `nextLastInputSource — reducer table (FR-027a)` describe block's `eventType`-based cases (`'touchstart'`, `'keydown'`, `'click'`) with origin-based cases covering `contracts/visibility-api.md`'s full table: `'touch'` and `'pen'` resolve `'touch'` from every `current` (`'none'`, `'touch'`, `'discrete'`); `'keyboard'` and `'mouse'` resolve `'discrete'` from every `current`; `'unknown'` is a no-op from every `current` (`'none'`→`'none'`, `'touch'`→`'touch'`, `'discrete'`→`'discrete'`). Leave the `shouldShowTouchControls — capability x last-input table (SC-011b)` describe block untouched (FR-010: "the existing 007 visibility assertions MUST continue to pass").

**Checkpoint**: `nextLastInputSource` takes an explicit origin and its full table is pinned by a passing node-only test suite, independent of `App.svelte`. `App.svelte` does not yet compile — that is expected and fixed in Phase 3.

---

## Phase 3: User Story 1 - A player with no keyboard can keep playing (Priority: P1) 🎯 MVP

**Goal**: Reclassify what each `App.svelte` listener reports as `origin`, so a tap's browser-synthesized `click` can no longer flip `lastInputSource` back to `'discrete'` — the entire reported defect.

**Independent Test**: With `nextLastInputSource` unit-tested in isolation (Phase 2), the remaining claim is that `App.svelte`'s listeners now feed it the right origin for each real DOM signal, and that the diff stays as small as FR-011 requires. This is a code-review-level check plus `npm test` staying green; the player-facing confirmation (tap 20 times on a real device, SC-001/SC-002) is the maintainer's manual pass, not automatable in this suite (Principle VII).

- [ ] T004 [US1] In `src/App.svelte`, update the three existing handlers to pass an `InputOrigin` instead of a raw event-type string: `onAnyKeyDown` (currently line 110-113) passes `'keyboard'` (was `'keydown'`); `onAnyClick` (114-117) passes `'unknown'` (was `'click'`) — this is the reclassification that fixes the reported defect, since `click` is no longer trusted to mean anything on its own (research.md Decision 1); `onAnyTouchStart` (118-121) passes `'touch'` (was `'touchstart'`, kept as an additive fallback per research.md Decision 4). Leave each handler's `audioEngine.unlock(...)` call unchanged. Update the FR-027a comment above `let lastInputSource` (lines 83-85) to mention the new `pointerdown` listener alongside `keydown`/`click`/`touchstart`.
- [ ] T005 [US1] In `src/App.svelte`, add a new handler beside the three existing ones, e.g. `const onAnyPointerDown = (event: PointerEvent): void => { ... }`, deriving `origin: InputOrigin` from `event.pointerType` per `contracts/visibility-api.md`'s call-site table (`'mouse'` → `'mouse'`, `'touch'` → `'touch'`, `'pen'` → `'pen'`, any other or absent value → `'unknown'`) and calling `lastInputSource = nextLastInputSource(lastInputSource, origin)`. Register it with `window.addEventListener('pointerdown', onAnyPointerDown)` in `onMount` alongside the existing `keydown`/`click`/`touchstart` registrations (currently lines 365-367), and remove it with the matching `window.removeEventListener` in `onDestroy` (currently lines 386-388). Do not call `audioEngine.unlock(...)` from this handler — that wiring stays exactly as it is on the three existing listeners, unrelated to this contract (contracts/visibility-api.md).
- [ ] T006 [US1] Run `npm test` (builds first, then the full vitest suite) and confirm it is green. Inspect `git diff` and confirm it touches only `src/lib/input/visibility.ts`, `src/App.svelte`, and `tests/lib/input/visibility.test.ts` so far — no file under `src/sim/`, no theme file, no touch layout/hit-area/action-mapping file (FR-011).

**Checkpoint**: The fix is in place. A tap's `pointerdown` sets `'touch'`, its trailing synthesized `click` is now a no-op `'unknown'`, and the controls can no longer be hidden by a tap. This is the MVP.

---

## Phase 4: User Story 2 - A touchscreen-laptop player keeps the adaptive rule (Priority: P2)

**Purpose**: Confirm the property spec.md calls out as its own user story — that a real key press and a real mouse click still hide the controls instantly, and pointer movement still changes nothing — holds against the Phase 3 change, beyond what T006's full-suite run already establishes. These are verification tasks over the artifact Phase 2/3 already produced, not new implementation (mirroring FR-002/FR-003, User Story 2's Acceptance Scenarios).

- [ ] T007 [P] [US2] Re-read `tests/lib/input/visibility.test.ts`'s rewritten `nextLastInputSource` block (from T003) and confirm the `'mouse'` and `'keyboard'` rows are distinct, separately named cases resolving `'discrete'` from every `current` including `'touch'` — i.e. a real click or key press hides the controls even while they are currently shown from a touch — and that composed with `shouldShowTouchControls({ hasTouch: true }, 'discrete')` the result is `false` (Acceptance Scenarios 1-2).
- [ ] T008 [P] [US2] Grep `src/App.svelte` for any listener wired to `pointermove`, `mousemove`, or `touchmove` that calls `nextLastInputSource`, and confirm there is none — this is what keeps "pointer movement MUST NOT show or hide the controls" (FR-003, Acceptance Scenario 4) structural rather than a branch that could be miscoded, consistent with there being exactly four listeners (`keydown`, `click`, `touchstart`, `pointerdown`) registered in `onMount` after T005.

**Checkpoint**: Keyboard and mouse still hide instantly, touch and pen still show instantly, and movement remains structurally incapable of doing either — US2 holds on the same mechanism US1 uses, verified without new code.

---

## Phase 5: User Story 3 - The rule is pinned where CI can see it (Priority: P3)

**Purpose**: Confirm the decision table itself — not just its outcome — is legible and would actually fail if the fix were reverted, per FR-010 and SC-004.

- [ ] T009 [US3] Re-read `tests/lib/input/visibility.test.ts`'s `nextLastInputSource` block end-to-end against FR-010's checklist: a tap-synthesized activation is represented by a `'touch'` row (from `pointerdown`/`touchstart`) followed by an `'unknown'` row (from the trailing `click`) that leaves the result at `'touch'`, and a genuine mouse activation is a `'mouse'` row resolving `'discrete'` — opposite outcomes, from two calls with different arguments (FR-006). Confirm dedicated rows also exist for `'unknown'` (no-op on every `current`) and `'pen'` (→ `'touch'`), and that each is its own named `it` case rather than folded into a broader assertion (SC-005).
- [ ] T010 [US3] Per quickstart.md's SC-004 spot-check: temporarily edit `nextLastInputSource` in `src/lib/input/visibility.ts` to route `'unknown'` through the old `→ 'discrete'` behavior, run `npm test`, and confirm the tap-synthesized-activation test case from T003/T009 fails. Revert the temporary edit and confirm `npm test` is green again — this is a spot-check, not a permanent change.

**Checkpoint**: All three user stories' Independent Test sections are satisfied by code and tests already in place. Ready for the maintainer's manual on-device pass (SC-001 through SC-003, out of scope for this task list per Principle VII).

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: The documentation requirement (FR-012, FR-012a, FR-012b) and a final scope/build check — cross-cutting, not tied to any single user story's Independent Test.

- [ ] T011 [P] Add a "Standing checks" section to `docs/manual-verification.md`, clearly separated from the dated per-spec pass log (FR-012a), holding the touch-only regression check as a re-runnable standing item: tap the pad, grab, pause, restart, theme picker, and mute button repeatedly on a real touch-only device with no keyboard and no mouse, and confirm the controls never disappear; note that emulated touch in desktop devtools does not reproduce the defect faithfully and a real device is required (FR-012). Leave the existing dated "007" section (including its `#31` finding) exactly as it is, and do not edit `specs/007-touch-gamepad-input/spec.md` (FR-012b) — the new section is additive.
- [ ] T012 Run `npm test` one final time and confirm it is green. Confirm `dist/` holds exactly one self-contained `index.html` (SC-006). Run `git diff --stat` against the Phase 1 baseline and confirm the full change set matches plan.md's Project Structure — `src/lib/input/visibility.ts`, `src/App.svelte`, `tests/lib/input/visibility.test.ts`, `docs/manual-verification.md` — with nothing under `src/sim/` and no theme file touched (FR-011, SC-006, SC-007).

**Checkpoint**: Feature complete and ready for the maintainer's manual pass across all three device situations in spec.md's Maintainer Review Notes.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — run first to establish the baseline.
- **Foundational (Phase 2)**: Depends on Setup. BLOCKS Phase 3 — `App.svelte` cannot pass an `InputOrigin` value that does not exist as a type yet, and its old event-type strings stop type-checking the moment T002 lands.
- **User Story 1 (Phase 3)**: Depends on Foundational completion. This is the MVP; it is also the only phase that touches `App.svelte`.
- **User Story 2 (Phase 4)**: Depends on Phase 3 completion — T008 inspects the final `App.svelte` listener set Phase 3 produces.
- **User Story 3 (Phase 5)**: Depends on Phase 2 completion (re-reads the test file T003 wrote); ordered after Phase 4 here for a simple linear pass, but could run in parallel with Phase 4 since neither writes to the other's files.
- **Polish (Phase 6)**: Depends on Phases 3-5 being complete — T012's diff-scope check needs the full change set to exist.

### Within Each Phase

- T002 (implementation) and T003 (test) in Phase 2 land together — one has no meaning without the other, though T003 is marked [P] since it is a different file from T002.
- T004 and T005 in Phase 3 are both edits to `src/App.svelte` and MUST be done sequentially in the same file, not in parallel.
- T007 and T008 in Phase 4 are independent re-reads of already-produced artifacts (a test file, a grep over `App.svelte`) and can run in parallel.
- T009 and T010 in Phase 5 both concern the same test file but are independent activities (a read-through vs. a temporary revert-and-run) and can run in parallel.

### Parallel Opportunities

- T003 can be drafted in parallel with T002 being reviewed, though both must be complete before Phase 3 begins.
- T007 and T008 (Phase 4) can run in parallel with each other, and Phase 4 as a whole can run in parallel with Phase 5 once both Phase 2 and Phase 3 are done.
- T011 (docs) has no code dependency once Phase 3 is done and can be drafted in parallel with Phases 4-5.

---

## Parallel Example: Phase 2 (Foundational)

```bash
# T002 and T003 touch different files and can be drafted in parallel,
# but both must be complete and green before Phase 3 starts:
Task: "Change nextLastInputSource's signature to (current, origin: InputOrigin) in src/lib/input/visibility.ts"
Task: "Rewrite the nextLastInputSource test rows to the origin-based table in tests/lib/input/visibility.test.ts"
```

## Parallel Example: Phases 4-5 (Verification)

```bash
# Once Phase 3 lands, US2 and US3 verification can proceed together:
Task: "Confirm mouse/keyboard origins resolve 'discrete' from every current state (US2)"
Task: "Grep App.svelte for a movement listener wired to the reducer — confirm none exists (US2)"
Task: "Re-read the full origin table against FR-010's checklist (US3)"
Task: "Revert-and-run spot-check for SC-004 (US3)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (confirm baseline).
2. Complete Phase 2: Foundational (the reducer's new signature and its test table — where nearly all the design work lives).
3. Complete Phase 3: User Story 1 (the `App.svelte` listener wiring that actually fixes the reported defect).
4. **STOP and VALIDATE**: `npm test` green, `git diff` matches plan.md's expected file set so far.
5. Hand off to the maintainer for the touch-only manual pass (SC-001, SC-002) — this is the whole of the reported defect and the highest-value checkpoint to validate before continuing.

### Incremental Delivery

1. Complete Setup + Foundational → the pure function is correct and tested in isolation.
2. Add User Story 1 → fix is live, MVP → maintainer can validate on a real touch-only device.
3. Add User Story 2 → confirm the touchscreen-laptop behavior (007's rule) did not regress.
4. Add User Story 3 → confirm the decision table itself is legible and would catch a regression.
5. Polish → standing manual-verification entry, final scope/build check.

### Notes

- There is no incremental "ship US1, then later add US2, then later add US3" delivery in the sense of separate deployable increments — like 009, US2 and US3 are properties of the *same* single change (Phase 2's reducer plus Phase 3's call-site wiring), not separable implementation work. Phases 4 and 5 exist to verify those properties explicitly against evidence already produced.
- Total scope, per plan.md: one changed function signature and its table in `visibility.ts`, four listener edits plus one new listener in `App.svelte`, one rewritten test block, one new docs section. Twelve tasks reflects that size — this is a small, single-purpose defect fix, not a multi-week feature.
