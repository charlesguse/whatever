# Phase 0 Research: The Readout Always Fits Its Box

No `[NEEDS CLARIFICATION]` markers remained in `spec.md` at plan time — the
spec's own Clarifications session (2026-09-05, on issue #43) already resolved
the three open questions the draft carried (FR-011's overflow policy, FR-009's
growth ceiling, and FR-016/FR-016a/FR-016b's settling strategy). The decisions
below are plan-level design choices the spec leaves to implementation: it
specifies properties the rule and the shell must have, not the module layout,
function signatures, or CSS technique that realize them.

## Decision: Extend `src/lib/layout/topStrip.ts` in place, not a new module

**Rationale**: The gap this feature closes — a box sized for the content it
will hold — is a refinement of `computeTopStripLayout`'s existing contract
(012), not a new geometry concern. The function's inputs and the invariants
it must uphold (no overlap, full containment, no dependency on the readout's
height for the mute/picker boxes) are unchanged; what changes is what "sized
correctly" means for the readout specifically, and that a `capped` flag now
travels with every occupant's returned box. A new sibling module would
duplicate the band-forming and reserved-region-subtraction logic (FR-016a's
fix lives inside that logic) for no separation of concerns.

**Alternatives considered**:
- A new `src/lib/layout/readoutFit.ts` computing only the readout's height
  policy, composed with 012's function by the shell — rejected: the growth
  allowance (FR-016a) has to be known *before* the band's usable width is
  computed, which is inside `computeTopStripLayout`'s own first step; a
  separate module would need the same band geometry duplicated or exported
  piecemeal, which is what `computeReadoutWidthCap` (below) already does
  cleanly as a second export of the same module.

## Decision: A true natural size is a `nowrap`-forced probe, not the existing unstyled one

**Rationale**: `App.svelte`'s current `readoutProbeEl` (`class="readout
top-strip-probe"`) has no `white-space` rule, so as a `position: fixed`
block with no explicit `width` it shrink-wraps using the *viewport* as its
containing block — at 320-412 px that shrink-to-fit calculation already
wraps the text before `computeTopStripLayout` ever sees a size (spec.md's
narrative: "a natural-size measurement that is silently wrapped by the
viewport it is measured in is not a natural size", FR-005). Adding
`white-space: nowrap` to the natural-size probe only (not the visible
`.readout`) makes its `getBoundingClientRect()` report the true single-line
width regardless of viewport, which is what FR-005 requires for both the
012 fit/collapse decision and this feature's width-cap arithmetic.

**Alternatives considered**:
- Give the probe an explicit large `width` (e.g. `9999px`) instead of
  `nowrap` — rejected: still relies on a magic constant that could itself be
  exceeded by a long enough theme name or a five-digit score plus a bigger
  font, where `nowrap` has no such ceiling.
- Compute the natural width from `scrollWidth` on the existing probe —
  rejected: `scrollWidth` on an already-wrapped block reports the *wrapped*
  layout's widest line, not the single-line natural width; it does not fix
  the underlying problem, only relabels it.

## Decision: Sever the cycle with a growth allowance derived from `availableBox` alone, exposed via a second export

**Rationale**: FR-016a states the fix directly — the band's usable width
(and therefore the readout's width cap) must be computed from the **growth
allowance** (FR-009's bound: at most one third of `availableBox`'s height)
rather than from any occupant's achieved or natural height. Concretely, this
means the "which reserved regions overlap the band vertically" step (012's
step 1) uses `max(muteButton.height, pickerSize.height, growthAllowance)` in
place of today's `max(...all occupant heights)`, which today includes the
readout. Because `growthAllowance` depends only on `availableBox` (not on
`sizes` at all), the readout's width cap becomes computable with zero
knowledge of the readout's content — which is exactly what lets the shell
measure the readout's height *at* that cap width as a second, independent
pass instead of feeding a guessed height back into the same computation.
That subset of steps (band geometry, the picker's natural-size collapse
decision, the mute button's and picker's placement — everything that does
not need the readout's height) is worth exposing to the shell directly as
`computeReadoutWidthCap(availableBox, reservedRects, naturalSizes): number`,
so the shell's first-pass code calls one pure function to learn the width to
measure against, rather than reimplementing band geometry inline or calling
the full placement function with a placeholder height it would have to
discard.

**Alternatives considered**:
- Bound the number of `computeTopStripLayout` calls (e.g. "at most 3
  iterations") and let width and height converge — rejected explicitly by
  the spec's Clarifications: an iteration count is a convention no node test
  can fail when a later change breaks it, where the growth-allowance
  approach makes idempotence provable from the rule's inputs.
- Have `computeTopStripLayout` call back into the shell for a height
  measurement mid-computation (an injected `heightForWidth` callback) —
  rejected by FR-006: the rule must stay a pure function of plain data, with
  every text measurement entering as a number the shell already collected,
  not a function the rule invokes.

## Decision: `computeTopStripLayout` gains a fourth parameter — the readout's measured height at its cap width — rather than measuring width and height in one call

**Rationale**: FR-016 describes the arrangement as "a single-pass function of
(available box, reserved regions, natural sizes, height-for-width metrics)"
— height-for-width is named as data the function receives, not something it
derives. Concretely: `computeTopStripLayout(availableBox, reservedRects,
naturalSizes, readoutHeightAtCapWidth?)`. The shell's two DOM passes
(FR-016b) map onto this directly: pass 1 measures `naturalSizes` (with the
readout probe forced `nowrap`); the shell calls `computeReadoutWidthCap` with
those sizes to get the width to measure against; pass 2 measures the
readout's real wrapped height at exactly that width using a second hidden
probe styled with that explicit `width` (and no `nowrap`); one call to
`computeTopStripLayout` with all four inputs then places everything. Passing
`readoutHeightAtCapWidth` as `undefined` (before the second pass has ever
run, e.g. the very first paint) falls back to the single-line natural height,
which cannot spill (Edge Cases: "Text metrics that are unavailable or report
zero").

**Alternatives considered**:
- One function that takes a `measureHeightAtWidth(width): number` callback —
  rejected by FR-006 for the same reason the cycle-severing decision above
  rejects a callback: no DOM access of any kind may be reachable from inside
  the pure module, including indirectly through an injected function.
- Return the width cap from a first call and require a second call to
  `computeTopStripLayout` itself for the final placement — considered, but
  `computeReadoutWidthCap` returning a plain `number` (not a partial
  `TopStripLayout`) is simpler to test in isolation (FR-020) and cannot be
  mistaken for a renderable intermediate layout.

## Decision: Growth allowance and elision live in the same module as a per-occupant `capped: boolean`, not a readout-only field

**Rationale**: User Story 3 and the Key Entities section ("Capped Occupant")
are explicit that the policy — grow the box to fit, then elide what still
does not fit — applies to *any* occupant the rule places smaller than its
natural size, not to the readout by name; today's `containRect` clamp
(present since 012) can already shrink the theme picker's collapsed control
below its natural size in the same degenerate cases that can shrink the
readout. Adding `capped: boolean` next to every returned box (readout, mute
button, theme picker) rather than a readout-specific field means a future
occupant — or an over-long theme name colliding with a narrow viewport today
— is covered by the same flag with no per-occupant branch, satisfying User
Story 3 AC4 ("the only changed files are that theme's data and its registry
entry"). `capped` is computed generically: true whenever a returned box's
size is smaller than the corresponding entry in `naturalSizes` in either
dimension, or (for the readout specifically) when `readoutHeightAtCapWidth`
exceeds the growth allowance.

**Alternatives considered**:
- A boolean only on the readout entry (`TopStripLayout.readout.capped`) —
  rejected: would require a second, differently-shaped flag if the picker's
  collapsed control is ever ellipsis-truncated by a future theme, exactly
  the per-occupant special-casing User Story 3 exists to prevent.

## Decision: Elision is rendered with `overflow: hidden` + `-webkit-line-clamp`, not a hand-rolled character-count truncation

**Rationale**: FR-002 requires FR-001 to be enforced structurally by the
occupant's own rendering — the box must be physically incapable of painting
outside itself, independent of whether the box was sized correctly.
`overflow: hidden` on `.readout` (and `.theme-collapsed`) is that structural
clip: it holds even if every sizing computation above were wrong. Layering
`display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp:
<n>` (widely supported in the WebKit/Blink/Gecko engines this project already
targets via Canvas + WebAudio) turns "how many lines fit in the growth
allowance" into a single CSS integer the shell computes once per placement
(`Math.floor(growthAllowance / lineHeight)`) rather than a character-count
guess that would need its own font-metric assumptions — the exact class of
assumption this whole feature exists to remove. A visible truncation
indicator (FR-010, User Story 3 AC3) is `-webkit-line-clamp`'s own ellipsis,
which browsers render automatically at the clamped line's end. The full,
un-elided text stays available to assistive technology via an `aria-label`
carrying the complete string (FR-018), so nothing is dropped for a screen
reader even where a sighted player sees `…`.

**Alternatives considered**:
- Truncate the string itself with a computed character count before it ever
  reaches the DOM — rejected: character width varies by glyph and font, so a
  count-based truncation is exactly the kind of measurement the rule must
  not need to guess (Assumptions: "Text measurement belongs to the shell").
- `overflow: hidden` with no line-clamp, accepting a hard cut mid-line —
  rejected by FR-011: "clipping with no indication hides text with nothing
  to signal it is hidden," named and rejected in the spec itself.

## Decision: `docs/manual-verification.md`'s new item extends the existing "Standing checks" section, at implementation time

**Rationale**: FR-023 asks for the same treatment 012's own Standing checks
item already received (feature 011 created the section; 012 added to it) —
a re-runnable item next to 012's, not a new section, and explicitly not an
edit to 012's own Maintainer Review Notes (a merged spec is the historical
record of what that feature required). This plan does not edit the docs file
itself: per this project's Wing Commander pipeline, planning artifacts
describe *what* changes and *where*; the edit itself is a task the
implement stage performs, exactly as 012's plan.md recorded the same file's
future change in its Project Structure table without touching it during
planning.

**Alternatives considered**: None — the spec names this decision directly
(FR-023, SC-010); this entry records where the section already lives (the
maintainer's 2026-09-03 Pixel 10 Pro entry under "Top-strip controls never
overlap (012, `#35`)" already flags "The readout's sub-380px wrap (#43) is out
of scope of this device" as the exact gap this feature closes) so the tasks
stage does not have to search for it.
