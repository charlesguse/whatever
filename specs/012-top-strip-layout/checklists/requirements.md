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

- Both `[NEEDS CLARIFICATION]` markers were answered on the lifecycle issue and
  are now folded into the spec:
  - **FR-012** — degradation collapses the theme picker to a single control that
    cycles themes and shows the active one. Shortened labels and a wrapped
    second row were both rejected for the same reason: they keep the picker's
    width proportional to the theme count, so FR-014 re-opens at every new
    theme, and the wrapped form spends vertical space where there is least of
    it. The collapse also reuses the existing cycle-theme action rather than
    inventing a touch-only concept. The answer added a mechanism the spec now
    carries as **FR-012a** (the collapse decision reads natural, not rendered,
    sizes — the classic oscillation) and **FR-012b** (idempotence pinned by a
    node test, with SC-010 as its measurable outcome).
  - **FR-023** — the narrowest supported viewport is 320 CSS px on the short
    edge in both orientations. 412 px would pin the reporting device and little
    else, which is the practice that produced this issue; 360 still leaves real
    phones untested. **FR-023a** records the accepted consequence: the collapsed
    strip is the ordinary phone arrangement rather than a rare branch, which is
    wanted — a wide cycle button is a better thumb target and the degraded path
    gets exercised constantly instead of rotting.
- One rider arrived outside the two questions and is folded in as well:
  **FR-024** no longer edits 007's Maintainer Review Notes, since a merged spec
  is the record of what that feature required. The phone-width overlap item goes
  to a new "Standing checks" section of `docs/manual-verification.md`, kept apart
  from that file's dated per-spec pass log, and stays in 012's own review notes.
  US4 scenario 5, SC-008, and review-note item 10 track the change. The same
  decision was made on #31 question 3, so the two features should land on the
  same shape whichever merges first.
- Three terms name surfaces that already exist in this repository — the
  safe-area-inset box, the touch controls' reserved regions, and 007's
  Maintainer Review Notes. They are named because the requirement is that this
  feature reuse them rather than grow a parallel one, which is a scope
  constraint rather than an implementation choice.
- Everything else the issue left open is resolved in **Assumptions** with a
  stated default, most notably that the strip's occupants stay overlays rather
  than reserving vertical space and shrinking the cave.
