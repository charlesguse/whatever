---

description: "Task list for The Readout Always Fits Its Box"
---

# Tasks: The Readout Always Fits Its Box

**Input**: Design documents from `/specs/013-readout-overflow-policy/`
(plan.md, spec.md, research.md, data-model.md, contracts/topstrip-api.md,
quickstart.md)

**Prerequisites**: plan.md, spec.md (required — read); research.md,
data-model.md, contracts/topstrip-api.md (all read for the algorithm and
type shapes below)

**Tests**: Included. The plan's Testing section, the constitution's "every
spec that adds or changes a physics/geometry rule ships a test that pins
it," and FR-020 through FR-022 all require the growth/cap/elision policy to
be pinned by a node-only `vitest` suite — this is not optional for this
feature.

**Organization**: Tasks are grouped by user story (spec.md's P1–P4), mirroring
how feature 012 built `computeTopStripLayout` and extended
`tests/lib/layout/topStrip.test.ts`. This feature extends 012's existing
module and test file in place rather than adding new ones (plan.md's
Structure Decision): User Story 1 delivers the whole growth-allowance /
cap-severing / elision implementation; User Stories 2–4 extend the same test
file with additional property coverage over the same functions, exactly as
their own "Independent Test" sections describe.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

Single project (Principle I — one Svelte+Vite app, no frontend/backend
split), unchanged from every prior feature:

- Changed module: `src/lib/layout/topStrip.ts`
- Changed shell file: `src/App.svelte`
- Changed test file: `tests/lib/layout/topStrip.test.ts`
- Changed docs file: `docs/manual-verification.md`

No file under `src/sim/`, no cave data, and no theme data file is touched by
any task below (FR-019).

---

## Phase 1: Setup

**Purpose**: Adopt the new type shapes (`contracts/topstrip-api.md`) and
extract the band-geometry/collapse-decision/placement steps that never touch
the readout's height into their own function, as a pure refactor with no
behavior change — the surface every later task builds on.

- [X] T001 In `src/lib/layout/topStrip.ts`: (1) extract today's steps 1
  (band + reserved-region subtraction), 2 (collapse decision), 3 (picker
  placement), 4 (readout width cap arithmetic) into a new exported function
  `computeReadoutWidthCap(availableBox, reservedRects, sizes): number`
  returning exactly the width the readout is capped to today — a pure
  extract-method refactor, no arithmetic changes; (2) make
  `computeTopStripLayout` call `computeReadoutWidthCap` internally for that
  same subset of work, per data-model.md's explicit instruction ("the tasks
  stage should implement `computeTopStripLayout`'s steps 1-5 by calling
  `computeReadoutWidthCap` internally, so there is exactly one implementation
  of this arithmetic to keep in sync"); (3) change `TopStripLayout`'s shape
  to the contract: `readout` becomes `{ rect: Rect; capped: boolean;
  maxLines: number } | undefined`, `muteButton` becomes `{ rect: Rect;
  capped: boolean }`, `themePicker` gains a `capped: boolean` alongside its
  existing `rect`/`collapsed` — for this task, hardcode every `capped` to
  `false` and `maxLines` to `1`, preserving today's exact rect values; (4)
  add `readoutHeightAtCapWidth?: number` as `computeTopStripLayout`'s fourth
  parameter, unused for now. Thread the new `.rect` accessor through every
  existing reader in `src/App.svelte` (the `topStripLayout.readout.x`-style
  bindings around lines 466-524) and `tests/lib/layout/topStrip.test.ts`
  (`collectRects`, and every `layout.readout!.x` / `layout.muteButton.x`
  site) so the project compiles and every pre-existing test still passes
  with identical rect values — this task changes shape only, not placement.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared fixtures every user story's tests build on — the pinned
360 px viewport (FR-020's third pinned width, not yet in the test file) and
a height-for-width stand-in table (data-model.md's "Occupant Content Size").

**⚠️ CRITICAL**: No user story's fit/cap tests can be written until this
phase is complete.

- [X] T002 In `tests/lib/layout/topStrip.test.ts`, add the 360 CSS px
  portrait/landscape `InsetBox` pair (`PORTRAIT_360`/`LANDSCAPE_360`)
  alongside the existing 320 (`NARROWEST_PORTRAIT`/`NARROWEST_LANDSCAPE`) and
  412 (`REPORTING_DEVICE_PORTRAIT`; add a matching `REPORTING_DEVICE_LANDSCAPE`)
  pairs, so all three of FR-020's pinned widths exist in both orientations —
  and matching `reservedRects` samples for 360 derived the same way the
  existing 320/412 samples are (via `computeTouchControlLayout`, not
  hand-rolled).
- [X] T003 In `tests/lib/layout/topStrip.test.ts`, add a height-for-width
  stand-in helper (data-model.md's Occupant Content Size entity: "a plain
  stand-in for what the browser's text metrics report, supplied as data — no
  DOM") returning a plausible multi-line height for `READOUT_TYPICAL` and
  `READOUT_TITLE_WIDE` at a given capped width — narrower widths return
  taller values, wide-enough widths return the natural single-line height —
  used as the `readoutHeightAtCapWidth` argument by every story's tests
  below. Do not hard-code the maintainer's measured 44px/62px/80px or
  18px/36px spill figures from spec.md (SC-002 forbids treating those as
  test-expected values); invent independent stand-in numbers with the same
  shape (taller at narrower widths).

**Checkpoint**: Foundation ready — every user story below can now write and
run fit/cap tests against `tests/lib/layout/topStrip.test.ts`.

---

## Phase 3: User Story 1 - The whole readout, inside its own box, on a small phone (Priority: P1) 🎯 MVP

**Goal**: At 320, 360, and 412 CSS px, in both orientations, the readout's
placed box is always at least as tall as its content needs at the width it
was actually given — no more spilling below ~412 px — while 412 px's
today-shipped two-line result and desktop's single-line result are both
unchanged.

**Independent Test**: Call `computeTopStripLayout` with a
height-for-width value standing in for the browser's text metrics, over the
pinned viewport set (320/360/412, both orientations), and assert every
returned readout box is at least as tall as that value requires at the
box's actual width, while every 012 property still holds (spec.md
Acceptance Scenarios 1-7).

### Tests for User Story 1 ⚠️

> Write these first; they fail against T001's hardcoded-`false`/`1`
> `capped`/`maxLines` and today's height-ignoring-width arithmetic until T008
> lands.

- [X] T004 [P] [US1] In `tests/lib/layout/topStrip.test.ts`, add the FR-004/
  SC-001 fit assertion: parameterized over the pinned viewport set (320,
  360, 412, both orientations, with and without each viewport's
  `reservedRects`) and occupant-size samples standing in for one through
  four themes and the long theme name, assert `readout.rect.height` is at
  least `min(readoutHeightAtCapWidth, growthAllowance)` for the width T003's
  helper supplies at that box, and that `readout.rect.width` is unaffected
  by which height value was supplied (FR-004, FR-016a).
- [X] T005 [P] [US1] In `tests/lib/layout/topStrip.test.ts`, add the SC-003
  regression guard: at `REPORTING_DEVICE_PORTRAIT` (412 px) with a
  height-for-width value that fits in two lines, assert the resulting
  `readout.rect` is unchanged from what T001's pre-growth-allowance
  arithmetic already produces there — 412 px is "the width that passes
  today and must keep passing" (spec.md).
- [X] T006 [US1] In `tests/lib/layout/topStrip.test.ts`, add the widest-line
  fit assertion (AC5): using `READOUT_TITLE_WIDE` with T003's helper's
  tallest 320 px value, assert the returned box is at least that tall and
  `rectFullyInside(readout.rect, NARROWEST_PORTRAIT)` holds.
- [X] T007 [US1] In `tests/lib/layout/topStrip.test.ts`, add the desktop
  no-capping regression guard (AC6, FR-017): at `WIDE_DESKTOP` with a
  height-for-width value equal to the natural single-line height (nothing
  capped), assert `readout.capped` is `false`, `readout.rect.height` equals
  the natural single-line height, and the arrangement matches the existing
  desktop ordering assertions already in the file.

### Implementation for User Story 1

- [X] T008 [US1] In `src/lib/layout/topStrip.ts`, implement the
  growth-allowance / cap-severing algorithm per data-model.md's eight-step
  "Top-Strip Placement" section: (1) compute `growthAllowance =
  availableBox.height / 3` before anything else — depends only on
  `availableBox`; (2) inside `computeReadoutWidthCap` (T001's extraction),
  form the band for reserved-region subtraction using
  `max(muteButton.height, pickerSize.height, growthAllowance)` in place of
  today's `max(...all occupant heights)` — this is the FR-016a fix, and it
  makes `computeReadoutWidthCap`'s result independent of the readout's
  height entirely; (3) in `computeTopStripLayout`, resolve `contentHeight =
  readoutHeightAtCapWidth ?? sizes.readout.height` (the natural single-line
  height as the fallback for "measurement not available yet",
  data-model.md's Edge Cases) and set `readout.rect.height =
  min(contentHeight, growthAllowance)`; (4) set `readout.maxLines =
  Math.max(1, Math.floor(growthAllowance / sizes.readout.height))`; (5)
  compute each occupant's `capped` flag per data-model.md's Capped Occupant
  formula (`returned.width < natural.width` or `returned.height <
  contentHeightNeeded`), evaluated after `containRect`'s clamp so the
  degenerate near-zero-`availableBox` edge case is covered by the same flag
  (data-model.md's step 8 note). This must make T004-T007 pass without
  changing any pre-existing 012 assertion (FR-014).
- [X] T009 [US1] In `src/App.svelte`, force `white-space: nowrap` on the
  readout's natural-size probe only (`readoutProbeEl` / its
  `.top-strip-probe` styling) so `topStripSizes.readout` reports a true
  single-line natural size regardless of viewport width, never one the
  viewport already wrapped (FR-005, research.md's `nowrap`-probe decision).
  Do not add `nowrap` to the visible `.readout` rule or any other probe.
- [X] T010 [US1] In `src/App.svelte`, add a second hidden "capped-width"
  readout probe styled like `.readout` but with an explicit inline `width`
  bound to a new `readoutWidthCap = $derived.by(() =>
  computeReadoutWidthCap(insetBox, touchLayout?.reservedRects ?? [],
  topStripSizes))` and no `nowrap`, so its `getBoundingClientRect().height`
  reports the readout's real wrapped height at exactly that width; derive
  `readoutHeightAtCapWidth` from it, re-read on the same
  `topStripProbeTick`/`hudText`/theme-label triggers `topStripSizes` already
  uses (data-model.md's Shell Wiring table); pass it as
  `computeTopStripLayout`'s fourth argument in the existing `topStripLayout`
  `$derived.by`. This is the shell's fixed two-DOM-pass measurement
  (FR-016b) — no third pass, no per-frame recomputation.
- [X] T011 [US1] In `src/App.svelte`, add `overflow: hidden; display:
  -webkit-box; -webkit-box-orient: vertical;` and a `-webkit-line-clamp:
  {topStripLayout.readout.maxLines}` inline style to the visible `.readout`
  element (FR-002's structural clip: the box is physically incapable of
  painting outside itself regardless of whether T008's sizing was correct),
  and set an `aria-label` on it to the full `hudText` whenever
  `topStripLayout.readout?.capped` is `true` (FR-018 — assistive technology
  always gets the complete text even when a sighted player sees an
  ellipsis).

**Checkpoint**: User Story 1 is fully functional — the readout's box is
sized for the content it will hold at every pinned width, structurally
clipped as a backstop, and 412 px/desktop are unchanged. The reported defect
(white text spilling onto the cave below ~412 px) is fixed.

---

## Phase 4: User Story 2 - A taller readout does not disturb the rest of the strip (Priority: P2)

**Goal**: However tall the readout grows, the mute control's and theme
picker's boxes never move, the arrangement settles in one pass with no
feedback loop, and every 012 property still holds with a grown readout in
play.

**Independent Test**: Run `computeTopStripLayout` over the pinned viewport
set with readout content ranging from one line to the tallest the cap
permits, and assert the mute and picker boxes are identical to the one-line
case, that all 012 properties still hold, and that re-running the rule on
its own output — including with a deliberately wrong achieved height —
returns the same arrangement (spec.md User Story 2, Acceptance Scenarios
1-7).

### Tests for User Story 2

- [X] T012 [P] [US2] In `tests/lib/layout/topStrip.test.ts`, add the FR-013/
  FR-022/SC-005 identity assertion: call `computeTopStripLayout` twice at
  the same viewport and occupant sizes, differing only in
  `readoutHeightAtCapWidth` (one a one-line value, one T003's tallest
  multi-line value, one a **deliberately wrong** value larger than
  `growthAllowance` standing in for a stale/buggy measurement), and assert
  `muteButton.rect` and `themePicker.rect` are deep-equal across all three
  calls, at every pinned viewport.
- [X] T013 [P] [US2] In `tests/lib/layout/topStrip.test.ts`, add the
  FR-016/FR-016a/SC-006 settling assertions: (a) `computeReadoutWidthCap`'s
  return value is identical regardless of what `readoutHeightAtCapWidth` a
  subsequent `computeTopStripLayout` call receives (true by signature —
  assert it directly as a regression guard, since `computeReadoutWidthCap`
  never takes that parameter); (b) two `computeTopStripLayout` calls with
  identical arguments (including the same `readoutHeightAtCapWidth`) are
  deep-equal (statelessness); (c) an arrangement computed with a
  deliberately wrong achieved band height (a wrong
  `readoutHeightAtCapWidth`) is deep-equal to one computed with the correct
  value in every field **except** `readout.rect.height`/`capped`/
  `maxLines` — pinning that the wrong value never reaches steps 1-5.
- [X] T014 [US2] In `tests/lib/layout/topStrip.test.ts`, add the 012 FR-012a
  restatement (AC6): across `readoutHeightAtCapWidth` values from one line
  to the tallest permitted, at a viewport where the natural-size sum forces
  a borderline collapse decision, assert `themePicker.collapsed` does not
  change — the collapse decision is made from natural sizes only, and a
  wrapped readout must not flip it either direction.
- [X] T015 [US2] In `tests/lib/layout/topStrip.test.ts`, add a grown-readout
  012-properties sweep: at every pinned viewport, both orientations, with
  each viewport's `reservedRects` active, and a `readoutHeightAtCapWidth`
  at the tallest the growth allowance permits, assert no two occupant boxes
  intersect, every box lies inside `availableBox`, and no occupant box
  intersects a reserved rect (spec.md User Story 2 Acceptance Scenarios 2-4,
  restating 012's FR-007/FR-008/FR-009 with a grown box in play, FR-014).

**Checkpoint**: User Stories 1 AND 2 both hold — growth is additive, never a
trade against the rest of the strip, and idempotence is provable from the
rule's inputs rather than observed by watching a loop converge.

---

## Phase 5: User Story 3 - Any occupant that has to shrink still fits its content (Priority: P3)

**Goal**: The grow-then-elide policy applies uniformly to any occupant the
rule places smaller than its natural size — not a readout-only rule — so an
over-long theme display name is covered with no code change.

**Independent Test**: Run the rule at 320 px with a collapsed theme-picker
size larger than the space available, and assert its returned box still lies
inside the available box and is flagged `capped`, exactly like the readout's
own flag (spec.md User Story 3, Acceptance Scenarios 1-4).

### Tests for User Story 3

- [X] T016 [P] [US3] In `tests/lib/layout/topStrip.test.ts`, add the SC-009
  generic-capped assertion: at `NARROWEST_PORTRAIT` with
  `THEME_PICKER_SAMPLES.longThemeName`'s collapsed `Size` widened further
  than the space the other occupants leave for it, assert the returned
  `themePicker.rect` is fully inside `availableBox` and `themePicker.capped`
  is `true` — the same `capped` field the readout uses, not a second
  mechanism (data-model.md's "Capped Occupant" is not a hard-coded list).
- [X] T017 [US3] In `tests/lib/layout/topStrip.test.ts`, extend the existing
  theme-count-scaling describe block (`THEME_PICKER_SAMPLES`, including
  `longThemeName`) with a `capped` assertion at `NARROWEST_PORTRAIT`,
  confirming the mechanism generalizes across theme counts with no
  per-count branch and that a theme's display name alone can trigger it
  (User Story 3 AC4 — no `src/lib/layout/topStrip.ts` change is needed to
  support a longer name than any sampled here, only a wider sample).

### Implementation for User Story 3

- [X] T018 [US3] In `src/App.svelte`, add `overflow: hidden; text-overflow:
  ellipsis; white-space: nowrap;` to the `.theme-collapsed` rule (single-line
  elision, distinct from the readout's multi-line clamp per research.md —
  the collapsed control is always exactly one line) and set an `aria-label`
  on it to the theme's full `displayName` whenever
  `topStripLayout.themePicker?.capped` is `true` (FR-018, User Story 3 AC3:
  operable and labelled even when visually truncated).

**Checkpoint**: All user stories through P3 hold — the containment policy is
a property of "an occupant whose placed box is smaller than its natural
size," not a readout-specific rule, so it already covers a future theme with
no further change.

---

## Phase 6: User Story 4 - A guarantee the suite can hold up (Priority: P4)

**Goal**: The fit properties are pinned by node-only tests strict enough that
pinning the readout's height to its unwrapped natural height — today's
shipped bug — fails the suite at 360 px and 320 px, and the maintainer has a
re-runnable by-hand item recorded for the next contributor to re-check.

**Independent Test**: The fit properties are asserted in the existing
node-only environment against the pure rule; a deliberate regression that
pins the readout's placed height to its unwrapped natural height regardless
of the width it is given fails those assertions (spec.md User Story 4,
Acceptance Scenario 1).

### Tests for User Story 4

- [X] T019 [US4] In `tests/lib/layout/topStrip.test.ts`, add the FR-021/
  SC-007 deliberate-regression test: a small test-local wrapper around
  `computeTopStripLayout`'s result that overwrites `readout.rect.height`
  with `sizes.readout.height` (the natural, unwrapped height) regardless of
  `readoutHeightAtCapWidth` — exactly today's shipped bug — and assert this
  overwritten result **fails** T004's FR-004 fit assertion at 360 px and
  320 px (both orientations), on the existing node-only runner with no
  browser.

### Documentation for User Story 4

- [X] T020 [P] [US4] In `docs/manual-verification.md`, add a new item to the
  existing `## Standing checks` section (alongside the "Top-strip controls
  never overlap (012, `#35`)" entry), instructing the maintainer to confirm
  on the narrowest real device to hand, in both orientations, that no
  top-strip occupant's text renders outside its own dark background —
  re-run against any change that touches `src/App.svelte`'s top-strip
  markup/CSS or `src/lib/layout/topStrip.ts`, not just once at this spec's
  review (FR-023, SC-010). Do not edit
  `specs/012-top-strip-layout/spec.md`'s Maintainer Review Notes — it must
  stay byte-for-byte unchanged (FR-023, SC-010).

**Checkpoint**: All four user stories hold. The property is enforced by the
suite, not by a stylesheet comment, and the matching by-hand check is
recorded for future specs to re-run.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Confirm the feature ships clean, per FR-019 and the plan's
Constitution Check.

- [ ] T021 [P] Run `npm test` (builds `dist/`, then the full `vitest` suite)
  and confirm every test from features 001-012 still passes unchanged
  alongside the new/extended `tests/lib/layout/topStrip.test.ts` cases, and
  that `dist/` still holds exactly one self-contained `index.html` (FR-019,
  SC-008).
- [ ] T022 [P] Review the full diff against `main` and confirm it touches no
  file under `src/sim/`, no cave data file, and no theme data file — no
  theme id appears in `src/lib/layout/topStrip.ts` or its `App.svelte`
  wiring, and no viewport width is hard-coded outside the test file — only
  `src/lib/layout/topStrip.ts`, `src/App.svelte`,
  `tests/lib/layout/topStrip.test.ts`, and `docs/manual-verification.md`
  changed (FR-019; spec.md Maintainer Review Notes items 8-9).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on T001 (reads the renamed `.rect`
  shape) — BLOCKS every user story's fit/cap tests.
- **User Story 1 (Phase 3)**: Depends on Foundational. Delivers the whole
  growth-allowance / cap-severing / elision implementation
  (`computeReadoutWidthCap`'s real arithmetic, `computeTopStripLayout`'s
  fourth parameter, and the `App.svelte` two-pass wiring) — every later
  story's tests call the same functions T008-T011 implement.
- **User Story 2 (Phase 4)**: Depends on User Story 1's T008 (the severed
  cycle it asserts) — no new implementation task, only new test coverage.
- **User Story 3 (Phase 5)**: Depends on User Story 1's T008 for the
  `capped` mechanism; T018 is a small, independent CSS/aria change to a
  different element (`.theme-collapsed`) than T011 touched (`.readout`).
- **User Story 4 (Phase 6)**: Depends on User Story 1's T008/T004 for its
  test (T019); T020 (docs) has no code dependency and can happen any time
  after Setup.
- **Polish (Phase 7)**: Depends on all four user stories being complete.

### Within User Story 1

- Tests (T004-T007) before implementation (T008-T011) — write them first,
  watch them fail against T001's hardcoded shape.
- T008 (the pure algorithm) before T009-T011 (the shell wiring and CSS that
  depend on `computeReadoutWidthCap`'s real value and `maxLines`).
- T009 (nowrap natural probe) before T010 (the capped-width probe, which
  reads `topStripSizes.readout` — T009's corrected measurement).
- T010 before T011 (`maxLines`/`capped` come from the `topStripLayout` call
  T010 wires up).

### Parallel Opportunities

- T004-T007 all extend the same test file — sequence within the phase, not
  in parallel, to avoid clobbering each other's edits.
- Likewise T012-T015, T016-T017, and T019 all extend the same test file —
  sequence within each phase.
- T020 (docs) can run in parallel with any test-file task — different file.
- T018 (`.theme-collapsed` CSS) can run in parallel with T011 (`.readout`
  CSS) once both depend only on T008 — different rules, same file, so
  sequence the actual edits but there is no data dependency between them.
- T021 and T022 (Polish) are independent verification passes and can run in
  parallel once every prior task is done.

---

## Parallel Example: User Story 2

```bash
# T012 and T013 both assert properties of the same two functions but are
# independent checks — write them in sequence in the same file, but they
# have no data dependency on each other:
Task: "Add FR-013/FR-022 mute/picker identity assertion in tests/lib/layout/topStrip.test.ts"
Task: "Add FR-016/FR-016a settling assertions in tests/lib/layout/topStrip.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001).
2. Complete Phase 2: Foundational (T002-T003) — blocks every story's tests.
3. Complete Phase 3: User Story 1 (T004-T011).
4. **STOP and VALIDATE**: `npm test` passes; manually open `dist/index.html`
   at 360 px and 320 px and confirm the reported spill is gone (spec.md
   SC-002). This alone fixes issue #43's reported defect.

### Incremental Delivery

1. Setup + Foundational → fixtures ready.
2. User Story 1 → the fix, pinned by tests → this is the MVP.
3. User Story 2 → severed-cycle and non-disturbance coverage added to the
   same test file, no new production code.
4. User Story 3 → the generic `capped` policy extended to the theme picker's
   collapsed control, with one small CSS/aria addition.
5. User Story 4 → the regression-proof test plus the Standing checks doc
   entry — the guarantee becomes something the next contributor's diff must
   survive, not something a reviewer has to remember to check.
6. Polish → full-suite and diff-scope confirmation.

### Why User Stories 2-4 add almost no new implementation task

`computeTopStripLayout` and `computeReadoutWidthCap` (T008) are written once,
as pure functions of `(availableBox, reservedRects, sizes,
readoutHeightAtCapWidth?)` with no theme-id or viewport-width branch
(FR-008). Severed-cycle idempotence, non-disturbance of the mute/picker
boxes, and the generic `capped` flag are properties of that one
implementation, not separate code paths — User Stories 2 and 4 are entirely
test-coverage phases over what User Story 1 already built. User Story 3 adds
one small rendering task (T018) because the readout and the theme picker's
collapsed control use different CSS elision techniques (multi-line clamp vs.
single-line ellipsis, research.md), but both read the same `capped` field.

---

## Suggested MVP Scope

User Story 1 (T001-T011, 11 tasks) is the reported defect and the whole
feature's load-bearing property: it makes every returned box sized for the
content it will actually hold, at every pinned width, with 412 px and
desktop unchanged. Stories 2-4 harden that same implementation with test
coverage and one small elision extension — genuinely valuable, but the
defect in issue #43 is closed once User Story 1 ships.
