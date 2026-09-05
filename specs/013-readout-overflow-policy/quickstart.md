# Quickstart: The Readout Always Fits Its Box

How to validate this feature end-to-end once implemented. See
[data-model.md](./data-model.md) for the growth-allowance algorithm and
[contracts/topstrip-api.md](./contracts/topstrip-api.md) for the changed
module surface. This extends 012's quickstart
([`specs/012-top-strip-layout/quickstart.md`](../012-top-strip-layout/quickstart.md))
— every check listed there still applies unchanged (FR-014, FR-019), and
this feature adds the checks below to the same `tests/lib/layout/
topStrip.test.ts` file rather than a new one (FR-020 through FR-022).

## Prerequisites

- `npm install` at the repo root (unchanged from features 001–012)

## Validate the placement rule in isolation (no browser)

```bash
npm test
```

**Expected outcome**: builds first, then the full `vitest` suite passes with
no browser, canvas, or device present, covering — per the spec's Independent
Tests — every case below.

**Content fits the width it was given (User Story 1, FR-004, SC-001):**

- across the pinned viewport set — **320, 360, and 412 CSS px** on the short
  edge, in both orientations, with and without the touch controls' reserved
  regions — for a table of `(availableBox, reservedRects, sizes,
  readoutHeightAtCapWidth)` standing in for one through four themes and an
  unusually long theme name, every returned box is at least as large as
  `min(readoutHeightAtCapWidth, growthAllowance)` requires, or is at the
  `growthAllowance` bound with `capped: true`;
- 412 px in particular reproduces today's shipped result unchanged: a
  two-line band with the text inside it (SC-003, "412 is the width that
  passes today and must keep passing");
- 360 px and 320 px — "the widths that spill" — produce a box tall enough
  for the height-for-width value supplied, never the readout's unwrapped
  natural height;
- the widest sampled readout content (standing in for the title screen's
  high-score-plus-furthest-cave line, User Story 1 AC5) fits at 320 px;
- a desktop-width sample where nothing is capped is a single line, visually
  matching 012's pre-existing result (User Story 1 AC6, FR-017 restated).

**The deliberate regression fails (User Story 4, FR-021, SC-007):**

- a mutation that pins `readout.rect.height` to `sizes.readout.height`
  (the natural, unwrapped height) regardless of
  `readoutHeightAtCapWidth` — exactly today's shipped bug — fails the
  FR-004 assertions above at 360 px and 320 px, on a runner with no browser.

**The severed cycle (User Story 2, FR-013, FR-016, FR-016a, SC-005, SC-006):**

- `computeReadoutWidthCap`'s return value is identical regardless of any
  `readoutHeightAtCapWidth` a subsequent `computeTopStripLayout` call
  receives (true by signature — asserted directly as a regression guard);
- `muteButton.rect` and `themePicker.rect` are deep-equal across two
  `computeTopStripLayout` calls that differ only in
  `readoutHeightAtCapWidth`, including a **deliberately wrong** value (e.g.
  the readout's tallest possible content) compared against the correct one —
  FR-022's named assertion;
- calling `computeTopStripLayout` twice with the same four arguments
  returns deep-equal results (trivial statelessness, still asserted
  directly);
- the theme picker's expanded/collapsed decision is unchanged across
  readout contents of differing `readoutHeightAtCapWidth` at the same
  viewport (012 FR-012a restated: wrapping the readout must not flip the
  collapse decision).

**Grow, then elide — uniformly, not per-occupant (User Story 3, FR-009
through FR-012, SC-009):**

- `readout.rect.height` never exceeds `availableBox.height / 3` for any
  sampled input (FR-009's bound);
- when `readoutHeightAtCapWidth` exceeds the allowance, `readout.capped` is
  `true` and `readout.maxLines` is a positive integer no larger than what
  the allowance and the readout's line height admit;
- with a collapsed theme-picker `Size` wider than the space `sizes` leaves
  available for it, its returned rect is contained in `availableBox` and
  `themePicker.capped` is `true` — the same flag the readout uses, not a
  second mechanism (data-model.md's "Capped Occupant" is not a hard-coded
  list);
- the collapsed control's width never depends on how many themes are
  registered (012's existing property, re-asserted here alongside the new
  `capped` field).

**No sim or earlier-feature regression (FR-019):**

- every existing test from features 001–012 passes unchanged, including all
  of 012's non-overlap/containment/idempotence assertions in
  `topStrip.test.ts`;
- `git diff` (or the PR's file list) touches no file under `src/sim/`, no
  cave data, and no theme data file.

## Validate the build is still a single, dependency-free file

```bash
npm run build
```

**Expected outcome**: unchanged — `dist/index.html` is the only file play
depends on, now clipping the readout and the collapsed theme control to
their own boxes via inline CSS (`overflow: hidden`, `-webkit-line-clamp` or
`text-overflow: ellipsis`) with no new runtime dependency and no new network
request.

## Validate on real devices (maintainer, per spec.md's Maintainer Review Notes)

CI cannot exercise a real phone, a real font's actual metrics, or a real
notch — the full checklist is already written out in `spec.md`'s
**Maintainer Review Notes** section (the narrowest device to hand and
emulated 320/360 px in portrait and landscape, a five-digit score, the title
screen, a resize from desktop to phone width, and a diff audit). Run `npm
run build`, open `dist/index.html` from disk on each, and work through that
section directly rather than a duplicate checklist here.
`docs/manual-verification.md`'s **Standing checks** section also gains a
re-runnable entry for this same content-containment check at implementation
time (FR-023), alongside 012's existing top-strip-overlap entry — future
specs should re-run that entry rather than rediscovering this bug the way
#43 did.
