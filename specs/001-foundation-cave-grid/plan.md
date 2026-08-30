# Implementation Plan: Foundation — Cave Grid, Deterministic Tick, Themed Renderer, Digging Player

**Branch**: `001-foundation-cave-grid` | **Date**: 2026-08-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-foundation-cave-grid/spec.md`

## Summary

This is the first feature in the repository — there is no `src/`, no
`package.json`, and no build yet, so this plan stands up the whole project
skeleton as well as the feature itself. The primary requirement is a playable
vertical slice: a 40×22 cave that a kid can walk and dig through, rendered
from a theme table onto a scrolling canvas viewport, running as a single
`dist/index.html` that plays from `file://`. The technical approach is the one
the constitution fixes: Svelte 5 + Vite + `vite-plugin-singlefile`, a plain-
TypeScript deterministic sim (`src/sim/`) that is a pure function of
`(grid, input, tick)` with its own seeded PRNG, a Svelte shell (`src/lib/`,
`src/App.svelte`) that owns the canvas render loop, keyboard input, and the
scrolling camera, and a shared ASCII cave format used identically by shipped
cave data and by `vitest` unit tests. Only five elements get behavior here
(empty, dirt, brick wall, steel wall, player); the remaining nine declared
elements are inert placeholders drawn from the theme table.

## Technical Context

**Language/Version**: TypeScript 5.x, compiled by Vite; Svelte 5 (runes)

**Primary Dependencies**: Svelte 5, Vite, `vite-plugin-singlefile`, `@sveltejs/vite-plugin-svelte`, vitest — the full set the constitution's Principle IV fixes. No other runtime dependency.

**Storage**: N/A — this feature persists nothing (see spec Assumptions: theme/score/progress persistence arrives with later features)

**Testing**: vitest, run headless (`npm test`), no DOM/canvas/browser-automation packages

**Target Platform**: Any modern browser, loaded via `file://` with no server; built output is one HTML file

**Project Type**: Single front-end project — no backend, no separate frontend/backend split

**Performance Goals**: Steady frame rate at the full 40×22 cave size, 60fps target / 30fps floor (constitution Principle VI, spec SC-006), tick rate in the neighborhood of 8 ticks/second (spec Assumptions)

**Constraints**: Zero network requests at play time; zero image/font/audio files; sim code must be allocation-light on the hot per-tick path, must not read wall-clock time or DOM, and must not use `Math.random`; camera/rendering must never feed back into sim state

**Scale/Scope**: One cave (40×22 cells), one theme (Classroom), 14 declared element ids (5 behavioral, 9 inert-for-now), four-directional keyboard input only

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Status |
|---|---|---|
| I. One Self-Contained Page | Build target is `dist/index.html` via `vite-plugin-singlefile`; FR-043/SC-008 require zero network requests and a single file; no images/fonts/audio anywhere in this feature | PASS |
| II. Deterministic, Tick-Based Sim | Sim is `src/sim/`, pure function of (grid, input, tick), fixed top-to-bottom/left-to-right scan with a per-cell moved flag (FR-004, FR-007), seeded PRNG owned by the sim and seeded from cave data (FR-008/FR-009), replay-identical (FR-010). Only wall/dirt/player rules are implemented; no falling-body rules exist yet to violate the canonical list, and none of the canonical rules are being reimplemented differently | PASS |
| III. Themes Are Data, Not Code | Renderer looks up every color/glyph/label from a theme table keyed by element id (FR-024–FR-027); Classroom covers all 14 element ids including the 9 inert ones | PASS — this feature ships one theme by design (spec Out of Scope); the constitution's "at least two themes + in-game selector" requirement is deferred to a later, explicitly-named feature, not silently dropped |
| IV. Simple, Dependency-Light Svelte | Svelte 5 + Vite + vite-plugin-singlefile only; sim has no Svelte import; canvas rendering; no added runtime deps | PASS |
| V. Keyboard-First Input | Arrows + WASD both map to the same four directions (FR-018); touch/gamepad are out of scope for this feature only, which the spec's Assumptions section calls out explicitly as an allowed, later-filled gap, not a regression | PASS (deferred, not violated) |
| VI. Performance Is A Feature | Fixed timestep tick loop decoupled from a separate render loop (FR-023); target/floor framerate carried into SC-006; hot-loop allocation avoidance is called out in Constraints above | PASS |
| VII. Verifiable Without A Browser | `npm test` runs vitest with no DOM/canvas/audio (FR-042/FR-045); ASCII-cave test harness is itself part of this feature's scope (User Story 3); `npm run build` and `npm test` both green with no browser installed | PASS |

