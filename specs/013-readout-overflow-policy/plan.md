# Implementation Plan: The Readout Always Fits Its Box

**Branch**: `013-readout-overflow-policy` | **Date**: 2026-09-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/013-readout-overflow-policy/spec.md`

## Summary

Spec 012's `computeTopStripLayout` (`src/lib/layout/topStrip.ts`) places one
non-overlapping, contained box per top-strip occupant, but the readout's box
carries a height/width mismatch: its width is capped to whatever space the
mute button and theme picker leave, while its height comes from a probe
measured *before* that cap is applied — and that probe is itself not a true
natural size, because a `position: fixed` element with no explicit width
shrink-wraps to the viewport, so at 320-412 CSS px the "natural" height probe
is already wrapped by the screen it is measured on (FR-005). Below ~412 px the
capped width needs more lines than the probe reported, and `.readout` carries
no `overflow`/`white-space` rule to stop the extra lines rendering onto the
cave.

This plan closes the gap in two structural moves, both already decided by the
spec's Clarifications rather than left to this stage:

1. **Fix what "natural size" means.** The readout's natural-size probe is
   forced to a single line (`white-space: nowrap`) so `sizes.readout.natural`
   is a true unconstrained size (FR-005), never one the viewport already
   wrapped.
2. **Sever the width→height→width cycle structurally (FR-016a).** The band's
   usable width — and therefore the readout's width cap — is computed from a
   **growth allowance** (at most one third of the available box's height,
   FR-009) instead of from any occupant's achieved or natural height. This
   makes the readout's width cap computable with no knowledge of its content
   at all, which is what lets the shell's second measurement pass (height at
   that now-fixed cap width, FR-016b) feed into placement without looping:
   `computeTopStripLayout` gains a fourth input, the readout's measured
   height at its cap width, and remains a pure, single-pass function of
   `(availableBox, reservedRects, naturalSizes, readoutHeightAtCapWidth)`.

A new pure export, `computeReadoutWidthCap`, gives the shell the cap width
*before* the second measurement pass exists to measure against — it is the
subset of `computeTopStripLayout`'s own steps that never touches the
readout's height (band geometry from the growth allowance, the picker's
collapse decision, the mute button's and picker's fixed-width placement),
exposed once so the shell does not reimplement it. The shell's two
already-planned-for DOM passes (FR-016b) become: pass 1 measures every
occupant's true natural size (readout forced `nowrap`); the shell calls
`computeReadoutWidthCap` with those sizes to learn the width the readout will
receive; pass 2 measures the readout's real height at exactly that width
(a second, differently-styled hidden probe with an explicit `width`); one
call to `computeTopStripLayout` with all of it then places everything, still
single-pass, still with no DOM/clock/theme-id read (FR-006, FR-008).

Rendering closes the belt-and-braces half (FR-002): `.readout` gains
`overflow: hidden` plus a `-webkit-line-clamp`/`display: -webkit-box`
clamp to the number of lines the growth allowance actually admits, so a
sizing mistake or a mis-measured font degrades to fewer lines shown, never to
text outside the box — and the same clamp-and-flag treatment (via the
existing `containRect` clamp already shrinking any box that does not fit,
Key Entities: "Capped Occupant") extends to the theme picker's collapsed
control (User Story 3), which is why `TopStripLayout` gains a `capped: boolean`
flag per occupant rather than a readout-only field. Elided content keeps a
visible truncation indicator and its full text in an `aria-label` (FR-010,
FR-012, FR-018). No file under `src/sim/` changes; no theme id or viewport
width enters the placement module (FR-008).

## Technical Context

**Language/Version**: TypeScript (strict), Svelte 5 runes — unchanged from
features 001–012.

**Primary Dependencies**: None added (Principle IV). Extends the existing
`src/lib/layout/topStrip.ts` module and its `Rect`/`InsetBox` type-only
import from `src/lib/input/touch/layout.ts` (unchanged from 012); no new
package for line-clamping or text measurement — `-webkit-line-clamp` is a CSS
property, and `overflow: hidden` needs none.

**Storage**: N/A — no new persisted value (Assumptions: "Nothing leaves the
device").

**Testing**: `vitest`, node environment, no DOM — extends the existing
`tests/lib/layout/topStrip.test.ts` table-plus-invariants style (FR-020
through FR-022): height-for-width supplied as plain numbers standing in for
what the browser's text metrics would report, never as real text laid out by
a real font. New assertions, not a new test file, since the property under
test (every returned box fits its content at the width it was given) is a
refinement of 012's containment/non-overlap properties over the same
function's inputs and outputs.

**Target Platform**: Same as the whole project — any browser via `file://`;
this feature is specifically about phone-width portrait and landscape below
412 px, verified manually per Principle VII (CI has no browser).

**Project Type**: Single self-contained web page (Principle I) — no
frontend/backend split, no new project.

