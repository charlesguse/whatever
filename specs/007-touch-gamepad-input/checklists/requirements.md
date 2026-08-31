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

- [ ] No [NEEDS CLARIFICATION] markers remain — three remain, each with a stated provisional pick; see Notes
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

- **Three [NEEDS CLARIFICATION] markers remain**, the maximum this process
  allows, and they are posted as questions on issue #7. Each names a
  provisional pick, so the spec is buildable as written if none is answered;
  each alternative is defensible and changes real work, which is why they are
  asked rather than decided:
  1. **FR-027 — hybrid devices.** A touchscreen laptop reports touch capability
     *and* has a keyboard. Always show the on-screen controls whenever touch is
     reported (provisional pick: purely capability-driven, one visibility state,
     at the cost of buttons a laptop player does not want), or show them on the
     first touch and hide them on the next key or mouse input (better on
     hybrids, but a second visibility state to specify and test). Scope impact,
     so it ranks first.
  2. **FR-025 — controller disconnect mid-cave.** Keep running with held inputs
     released (provisional pick: the keyboard is always available to take over,
     per Principle V) or auto-pause so a dead battery does not cost the run.
     User-experience impact on the failure path the issue calls out by name.
  3. **FR-031 — touch layout.** Translucent overlays on the playfield
     (provisional pick: largest cave view, at the cost of a thumb occluding a
     corner) or a reserved band that shrinks the drawn cave so nothing is ever
     covered. Affects the rendering and camera work the layout implies.
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
