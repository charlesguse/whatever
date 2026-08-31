# Touch Contract: `src/lib/input/touch/{axis,layout,TouchInput}.ts` (new)

## `touch/axis.ts` — shared with gamepad (see [gamepad-api.md](./gamepad-api.md))

```ts
export function resolveDominantAxis(
  dx: number,
  dy: number,
  tieBreakDirection?: Direction
): Direction;
```

- Compares `Math.abs(dx)` vs `Math.abs(dy)`; the larger magnitude's axis
  wins, sign picks the direction (`dx > 0` → `'right'`, etc.).
- **Exact tie** (`Math.abs(dx) === Math.abs(dy)`, both non-zero): if
  `tieBreakDirection` is supplied and is one of the two tied directions
  for this offset's signs, it wins; otherwise the horizontal direction
  wins (FR-020's rule, reused verbatim for the touch pad's zero-hysteresis
  case where `tieBreakDirection` is always `undefined`).
- `dx === 0 && dy === 0` is not a valid input for this function — callers
  (both `layout.ts` and `gamepad/mapping.ts`) are required to have already
  excluded the dead-zone/below-threshold case before calling it.

## `touch/layout.ts`

```ts
export function computeOrientation(insetBox: InsetBox): Orientation;
export function computeTouchControlLayout(
  insetBox: InsetBox,
  orientation: Orientation
): TouchControlLayout;
export function resolveTouchPoint(
  layout: TouchControlLayout,
  x: number,
  y: number
): ControlHit;
```

See [data-model.md](../data-model.md) for the full `InsetBox`/
`TouchControlLayout`/`ControlHit` shapes, the sizing invariants (FR-009,
64px/44px targets), the never-overlapping `reservedRect`/`caveRect`
guarantee (SC-011a), and `resolveTouchPoint`'s exact resolution order.

**Guarantees this module alone provides, checkable with zero DOM:**

- For every `InsetBox` and `Orientation` the test suite samples,
  `reservedRect` and `caveRect` never intersect (SC-011a) and both are
  fully contained within `insetBox` (SC-011, FR-031a).
- `resolveTouchPoint` is a pure function of `(layout, x, y)` — calling it
  twice with the same arguments always returns the same `ControlHit`, so
  `TouchInput`'s re-resolution of pad touches on every `touchmove` needs
  no memoization to stay correct.

## `touch/TouchInput.ts`

```ts
export class TouchInput {
  attach(target: Document = document): void;
  detach(target: Document = document): void;
  setLayout(layout: TouchControlLayout | undefined): void;

  consumeDirection(): Direction | undefined;
  consumeGrab(): boolean;
  consumeRestart(): boolean;
  consumeStart(): boolean;
  consumePause(): boolean;
  consumeCycleTheme(): boolean; // always false — see data-model.md
}
```

`setLayout` is called by `App.svelte` every time the computed layout
changes (mount, resize, orientation change, and whenever the controls
transition shown ↔ hidden per FR-027a — passing `undefined` when hidden).
See [data-model.md](../data-model.md)'s "Touch Input State" section for
the full per-touch-identifier bookkeeping (`assignments`, `grabTouchId`,
the three one-shot pending flags) and the exact `touchstart`/`touchmove`/
`touchend`/`touchcancel` handling.

## Gesture suppression (FR-012) — event-level, attached by `attach()`

| Listener | Target | Action |
|---|---|---|
| `touchmove` | `document`, `{ passive: false }` | `event.preventDefault()` unconditionally while the game is mounted — the only scrollable/zoomable surface in the whole page is the canvas/control area, so there is nothing legitimate for a touchmove to scroll |
| `gesturestart` (Safari pinch) | `document` | `event.preventDefault()` |
| `contextmenu` | `document` | `event.preventDefault()` — suppresses the long-press callout menu |
| `dblclick` | `document` | `event.preventDefault()` — belt-and-suspenders against double-tap-to-zoom on browsers that still synthesize it despite the viewport meta below |

The theme picker's own `<button>` elements are unaffected — `click`
handlers still fire normally on synthesized clicks after a `touchend`
inside them (`preventDefault()` on `touchmove`/`gesturestart`/
`contextmenu` does not suppress tap-to-click synthesis, only scroll/zoom/
callout gestures), satisfying FR-012's "the theme control's own taps MUST
continue to work."

## Companion, non-TypeScript pieces this feature also needs (FR-012,
FR-013, FR-038) — declared here because they are part of the same
contract even though they are markup/CSS, not exported functions

- `index.html`'s `<meta name="viewport">` gains
  `viewport-fit=cover` (unlocks `env(safe-area-inset-*)`) and
  `maximum-scale=1, user-scalable=no` (defense-in-depth against pinch-
  zoom alongside the `gesturestart` listener above) — still one inline
  `<meta>` tag, no new file, no network request (Principle I).
- Global CSS (`touch-action: none` on the document/canvas/control
  elements; `-webkit-user-select: none` / `user-select: none` on the
  same) — inline `<style>`, same file, same principle.

## What is explicitly NOT part of this contract

- Which screen the controls are shown on — `App.svelte`'s
  `session.screen` gate, combined with [visibility-api.md](./visibility-api.md)'s
  capability/last-input gate (FR-008, FR-027, FR-027a).
- The tap-to-confirm decision of *when* `consumeStart()` is actually read
  by `App.svelte` — covered in [data-model.md](../data-model.md) and
  research.md's playfield-tap decision, not by this module, which only
  ever unconditionally sets the flag on an un-laid-out `touchstart`.
