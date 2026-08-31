# Implementation Plan: Amoeba, Magic Wall, and Expanding Wall

**Branch**: `004-amoeba-magic-walls` | **Date**: 2026-08-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-amoeba-magic-walls/spec.md`

## Summary

Features 001–003 shipped a cave with a kid, rock physics, an exit, and two
patrolling enemies with explosions — but three declared element ids
(`amoeba`, `magicWall`, `expandingWall`) have sat inert since feature 001,
behaving only as feature 002's generic "things rest on it without rolling"
rule. This feature gives all three their behavior, completing the declared
element set. A growing blob of glue (amoeba) spreads into empty space and
dirt at a per-cell, per-tick probability that makes a bigger blob spread
faster, and resolves — the instant it is sealed in or the instant it exceeds
a size limit, whichever is checked first — into either gold stars (the game's
biggest single payout) or erasers (a consolation prize). A magic wall lies
dormant until the first falling eraser or gold star enters it, then runs for
a fixed number of ticks converting anything that falls in to its opposite
before dying permanently and indistinguishably from how it looked before it
ever activated. An expanding wall (bookshelf) grows one cell per tick into
open floor on both sides, forever, closing routes behind a player who
dawdles.

The technical approach stays entirely inside the existing tick-scan and
typed-array-grid architecture, and — unlike feature 003 — needs **no new
`Grid` typed arrays at all**: amoeba and expanding-wall growth are two more
branches in the same unified per-cell dispatch the main scan already uses for
the kid, bodies, and enemies (dispatched by whatever element id currently
occupies a cell, exactly the rule that already lets a cell destroyed earlier
in the same tick simply not act again), and the magic wall's phase and
countdown are cave-wide scalars on `CaveState` — never per-cell — decremented
by a cheap pass before the main scan, mirroring how explosion cells already
age each tick. The amoeba's collective size-limit and sealed checks are two
allocation-free linear scans over the grid after the main scan, reusing the
existing `hasAnyExplosion`-style full-grid-pass idiom rather than
accumulating any per-tick array. Three new optional, validated cave
parameters (`amoebaGrowthRate`, `amoebaSizeLimit`, `magicWallDuration`) join
`CaveDefinition` with documented defaults so every existing cave and test
loads unchanged. The kid's movement block gains three more names alongside
the existing brick/steel wall check; push and grab need no new code at all,
since their existing "beyond cell must be empty" / "only dirt and diamond are
special" checks already exclude the three new elements. One new theme field
(`magicWallActiveEntry`, parallel to the existing `doorOpenEntry`) and one
new `resolveEntry` branch in `canvas.ts`, keyed only on a new read-only
`getMagicWallPhase` accessor, give the active wall its distinct look while
keeping dormant and dead visually and programmatically indistinguishable
everywhere the shell surfaces anything to the player. The shipped starter
cave gains at least one of each element, placed so the cave stays winnable
without using any of them.

## Technical Context

**Language/Version**: TypeScript 5.x, compiled by Vite; Svelte 5 (runes) — unchanged from features 001–003

**Primary Dependencies**: Unchanged — Svelte 5, Vite, `vite-plugin-singlefile`, `@sveltejs/vite-plugin-svelte`, vitest. No new runtime dependency; this feature is new rules over the existing typed-array grid, the existing scan, and the existing seeded PRNG, which gains exactly one new consumer (amoeba growth, FR-037).

**Storage**: N/A — unchanged; magic wall phase/countdown and the three new cave parameters all live in in-memory `CaveState`/`CaveDefinition` and are rebuilt from cave data on restart, same as collected/quota/status today.

**Testing**: vitest, run headless (`npm test`), no DOM/canvas/browser-automation packages — unchanged

**Target Platform**: Any modern browser via `file://`, one build artifact — unchanged

**Project Type**: Single front-end project — unchanged

**Performance Goals**: Steady frame rate through an amoeba of at least 100 cells, an active magic wall, and a growing expanding wall at once, 60fps target / 30fps floor (constitution Principle VI, spec SC-012), over at least 1000 ticks with no per-tick allocation growth. The amoeba's end-of-scan collective check is two allocation-free linear grid scans (only the second is conditional), not a per-tick array; the magic wall's countdown is two scalar field reads/writes on `CaveState`, not a grid pass at all.

**Constraints**: Zero network requests at play time; zero new image/font/audio files; the seeded PRNG gains exactly one new consumer (amoeba growth, after push resolution) and no other new randomness anywhere; sim code still contains no wall-clock time, no DOM access, no `Math.random`; theme additions must be pure data with exactly one new field and no new drawing-logic branches beyond selecting it; every rule that changes the grid ships an ASCII-cave test (FR-038).

