# Implementation Plan: Fireflies, Butterflies, and Explosions

**Branch**: `003-enemies-explosions` | **Date**: 2026-08-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-enemies-explosions/spec.md`

## Summary

Features 001 and 002 shipped a cave the kid can dig, walk, and be crushed in,
with two enemy element ids (`firefly`, `butterfly`) declared but inert. This
feature gives them behavior — a fixed wall-follower patrol on a half-speed
cadence, opposite turning preferences per type — and gives the cave its
signature scoring trick: a detonated enemy stamps a 3x3 blast that destroys
everything but steel walls and the door, and resolves after two ticks into
either empty space (firefly, and the kid) or gold stars (butterfly). Enemies
inside a blast are destroyed and themselves detonate one tick later, so a
chain visibly cascades one link per tick. The kid's own death — by enemy
contact or by the crushing rule feature 002 already has — now blooms the same
way, via a new `dying` cave status that keeps the simulation advancing (chain
still resolving, enemies still patrolling) while refusing input and the win
condition, until the last explosion burns out and the cave goes `dead`.

The technical approach stays entirely inside the existing tick-scan and
typed-array-grid architecture: two new parallel per-cell arrays on `Grid`
(`facing` for enemies, plus a remaining-ticks/target-content pair for
explosion cells), one new `CaveStatus` value (`dying`), a small
`pendingBlasts` list carried on `CaveState` between ticks for one-link-per-tick
chain propagation, and one new per-tick phase (age/convert explosion cells,
then stamp any blasts a prior tick's chain deferred) that runs before the
existing top-to-bottom, left-to-right scan gains one more dispatched element
type (the two enemies) and one more trigger inside the existing falling-body
state machine (a falling body whose target cell holds an enemy detonates it
instead of moving in). No new grid element ids, no new theme fields, and — a
genuinely pleasant consequence of building death as "the kid's cell becomes an
explosion cell" — no explicit "ignore input while dying" branch anywhere: once
the kid's cell is no longer `'player'`, the existing movement dispatch simply
has nothing left to move. `src/App.svelte` and `src/lib/render/canvas.ts`
need no changes at all; the renderer already draws whatever `getCell` reports
through the active theme, and the status banner already renders nothing for
any status it doesn't explicitly name.

## Technical Context

**Language/Version**: TypeScript 5.x, compiled by Vite; Svelte 5 (runes) — unchanged from features 001/002

**Primary Dependencies**: Unchanged — Svelte 5, Vite, `vite-plugin-singlefile`, `@sveltejs/vite-plugin-svelte`, vitest. No new runtime dependency; this feature is new rules over the existing typed-array grid, the existing scan, and the existing seeded PRNG (which gains no new consumer — FR-034).

**Storage**: N/A — unchanged; enemy facing, explosion state, and the pending-blast queue all live in in-memory `CaveState` and are rebuilt from cave data on restart, same as collected/quota/status today.

**Testing**: vitest, run headless (`npm test`), no DOM/canvas/browser-automation packages — unchanged

**Target Platform**: Any modern browser via `file://`, one build artifact — unchanged

**Project Type**: Single front-end project — unchanged

**Performance Goals**: Steady frame rate through several patrolling enemies and a chain of at least six blasts at once, 60fps target / 30fps floor (constitution Principle VI, spec SC-013); the new enemy-step and blast-stamping code must stay allocation-free in the hot per-cell scan — the one accepted exception is the small `pendingBlasts` array carried on `CaveState`, sized to the number of enemies a chain reaches in flight (at most the enemy count), not to grid size, and rebuilt (not appended-to-unboundedly) each tick.

**Constraints**: Zero network requests at play time; zero new image/font/audio files; the seeded PRNG remains the sim's only randomness source and gains no new consumer (FR-034); sim code still contains no wall-clock time, no DOM access, no `Math.random`; theme additions (relabeling only) must be pure data with no new drawing-logic branches; every rule that changes the grid ships an ASCII-cave test (FR-035).

