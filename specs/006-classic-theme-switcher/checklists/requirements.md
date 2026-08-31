# Specification Quality Checklist: Classic Theme And An In-Game Theme Switcher

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-08-31
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [ ] No [NEEDS CLARIFICATION] markers remain — **two remain by design** (FR-020, FR-030); see Notes
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

- **Two [NEEDS CLARIFICATION] markers are open**, posted as questions on issue #6
  rather than blocking. Both carry a provisional pick, so the spec is
  implementable as written if neither is answered:
  1. **FR-030 — are cave names themed or theme-neutral?** Raised explicitly by
     the maintainer's comment on the issue, which asked for the decision to be
     made at spec time rather than discovered mid-implementation. Provisional
     pick: **theme-neutral, shared by both themes** — the cheaper option, and
     the one that keeps theme data from being coupled to the cave count, which
     would become a new constraint on every later feature that adds a cave. The
     alternative (each theme supplies a per-cave name list, so Classic can use
     "Cave A", "Cave B") is more faithful and makes the contract genuinely
     complete. Reversing this later means moving one string per cave between two
     files, so it is cheap to change but worth deciding once.
  2. **FR-020 — how is the in-play theme control operated?** The issue requires
     a control that *enumerates* the registry and a switch that drops no input,
     and the constitution requires it to be fully reachable by keyboard alone.
     Those three pull against each other during play: a focusable enumerated
     list competes for the same keys the game uses. Provisional pick: an
     always-visible enumerated list, driven during play by a dedicated key that
     no gameplay action uses, never taking focus while a cave is running.
- **Everything else was decided rather than asked**, per the constitution's
  instruction that a spec picks a behavior, states it, and tests it. The picks
  with the widest reach are recorded in Assumptions: Classic ships within the
  existing appearance vocabulary rather than requiring new rendering primitives
  (FR-014 leaves the door open if that turns out false); the contract gains one
  certain new field, a display name for the control (FR-003); theme choice is
  last-write-wins inside the existing saved record, which is the one place
  feature 005's grow-only merge must **not** be copied (FR-027); and no theme
  uses the commercial original's trademarked title (FR-011).
- **Paths and terms that look like implementation detail are the project's own
  constitutional vocabulary.** `src/sim/`, "theme data", "tick", "seeded
  generator", and "registry" all appear in `.specify/memory/constitution.md` and
  in specs 001–005, and the acceptance test the issue asks for is literally
  stated as a path constraint ("zero files under `src/sim/`"). Restating it
  abstractly would make FR-012 and SC-002 unverifiable, which is the opposite of
  the intent.
- **This feature adds no simulation rule** (FR-031), so it ships no new ASCII
  cave physics test. The constitution's "every physics rule ships a test" applies
  to rules added or changed; here the corresponding obligation is the inverse —
  a test that proves the simulation is *unaffected* by a switch (SC-003), plus
  the completeness check (FR-029).
- **Visual judgment is the maintainer's**, per Principle VII. The spec ends with
  a Maintainer Review Notes section naming exactly what to eyeball, since a
  browserless suite cannot answer whether Classic "looks right" or whether a
  boulder stutters across a switch.