**Scale/Scope**: One reworked starter cave gaining at least one amoeba, one magic wall, and one expanding wall, placed so the cave stays winnable without any of them and nothing kills or traps the kid at tick zero (FR-031); all fourteen declared element ids now have behavior — this is the feature that closes out the declared set; one theme (Classroom) gains three corrected/confirmed labels and one new field; no new input, no new grid element ids.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Status |
|---|---|---|
| I. One Self-Contained Page | No new files outside the existing single-page build; no images/fonts/audio added; the active magic wall is drawn from existing theme glyph/color machinery, never an asset | PASS |
| II. Deterministic, Tick-Based Sim | Amoeba growth, expanding-wall growth, and magic-wall conversion all run inside the existing top-to-bottom, left-to-right scan with the existing per-cell moved flag; the amoeba's collective conversion and the magic wall's countdown are new phases that run once per tick, cave-scoped or grid-scoped and never wall-clock-scoped (FR-019, FR-021, FR-027); amoeba growth is the seeded generator's documented second consumer, in a fixed order within the tick (FR-037); replay determinism is extended to amoeba extent, magic wall phase/countdown, and expanding wall extent (FR-043) | PASS |
| III. Themes Are Data, Not Code | The three labels (FR-032) and the new `magicWallActiveEntry` field (FR-033/FR-034) touch only `src/lib/themes/types.ts` and `src/lib/themes/classroom.ts`; `canvas.ts`'s `resolveEntry` gains one boolean-keyed branch on a read-only accessor, never a branch on theme identity (FR-033, FR-035) | PASS |
| IV. Simple, Dependency-Light Svelte | No new runtime dependency; all new logic is plain TypeScript in `src/sim/`; `src/App.svelte` requires zero changes; `canvas.ts` gains exactly one new branch and one new import | PASS |
| V. Keyboard-First Input | No new input added or required; the kid's blocked-movement behavior against the three new elements reuses the existing movement dispatch with no new input-handling code | PASS |
| VI. Performance Is A Feature | Amoeba and expanding-wall growth add no new per-cell array and no per-tick allocation — they are dispatch branches over data already scanned every tick; the amoeba's collective check is two allocation-free linear scans (the second conditional); the magic wall's countdown is O(1) scalar state, not a grid pass; SC-012 explicitly requires holding frame rate through a 100+-cell amoeba, an active wall, and a growing wall together over 1000 ticks | PASS |
| VII. Verifiable Without A Browser | Every new rule ships an ASCII-cave `vitest` test per FR-038/FR-039, including the amoeba's per-cell-draw determinism cases, the magic-wall-thickness and blocked-destination cases, and a full mixed replay; `npm test` still builds first and runs headless | PASS |

No violations. Complexity Tracking is not needed.

## Project Structure

### Documentation (this feature)

```text
specs/004-amoeba-magic-walls/
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

This feature is additive over the feature-001/002/003 skeleton — no new
top-level directories, only new/modified files inside it:

```text
src/
├── sim/
│   ├── elements.ts           # UNCHANGED — amoeba/magicWall/expandingWall already declared, no new ids
│   ├── grid.ts                # UNCHANGED — this feature adds zero new per-cell typed arrays (research.md, Decision 1)
│   ├── prng.ts                # UNCHANGED — this feature adds no new PRNG mechanism, only a new consumer in tick.ts
│   ├── cave.ts                # + amoebaGrowthRate/amoebaSizeLimit/magicWallDuration on CaveDefinition and CaveState
│   │                          #   (with parse-time validation and documented defaults, FR-028/FR-029);
│   │                          #   + magicWallPhase/magicWallCountdown on CaveState (FR-015);
│   │                          #   + read-only accessor getMagicWallPhase (FR-036)
│   ├── tick.ts                # + amoeba growth dispatch branch (growAmoeba) in the main scan;
│   │                          #   + expanding wall growth dispatch branch (growExpandingWall) in the main scan;
│   │                          #   + amoeba collective conversion pass, run once after the main scan;
│   │                          #   + magic-wall countdown pass, run once before the main scan;
│   │                          #   + processBody gains a falling-body-into-amoeba branch (detonation via the
│   │                          #     existing stampBlast) and a falling-body-into-magicWall branch (activation/
│   │                          #     conversion/FR-018a);
│   │                          #   + movePlayer's wall-block check gains amoeba/magicWall/expandingWall
│   └── ascii.ts                # + AsciiCave gains three optional pass-through fields for the new cave
│                                #   parameters, forwarded into CaveDefinition; caveFromAscii/asciiFromState
│                                #   signatures otherwise unchanged (amoeba/magicWall/expandingWall are already
│                                #   ordinary characters in the existing mapping)
├── lib/
│   ├── render/
│   │   └── canvas.ts            # resolveEntry gains one branch: magicWall + getMagicWallPhase(state) === 'active'
│   │                             #   selects theme.magicWallActiveEntry, mirroring the existing doorOpenEntry
│   │                             #   pattern; no other change
│   └── themes/
│       ├── types.ts             # Theme gains one new field: magicWallActiveEntry: ThemeEntry
│       └── classroom.ts         # magicWall relabeled "Sticker Machine" (FR-032); amoeba/expandingWall labels
│                                 #   confirmed as-is; + magicWallActiveEntry with a distinct glyph/color/label
└── caves/
    └── starter.ts               # reworked: + at least one amoeba, one magic wall (with an eraser a player can
                                  #   plausibly drop into it), and one expanding wall, placed so the cave stays
                                  #   winnable without any of them and nothing traps/kills the kid at tick zero
                                  #   (FR-031); cave's three new parameters set explicitly, not left to defaults