**Scale/Scope**: One reworked starter cave gaining at least one firefly on a watchable loop and at least one eraser-reachable butterfly (FR-026); two of the fourteen declared element ids (`firefly`, `butterfly`) move from inert to behavioral, plus the existing `explosion` id gains its first real behavior; one theme (Classroom) gets two corrected labels/glyphs; no new input, no new element ids, no new theme fields.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Status |
|---|---|---|
| I. One Self-Contained Page | No new files outside the existing single-page build; no images/fonts/audio added; explosions and enemies are drawn from existing theme glyphs/colors, never assets | PASS |
| II. Deterministic, Tick-Based Sim | Enemy steps, detonation, blast stamping, explosion aging, and chain propagation all run inside the existing top-to-bottom, left-to-right scan with the existing per-cell moved flag; a chain link deferred to "next tick" is state on `CaveState` (`pendingBlasts`), not a second scan pass this tick (FR-008, FR-023); the enemy cadence is derived purely from the cave's own tick counter, no wall clock (FR-002); no new PRNG consumer (FR-009, FR-034); replay determinism is extended to enemy positions/facings and explosion state (FR-040) | PASS |
| III. Themes Are Data, Not Code | The Classroom naming fix (FR-029) touches only `src/lib/themes/classroom.ts` — two labels and, if needed for distinguishability, two glyphs/colors; explosions render through the theme's existing `explosion` entry with no new branching (FR-031); `ThemeEntry`'s existing shape (fillColor/glyph/label) is sufficient, so the theme contract needs no new field — if implementation finds otherwise, that is reported as a contract defect per FR-030, not special-cased | PASS |
| IV. Simple, Dependency-Light Svelte | No new runtime dependency; all new logic is plain TypeScript in `src/sim/`; `src/App.svelte` and `src/lib/render/canvas.ts` require zero changes (see Summary) | PASS |
| V. Keyboard-First Input | No new input added or required; the dying state's "input is ignored" requirement is satisfied structurally (the kid's cell is no longer `'player'` once dead) rather than by shell input-gating code, so FR-033's "the shell MUST NOT reimplement the input-ignoring rule" holds by construction | PASS |
| VI. Performance Is A Feature | Enemy facing and explosion state are two/three more fixed-size parallel typed arrays sized once at cave load, cloned alongside `cells`/`movedThisTick`/`falling` — same pattern feature 002 established; the one small non-typed-array allocation (`pendingBlasts`) is bounded by enemy count, not grid size, and only nonempty while a chain is in flight; SC-013 explicitly requires holding frame rate through a six-blast chain | PASS |
| VII. Verifiable Without A Browser | Every new rule ships an ASCII-cave `vitest` test per FR-035/FR-036, including the tick-by-tick chain-propagation case and the mid-chain-death case; `npm test` still builds first and runs headless | PASS |

No violations. Complexity Tracking is not needed.

## Project Structure

### Documentation (this feature)

