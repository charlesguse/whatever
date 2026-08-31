# Specification Quality Checklist: Arcade Shell — Eight Caves, Timer, Score, Lives, and Game Over

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-08-31
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain — all three resolved (see Notes)
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

- All three [NEEDS CLARIFICATION] markers were answered on issue #5 and are now
  folded into the spec. Each confirmed the spec's provisional pick, and two of
  them turned out to be one decision seen twice:
  1. **FR-027 — does a voluntary restart cost a life? Yes.** Restart and death
     converge on a single **attempt-over** transition: one place an attempt ends,
     one place lives decrement, one place the cave resets. The answer pinned two
     things option A had left open, now written as FR-027a and FR-027b — restart
     MUST be available during the **dying** phase (that is the moment a player
     most wants it, and feature 003 gave death an animation window), and every
     reload MUST rebuild from the cave's definition and seed rather than from a
     snapshot. FR-027a additionally settles the two states where an attempt is
     not live: restart during the life-lost screen and during the cave intro
     costs nothing, preserving FR-023's one-life-per-attempt invariant.
  2. **FR-017 — does a lost life roll back points? No; FR-017a.** Points stay and
     the score never decreases. The farming worry is bounded by the answer to
     FR-027: every farmed run costs a life, which is a priced decision rather
     than an exploit. **The two rules are coupled, and Assumptions now says so
     explicitly** — softening FR-027 into a free restart without pairing it with
     a bound would turn the score into an unbounded fountain.
  3. **FR-002 — is "furthest cave reached" a badge or a shortcut? A badge.**
     Every game starts at cave one, so every score covers the same eight caves
     and one number means one thing; a cave select would need an exclusion rule
     or a second scoreboard, and would want the touch/gamepad input story settled
     first. Recorded as a deferral, not a rejection: FR-038 now requires the value
     to be persisted as a plain cave number so a later cave select reads it with
     no migration.
- Every other ambiguity in the request was resolved by picking a behavior and
  recording it in Assumptions with the reasoning, per the constitution's
  instruction that a spec picks, states, and tests rather than leaving a rule to
  chance. The picks with the widest blast radius are the scoring values (10 / 15
  / 1 point per second), the clock living in the simulation rather than the
  shell, and a retry being the same cave from the same seed.
- The one simulation change here is the cave clock (FR-009–FR-015); everything
  else is shell. Caves that declare no time limit behave exactly as they do
  today, which is why no feature-001 through -004 test needs to move.
- Quota attainability (FR-035) is specified as a deliberately conservative
  necessary condition rather than a solvability proof, with a recorded winning
  input sequence for cave one (FR-036) and maintainer play covering the rest.
  This is called out because the issue's wording — "its quota is actually
  attainable from the layout" — could be read as asking for a solver, which no
  browserless test can honestly provide for eight caves.
- The vocabulary that looks technical — read-only accessor, theme data, seeded
  generator, ASCII cave test, tick — is the project's own constitutional
  vocabulary, not implementation leakage; specs 001–004 use the same terms.
