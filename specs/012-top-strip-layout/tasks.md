---

description: "Task list for Top-Strip Controls Never Overlap"
---

# Tasks: Top-Strip Controls Never Overlap

**Input**: Design documents from `/specs/012-top-strip-layout/`
(plan.md, spec.md, research.md, data-model.md, contracts/topstrip-api.md,
quickstart.md)

**Prerequisites**: plan.md, spec.md (required — read); research.md,
data-model.md, contracts/topstrip-api.md (all read for the algorithm and
type shapes below)

**Tests**: Included. The plan's Testing section, the constitution's "every
spec that adds or changes a physics/geometry rule ships a test that pins
it," and FR-002/FR-023 all require the placement rule to be pinned by a
node-only `vitest` suite — this is not optional for this feature.

**Organization**: Tasks are grouped by user story (spec.md's P1–P4), mirroring
how feature 007 built `computeTouchControlLayout` and
`tests/lib/input/touch/layout.test.ts`. `computeTopStripLayout` is one pure
function (research.md: no `Orientation` parameter, no theme-count branch), so
User Story 1 delivers the whole implementation; User Stories 2–4 extend the
same test file with additional property coverage over the same function,
exactly as their own "Independent Test" sections describe.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

Single project (Principle I — one Svelte+Vite app, no frontend/backend
split), unchanged from every prior feature:

- New module: `src/lib/layout/topStrip.ts`
- Changed shell file: `src/App.svelte`
- New test file: `tests/lib/layout/topStrip.test.ts`
- Changed docs file: `docs/manual-verification.md`

---

## Phase 1: Setup

**Purpose**: Establish the new module's surface before any test or
implementation task depends on it.

- [X] T001 Create the `src/lib/layout/` directory and add
  `src/lib/layout/topStrip.ts` with the `Size`, `TopStripOccupantSizes`, and
  `TopStripLayout` type exports and the `computeTopStripLayout` function
  signature, exactly as specified in
  `specs/012-top-strip-layout/contracts/topstrip-api.md`, type-only
  importing `InsetBox`/`Rect` from `../input/touch/layout` (research.md's
  "reuse via type-only import" decision). The function body may `throw new
  Error('not implemented')` at this stage — T005 fills it in.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared test scaffolding every user story's tests build on —
mirrors `tests/lib/input/touch/layout.test.ts`'s own helpers and sample
tables.

**⚠️ CRITICAL**: No user story's tests can be written until this phase is
complete.

- [X] T002 Create the `tests/lib/layout/` directory and add
  `tests/lib/layout/topStrip.test.ts` importing `computeTopStripLayout` and
  the types from `src/lib/layout/topStrip.ts`. Add: (1) `rectsIntersect` and
  `rectFullyInside` helpers, mirroring
  `tests/lib/input/touch/layout.test.ts` lines 25-36; (2) a pinned viewport
  table per FR-023 — `NARROWEST_PORTRAIT`/`NARROWEST_LANDSCAPE` `InsetBox`es
  at 320 CSS px on the short edge, plus a wide desktop-sized box for the
  no-regression checks (FR-020); (3) matching `reservedRects` samples for
  each of those boxes — a bottom band for portrait and two side margins for
  landscape, shaped like `computeTouchControlLayout`'s own output
  (`src/lib/input/touch/layout.ts` lines 126-178, 186-255) — and an empty
  array for the "no touch controls visible" cases; (4)
  `OCCUPANT_SIZE_SAMPLES`, a table of `TopStripOccupantSizes` values standing
  in for: a typical in-play readout, the title screen's widest readout line,
  no readout, `themePicker.expanded`/`.collapsed` `Size` pairs for one
  through four registered themes, and one unusually long theme name — per
  data-model.md's "Occupant Size Inputs" table.

**Checkpoint**: Foundation ready — every user story below can now write and
run tests against `tests/lib/layout/topStrip.test.ts`.

---

## Phase 3: User Story 1 - A phone screen where nothing sits on anything (Priority: P1) 🎯 MVP

**Goal**: The reported defect is gone — at the narrowest supported phone
width, the readout, the mute control, and the theme picker (expanded or
collapsed) never overlap each other and always stay inside the available
screen box, and the shell actually renders them at the placement rule's
returned boxes instead of fixed CSS positions.

**Independent Test**: With no browser, call `computeTopStripLayout` with a
320 CSS px available box plus each occupant's measured natural size, and
assert no two returned boxes intersect and every box lies fully inside the
available box (spec.md User Story 1, Acceptance Scenarios 1-2, 4-5, 7-9).

### Tests for User Story 1 ⚠️

> Write these first; they fail against T001's stub until T005 lands.

- [X] T003 [US1] In `tests/lib/layout/topStrip.test.ts`, add non-overlap and
  containment tests at `NARROWEST_PORTRAIT` with no reserved rects, asserting
  no two of `readout`/`muteButton`/`themePicker.rect` intersect (FR-007) and
  every returned box lies fully inside `availableBox` (FR-008), across these
  `OCCUPANT_SIZE_SAMPLES` cases: readout at typical width, readout at the
  title screen's widest width (spec.md Acceptance Scenario 4), no readout
  present (Edge Cases: "No readout on screen"), and no theme picker present
  (Edge Cases: "One registered theme").
- [X] T004 [US1] In `tests/lib/layout/topStrip.test.ts`, add collapse-decision
  tests at `NARROWEST_PORTRAIT`: (a) with occupant sizes whose natural-size
  sum exceeds the band's usable width, assert `themePicker.collapsed` is
  `true` and `themePicker.rect`'s size equals `sizes.themePicker.collapsed`
  exactly, never an intermediate size (FR-011, FR-012); (b) calling
  `computeTopStripLayout` again with the identical arguments returns a
  deep-equal `TopStripLayout`, including the same `collapsed` value
  (FR-012b, FR-018, SC-010, spec.md Acceptance Scenario 7 and 9); (c) with a
  wide sample where all three fit at natural size, assert `collapsed` is
  `false`, `themePicker.rect`'s size equals `sizes.themePicker.expanded`
  exactly, and the arrangement is readout-leading-edge /
  theme-picker-trailing-edge / mute-button-centered-between (FR-020).

### Implementation for User Story 1

- [X] T005 [US1] Implement `computeTopStripLayout` in
  `src/lib/layout/topStrip.ts` per the six-step algorithm in
  `specs/012-top-strip-layout/data-model.md`'s "Top-Strip Placement" section:
  (1) form the strip band spanning `availableBox`'s full width at its top
  edge, sized to the tallest present occupant's natural height plus margin,
  subtracting the horizontal extent of any `reservedRects` entry that
  overlaps the band vertically; (2) decide the theme picker's expanded vs.
  collapsed form once, from the natural-size sum of `muteButton` + `readout`
  (if present) + `themePicker.expanded` (if present) plus margins against the
  band's usable width — never from a previously-returned layout (FR-012a);
  (3) place the mute button at full natural size, centered in the band's
  usable width (FR-011); (4) place the theme picker, in the form chosen at
  step 2, at full natural size, at the band's trailing edge; (5) place the
  readout at the band's leading edge with width
  `min(readout.width, remaining space before the mute button's left edge)`;
  (6) clamp every returned rect into `availableBox` with a `containRect`
  helper mirroring `src/lib/input/touch/layout.ts` lines 84-90 (`clamp` +
  `containRect`). This must make T003 and T004 pass.
- [X] T006 [US1] In `src/App.svelte`, add hidden natural-size probe elements
  mirroring the existing `.safe-area-probe` pattern (script setup at lines
  90-101, markup at line 409, CSS at lines 490-497: `position: fixed;
  visibility: hidden; pointer-events: none;`, never `display: none`) for the
  current readout text, the mute button, the full theme-button row, and the
  collapsed cycle control. Add a `topStripSizes` `$derived.by` that reads
  each probe's `getBoundingClientRect()` into a `TopStripOccupantSizes`
  value (`readout` omitted when `hudText` is `undefined`; `themePicker`
  omitted when `listThemes().length <= 1`), re-measured on the existing
  `resize`/`orientationchange` listeners (lines 377-378, 398) plus whenever
  `hudText` or `listThemes()`'s derived label list changes.
- [X] T007 [US1] In `src/App.svelte`, add
  `topStripLayout = $derived.by(() => computeTopStripLayout(insetBox,
  touchLayout?.reservedRects ?? [], topStripSizes))`, mirroring
  `touchLayout`'s own `$derived.by` at lines 140-143, importing
  `computeTopStripLayout` from `./lib/layout/topStrip`. `topStripLayout` is
  `undefined` until `insetBox` and `topStripSizes` are both measured.
- [X] T008 [US1] In `src/App.svelte`, replace the fixed `.readout` (lines
  510-520) and `.mute-button` (lines 536-552) CSS position rules, and the
  `.theme-picker` rule's `top`/`right` (lines 554-560), with inline `style`
  bindings driven by `topStripLayout.readout` / `topStripLayout.muteButton` /
  `topStripLayout.themePicker.rect`, mirroring the `canvasStyle`/
  `touchLayout` inline-style pattern already used at lines 153-157 and
  450-477. Remove the now-unused `themePickerRightPx` derived value (lines
  161-164) and its binding at line 430.
- [X] T009 [US1] In `src/App.svelte`, render the collapsed theme control when
  `topStripLayout.themePicker?.collapsed` is `true`: a single button
  positioned at `topStripLayout.themePicker.rect`, its label showing the
  active theme's `displayName`, `onclick` calling
  `selectTheme(cycleThemeId(activeThemeId, listThemes().map((t) => t.id)))`
  — the same call already used at line 205 (FR-013's "same advance-to-next-
  theme action"). The existing `{#each listThemes() as themeOption}` row
  (lines 429-443) renders unchanged when `topStripLayout.themePicker?.
  collapsed` is `false`.

**Checkpoint**: User Story 1 is fully functional — the placement rule is
implemented, pinned by tests, and wired into the shell. The reported defect
(mute/theme overlapping the HUD at phone width) is fixed.

---

## Phase 4: User Story 2 - Rotate the phone and it still holds (Priority: P2)

**Goal**: The same property holds after rotation and resize, including when
the on-screen touch controls' reserved regions are active, without any new
per-element listener (the resize/orientationchange wiring already lives in
T006).

**Independent Test**: Run `computeTopStripLayout` over landscape boxes,
including boxes where `reservedRects` (the touch layout's side margins) are
active, and assert the same non-overlap/containment properties plus: no
occupant's box intersects any reserved rect (spec.md User Story 2,
Acceptance Scenarios 1-2, 5).

### Tests for User Story 2

- [X] T010 [US2] In `tests/lib/layout/topStrip.test.ts`, add reserved-region
  tests: at `NARROWEST_LANDSCAPE` with the touch controls' side-margin
  `reservedRects` active, and at `NARROWEST_PORTRAIT` with the bottom-band
  `reservedRects` active, assert none of `readout`/`muteButton`/
  `themePicker.rect` intersects any `reservedRects` entry (FR-009), in
  addition to the non-overlap (FR-007) and containment (FR-008) properties
  already required.
- [X] T011 [US2] In `tests/lib/layout/topStrip.test.ts`, add a desktop-width
  regression test: at the wide sampled viewport from `OCCUPANT_SIZE_SAMPLES`
  where all three occupants fit at natural size, assert the arrangement
  matches today's shipped layout — readout at the leading edge, theme picker
  at the trailing edge, mute button centered between them (FR-020, spec.md
  User Story 2 Acceptance Scenario 5).
- [X] T012 [US2] In `tests/lib/layout/topStrip.test.ts`, add a degenerate-
  viewport test: an `availableBox` with near-zero width and one with
  near-zero height, asserting `computeTopStripLayout` returns rects (does
  not throw) and every returned rect stays fully inside the available box
  (Edge Cases: "A degenerate available box").

**Checkpoint**: User Stories 1 AND 2 both hold — the property survives
rotation, resize, and the touch controls' reserved regions, with no new
listener.

---

## Phase 5: User Story 3 - A third theme does not break the strip (Priority: P3)

**Goal**: The property holds for any number of registered themes from one
upward, and the collapsed control's width never grows with the theme count.

**Independent Test**: Run `computeTopStripLayout` with theme-picker sizes
standing in for one, two, three, and four themes, and for one unusually long
theme name, at the narrowest supported viewport, and assert the same
non-overlap and containment properties for every one (spec.md User Story 3,
Acceptance Scenarios 1-3).

### Tests for User Story 3

- [ ] T013 [US3] In `tests/lib/layout/topStrip.test.ts`, add a parameterized
  test over `OCCUPANT_SIZE_SAMPLES`'s one-through-four-theme and
  long-theme-name `themePicker.expanded` samples at `NARROWEST_PORTRAIT`:
  assert the non-overlap (FR-007) and containment (FR-008) properties hold
  for every sample (FR-014), and assert `themePicker.collapsed`'s resulting
  `rect` width is identical across all of them — the collapsed form's width
  never grows with the count (FR-012, SC-009).
- [ ] T014 [US3] In `tests/lib/layout/topStrip.test.ts`, add a freed-space
  test: with `themePicker` absent (standing in for a one-theme registry) at
  `NARROWEST_PORTRAIT`, assert the property still holds and that the mute
  button and readout occupy more of the band's width than they do in the
  equivalent two-occupant case with a picker present — the freed space is
  actually used, not merely left unbroken (Edge Cases: "One registered
  theme", spec.md User Story 3 Acceptance Scenario 3).

**Checkpoint**: All user stories through P3 hold — adding a theme is a
data-only change that requires no edit to `src/lib/layout/topStrip.ts` and no
new test case beyond parameterizing existing ones.

---

## Phase 6: User Story 4 - A guarantee the suite can hold up (Priority: P4)

**Goal**: A regression that puts two occupants on top of each other at phone
width fails the suite, on a runner with no browser, and the maintainer has a
re-runnable by-hand item to confirm the same on a real phone.

**Independent Test**: The placement rule is exercised directly in the
existing node-only environment; a deliberate regression that ignores the
other occupants' placement fails the non-overlap assertions (spec.md User
Story 4, Acceptance Scenario 1).

### Tests for User Story 4

- [ ] T015 [US4] In `tests/lib/layout/topStrip.test.ts`, add a deliberate-
  regression test (SC-005, quickstart.md "A deliberate regression fails the
  suite"): define a small test-local `brokenPlacement` function that pins
  the mute button to a fixed `{ x: 0, y: 0, ... }` box regardless of its
  inputs (ignoring the readout and theme picker), run it over
  `NARROWEST_PORTRAIT` with a sample where the readout also starts at the
  leading edge, and assert `rectsIntersect` returns `true` for that broken
  output — proving the suite's non-overlap helper would catch this class of
  regression if it appeared in `computeTopStripLayout` itself.

### Documentation for User Story 4

- [ ] T016 [P] [US4] In `docs/manual-verification.md`, add a new item to the
  existing `## Standing checks` section (after the "Touch-only tap
  visibility (011, `#31`)" entry, lines 16-30), instructing the maintainer
  to confirm on a real phone, in both orientations, that the readout, the
  mute control, and the theme picker do not overlap and that each is fully
  legible and tappable (FR-024, SC-008). Do not edit
  `specs/007-touch-gamepad-input/spec.md`'s Maintainer Review Notes — it
  must stay byte-for-byte unchanged (FR-024).

**Checkpoint**: All four user stories hold. The property is enforced by the
suite, not by a stylesheet comment, and the matching by-hand check is
recorded for future specs to re-run.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Confirm the feature ships clean, per FR-022 and the plan's
Constitution Check.

- [ ] T017 [P] Run `npm test` (builds `dist/`, then the full `vitest`
  suite) and confirm every test from features 001-011 still passes
  unchanged alongside the new `tests/lib/layout/topStrip.test.ts` cases, and
  that `dist/` still holds exactly one self-contained `index.html` (FR-022,
  SC-006).
- [ ] T018 [P] Review the full diff against `main` and confirm it touches no
  file under `src/sim/`, no cave data file, and no theme data file — only
  `src/lib/layout/topStrip.ts` (new), `src/App.svelte`,
  `tests/lib/layout/topStrip.test.ts` (new), and
  `docs/manual-verification.md` changed (FR-022; spec.md Maintainer Review
  Notes item 9).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on T001 (imports its types) — BLOCKS
  every user story's tests.
- **User Story 1 (Phase 3)**: Depends on Foundational. Delivers the whole
  implementation (`computeTopStripLayout` + the `App.svelte` wiring) — every
  later story's tests call the same function T005 implements.
- **User Story 2 (Phase 4)**: Depends on User Story 1's T005 (the function
  under test) — no new implementation task, only new test coverage over the
  reserved-region and reflow properties.
- **User Story 3 (Phase 5)**: Depends on User Story 1's T005, same reason.
- **User Story 4 (Phase 6)**: Depends on User Story 1's T005 for its test
  (T015); T016 (docs) has no code dependency and can happen any time after
  Setup.
- **Polish (Phase 7)**: Depends on all four user stories being complete.

### Within User Story 1

- Tests (T003, T004) before implementation (T005) — write them first, watch
  them fail against T001's stub.
- T005 (the pure function) before T006-T009 (the shell wiring that calls it).
- T006 (probes/`topStripSizes`) before T007 (`topStripLayout`, which reads
  `topStripSizes`).
- T007 before T008 and T009 (both read `topStripLayout`).
- T008 and T009 touch the same file (`src/App.svelte`) but different regions
  (CSS/style bindings vs. the collapsed-control markup) — do them in order to
  avoid merge noise, not because either reads the other's output.

### Parallel Opportunities

- T003 and T004 both edit `tests/lib/layout/topStrip.test.ts` — do them in
  sequence, not in parallel, to avoid clobbering each other's edits to the
  same file.
- Likewise T010-T012, T013-T014, and T015 all extend the same test file —
  sequence within each story.
- T016 (docs) can run in parallel with T015 (test file) — different files.
- T017 and T018 (Polish) are independent verification passes and can run in
  parallel once every prior task is done.

---

## Parallel Example: User Story 4

```bash
# T015 (test file) and T016 (docs file) touch different files and can
# proceed together once User Story 1's T005 exists:
Task: "Add deliberate-regression test in tests/lib/layout/topStrip.test.ts"
Task: "Add Standing checks item in docs/manual-verification.md"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001).
2. Complete Phase 2: Foundational (T002) — blocks every story's tests.
3. Complete Phase 3: User Story 1 (T003-T009).
4. **STOP and VALIDATE**: `npm test` passes; manually open `dist/index.html`
   at phone width and confirm the reported overlap is gone (spec.md SC-002).
   This alone fixes issue #35's reported defect.

### Incremental Delivery

1. Setup + Foundational → scaffolding ready.
2. User Story 1 → the fix, pinned by tests → this is the MVP.
3. User Story 2 → rotation/reflow coverage added to the same test file, no
   new production code.
4. User Story 3 → theme-count-scaling coverage added, no new production
   code — confirms adding a theme stays data-only.
5. User Story 4 → the regression-proof test plus the Standing checks doc
   entry — the guarantee becomes something the next contributor's diff must
   survive, not something a reviewer has to remember to check.
6. Polish → full-suite and diff-scope confirmation.

### Why User Stories 2-4 add no new implementation task

`computeTopStripLayout` (T005) is written once, as a pure function of
`(availableBox, reservedRects, sizes)` with no `Orientation` parameter and no
theme-count branch (research.md's explicit decisions). Landscape, reserved
regions, and any number of themes are not separate code paths — they are
different inputs to the same function. User Stories 2-4 are therefore
entirely test-coverage phases over the implementation User Story 1 already
built, exactly as their own "Independent Test" sections in spec.md describe
("run the same pure placement rule over landscape boxes...").
