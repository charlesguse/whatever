# Specification Quality Checklist: Amoeba, Magic Wall, and Expanding Wall

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-08-30
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

- Three [NEEDS CLARIFICATION] markers remain, deliberately, and are posted to
  issue #4 for the maintainer rather than guessed at:
  1. **FR-005** — how the per-cave amoeba growth rate is expressed: a per-cell
     per-tick probability (accelerating blob) or a fixed number of cells per N
     ticks (linear blob). This changes how the amoeba *feels* more than any
     other decision in the feature.
  2. **FR-018** — what happens to a body converted by an active magic wall when
     the cell below the wall is blocked: destroyed, left resting unconverted, or
     left resting with the wall still spent.
  3. **FR-032** — the Classroom name for the magic wall. The request calls it a
     pencil sharpener, but feature 003 settled "Pencil Sharpener" as the
     firefly's name, so the two cannot both have it.
- Every other ambiguity in the request was resolved by picking a behavior and
  recording it in Assumptions, per the constitution's instruction that a spec
  picks, states, and tests rather than leaving a rule to chance. Each pick has a
  test named in FR-039, so if the maintainer disagrees the disagreement lands on
  a specific, pinned rule.
- The vocabulary in the spec that looks technical — read-only accessor, theme
  field, seeded generator, ASCII cave test, scan order — is the project's own
  constitutional vocabulary, not implementation leakage; specs 001–003 use the
  same terms.
