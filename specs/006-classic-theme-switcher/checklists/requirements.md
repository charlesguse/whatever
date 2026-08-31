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

- [x] No [NEEDS CLARIFICATION] markers remain — both were answered on issue #6; see Notes
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

- **Both [NEEDS CLARIFICATION] markers are resolved.** They were posted as
  questions on issue #6 and answered there; each answer confirmed the spec's
  provisional pick, and the reasoning and the extra requirements that came with
  them are now folded into the spec rather than left in this note:
  1. **FR-030 — are cave names themed or theme-neutral?** Answered:
     **theme-neutral, shared by both themes.** The deciding argument is
     coupling, not faithfulness — per-theme cave names would tie theme data to
     the cave count, taxing every later feature that adds a cave and forcing
     FR-029's completeness check to grow a per-cave dimension. Recorded in
     Assumptions alongside the pre-designed migration path (an optional per-cave
     override map on the theme, falling back to the cave's own name) so the
     question is not re-litigated from scratch; that map is explicitly out of
     scope here.
  2. **FR-020 — how is the in-play theme control operated?** Answered: an
     **always-visible enumerated list, driven during play by a dedicated cycle
     input** that no gameplay action uses, never taking focus while a cave is
     running. The rejected alternative — a focusable list that suppresses
     gameplay keys while focused — contradicts FR-020 itself, since leaving the
     kid standing still while the clock runs is swallowed gameplay input whether
     or not a tick is dropped; that rejection is now stated in FR-020 and in Out
     of Scope. The answer added three requirements, all new: FR-033 (the cycle
     is a named input action, so the touch-and-gamepad feature binds it rather
     than reopening this code), FR-034 (the visible list is pointer-operable as
     well as keyboard-operable), and FR-035 (the cycle input is inert on the
     title screen's "any key starts the game" path). SC-011 and SC-012 make the
     disjoint-key and title-screen guarantees measurable.
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