src/App.svelte                   # UNCHANGED — no new status, no new input, no new HUD field

tests/
└── sim/
    ├── amoeba.test.ts             # new — FR-001–FR-012 growth/conversion/detonation cases
    ├── magic-wall.test.ts         # new — FR-013–FR-022 activation/conversion/expiry/thickness/blocking cases
    ├── expanding-wall.test.ts     # new — FR-023–FR-027 growth/blocking cases
    ├── cave-parsing.test.ts       # UPDATED — FR-029's new validation rules for the three new parameters, both directions
    ├── determinism.test.ts        # UPDATED — replay extended to cover amoeba growth, a magic-wall conversion, and expanding-wall growth (SC-010)
    ├── movement.test.ts           # UPDATED — the kid blocked by amoeba/magicWall/expandingWall, all three phases of the wall
    ├── pushing.test.ts            # UNCHANGED assertions; + one case confirming a push toward each new element fails, for completeness
    ├── grab.test.ts               # UNCHANGED assertions; + one case confirming grab toward each new element is a no-op, for completeness
    ├── elements.test.ts           # UPDATED — amoeba/magicWall/expandingWall move from "inert" assertions to references to the new dedicated test files
    ├── falling.test.ts            # UNCHANGED assertions; re-run to confirm no regression
    ├── rolling.test.ts            # UNCHANGED assertions; re-run to confirm no regression
    ├── crushing.test.ts           # UNCHANGED assertions; re-run to confirm no regression
    ├── enemies.test.ts            # UNCHANGED assertions; re-run to confirm no regression
    ├── detonation.test.ts         # UNCHANGED assertions; re-run to confirm no regression
    ├── explosions.test.ts         # UNCHANGED assertions; re-run to confirm no regression
    ├── quota-and-door.test.ts     # UNCHANGED assertions; re-run to confirm no regression
    ├── stack-resolution.test.ts   # UNCHANGED assertions; re-run to confirm no regression
    ├── terminal-and-restart.test.ts # UNCHANGED assertions; re-run to confirm no regression
    ├── grid.test.ts               # UNCHANGED assertions; re-run to confirm no regression
    └── helpers/
        └── ascii-cave.ts          # UPDATED — CaveOptions gains three optional pass-through fields
                                    #   (amoebaGrowthRate, amoebaSizeLimit, magicWallDuration)

tests/lib/themes/classroom.test.ts # UPDATED — asserts the relabeled magicWall entry, the new magicWallActiveEntry
                                    #   field, and mutual/global distinguishability including the new entry
```

**Structure Decision**: Same single Svelte/Vite project as features 001–003;
no new directories. Every new rule lives in `src/sim/` (plain TypeScript, no
Svelte/DOM/`Math.random`) per `CLAUDE.md`'s sim/shell line; the only shell
changes are the theme data addition and one rendering branch reading a
read-only accessor, both data/wiring rather than new logic. Tests continue to
live under `tests/sim/` and exercise only `src/sim/` exports through the
existing ASCII helper, with three new files for the three elements'
substantial new rule sets rather than growing the existing files unboundedly.

## Complexity Tracking

*No violations — table not needed.*
