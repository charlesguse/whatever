# Top-Strip Contract: `src/lib/layout/topStrip.ts` (new)

```ts
import type { InsetBox, Rect } from '../input/touch/layout';

export interface Size {
  readonly width: number;
  readonly height: number;
}

export interface TopStripOccupantSizes {
  readonly readout?: Size;
  readonly muteButton: Size;
  readonly themePicker?: {
    readonly expanded: Size;
    readonly collapsed: Size;
  };
}

export interface TopStripLayout {
  readonly readout?: Rect;
  readonly muteButton: Rect;
  readonly themePicker?: {
    readonly rect: Rect;
    readonly collapsed: boolean;
  };
}

export function computeTopStripLayout(
  availableBox: InsetBox,
  reservedRects: readonly Rect[],
  sizes: TopStripOccupantSizes
): TopStripLayout;
```

See [data-model.md](../data-model.md) for the full type shapes, the six-step
placement algorithm, and the priority rationale (mute and the theme picker's
chosen form never shrink; the readout absorbs whatever space remains).

## Guarantees this module alone provides, checkable with zero DOM

- **FR-007 (no overlap)**: for every `(availableBox, reservedRects, sizes)`
  the test suite samples, no two of `readout`, `muteButton`,
  `themePicker.rect` intersect.
- **FR-008 (containment)**: every returned `Rect` lies fully inside
  `availableBox`.
- **FR-009 (reserved regions)**: no returned `Rect` intersects any entry of
  `reservedRects`.
- **FR-010 (the boxes are the hit targets)**: the returned rects are exactly
  what `App.svelte` applies as each occupant's `position`/`width`/`height`
  (data-model.md's Shell Wiring table) — there is no separate, unmeasured
  "visual" box, so FR-007–FR-009 holding for the returned rects is
  equivalent to holding for what a player can tap.
- **FR-011 (no shrinking hit target)**: `muteButton`'s returned size always
  equals `sizes.muteButton`; `themePicker.rect`'s size always equals
  `sizes.themePicker.expanded` or `sizes.themePicker.collapsed` exactly,
  never an intermediate size. Only `readout`'s width may be less than
  `sizes.readout.width`.
- **FR-012 / FR-012a (collapse decided from natural sizes)**:
  `themePicker.collapsed` is a pure function of `sizes` and
  `availableBox`/`reservedRects` alone — never of any previously-returned
  `TopStripLayout` — so calling `computeTopStripLayout` again with the same
  `sizes` after rendering its own output returns the same `collapsed` value
  (FR-012b's idempotence, asserted directly in `tests/lib/layout/
  topStrip.test.ts`).
- **FR-005 (no id/device branching)**: the function's parameters carry no
  theme id, string name, user agent, or device model — `sizes.themePicker`
  is two plain `Size`s, so the function has nothing to branch on beyond
  numbers and the presence/absence of `readout`/`themePicker`.
- **Determinism**: calling `computeTopStripLayout` twice with
  reference-equal or deep-equal arguments always returns deep-equal results
  — no internal state, no clock, no `Math.random` (FR-002).

## What is explicitly NOT part of this contract

- **Which natural sizes are measured, and how.** That is `App.svelte`'s
  hidden-probe wiring (data-model.md's Shell Wiring table, research.md's
  measurement decision) — this module only ever receives already-measured
  `Size` values, never a DOM node.
- **Which action a tap on the collapsed theme control triggers.** That is
  an existing call (`selectTheme(cycleThemeId(...))`, already used by the
  keyboard/gamepad/touch cycle-theme dispatch) wired at the `App.svelte`
  call site, not inside this module.
- **The touch-control layout itself** (`reservedRects`'s source,
  `computeTouchControlLayout`, `resolveTouchPoint`) — unchanged, covered by
  feature 007's own contract
  ([`specs/007-touch-gamepad-input/contracts/touch-api.md`](../../007-touch-gamepad-input/contracts/touch-api.md)).
