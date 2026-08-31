# Specification Quality Checklist: Touch Controls And Gamepad Support

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-08-31
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain — all three were answered on issue #7; see Notes
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

- **All three clarifications are resolved.** They were posted on issue #7 and
  [answered there](https://github.com/charlesguse/whatever/issues/7#issuecomment-5480274021)
  with **B, A, B**. No [NEEDS CLARIFICATION] marker remains, and each answer is
  folded into the requirements, scenarios, success criteria, and Maintainer
  Review Notes rather than only recorded here:
  1. **FR-027 — hybrid devices → adaptive.** New **FR-027a**: on a touch-capable
     platform the controls are **visible initially**, hide on a **keydown or a
     click only** (never on pointer movement, which fires spuriously), re-show on
     **any touch**, and both transitions are **instant**. **FR-030** was reworded
     accordingly — the visibility decision is a pure function of reported
     capabilities *and the last input source*, still browser-free to test as a
     two-argument table. FR-008, FR-029, US3 scenarios 6–7, SC-007, SC-011b, a
     new **Last input source** entity, and a hybrid section in the Maintainer
     Review Notes follow from it.
  2. **FR-025 — controller disconnect → keep running.** The cave keeps running
     with the vanished pad's inputs released and never auto-pauses, preserving
     the invariant that a hardware event cannot mutate session state. US4
     scenarios 2–3, SC-009, and the review note were tightened to say "must not
     pause" outright. The time-based "paused only if recently used" variant is
     recorded as rejected: a wall-clock branch in the input path is not testable
     as a pure function.
  3. **FR-031 — touch layout → reserved area.** Controls occupy a reserved area
     the drawn cave never enters, defined **per orientation** from the start.
     New **FR-031a** pins that the reserved area and the cave are both laid out
     from the **safe-area-inset box**, not the raw viewport, so the cave-sizing
     calculation consumes the same insets the controls do. FR-013, FR-015,
     FR-032, US1 scenario 11, SC-011a, the **Touch control layout** entity, and
     two edge cases follow.
- **Everything else was decided rather than asked**, per the constitution's
  instruction that a spec picks a behavior, states it, and tests it. The picks
  with the widest reach are recorded in Assumptions: direction precedence is
  keyboard > touch > gamepad while grab and one-shots OR across sources
  (FR-005/FR-006); a four-zone d-pad rather than an analog on-screen stick,
  because the sim takes one of four directions per tick; deadzone hysteresis is
  the requirement and 0.5/0.35 are starting values the maintainer may retune;
  and gamepad bindings are a data table with named defaults rather than fixed
  button choices.
- **The named action set does not grow.** Feature 006 made the theme cycle a
  named input action (006 FR-033) specifically so this feature would bind it.
  Touch and gamepad are new *sources* of the existing six actions — move, grab,
  pause, restart, start/confirm, cycle theme — which is what keeps FR-034's
  "keyboard path unchanged" checkable at review.
- **Paths and terms that look like implementation detail are the project's own
  constitutional vocabulary.** `src/sim/`, "tick", "named action", and the
  Gamepad API all appear in `.specify/memory/constitution.md`, in specs 001–006,
  or in the issue text itself; the issue states the acceptance test partly as a
  path constraint. Restating them abstractly would make FR-033 and SC-008
  unverifiable.
- **This feature adds no simulation rule**, so it ships no new ASCII cave
  physics test. The constitution's "every physics rule ships a test" applies to
  rules added or changed; the inverse obligation applies here — tests proving
  the simulation is unaffected by *which source* produced an action (SC-003,
  SC-009), plus pure-function coverage of mapping, deadzone, tie-breaking,
  edge-triggering, merging, and visibility (SC-014).
- **Device judgment is the maintainer's**, per Principle VII. CI has no browser,
  no touchscreen, and no controller, so the spec ends with a Maintainer Review
  Notes section naming exactly what to check on a real tablet, on a desktop with
  a controller, and on a plain desktop with neither.
