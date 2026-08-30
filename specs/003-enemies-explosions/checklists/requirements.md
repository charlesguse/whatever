# Specification Quality Checklist: Fireflies, Butterflies, and Explosions

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-08-30
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
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

- All three [NEEDS CLARIFICATION] markers are resolved by the maintainer's reply
  on the originating issue, and each answer is folded into the requirement it
  came from rather than left as a note:
  1. **FR-013 — does a crushing death now explode?** Yes. Every death blooms,
     including a crush, matching the original game; FR-038 names 002's FR-010 as
     amended and requires its crush test updated to the new expected grid.
  2. **FR-017 — do blasts spare the classroom door?** Yes, open or closed. A
     destructible exit means a chain the player did not fully control can make a
     cave unwinnable, which is a failure they cannot tell from a bug.
  3. **FR-023 — do chains resolve inside one tick or one link per tick?** One
     link per tick, so the cascade is watchable. The blast is already an element
     with a lifetime, so the "still resolving" machinery exists either way.
- The reply also raised an interaction none of the options named, and it is
  answered in the spec rather than deferred: a propagating chain plus feature
  002's FR-029 (freeze on death) would freeze the kid's own bloom half-resolved.
  FR-015 now defines a **dying state** — input and the win condition stop, the
  simulation keeps advancing until no explosion cell remains, then the cave goes
  dead and freezes as before. FR-036 pins it with three cases: a death mid-chain
  whose cascade still completes, restart during the dying state, and the freeze
  on the first tick with no explosion left.
- One detail the reply did not name is decided in Assumptions rather than left
  ambiguous: enemies keep patrolling during the dying state, since the kid is
  already off the grid and nothing observable turns on it.
- Every rule the request asked to have *picked* rather than asked about is
  decided, stated, and tested, per the constitution: the turning preferences
  (FR-005, firefly left / butterfly right), the enemy rate (FR-002, one step per
  two ticks), the explosion lifetime (FR-019, two ticks), and the initial facing
  (FR-007, left).
- Three earlier requirements are deliberately amended and all are named in one
  place, FR-038: feature 002's FR-010 (crushing death), FR-027 (the
  quota-versus-gold-stars parse check, which must relax or the request's own
  "how you actually make quota" premise is unbuildable), and FR-029 (the freeze
  on death, which FR-015 now delays until the last blast burns out). No other
  earlier rule moves.
- The maintainer's comment on the issue resolved the feature-001 naming
  conflict; it is folded in as User Story 4 and FR-029/FR-030 and is treated as
  appearance-only, including the explicit instruction that needing a simulation
  change to rename two elements is a defect to report rather than work around.
- Two judgements are left to review rather than to the spec: the enemy rate and
  the explosion lifetime as *feel* dials — the latter now also setting how fast
  a cascade travels. Both mechanisms are fixed; only the numbers are open, and
  they are called out under "Verified by the maintainer at review time".