```text
specs/003-enemies-explosions/
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

This feature is additive over the feature-001/002 skeleton — no new
top-level directories, only new/modified files inside it:

```text
src/
├── sim/
│   ├── elements.ts           # UNCHANGED — firefly/butterfly/explosion already declared, no new ids
│   ├── grid.ts                # + facing: parallel Uint8Array (get/set), enemy-only, carried tick-to-tick;
│   │                          #   + explosionRemaining/explosionContent: parallel Uint8Arrays (get/set/clear),
│   │                          #     carried tick-to-tick like `falling`;
│   │                          #   + Direction type and its index mapping move here from tick.ts (now shared by
│   │                          #     TickInput and enemy facing), re-exported from tick.ts for existing importers
│   ├── prng.ts                # UNCHANGED — this feature adds no consumer (FR-034)
│   ├── cave.ts                # + 'dying' added to CaveStatus; + pendingBlasts field on CaveState (chain queue);
│   │                          #   + parse-time quota check relaxed: reject only when quota exceeds
│   │                          #     diamonds + 9*butterflies (FR-025), tallying butterflies alongside diamonds;
│   │                          #   + read-only accessors: getEnemyFacing, isExplosion (FR-033)
│   ├── tick.ts                # + enemy step phase (cadence, wall-follower, contact detonation) dispatched
│   │                          #   alongside player/body in the main scan;
│   │                          #   + explosion age/convert pass and pending-blast stamp pass, both run once per
│   │                          #     tick before the main scan;
│   │                          #   + stampBlast helper (3x3 clip, spares steelWall/exit, queues chain links);
│   │                          #   + processBody gains an enemy-below and player-below (crush) detonation branch,
│   │                          #     replacing feature 002's direct-crush-kill with a stamped blast (FR-013);
│   │                          #   + dead-transition check: 'dying' -> 'dead' on the first tick with no explosion
│   │                          #     cell left anywhere in the grid
│   └── ascii.ts                # UNCHANGED — enemies/explosions are ordinary characters in the existing mapping
├── lib/
│   ├── render/
│   │   └── canvas.ts            # UNCHANGED — explosion and enemy cells already render via getCell + theme lookup
│   └── themes/
│       ├── types.ts             # UNCHANGED — ThemeEntry's existing shape is sufficient (see Constitution Check)
│       └── classroom.ts         # firefly relabeled "Pencil Sharpener", butterfly relabeled "Paper Airplane"
│                                 #   (FR-029), with glyphs/colors adjusted only as needed for distinguishability
└── caves/
    └── starter.ts               # reworked: + at least one firefly on a watchable loop, + at least one
                                  #   eraser-reachable butterfly, no enemy adjacent to the kid at tick zero,
                                  #   quota still reachable without detonating the butterfly (FR-026, FR-027)

src/App.svelte                   # UNCHANGED — see Summary and Constitution Check (Principle V)

tests/
└── sim/
    ├── enemies.test.ts           # new — FR-001–FR-009 patrol/turning/cadence/blocking cases
    ├── detonation.test.ts        # new — FR-010–FR-015 trigger cases (contact, falling body, chain, crush, dying)
    ├── explosions.test.ts        # new — FR-016–FR-024 blast/lifetime/sparing/chain cases
    ├── crushing.test.ts          # UPDATED — FR-013's amended expected grid (bloom + empty space, not silent death)
    ├── cave-parsing.test.ts      # UPDATED — FR-025's relaxed quota-vs-diamonds+butterflies check, both directions
    ├── determinism.test.ts       # UPDATED — replay extended to cover patrols, a chain, and a death (SC-011)
    ├── terminal-and-restart.test.ts # UPDATED — restart during 'dying', dead-freeze once the last bloom burns out
    ├── movement.test.ts           # UNCHANGED assertions; re-run to confirm no regression
    ├── falling.test.ts            # UNCHANGED assertions; re-run to confirm no regression
    ├── rolling.test.ts            # UNCHANGED assertions; re-run to confirm no regression
    ├── pushing.test.ts            # UNCHANGED assertions; re-run to confirm no regression
    ├── grab.test.ts               # UNCHANGED assertions; re-run to confirm no regression
    ├── quota-and-door.test.ts     # UNCHANGED assertions; + gold-stars-from-a-blast-count-toward-quota case
    ├── stack-resolution.test.ts   # UNCHANGED assertions; re-run to confirm no regression
    ├── grid.test.ts               # UNCHANGED assertions; re-run to confirm no regression
    ├── elements.test.ts           # UNCHANGED assertions; re-run to confirm no regression
    └── helpers/
        └── ascii-cave.ts          # UNCHANGED — enemies/explosions are ordinary characters, no new helper needed

tests/lib/themes/classroom.test.ts # UPDATED — asserts the corrected labels and mutual/global distinguishability
```

**Structure Decision**: Same single Svelte/Vite project as features 001/002;
no new directories. Every new rule lives in `src/sim/` (plain TypeScript, no
Svelte/DOM/`Math.random`) per `CLAUDE.md`'s sim/shell line; the only shell
change is the theme relabeling, which is data. Tests continue to live under
`tests/sim/` and exercise only `src/sim/` exports through the existing ASCII
helper.

## Complexity Tracking

*No violations — table not needed.*
