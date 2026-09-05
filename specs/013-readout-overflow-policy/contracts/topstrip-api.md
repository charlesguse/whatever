# Top-Strip Contract: `src/lib/layout/topStrip.ts` (changed)

Extends 012's contract
([`specs/012-top-strip-layout/contracts/topstrip-api.md`](../../012-top-strip-layout/contracts/topstrip-api.md)).
`Size`, `TopStripOccupantSizes`'s shape, `Rect`, and `InsetBox` are unchanged.
`TopStripLayout` gains a `capped` flag per occupant and a `maxLines` field on
the readout; `computeTopStripLayout` gains a fourth parameter; one new
function, `computeReadoutWidthCap`, is exported.

```ts
import type { InsetBox, Rect } from '../input/touch/layout';

export interface Size {
  readonly width: number;
  readonly height: number;
}

export interface TopStripOccupantSizes {
  readonly readout?: Size; // MUST be measured with white-space: nowrap (FR-005) — a true
                            // single-line natural size, never one the viewport wrapped
  readonly muteButton: Size;
  readonly themePicker?: {
    readonly expanded: Size;
    readonly collapsed: Size;
  };
}

export interface TopStripLayout {
  readonly readout?: {
    readonly rect: Rect;
    readonly capped: boolean;   // true iff rect is smaller than content needs in either dimension
    readonly maxLines: number;  // lines the growth allowance admits at this readout's line height
  };
  readonly muteButton: {
    readonly rect: Rect;
    readonly capped: boolean;   // true only in the degenerate near-zero-availableBox edge case
  };
  readonly themePicker?: {
    readonly rect: Rect;
    readonly collapsed: boolean;
    readonly capped: boolean;   // true iff the chosen form's rect is smaller than its natural size
  };
}

/**
 * The width the readout will receive, computed with no knowledge of the
 * readout's own height (FR-016a) — call this between the shell's two DOM
 * passes (FR-016b) to learn the width to measure the readout's real height
 * against.
 */
export function computeReadoutWidthCap(
  availableBox: InsetBox,
  reservedRects: readonly Rect[],
  sizes: TopStripOccupantSizes
): number;

/**
 * readoutHeightAtCapWidth: the shell's second-pass measurement — the
 * readout's real wrapped height at exactly computeReadoutWidthCap(...)'s
 * result. Omit (or pass undefined) before that measurement exists yet; the
 * function then falls back to the readout's natural single-line height,
 * which cannot spill (Edge Cases: "Text metrics that are unavailable or
 * report zero").
 */
export function computeTopStripLayout(
  availableBox: InsetBox,
  reservedRects: readonly Rect[],
  sizes: TopStripOccupantSizes,
  readoutHeightAtCapWidth?: number
): TopStripLayout;
```

See [data-model.md](../data-model.md) for the full type shapes, the
eight-step placement algorithm, the growth-allowance formula, and the
`capped`/`maxLines` derivations.

## Guarantees this module alone provides, checkable with zero DOM

Everything 012's contract already guarantees (no overlap, full containment,
no dependency of the mute button's or theme picker's box on the readout's
height, no id/device branching, determinism) continues to hold — unchanged
by this feature (FR-014). This feature adds:

- **FR-004 (content fits the width it was given)**: for every sampled
  `(availableBox, reservedRects, sizes, readoutHeightAtCapWidth)`, the
  returned `readout.rect.height` is at least `min(readoutHeightAtCapWidth,
  growthAllowance)` — i.e. it is never pinned to the readout's *natural*
  height regardless of the width it was actually given, which is precisely
  today's bug (User Story 4's named regression).
- **FR-009 (growth is bounded)**: `readout.rect.height` never exceeds
  `availableBox.height / 3`, for any input.
- **FR-010 / FR-011 (grow, then elide, uniformly)**: whenever
  `readoutHeightAtCapWidth` exceeds the allowance, `readout.capped` is
  `true` and `readout.maxLines` is set to a value the shell can hand to
  `-webkit-line-clamp` — never a silently truncated box with no signal.
  The same `capped` computation applies to `muteButton` and `themePicker`,
  not a readout-only field (User Story 3).
- **FR-013 (severed dependency, restated as a test)**: `muteButton.rect` and
  `themePicker.rect` are **byte-identical** across two calls that differ
  only in `readoutHeightAtCapWidth` (including a deliberately wrong value
  standing in for a stale or buggy measurement) — this is what proves
  FR-016a's structural fix rather than an observed coincidence.
- **FR-016 / FR-016a (single-pass, structurally acyclic)**:
  `computeReadoutWidthCap`'s return value is identical regardless of what
  `readoutHeightAtCapWidth` a *subsequent* `computeTopStripLayout` call is
  given — because `computeReadoutWidthCap` never takes that parameter at
  all, this is true by the type signature, not merely by test.
- **FR-016b (fixed two-pass measurement, not a loop)**: nothing in this
  module's API allows more than one round trip — `computeReadoutWidthCap`
  takes only natural sizes, `computeTopStripLayout` takes one additional
  plain number. There is no third function, no callback, and no way to
  invoke either function from inside the other.
- **FR-005 (true natural size)**: enforced by convention on the caller
  (`sizes.readout` MUST be `nowrap`-measured), documented on the type above;
  the module itself has no way to verify how a `Size` was measured, which is
  exactly why FR-006 keeps measurement out of this module entirely.

## What is explicitly NOT part of this contract

- **How `sizes.readout` and `readoutHeightAtCapWidth` are measured, and with
  what CSS.** That is `App.svelte`'s two-probe wiring (data-model.md's Shell
  Wiring table) — this module only ever receives already-measured plain
  numbers, never a DOM node.
- **How `capped`/`maxLines` are rendered.** `overflow: hidden`,
  `-webkit-line-clamp`, `text-overflow: ellipsis`, and the `aria-label`
  fallback are `App.svelte`'s concern (FR-002's belt-and-braces half); this
  module only computes the numbers that drive them.
- **The touch-control layout itself** (`reservedRects`'s source,
  `computeTouchControlLayout`, `resolveTouchPoint`) — unchanged, covered by
  feature 007's own contract.
- **Which action a tap on the collapsed theme control triggers, and 012's
  expanded/collapsed decision itself** — unchanged, covered by 012's
  contract; this feature only adds a `capped` flag to that same decision's
  output.
