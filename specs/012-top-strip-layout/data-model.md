# Phase 1 Data Model: Top-Strip Controls Never Overlap

Entities below extend feature 007's data model
([`specs/007-touch-gamepad-input/data-model.md`](../007-touch-gamepad-input/data-model.md))
and feature 006's theme registry
([`specs/006-classic-theme-switcher/data-model.md`](../006-classic-theme-switcher/data-model.md)).
Sim entities, every theme entity, `SessionState`, `TickInput`, and the
Touch Control Layout entities (`InsetBox`, `Rect`, `TouchControlLayout`) are
unchanged and not repeated — this feature touches no file under `src/sim/`
(FR-022), no theme file (FR-015), and reuses `InsetBox`/`Rect` by type-only
import rather than redefining them (research.md). This feature adds one new
entity group: the top-strip placement rule.

## Top-Strip Occupant (`spec.md` Key Entities)

One of the three things sharing the top strip. The set is closed (FR-001,
Key Entities: "adding a fourth occupant is a spec change").

| Occupant | Present when | Priority (FR-013) | Shrinks below natural size? |
|---|---|---|---|
| Status readout | `hudText` is defined (`App.svelte`'s existing `$derived.by`) — absent on some screens (Edge Cases: "No readout on screen") | Lowest — absorbs remaining space last | Yes, width only, never below 0; never taller |
| Mute button | Always | Highest, tied with theme picker's collapsed floor | No (FR-011) |
| Theme picker | `listThemes().length > 1` (existing `App.svelte` gate, unchanged) | Middle — first to give up space, via collapse (FR-012, FR-013) | No — collapses to a fixed-width form instead of shrinking continuously |

## Occupant Size Inputs (`src/lib/layout/topStrip.ts`)

| Type | Shape | Notes |
|---|---|---|
| `Size` | `{ readonly width: number; readonly height: number }` (px) | a natural size, measured at runtime (research.md's hidden-probe decision), never hard-coded (FR-003) |
| `TopStripOccupantSizes` | `{ readonly readout?: Size; readonly muteButton: Size; readonly themePicker?: { readonly expanded: Size; readonly collapsed: Size } }` | `readout` is `undefined` exactly when no readout is shown this screen; `themePicker` is `undefined` exactly when `listThemes().length <= 1` (Edge Cases: "One registered theme"); `themePicker.expanded` is the natural width of the full one-button-per-theme row, `themePicker.collapsed` is the natural width of the single cycle control — both measured simultaneously via the hidden-probe pair (research.md), regardless of which one is currently rendered |

## Top-Strip Placement (`computeTopStripLayout`, pure)

```ts
function computeTopStripLayout(
  availableBox: InsetBox,
  reservedRects: readonly Rect[],
  sizes: TopStripOccupantSizes
): TopStripLayout
```

| Type | Shape | Notes |
|---|---|---|
| `TopStripLayout` | `{ readonly readout?: Rect; readonly muteButton: Rect; readonly themePicker?: { readonly rect: Rect; readonly collapsed: boolean } }` | one entry per occupant present in `sizes`; `themePicker.collapsed` records which form was chosen so `App.svelte` knows whether to render the row of buttons or the single cycle control |

**Inputs, restated from FR-003**: `availableBox` is the same `InsetBox`
`App.svelte` already measures for the touch controls (research.md — no new
measurement source for the screen itself); `reservedRects` is
`touchLayout?.reservedRects ?? []`, the exact array `computeTouchControlLayout`
already returns; `sizes` comes from the new hidden probes.

**Algorithm (research.md's priority decision, restated as steps):**

1. **Form the strip band.** The tallest present occupant's natural height
   (plus a fixed margin) sets the band's height; the band spans
   `availableBox`'s full width at its top edge, then any `reservedRects`
   entry that overlaps the band vertically has its horizontal extent
   subtracted from the band's usable interior (this is what makes
   landscape's full-height side margins cut into the top strip too — Edge
   Cases — without an orientation-specific code path, per research.md).
2. **Decide the theme picker's form once**, from natural sizes only
   (FR-012a): sum `muteButton`, `readout` (if present), and
   `themePicker.expanded` (if present) plus margins; if that sum fits the
   band's usable width, the picker is expanded, otherwise collapsed. This
   sum, and therefore the decision, never depends on which form is
   currently rendered — the structural fix for the oscillation Edge Case
   ("A window sitting exactly at the width where the strip collapses").
3. **Place the mute button** at its full natural size, centered in the
   band's usable width (FR-011: never shrinks).
4. **Place the theme picker** (if present), in the form chosen at step 2,
   at its full natural size, at the band's trailing edge (FR-011: never
   shrinks; FR-020: trailing edge at natural-fit widths, matching today's
   desktop arrangement).
5. **Place the readout** (if present) at the band's leading edge, with
   width `min(readout.width, remaining space between the leading edge and
   the mute button's left edge)` — narrower than natural only when space is
   tight (Edge Cases: "readout wider than whole screen"), never wider,
   never overlapping.
6. Every rect returned is passed through the same `containRect`-style
   clamp `touch/layout.ts` already uses (`src/lib/input/touch/layout.ts`
   lines 84-90), so no box can ever extend beyond `availableBox` regardless
   of the arithmetic above (FR-008) — the "degenerate available box" edge
   case (near-zero width/height) degrades to near-zero-size boxes rather
   than throwing or producing an out-of-bounds box.

**Properties this guarantees (FR-007 through FR-010, restated as what the
construction above makes structural rather than asserted):**

- No two returned boxes intersect: the mute button and theme picker never
  share horizontal space (step 3/4 place them in disjoint bands of the
  strip's width), and the readout's width is capped at step 5 to end
  exactly at the mute button's left edge minus the margin.
- No returned box intersects a `reservedRects` entry: those regions are
  subtracted from the usable band *before* any occupant is placed (step 1).
- Every returned box lies inside `availableBox`: guaranteed by the final
  clamp (step 6), independent of every earlier step's arithmetic.
- Idempotence (FR-012b, FR-018): the function is stateless and pure — the
  same `(availableBox, reservedRects, sizes)` always returns the same
  `TopStripLayout`, and since step 2's decision reads only `sizes` (natural,
  never rendered, sizes), re-running the rule after applying its own
  previous output changes nothing about `sizes`, so the decision cannot
  flip.

## Shell Wiring (`src/App.svelte`, changed)

| Piece | Change |
|---|---|
| Hidden probes | New off-screen (`visibility: hidden`, not `display:none`) elements measuring the readout's current text, the mute button, the full theme-button row, and the collapsed cycle control — mirroring the existing `.safe-area-probe` pattern (research.md) |
| `topStripSizes` | New `$derived.by`, re-measured whenever `insetBox`, `hudText`, or the theme registry's derived label list changes |
| `topStripLayout` | New `$derived.by(() => computeTopStripLayout(insetBox, touchLayout?.reservedRects ?? [], topStripSizes))`, recomputed only when its inputs change — never per tick (FR-017), mirroring `touchLayout`'s existing `$derived.by` at lines 140-143 |
| `.readout` / `.mute-button` / `.theme-picker` CSS | The fixed `top`/`left`/`right`/`transform` rules are replaced by inline `style` bindings driven by `topStripLayout`'s returned rects, the same pattern `canvasStyle`/`touchLayout`'s inline styles already use (lines 153-157, 450-477) |
| Collapsed theme control (new markup) | Rendered instead of the button row when `topStripLayout.themePicker?.collapsed` is true; its `onclick` calls `selectTheme(cycleThemeId(activeThemeId, listThemes().map(t => t.id)))` — the exact function call already used by the keyboard/gamepad/touch cycle-theme dispatch at `App.svelte` lines 204-206 (FR-013's "performs the same advance-to-next-theme action") |

No field of `SessionState`, no sim accessor, and no theme registry mutation
is touched by any of the above — every new piece is presentation-only
positioning and an existing action's call site.