**Performance Goals**: No change to the tick loop (Principle VI). The shell's
measurement work grows from one DOM pass to a fixed two (FR-016b) on
resize/orientationchange/content-change only — never per frame, never per
tick (FR-016b, mirroring 012's FR-017).

**Constraints**: `computeTopStripLayout` and the new `computeReadoutWidthCap`
MUST both stay pure — no DOM, no canvas, no clock, no randomness (FR-006) —
and MUST NOT branch on a theme id, device model, user agent, browser feature
name, or a specific viewport width (FR-008). Neither may import from
`src/sim/`, and no Svelte/DOM/audio import may enter either (FR-007).

**Scale/Scope**: One changed module (`src/lib/layout/topStrip.ts` — new
export, changed signature, growth-allowance and elision-flag logic), one
changed shell file (`src/App.svelte` — a `nowrap` natural-size probe, a
second capped-width probe, the two-pass measurement wiring, and
`overflow`/`line-clamp`/`aria-label` on `.readout` and the collapsed theme
control), one extended test file
(`tests/lib/layout/topStrip.test.ts`), one docs file gains a "Standing
checks" entry at implementation time (FR-023; not edited by this plan). No
sim file, no cave data, no theme file touched (FR-019).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Check | Result |
|---|---|---|
| I. One Self-Contained Page | No new external request, file, or asset; `overflow`/`line-clamp` are inline CSS, still a single `index.html` build (FR-019, User Story 4 AC3). | PASS |
| II. Deterministic, Tick-Based Sim | This feature touches no file under `src/sim/`, no tick logic, no PRNG (FR-007, FR-019). | PASS — N/A, shell-only |
| III. Themes Are Data | No theme file touched; the placement rule still reads only sizes and counts, never a theme id (FR-008, FR-015). Elision applies uniformly (FR-011), so a theme with a long display name needs no code change (User Story 3 AC4). | PASS |
| IV. Simple, Dependency-Light Svelte | No new package; `-webkit-line-clamp`/`overflow: hidden` are plain CSS, not a library. | PASS |
| V. Input Is Keyboard-First, Progressive Everything Else | No binding changes; the collapsed theme control's elided label keeps calling the same cycle-theme action (Assumptions: "Bindings and behavior are untouched"). | PASS |
| VI. Performance Is A Feature | Recomputed only on resize/orientationchange/measurement change via a fixed two-pass measurement, never per tick or per frame (FR-016b). | PASS |
| VII. Verifiable Without A Browser Harness | The growth-allowance, single-pass, and containment properties are pinned by node-only `vitest` assertions over `computeTopStripLayout`/`computeReadoutWidthCap` with height-for-width supplied as data (FR-020 through FR-022); the rendered result (real font metrics, real legibility) is the maintainer's manual check, added to `docs/manual-verification.md`'s Standing checks at implementation time (FR-023). | PASS |

No violations. Complexity Tracking table is not needed.

*Post-Phase-1 re-check*: data-model.md and contracts/topstrip-api.md keep both
`computeTopStripLayout` and `computeReadoutWidthCap` pure functions of plain
numbers and rects, with the readout's height-for-width entering as a fourth
argument rather than being measured inside either function; the only
DOM-touching change (the `nowrap` natural probe, the capped-width probe, and
the resulting `overflow`/`line-clamp`/`aria-label` bindings) lives in
`App.svelte`, mirroring where 012 already put its hidden probes and inline
styles. Still PASS, no new violations.

## Project Structure

### Documentation (this feature)

```text
specs/013-readout-overflow-policy/
├── plan.md                 # This file (/speckit-plan command output)
├── research.md             # Phase 0 output
├── data-model.md           # Phase 1 output
├── quickstart.md           # Phase 1 output
├── contracts/
│   └── topstrip-api.md     # Phase 1 output — the module's changed surface
├── checklists/
│   └── requirements.md     # Pre-existing (spec stage)
└── tasks.md                 # Phase 2 output (/speckit-tasks — not created here)
```

### Source Code (repository root)

Single-project structure, unchanged from every prior feature (Principle I —
one Svelte+Vite app, no frontend/backend split):

```text
src/
├── sim/                        # UNCHANGED by this feature (FR-019)
├── lib/
│   ├── input/
│   │   └── touch/
│   │       └── layout.ts       # UNCHANGED — Rect/InsetBox reused by type-only import
│   ├── themes/
│   │   └── registry.ts         # UNCHANGED — listThemes() reused, read-only
│   └── layout/
│       └── topStrip.ts         # CHANGED — computeReadoutWidthCap (new export),
│                                # computeTopStripLayout's signature gains a
│                                # height-for-width input, growth-allowance and
│                                # per-occupant `capped` logic
└── App.svelte                  # CHANGED — nowrap natural-size probe for the
                                 # readout, a second capped-width probe, the
                                 # two-pass measurement wiring, overflow/
                                 # line-clamp/aria-label on .readout and the
                                 # collapsed theme control

tests/
└── lib/
    └── layout/
        └── topStrip.test.ts    # CHANGED — adds FR-004/FR-009 through FR-011,
                                 # FR-016/FR-016a/FR-016b, FR-020 through FR-022
                                 # assertions to 012's existing table; no
                                 # existing 012 assertion is altered (FR-014)

docs/
└── manual-verification.md      # CHANGED at implementation time — "Standing
                                 # checks" gains the content-containment item
                                 # (FR-023); 012's own Maintainer Review Notes
                                 # are untouched (FR-023, SC-010)
```

**Structure Decision**: No structural change to the project — this feature
extends 012's existing `src/lib/layout/topStrip.ts` module and its test file
in place rather than adding a sibling module, because the property being
added (a box sized for the content it will hold) is a refinement of the same
function's contract, not a new geometry concern. One changed shell file, one
docs file changed at implementation time. No `src/sim/` file, no cave data,
no theme file touched.

## Complexity Tracking

*No entries — Constitution Check has no violations to justify.*
