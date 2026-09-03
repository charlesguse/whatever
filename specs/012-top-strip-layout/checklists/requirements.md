# Specification Quality Checklist: Top-Strip Controls Never Overlap

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-09-03
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [ ] No [NEEDS CLARIFICATION] markers remain
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

- Two `[NEEDS CLARIFICATION]` markers remain, both posted to the lifecycle issue
  for the requester rather than guessed:
  - **FR-012** — which degradation the maintainer wants when the three
    occupants cannot fit at their natural sizes at phone width. The three
    candidates (shorter theme labels, a single cycling control, a wrapped second
    row) produce visibly different phones and different amounts of work, and no
    one of them is the obvious default. Everything the choice must preserve is
    already stated as requirements (FR-013's priority, FR-011's hit targets,
    Principle V's touch parity), so the answer sets the form, not the
    guarantees.
  - **FR-023** — what counts as the narrowest supported viewport, which decides
    whether degradation ever triggers on real devices and what the pinned test
    actually pins. The reporter's device is ~412 CSS px wide; the classic floor
    is 320.
- Neither marker blocks planning of the structural half of the feature: the
  placement rule, its purity, its inputs, and the properties it must satisfy
  (FR-001 through FR-011, FR-014 through FR-022) are fully stated and testable
  without them.
- Three terms name surfaces that already exist in this repository — the
  safe-area-inset box, the touch controls' reserved regions, and 007's
  Maintainer Review Notes. They are named because the requirement is that this
  feature reuse them rather than grow a parallel one, which is a scope
  constraint rather than an implementation choice.
- Everything else the issue left open is resolved in **Assumptions** with a
  stated default, most notably that the strip's occupants stay overlays rather
  than reserving vertical space and shrinking the cave.
