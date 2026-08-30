# Specification Quality Checklist: Rock Physics — Falling, Rolling, Pushing, Crushing, and the Exit

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
  GitHub issue #2 for the maintainer rather than blocking this spec:
  1. **FR-015** — does a push land in one tick, or require sustained pressure
     (a fixed multi-tick cost, or the original game's per-tick random chance)?
  2. **FR-030** — does this feature ship a restart key, or is reloading the page
     the only way to start over, given that lives and retry are deferred?
  3. **Out of Scope → Deliberately at the edge of scope** — does a visible
     collected/quota readout ship here, or wait for the arcade-shell HUD?
- Each marker states the spec's interim decision, so the spec is implementable
  as written if no answer arrives. Every one of the three is covered by a
  concrete, testable behavior today; answering a question changes which behavior
  is pinned, not whether one is.
- The two rule details the originating request asked to have *picked* rather
  than asked about — the left/right roll preference and the push's tick cost —
  are decided in FR-009 and FR-015 respectively, per the constitution's rule
  that an ambiguous detail is chosen, stated, and tested rather than left open.
