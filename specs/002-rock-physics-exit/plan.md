# Implementation Plan: Rock Physics — Falling, Rolling, Pushing, Crushing, and the Exit

**Branch**: `002-rock-physics-exit` | **Date**: 2026-08-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-rock-physics-exit/spec.md`

## Summary

Feature 001 shipped a cave the kid can walk and dig through with no hazards
and no objective. This feature makes the cave a game: erasers and gold stars
fall and roll under the same tick scan feature 001 established, a falling
body kills the kid on contact while a resting one is furniture, the kid can
lean on a resting eraser to push it one cell on a fixed per-tick chance drawn
from the cave's own seeded PRNG, walking into a gold star collects it toward
a per-cave quota, a grab modifier lets the kid clear paper or collect a star
without moving into the cell, and reaching the quota turns the classroom
door — until then indistinguishable from a locker — into the cave's exit.
Death and completion are the two terminal states; a restart key rebuilds the
cave from its definition in either case. The technical approach is additive
to the existing sim/shell split: two new parallel per-cell flags on the
existing typed-array `Grid` (falling, plus reuse of the existing
moved-this-tick flag), three new scalar fields on `CaveState` (collected
count, quota, status), a `grab` field added to `TickInput`, and one named
push-chance constant that is the seeded PRNG's only consumer. No new grid
element ids are needed — `boulder`, `diamond`, `brickWall`, `steelWall`, and
`exit` already exist as inert placeholders from feature 001 and gain
behavior here. The theme contract gains data-only fields for the door's two
appearances, the two terminal messages, and the collected/quota readout
wording; no rendering logic branches on theme or element.

## Technical Context

**Language/Version**: TypeScript 5.x, compiled by Vite; Svelte 5 (runes) — unchanged from feature 001

**Primary Dependencies**: Unchanged from feature 001 (Svelte 5, Vite, `vite-plugin-singlefile`, `@sveltejs/vite-plugin-svelte`, vitest). No new runtime dependency — this feature is entirely new rules over the existing typed-array grid and existing seeded PRNG, plus new theme data fields.

**Storage**: N/A — unchanged; this feature persists nothing new (collected count, quota, and status live in in-memory `CaveState` and are rebuilt from cave data on restart)

**Testing**: vitest, run headless (`npm test`), no DOM/canvas/browser-automation packages — unchanged

**Target Platform**: Any modern browser via `file://`, one build artifact — unchanged

**Project Type**: Single front-end project — unchanged

**Performance Goals**: Steady frame rate with many bodies falling/rolling at once at full cave size, 60fps target / 30fps floor (constitution Principle VI, spec SC-013); falling/rolling/pushing must stay allocation-free on the hot per-tick scan, same discipline as feature 001's movement code

**Constraints**: Zero network requests at play time; zero new image/font/audio files; the seeded PRNG remains the sim's only randomness source and push resolution is its only consumer this feature (FR-016); sim code still contains no wall-clock time, no DOM access, no `Math.random`; camera/rendering still never feeds back into sim state; theme additions must be pure data, no new drawing-logic branches

**Scale/Scope**: One reworked starter cave (erasers, gold stars, a declared quota, exactly one classroom door), five now-behavioral element ids of the fourteen declared (boulder, diamond join player/dirt/walls from feature 001; exit joins them here), one theme (Classroom) gains new fields, four-directional keyboard input plus a held grab modifier and a restart key

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Status |
|---|---|---|
| I. One Self-Contained Page | No new files outside the existing single-page build; no images/fonts/audio added; door flashing and terminal messages are drawn in code from theme data, not assets | PASS |
| II. Deterministic, Tick-Based Sim | Falling/rolling/pushing/crushing/collecting are all implemented inside the existing top-to-bottom, left-to-right scan with the existing per-cell moved flag (FR-002–FR-009, FR-045); a body that moves into an already-scanned cell resumes next tick, preserved and explicitly pinned by a new stack-resolution test (FR-046); the sim's seeded PRNG is extended with exactly one consumer (push resolution, FR-015/FR-016), still no `Math.random`, no wall-clock time, no DOM access; replay determinism is extended to falls, rolls, pushes, collection, and status (FR-049) | PASS |
| III. Themes Are Data, Not Code | Theme contract gains fields for the door's closed/open appearance, the two terminal messages, and the readout wording (FR-038); no rendering code branches on theme id or element id (FR-037, FR-042); flashing timing lives entirely in the renderer, never in sim state (FR-039) | PASS |
| IV. Simple, Dependency-Light Svelte | No new runtime dependency; new sim logic is plain TypeScript in `src/sim/`; the collected/quota readout and terminal-state banner are small additions to the existing Svelte shell, not a new architectural layer | PASS |
| V. Keyboard-First Input | Grab modifier and restart key are added the same way direction keys were in feature 001 — held-key state resolved in the shell, reported per tick (FR-019, FR-021); touch/gamepad remain explicitly out of scope for this feature, unchanged from feature 001's deferral | PASS (deferred, not violated) |
| VI. Performance Is A Feature | Falling/rolling scan reuses the existing single-pass, allocation-free walk; the new `falling` flag is one more parallel typed array sized once at cave load, not per tick; SC-013 explicitly requires holding frame rate with many bodies moving at once | PASS |
| VII. Verifiable Without A Browser | Every new rule ships an ASCII-cave `vitest` test per FR-045/FR-046, including the subtle no-randomness-consumed-on-a-blocked-push case and the multi-tick stack-resolution case; `npm test` still builds first and runs headless | PASS |

