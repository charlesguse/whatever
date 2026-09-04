# Quickstart: Top-Strip Controls Never Overlap

How to validate this feature end-to-end once implemented. See
[data-model.md](./data-model.md) for the placement algorithm and
[contracts/topstrip-api.md](./contracts/topstrip-api.md) for the new module
surface. This extends features 001–011's quickstarts — their checks (single-
file build, sim physics, the arcade shell, the theme registry and switcher,
touch/gamepad input, touch-control visibility) still apply unchanged, and
this feature adds no new check to any of them beyond "still passes with
zero modification" (FR-022).

## Prerequisites

- `npm install` at the repo root (unchanged from features 001–011)

## Validate the placement rule in isolation (no browser)

```bash
npm test
```

**Expected outcome**: builds first, then the full `vitest` suite passes with
no browser, canvas, or device present, covering — per the spec's
Independent Tests — every case below in
`tests/lib/layout/topStrip.test.ts`.

**Non-overlap and containment (User Story 1, User Story 2):**

- across the pinned viewport set — 320 CSS px on the short edge in both
  orientations, with and without the touch controls' reserved regions
  present — no two of `readout`, `muteButton`, `themePicker.rect` intersect
  (FR-007, SC-001);
- every returned rect lies fully inside the available box, including a
  non-zero-origin box standing in for a notch/home-indicator inset
  (FR-008, SC-001);
- when reserved regions are present (landscape side margins and the
  portrait bottom band), no returned rect intersects them (FR-009, SC-001);
- the property holds with no readout present (Edge Cases: "No readout on
  screen") and with no theme picker present (Edge Cases: "One registered
  theme") — both are optional inputs, not assumed-present occupants;
- the property holds at the widest sampled readout size (standing in for
  the title screen's high-score-plus-furthest-cave line) and the narrowest;
- a degenerate available box (near-zero width or height) returns rects
  rather than throwing, and no rect escapes it (Edge Cases).

**Determinism and idempotence (User Story 1 AC7, FR-012b, FR-018):**

- calling `computeTopStripLayout` twice with the same arguments returns
  deep-equal results;
- feeding the rule the exact `sizes`/`availableBox` that produced a
  collapsed arrangement yields the collapsed arrangement again, and
  likewise for an expanded arrangement — no flip between the two on
  repeated calls with unchanged inputs (SC-010).

**Growing with the number of themes (User Story 3):**

- the property holds for `themePicker.expanded` widths standing in for one
  through four registered themes, and for one unusually long theme name, at
  the narrowest supported viewport (FR-014, SC-004);
- `themePicker.collapsed`'s width is identical across all of those samples
  — the collapsed form's width never grows with the count (FR-012, SC-009);
- with `themePicker` absent (standing in for a one-theme registry), the
  readout and mute button are placed using the freed space and the
  property still holds (Edge Cases: "One registered theme").

**No shrinking hit target, no regression at desktop width (FR-011, FR-020):**

- `muteButton`'s returned size equals its input `Size` in every sampled
  case;
- `themePicker.rect`'s size equals exactly `sizes.themePicker.expanded` or
  `sizes.themePicker.collapsed`, never an intermediate value;
- at a wide sampled viewport where all three fit at natural size, the
  arrangement matches today's: readout leading edge, theme picker trailing
  edge, mute button between them.

**A deliberate regression fails the suite (SC-005):**

- pinning any one occupant to a fixed position that ignores the others
  (a mutation test the tasks stage should include, mirroring
  `layout.test.ts`'s own regression coverage) fails the non-overlap
  assertions above.

**No sim or earlier-feature regression (FR-022):**

- every existing test from features 001–011 passes unchanged;
- `git diff` (or the PR's file list) touches no file under `src/sim/`, no
  cave data, and no theme data file.

## Validate the build is still a single, dependency-free file

```bash
npm run build
```

**Expected outcome**: unchanged — `dist/index.html` is the only file play
depends on, now positioning the readout, mute button, and theme picker
(or its collapsed form) from `computeTopStripLayout`'s output, with no new
runtime dependency and no new network request.

## Validate on real devices (maintainer, per spec.md's Maintainer Review Notes)

CI cannot exercise a real phone, a real notch, or real font metrics — the
full checklist is already written out in `spec.md`'s **Maintainer Review
Notes** section (both orientations on a real phone, the narrowest device to
hand, and a desktop window resize). Run `npm run build`, open
`dist/index.html` from disk on each, and work through that section
directly rather than a duplicate checklist here. `docs/manual-
verification.md`'s **Standing checks** section also gains a re-runnable
entry for this same phone-width check (FR-024) — future specs should
re-run that entry rather than rediscovering this bug the way #35 did.
