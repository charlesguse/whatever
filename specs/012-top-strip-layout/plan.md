# Implementation Plan: Top-Strip Controls Never Overlap

**Branch**: `012-top-strip-layout` | **Date**: 2026-09-03 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/012-top-strip-layout/spec.md`

## Summary

The status readout, the mute button, and the theme picker each live at a
fixed CSS position (`.readout` top-left, `.mute-button` top-center, `.theme-
picker` top-right — `src/App.svelte`, `.readout`/`.mute-button`/`.theme-
picker` rules) with nothing measuring whether they fit. Feature 007 solved
the identical problem for the on-screen touch controls with a pure,
DOM-free `computeTouchControlLayout` function that carves reserved rects out
of a measured `InsetBox` so overlap is structurally impossible, and pinned
it with a node-only geometry test (`src/lib/input/touch/layout.ts` +
`tests/lib/input/touch/layout.test.ts`). This plan does the same thing for
the top strip: a new pure module, `src/lib/layout/topStrip.ts`, takes the
same already-measured `InsetBox`, the touch layout's `reservedRects`, and
each occupant's runtime-measured natural size, and returns one non-
overlapping, contained `Rect` per present occupant — collapsing the theme
picker to a single cycle control (FR-012) when the three do not fit at
natural size, decided from natural sizes alone so the arrangement cannot
oscillate (FR-012a). `App.svelte` measures natural sizes through a new
hidden probe (mirroring the existing `.safe-area-probe` pattern already
used for `insetBox` itself), feeds them to the new function on the same
resize/orientationchange listeners feature 007 already wired, and applies
the returned boxes as inline styles instead of the fixed CSS rules. No file
under `src/sim/` changes; no theme id or device check enters the new module.

## Technical Context

**Language/Version**: TypeScript (strict), Svelte 5 runes — unchanged from
features 001–011.

**Primary Dependencies**: None added. Reuses `InsetBox`/`Rect` (type-only
import) and `reservedRects` from `src/lib/input/touch/layout.ts`
(feature 007) and `listThemes()` from `src/lib/themes/registry.ts`
(feature 006); no new package (Principle IV).

**Storage**: N/A — no new persisted value (Assumptions: "Nothing leaves the
device").

**Testing**: `vitest`, node environment, no DOM — the new placement function
is exercised the same way `tests/lib/input/touch/layout.test.ts` exercises
`computeTouchControlLayout`: a table of representative inputs plus
invariant-style assertions (non-intersection, containment), not hardcoded
expected-output snapshots. New file: `tests/lib/layout/topStrip.test.ts`.

**Target Platform**: Same as the whole project — any browser via `file://`;
this feature is specifically about phone-width portrait and landscape,
verified manually per Principle VII (CI has no browser).

**Project Type**: Single self-contained web page (Principle I) — no
frontend/backend split, no new project.

**Performance Goals**: No change to the tick loop (Principle VI). Placement
recomputes only on resize/orientationchange and when measured natural sizes
change (readout text, theme registry length) — not per frame, not per tick
(FR-017).

**Constraints**: The placement function MUST be pure — no DOM, no canvas,
no clock, no randomness (FR-002) — and MUST NOT branch on a theme id, device
model, user agent, or browser feature name (FR-005). It MUST NOT import
from `src/sim/`, and no Svelte/DOM/audio import may enter it (FR-006).

