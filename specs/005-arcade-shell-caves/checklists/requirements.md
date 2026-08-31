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

- [ ] No [NEEDS CLARIFICATION] markers remain — three are open (see Notes)
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

- Three [NEEDS CLARIFICATION] markers are open, each on a decision with two
  defensible answers and materially different consequences. Each carries the
  spec's provisional pick so the spec reads complete and is implementable as
  written if the maintainer says nothing:
  1. **FR-002 — is "furthest cave reached" a badge or a shortcut?** Provisional
     pick: a badge only, with every game starting at cave one. Unlocking cave
     select would change what a high score means, since a run begun at cave
     seven skips six caves' worth of scoring, and would need the persisted
     record to gate a menu rather than decorate one.
  2. **FR-017 — does a lost life roll back the points scored during the failed
     attempt?** Provisional pick: no, the points stay, which is arcade-standard
     and makes the score a pure function of the collected count and quota.
     Rolling back would make a doomed attempt free and change the arithmetic the
     tests pin.
  3. **FR-027 — does a voluntary restart cost a life?** Provisional pick: yes,
     as a deliberate death does in the arcade original. Free restarts make the
     clock and the lives count optional for any player willing to retry, which
     is most of the stakes this feature exists to add — but the issue also says
     recovering from failure must never take more than a keypress, and a free
     restart is the friendlier reading of that line.
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