No violations. Complexity Tracking is not needed.

## Project Structure

### Documentation (this feature)

```text
specs/002-rock-physics-exit/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md         # Phase 1 output (/speckit-plan command)
├── quickstart.md         # Phase 1 output (/speckit-plan command)
├── contracts/            # Phase 1 output (/speckit-plan command)
│   └── sim-api.md
├── checklists/
│   └── requirements.md
└── tasks.md              # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

This feature is additive over the feature-001 skeleton — no new top-level
directories, only new/modified files inside it:

```text
src/
├── sim/
│   ├── elements.ts           # UNCHANGED — boulder/diamond/exit already declared, no new ids
│   ├── grid.ts                # + falling flag: parallel Uint8Array (get/set/clear), cloned alongside cells/movedThisTick
│   ├── prng.ts                # UNCHANGED signature; gains its first real consumer (tick.ts)
│   ├── cave.ts                # + quota (parse-time validation, FR-027), collected, status fields on CaveState;
│   │                          #   + read-only accessors: getCollected, getQuota, isDoorOpen, getStatus, isFalling (FR-043)
│   ├── tick.ts                # + falling/rolling/pushing/crushing/collecting/grab/door/status rules;
│   │                          #   + PUSH_CHANCE constant (the seeded generator's only consumer, FR-015)
│   └── ascii.ts                # caveFromAscii/asciiFromState gain the quota field pass-through
├── lib/
│   ├── input/
│   │   └── keyboard.ts         # + held grab modifier, + restart key (both reported like existing direction state)
│   ├── render/
│   │   └── canvas.ts            # + door flashing driven by its own frame timer (FR-039); + terminal-state banner;
│   │                            #   still reads only sim accessors, still zero literal appearance values
│   └── themes/
│       ├── types.ts             # + doorOpenEntry, messages{dead, completed}, readout{label/template} on Theme
│       └── classroom.ts         # + the new fields above; exit's existing entry stays the closed/locker appearance
└── caves/
    └── starter.ts               # reworked: erasers, gold stars, a declared quota, exactly one door (FR-033-FR-036)

src/App.svelte                   # + restart key wiring, + collected/quota readout, + terminal-state message display

tests/
└── sim/
    ├── falling.test.ts           # new — FR-001–FR-006, FR-046 falling cases
    ├── rolling.test.ts           # new — FR-007–FR-009, FR-046 rolling cases
    ├── crushing.test.ts          # new — FR-010–FR-011, FR-046 crush/no-crush cases
    ├── pushing.test.ts           # new — FR-012–FR-016, FR-046 push cases including the no-randomness-consumed case
    ├── grab.test.ts               # new — FR-017–FR-021, FR-046 grab cases
    ├── quota-and-door.test.ts     # new — FR-022–FR-027, FR-046 door/quota cases
    ├── terminal-and-restart.test.ts # new — FR-028–FR-032, FR-046 terminal/restart cases
    ├── stack-resolution.test.ts   # new — the scan-order multi-tick stack case (FR-046, constitution Principle II)
    ├── movement.test.ts           # UNCHANGED assertions; re-run to confirm no regression (FR-048)
    ├── cave-parsing.test.ts       # + the quota-exceeds-diamonds rejection case (FR-027)
    ├── determinism.test.ts        # + a replay covering falls/rolls/a held push/a collection/a death (SC-009)
    └── helpers/
        └── ascii-cave.ts          # runTicks/caveFromLines gain optional grab-per-tick input, quota option
```

**Structure Decision**: Same single Svelte/Vite project as feature 001; no
new directories. Every new rule lives in `src/sim/` (plain TypeScript, no
Svelte/DOM/`Math.random`) per `CLAUDE.md`'s sim/shell line; every new visual
or input concern lives under `src/lib/` or `src/App.svelte`. Tests continue
to live under `tests/sim/` and exercise only `src/sim/` exports through the
ASCII helper.

## Complexity Tracking

*No violations — table not needed.*