**Scale/Scope**: One new module (`src/lib/layout/topStrip.ts`), one new test
file, one changed shell file (`src/App.svelte` — measurement wiring and the
three occupants' markup/CSS), one docs file gains a "Standing checks" entry
(007's own Maintainer Review Notes stay untouched, FR-024). No sim file, no
cave data, no theme file touched (FR-022).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Check | Result |
|---|---|---|
| I. One Self-Contained Page | No new external request, file, or asset; still a single `index.html` build (FR-022, SC-006). | PASS |
| II. Deterministic, Tick-Based Sim | This feature touches no file under `src/sim/`, no tick logic, no PRNG (FR-006, FR-022). | PASS — N/A, shell-only |
| III. Themes Are Data | No theme file touched; the placement rule reads only `listThemes()`'s count and each entry's measured button width, never a theme id (FR-005, FR-015). | PASS |
| IV. Simple, Dependency-Light Svelte | No new package; the new module is plain TypeScript reusing existing types. | PASS |
| V. Input Is Keyboard-First, Progressive Everything Else | The collapsed theme control performs the same advance-to-next-theme action the keyboard/gamepad cycle-theme binding already triggers (FR-013); no bindings change (Assumptions). | PASS |
| VI. Performance Is A Feature | Recomputed only on resize/orientationchange/measurement change, never per tick or per frame; no tick-loop allocation (FR-017). | PASS |
| VII. Verifiable Without A Browser Harness | The placement rule and its non-overlap/containment/idempotence properties are pinned by a node-only `vitest` suite over a fixed viewport/occupant-size table (FR-002, FR-023, FR-012b); the rendered result (legibility, real taps) is the maintainer's manual check, added to `docs/manual-verification.md`'s Standing checks (FR-024). | PASS |

No violations. Complexity Tracking table is not needed.

*Post-Phase-1 re-check*: data-model.md and contracts/topstrip-api.md keep
`computeTopStripLayout` a pure function of `(availableBox, reservedRects,
sizes)` with no DOM/clock/theme-id reads; the only DOM-touching change (a
new hidden measurement probe and the resulting inline `style` bindings)
lives in `App.svelte`, mirroring where 007 already put the safe-area probe
and `touchLayout`'s inline styles. Still PASS, no new violations.

## Project Structure

### Documentation (this feature)

```text
specs/012-top-strip-layout/
├── plan.md                 # This file (/speckit-plan command output)
├── research.md             # Phase 0 output
├── data-model.md           # Phase 1 output
├── quickstart.md           # Phase 1 output
├── contracts/
│   └── topstrip-api.md     # Phase 1 output — new module surface
├── checklists/
│   └── requirements.md     # Pre-existing (spec stage)
└── tasks.md                 # Phase 2 output (/speckit-tasks — not created here)
```

### Source Code (repository root)

Single-project structure, unchanged from every prior feature (Principle I —
one Svelte+Vite app, no frontend/backend split):

```text
src/
├── sim/                        # UNCHANGED by this feature (FR-022)
├── lib/
│   ├── input/
│   │   └── touch/
│   │       └── layout.ts       # UNCHANGED — Rect/InsetBox/reservedRects reused by type-only import
│   ├── themes/
│   │   └── registry.ts         # UNCHANGED — listThemes() reused, read-only
│   └── layout/                 # NEW directory
│       └── topStrip.ts         # NEW — computeTopStripLayout, pure, no DOM
└── App.svelte                  # CHANGED — hidden natural-size probes, topStripLayout
                                 # derived state, inline styles replace the fixed
                                 # .readout/.mute-button/.theme-picker CSS positions

tests/
└── lib/
    └── layout/
        └── topStrip.test.ts    # NEW — non-overlap/containment/idempotence over
                                 # the pinned viewport + occupant-size table (FR-023)

docs/
└── manual-verification.md      # CHANGED — "Standing checks" section gains the
                                 # phone-width top-strip overlap item (FR-024);
                                 # 007's own Maintainer Review Notes are untouched
```

**Structure Decision**: No structural change to the project — this feature
adds one new module under a new `src/lib/layout/` directory (mirroring the
existing `src/lib/input/touch/` precedent for a pure, tested geometry
module), one new test file, one changed Svelte shell file, and one changed
docs file. It touches no `src/sim/` file, no cave data, and no theme file.

## Complexity Tracking

*No entries — Constitution Check has no violations to justify.*
