# Phase 1 Data Model: The Readout Always Fits Its Box

Extends feature 012's data model
([`specs/012-top-strip-layout/data-model.md`](../012-top-strip-layout/data-model.md)),
which itself extends 007's and 006's. Sim entities, every theme entity,
`SessionState`, `TickInput`, the Touch Control Layout entities
(`InsetBox`, `Rect`, `TouchControlLayout`), and 012's Top-Strip Occupant
table are unchanged and not repeated — this feature touches no file under
`src/sim/` (FR-019), no theme file (FR-008), and changes no occupant's
identity or priority order (FR-013, FR-014). What changes is what each
occupant's *size inputs* describe and what its *returned box* now carries.

## Occupant Content Size (`spec.md` Key Entities)

What an occupant's content needs, expressed **for a given width** rather
than as one fixed size — the entity 012 was missing (spec.md's narrative:
"today an occupant reports one natural size, and the rule caps its width
without asking what that cap costs in height"). Measured in the shell,
handed to the rule as plain numbers (FR-006).

| Field | Meaning | Measured how |
|---|---|---|
| `natural` | The occupant's true unconstrained, single-line size (FR-005) | A hidden probe forced to a single line (`white-space: nowrap` for the readout; the mute button and both theme-picker forms are already single-line controls with nothing to wrap) — research.md's `nowrap` decision |
| `heightAtCapWidth` (readout only) | How tall the readout's content is at the width `computeReadoutWidthCap` says it will receive | A second hidden probe with that exact `width` set explicitly, measured in the shell's second DOM pass (FR-016b) |

## Growth Allowance (`spec.md` Key Entities)

The bounded extra height an occupant's box may take to fit its content
(FR-009), derived from `availableBox` alone — **never** from any occupant's
achieved or natural height (FR-016a). Zero when there is no room to grow.

```
growthAllowance = availableBox.height / 3
```

This is a **backstop, not a budget** (FR-009): at 320 px the measured need is
about 80px and even a landscape viewport leaves room for roughly four lines
inside the bound, so normal operation never reaches it. It is also the value
substituted for the readout's height when the band's geometry decides which
`reservedRects` overlap it vertically (research.md), which is the specific
substitution that severs the width→height→width cycle 012 left standing.

## Capped Occupant (`spec.md` Key Entities)

An occupant whose placed box is smaller than its natural size in either
dimension. The set is data, not a hard-coded list (FR-011's "applied
uniformly to every occupant the rule places smaller than its natural size").

```
capped = (returned.width < natural.width) OR (returned.height < contentHeightNeeded)
```

Where `contentHeightNeeded` is `heightAtCapWidth` for the readout and
`natural.height` for every other occupant (they never wrap — 012's mute
button and theme-picker forms are fixed single-line controls; only
`containRect`'s final clamp, step 6 below, can ever shrink them, in the
degenerate near-zero-`availableBox` edge case). `capped` travels on every
occupant's entry in `TopStripLayout`, not only the readout's (research.md),
so the shell knows uniformly which occupants must render in fit-to-box
(clamped, possibly elided) mode versus their full natural presentation.

## Occupant Size Inputs (`src/lib/layout/topStrip.ts`, changed)

| Type | Shape | Notes |
|---|---|---|
| `Size` | `{ readonly width: number; readonly height: number }` (px) | Unchanged from 012 |
| `TopStripOccupantSizes` | `{ readonly readout?: Size; readonly muteButton: Size; readonly themePicker?: { readonly expanded: Size; readonly collapsed: Size } }` | Unchanged shape from 012 — `readout` here is the **natural**, `nowrap`-measured size (research.md); the capped-width height is a separate parameter (below), not a field of this type, because it is not known until after `computeReadoutWidthCap` runs |
| `readoutHeightAtCapWidth` | `number \| undefined`, a new standalone parameter to `computeTopStripLayout` | The shell's second-pass measurement (Occupant Content Size table); `undefined` before that pass has ever produced a value, in which case the rule falls back to the readout's natural (single-line) height, which cannot spill (Edge Cases: "Text metrics that are unavailable or report zero") |

## Top-Strip Placement (`computeTopStripLayout`, pure, changed signature)

```ts
function computeTopStripLayout(
  availableBox: InsetBox,
  reservedRects: readonly Rect[],
  sizes: TopStripOccupantSizes,
  readoutHeightAtCapWidth?: number
): TopStripLayout
```

| Type | Shape | Notes |
|---|---|---|
| `TopStripLayout` | `{ readonly readout?: { readonly rect: Rect; readonly capped: boolean; readonly maxLines: number }; readonly muteButton: { readonly rect: Rect; readonly capped: boolean }; readonly themePicker?: { readonly rect: Rect; readonly collapsed: boolean; readonly capped: boolean } }` | Every occupant's entry now carries `capped` (Capped Occupant, above); the readout's entry additionally carries `maxLines` — the number of lines `growthAllowance` admits at the readout's line height, which is what the shell hands `-webkit-line-clamp` (research.md) — computed by the rule since it already knows `growthAllowance` and the readout's natural single-line height (one line's worth of the natural size) |

**Inputs, restated from FR-006**: `availableBox` and `reservedRects` are
unchanged from 012 — the same measured `InsetBox` and the same
`touchLayout?.reservedRects ?? []`. `sizes` is unchanged in shape from 012
but now sourced from `nowrap`-forced probes for the readout. The new
`readoutHeightAtCapWidth` is the shell's second-pass measurement.

**Algorithm, extending 012's six steps (research.md's decisions restated as
steps):**

1. **Compute the growth allowance** — `availableBox.height / 3` (FR-009) —
   before anything else. This never depends on `sizes`.
2. **Form the strip band for the purpose of reserved-region subtraction**
   using `max(muteButton.height, pickerSize.height, growthAllowance)` in
   place of 012's `max(...all occupant heights)` — substituting
   `growthAllowance` for the readout's height is the FR-016a fix: the band
   used to decide which `reservedRects` overlap it vertically, and therefore
   the usable width, no longer depends on the readout's content in any way.
3. **Decide the theme picker's form once**, from natural sizes and the
   allowance-based usable width — unchanged in spirit from 012's step 2,
   now operating on the corrected usable width.
4. **Place the theme picker and the mute button** at full natural size —
   unchanged from 012's steps 3 and 5; neither has ever depended on the
   readout's height (FR-013), and step 2's fix does not change that.
5. **Compute the readout's width cap** — `usableWidth` (from step 2) minus
   the mute button's and (if present) the theme picker's natural widths and
   margins. This is exactly `computeReadoutWidthCap`'s own return value
   (below) — steps 1-5 are the function body `computeReadoutWidthCap`
   exposes standalone, so the shell can call it before a height-at-cap-width
   measurement exists to feed the next step.
6. **Resolve the readout's height.** `contentHeight = readoutHeightAtCapWidth
   ?? sizes.readout.height` (natural single-line height as the fallback);
   `readout.rect.height = min(contentHeight, growthAllowance)`; `maxLines =
   Math.max(1, Math.floor(growthAllowance / sizes.readout.height))` (one
   line's height is `sizes.readout.height`, since that is measured `nowrap`).
7. **Compute each occupant's `capped` flag** per the Capped Occupant formula
   above, before the final clamp.
8. **Clamp every returned rect into `availableBox`** via the same
   `containRect` 012 already uses (unchanged) — if this clamp shrinks a box
   below what step 7 assumed, `capped` is re-evaluated against the
   post-clamp size, so the degenerate near-zero-`availableBox` edge case
   (Edge Cases) is still covered by the same flag rather than a special case.

**Properties this guarantees, extending 012's (FR-007 through FR-010,
restated as what the construction above makes structural rather than
asserted):**

- **No two returned boxes intersect, every returned box lies inside
  `availableBox`** (012's FR-007/FR-008): unchanged — step 8's clamp and
  steps 3-5's disjoint placement are untouched by this feature's changes.
- **The mute button's and theme picker's boxes never depend on the
  readout's height** (FR-013): true by construction — no step above that
  computes their rects reads `sizes.readout.height` or
  `readoutHeightAtCapWidth`; step 2 reads `growthAllowance` instead, which
  depends only on `availableBox`.
- **Single-pass, structurally acyclic idempotence** (FR-016, FR-016a): a
  second call to `computeTopStripLayout` with the same four arguments
  returns the same `TopStripLayout` — trivially, since the function is
  stateless — and, more specifically, an arrangement computed with a
  **deliberately wrong** `readoutHeightAtCapWidth` produces the identical
  `muteButton`/`themePicker`/readout-`x`-and-`width` as one computed with the
  correct value, because `readoutHeightAtCapWidth` only ever reaches step 6
  (the readout's own height), never steps 1-5 (FR-022 pins this directly).
- **Every occupant's box is at least as large as its content needs at the
  width it was given, or is capped with the content elided** (FR-004,
  FR-010): the readout's height is `min(contentHeight, growthAllowance)` —
  equal to `contentHeight` (fits) unless `contentHeight` exceeds the
  allowance, in which case the box is the allowance and `capped` is true
  (elide, via `maxLines`).

## `computeReadoutWidthCap` (new pure export)

```ts
function computeReadoutWidthCap(
  availableBox: InsetBox,
  reservedRects: readonly Rect[],
  sizes: TopStripOccupantSizes
): number
```

Runs steps 1-5 above and returns the width computed in step 5, with no
dependency on the readout's height at all — by construction, since step 5
happens before the readout's height is ever considered. This is what the
shell calls between its two DOM passes (FR-016b): pass 1 produces `sizes`;
`computeReadoutWidthCap(availableBox, reservedRects, sizes)` gives the width
to set on the second hidden probe; pass 2 measures that probe's real height;
one call to `computeTopStripLayout(availableBox, reservedRects, sizes,
thatHeight)` places everything. `computeTopStripLayout` does not call
`computeReadoutWidthCap` internally as a separate step at runtime — it
performs the same steps 1-5 inline — but the two are guaranteed to agree
because they are the same arithmetic (the tasks stage should implement
`computeTopStripLayout`'s steps 1-5 by calling `computeReadoutWidthCap`
internally, so there is exactly one implementation of this arithmetic to
keep in sync, not two that could drift).

## Shell Wiring (`src/App.svelte`, changed)

| Piece | Change |
|---|---|
| Readout natural-size probe | `readoutProbeEl` (012) gains `white-space: nowrap` so its measured size is a true natural size (research.md) — this is the probe `topStripSizes.readout` is measured from |
| Capped-width probe (new) | A second hidden readout probe, styled identically to `.readout` but with an explicit inline `width` set to `computeReadoutWidthCap(...)`'s result and no `nowrap`, so `getBoundingClientRect().height` reports the real wrapped height at that width — the shell's second DOM pass (FR-016b) |
| `topStripSizes` | Unchanged shape from 012, still a `$derived.by` re-measured on `topStripProbeTick`/`hudText`/theme-label changes — now reads the `nowrap` probe |
| `readoutWidthCap` (new) | A `$derived.by(() => insetBox && topStripSizes ? computeReadoutWidthCap(insetBox, touchLayout?.reservedRects ?? [], topStripSizes) : undefined)`, feeding the capped-width probe's inline `width` style |
| `readoutHeightAtCapWidth` (new) | A `$state`/`$derived.by` set from the capped-width probe's `getBoundingClientRect().height`, re-read on the same triggers as `topStripSizes` |
| `topStripLayout` | Unchanged shape of `$derived.by`, now passing `readoutHeightAtCapWidth` as `computeTopStripLayout`'s fourth argument |
| `.readout` / `.theme-collapsed` CSS | Gain `overflow: hidden; display: -webkit-box; -webkit-box-orient: vertical;` and an inline `-webkit-line-clamp: {topStripLayout.readout.maxLines}` (readout only — the collapsed theme control is always exactly one line, so it needs `overflow: hidden` and `text-overflow: ellipsis` with `white-space: nowrap`, not a line-clamp) — the FR-002 structural clip |
| `aria-label` (new) | Set on `.readout` and `.theme-collapsed` to the full, un-elided string whenever `capped` is true, so assistive technology always has the complete text (FR-018) |

No field of `SessionState`, no sim accessor, and no theme registry mutation
is touched by any of the above — every new piece is presentation-only
measurement, positioning, and an existing string's full form as an
`aria-label`.
