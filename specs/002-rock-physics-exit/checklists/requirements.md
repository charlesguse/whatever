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

- All three clarifications were answered on GitHub issue #2 and are folded into
  the spec. No markers remain:
  1. **Push cost (FR-015, FR-016)** — a push takes sustained pressure, resolved
     as a fixed per-tick chance of roughly one in eight drawn from the cave's
     own seeded generator, in a single named constant. A draw is taken *only*
     for an eligible push; a blocked push fails deterministically and consumes
     no randomness, so the random stream cannot diverge on what the player
     leaned against. This makes push resolution the PRNG's first consumer, and
     FR-046 pins both the reproducible success sequence and the no-draw-when-
     blocked rule.
  2. **Restart key (FR-031, FR-032)** — shipped. Rebuilding goes back to the
     cave definition and reseeds from it, so a restarted cave replays
     identically to a fresh one; FR-046 pins that.
  3. **Collected/quota readout (FR-041)** — a minimal one ships, worded from
     theme data (FR-038) and reading the sim through the accessors of FR-043.
     The spec states plainly that it is provisional and that the arcade-shell
     HUD may replace it outright.
- Requirements were renumbered when the two new requirements (FR-016 push draw
  discipline, FR-041 readout) were inserted; FR-016 through FR-049 all shifted.
  Cross-references inside the spec were updated to match.
- The rule details the originating request asked to have *picked* rather than
  asked about — the left/right roll preference in FR-009 — remain decided,
  stated, and tested, per the constitution's rule that an ambiguous detail is
  chosen rather than left open.
- One judgement is deliberately left to review rather than to the spec: the
  exact push probability. The mechanism and its determinism are fixed; the
  constant is a dial, called out under "Verified by the maintainer at review
  time".
