# Phase 0 Research: Top-Strip Controls Never Overlap

No `[NEEDS CLARIFICATION]` markers remained in `spec.md` at plan time. The
decisions below are plan-level design choices the spec leaves to
implementation (it specifies *properties* the rule must have — pure,
measured, prioritized — not its algorithm or file layout).

## Decision: New module lives at `src/lib/layout/topStrip.ts`

**Rationale**: The touch-control layout precedent
(`src/lib/input/touch/layout.ts`) lives under `input/` because it is also
the hit-test source for `TouchInput`. The top-strip rule has no hit-testing
role — the three occupants are native DOM buttons/text that already
receive real clicks/taps once positioned — so nesting it under `input/`
would misdescribe it. A sibling `src/lib/layout/` directory names what it
is (a geometry rule) without implying it consumes or produces input events.

**Alternatives considered**:
- `src/lib/input/topStrip.ts` — rejected: not an input source, and would
  suggest a hit-test API parallel to `resolveTouchPoint` that this module
  does not have.
- Inline the function in `App.svelte` — rejected outright by FR-002: it
  must be verifiable in the existing node-only test environment, which
  means it cannot live inside a `.svelte` file.

## Decision: Reuse `Rect`/`InsetBox` via type-only import from `touch/layout.ts`

**Rationale**: FR-003 requires the same already-measured safe-area-inset
box and the touch layout's `reservedRects` as inputs — these are literally
the same values, not just the same shape, so importing the *types* (not
any function) keeps one definition of "an axis-aligned rect in CSS px" and
avoids two structurally-identical interfaces drifting apart. A type-only
import adds no runtime dependency and does not violate FR-006 (which
prohibits sim imports, not intra-`lib` type reuse) or FR-005 (the import
carries no theme/device logic).

**Alternatives considered**:
- Duplicate `Rect`/`InsetBox` locally in `topStrip.ts` — rejected: two
  identical shapes for the same measured box is the kind of redundancy that
  drifts silently (e.g., one gains a field the other doesn't).
- A new shared `src/lib/geometry.ts` — rejected as premature: exactly two
  modules use these types today; a shared module is worth it if a third
  geometry consumer appears, not before.

## Decision: The rule takes rects and sizes only — no `Orientation` parameter

**Rationale**: `computeTouchControlLayout` takes an explicit `Orientation`
because portrait and landscape use structurally different reserved-region
shapes (one bottom band vs. two side margins). The top-strip rule does not
need to know which orientation produced its inputs — it always: (1) forms a
horizontal band across the top of `availableBox`, (2) removes the
horizontal projection of any `reservedRects` that intersect that band
vertically (this is what makes "landscape's full-height side margins cut
into the top strip too" — Edge Cases — true automatically, not as a special
case), then (3) places occupants left-to-right in what remains. Not taking
`Orientation` also directly satisfies FR-005's "sees sizes and counts
only" — orientation is exactly the kind of platform-shape fact the rule
must not need.

**Alternatives considered**:
- Mirror `computeTouchControlLayout`'s `(insetBox, orientation)` signature
  for consistency — rejected: would require branching on orientation
  inside the top-strip rule for no behavioral gain, since the general
  rect-subtraction approach already produces the right answer in both
  orientations and degrades gracefully in the "very short landscape
  viewport" edge case without a second code path.

## Decision: Natural sizes are measured via always-mounted, visually-hidden probe elements

**Rationale**: FR-012a requires the expanded/collapsed decision to use each
occupant's *natural* size regardless of which form is currently rendered —
including the theme picker's non-active form. The project already has
exactly this pattern for `insetBox`: a hidden `.safe-area-probe` element
(`App.svelte`, `probeEl`) that stays laid out (not `display:none`, which
reports zero size) but invisible and non-interactive, read via
`getComputedStyle`/`getBoundingClientRect`. This plan extends that same
technique: hidden probes for the readout's current text, the mute button,
the full row of theme buttons, and the collapsed cycle control, all
rendered off-screen (`position: fixed; visibility: hidden; pointer-events:
none`, not `display:none`) so `getBoundingClientRect()` reports their real
natural size independent of which form the visible strip is currently
showing. Re-measured on the same resize/orientationchange listeners
feature 007 already installs, plus whenever the measured text changes
(`hudText`, the theme registry's derived label list) — never per tick
(FR-017).

**Alternatives considered**:
- Estimate text width from character count and a known font metric —
  rejected: FR-003 explicitly forbids a hard-coded width for text whose
  length varies; real font metrics depend on the browser's font
  rendering, which only the DOM can report accurately.
- Measure only the currently-rendered form and infer the other — rejected:
  the two theme-picker forms are not simple linear functions of each
  other's width (collapsed shows one theme name at a time, expanded sums
  N buttons' natural widths), so inference would reintroduce exactly the
  "assumed width" bug this feature fixes.

## Decision: Placement priority — mute first, theme picker second, readout absorbs what's left

**Rationale**: FR-013 states the priority explicitly: the readout stays
readable during play, mute stays visible and operable everywhere, and the
theme picker is the first occupant to give up space (by collapsing, FR-012).
The Edge Cases section extends this one step further for the case even a
collapsed picker doesn't leave room for the readout at its natural width:
"the readout gets the space that remains after the other two are placed,
and is shortened to fit." Read together, the placement order is: (1) decide
the theme picker's form once, from natural sizes only (FR-012a); (2) place
the mute button at its full natural size, centered in the strip's usable
width, since FR-011 forbids shrinking any control's hit target; (3) place
the theme picker (in its decided form) at the trailing edge, also at full
size; (4) give the readout whatever remains between the leading edge and
the mute button's left edge, capped at the readout's own natural width —
narrower than natural when space is tight, never wider, and never
overlapping. This ordering makes FR-011 (controls never shrink) and the
readout's "shortened to fit" edge case both hold by construction rather
than by a size-comparison special case.

**Alternatives considered**:
- Shrink all three proportionally when space is tight — rejected: directly
  contradicts FR-011 (mute and the theme control's hit targets may never
  shrink) and FR-012/FR-012a (the theme picker's only size change is the
  binary expanded/collapsed choice, not a continuous shrink).
- Give the readout priority over the theme picker's collapse — rejected:
  contradicts FR-013's explicit statement that the theme picker "is the
  first occupant to give up space," and would mean an unusually long theme
  name (User Story 3) could push the readout around instead of the picker
  collapsing.

## Decision: `docs/manual-verification.md`'s new item extends the existing "Standing checks" section

**Rationale**: Feature 011 already created a `## Standing checks` section
(confirmed present at plan time) for exactly this kind of re-runnable,
not-tied-to-one-review item. FR-024 asks for the same treatment, in the
same section, rather than a new section — and explicitly forbids editing
007's own Maintainer Review Notes, since a merged spec is the historical
record of what that feature required.

**Alternatives considered**: None — the spec names this decision directly
(FR-024, SC-008); this entry records where the section already lives so
the tasks stage does not have to search for it.
