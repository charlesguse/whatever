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

- [x] No [NEEDS CLARIFICATION] markers remain — all four are resolved (see Notes)
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

- All three of the spec's original [NEEDS CLARIFICATION] markers are resolved by
  the maintainer's reply on the originating issue, and each answer is folded
  into the requirement it came from rather than left as a note:
  1. **FR-005 — how is the amoeba growth rate expressed?** A per-cell, per-tick
     probability, so the blob accelerates as it grows and waiting costs
     something. The reply also pinned the determinism consequence, now **FR-005a**:
     every cell draws exactly once per tick in scan order, with no early exit and
     no skipping enclosed cells, so the draw count is a pure function of the grid.
     FR-039 gains two cases for it — an enclosed blob still spending its draws,
     and a larger blob growing faster than a smaller one at the same rate.
  2. **FR-018 — what happens when the cell below an active wall is blocked?**
     The body is destroyed, per the arcade original; the wall still activates and
     still spends the tick. Split out as **FR-018a**, with the two edge-case
     bullets and the FR-039 test case restated against it, and SC-006 extended.
  3. **FR-032 — the Classroom name for the magic wall.** "Sticker Machine". The
     firefly keeps "Pencil Sharpener" from feature 003; the magic wall gets the
     image the request was reaching for without re-settling names one feature
     later. One line of theme data, no simulation change.
- A fourth marker was opened on **FR-034** — whether a dormant wall and a spent
  one should be distinguishable — and is now resolved by a second reply on the
  issue: **FR-034 stands**. The reply withdrew its own earlier aside; the
  ambiguity is the mechanic rather than a UI defect, as in the arcade original,
  and making the two states legible would degrade the wall into a status
  readout. So the theme carries **two** magic wall entries (inert and active),
  not three, and the maintainer-verified criterion stays as written. Because the
  inert entry now covers two distinct simulation states, the reply's
  implementation note is folded in as **FR-034a**: nothing the shell ships may
  leak the difference by another route — label, tooltip, accessibility text, or
  debug overlay — and FR-036's phase accessor exists only to select the active
  theme entry, never to answer the question the theme refuses to answer. SC-013
  and the maintainer-verified criterion are extended to cover the leak.
- No [NEEDS CLARIFICATION] markers remain, and nothing is blocking this spec.
- Every other ambiguity in the request was resolved by picking a behavior and
  recording it in Assumptions, per the constitution's instruction that a spec
  picks, states, and tests rather than leaving a rule to chance. Each pick has a
  test named in FR-039, so if the maintainer disagrees the disagreement lands on
  a specific, pinned rule.
- The vocabulary in the spec that looks technical — read-only accessor, theme
  field, seeded generator, ASCII cave test, scan order — is the project's own
  constitutional vocabulary, not implementation leakage; specs 001–003 use the
  same terms.