No violations. Complexity Tracking is not needed.

## Project Structure

### Documentation (this feature)

```text
specs/001-foundation-cave-grid/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md         # Phase 1 output (/speckit-plan command)
├── quickstart.md         # Phase 1 output (/speckit-plan command)
├── contracts/            # Phase 1 output (/speckit-plan command)
│   └── sim-api.md
└── tasks.md              # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

The repository currently has no `src/`, `public/`, or `package.json` — this
feature creates the project skeleton the constitution describes, split along
the sim/shell line `CLAUDE.md` mandates:

```text
package.json               # scripts: dev, build, test
vite.config.ts             # vite-plugin-singlefile + @sveltejs/vite-plugin-svelte
tsconfig.json
index.html                 # Vite entry, mounts App.svelte

src/
├── main.ts                 # Svelte app bootstrap
├── App.svelte               # top-level shell: canvas, tick loop wiring, input listeners
├── sim/                     # PLAIN TYPESCRIPT ONLY — no Svelte, no DOM, no Math.random, no Date.now
│   ├── elements.ts           # element id enum/const + the shared character mapping (FR-032)
│   ├── grid.ts               # typed-array grid: cell contents, moved-this-tick flags, read-only accessors (FR-005)
│   ├── prng.ts                # seeded PRNG owned by the sim (FR-008/FR-009)
│   ├── cave.ts                # cave definition type + parser/validator (FR-031, FR-033)
│   ├── tick.ts                # the tick function: (grid, input) -> next grid (FR-006, FR-007)
│   └── ascii.ts               # ASCII <-> grid helpers shared by cave data and tests (FR-032, FR-038, FR-040)
├── lib/
│   ├── input/
│   │   └── keyboard.ts         # key-down/up tracking -> per-tick direction (FR-018-FR-022)
│   ├── render/
│   │   ├── canvas.ts            # render loop, fixed timestep, reads sim state only (FR-023)
│   │   └── camera.ts            # dead-zone scrolling viewport, clamps at cave edges (FR-029)
│   └── themes/
│       ├── types.ts             # theme entry contract (fill color, glyph, label, cave background)
│       ├── registry.ts          # theme registry keyed by theme id (FR-027)
│       └── classroom.ts         # the Classroom theme data (FR-026)
└── caves/
    └── starter.ts               # the one shipped starter cave, in the ASCII cave format (FR-034-FR-036)

tests/
└── sim/
    ├── grid.test.ts
    ├── cave-parsing.test.ts
    ├── movement.test.ts
    ├── determinism.test.ts
    └── helpers/
        └── ascii-cave.ts        # test harness: build-from-ASCII, run-ticks, assert-ASCII (FR-038-FR-040)
```

**Structure Decision**: Single Svelte/Vite project at the repo root (no
monorepo, no separate frontend/backend — there is only a frontend). The
sim/shell boundary from `CLAUDE.md` is enforced by directory: `src/sim/` is
plain TypeScript with no Svelte or DOM imports, everything else under `src/`
is shell. Tests live in `tests/sim/` and exercise only `src/sim/` exports
through the ASCII helper, never the Svelte shell, satisfying Principle VII.

## Complexity Tracking

*No violations — table not needed.*
