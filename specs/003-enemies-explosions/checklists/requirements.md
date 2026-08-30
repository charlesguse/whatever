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

- Three [NEEDS CLARIFICATION] markers remain, and each is posted as a question
  on the originating issue rather than guessed silently. Each one has a stated
  default in the spec, so planning is not blocked while they are open:
  1. **FR-013 — does a crushing death now explode?** The request says "the
     player explodes into empty space", but feature 002's FR-010 has a falling
     body simply take the kid's cell. The spec's default is that every death
     blooms, including a crush, and FR-038 names 002's FR-010 as amended.
  2. **FR-017 — do blasts spare the classroom door?** The request says
     "everything except steel wall"; feature 002's FR-023 already makes the
     closed door indestructible, and a destructible exit can strand a player.
     The spec's default is that the door survives.
  3. **FR-023 — do chains resolve inside one tick or one link per tick?** The
     spec's default is atomic within the tick, which is simpler to pin with a
     test; a per-tick cascade would read better on screen.
- Every rule the request asked to have *picked* rather than asked about is
  decided, stated, and tested, per the constitution: the turning preferences
  (FR-005, firefly left / butterfly right), the enemy rate (FR-002, one step per
  two ticks), the explosion lifetime (FR-019, two ticks), and the initial facing
  (FR-007, left).
- Two earlier requirements are deliberately amended and both are named in one
  place, FR-038: feature 002's FR-010 (crushing death) and FR-027 (the
  quota-versus-gold-stars parse check, which must relax or the request's own
  "how you actually make quota" premise is unbuildable). No other earlier rule
  moves.
- The maintainer's comment on the issue resolved the feature-001 naming
  conflict; it is folded in as User Story 4 and FR-029/FR-030 and is treated as
  appearance-only, including the explicit instruction that needing a simulation
  change to rename two elements is a defect to report rather than work around.
- Two judgements are left to review rather than to the spec: the enemy rate and
  the explosion lifetime as *feel* dials. Both mechanisms are fixed; only the
  numbers are open, and they are called out under "Verified by the maintainer at
  review time".
