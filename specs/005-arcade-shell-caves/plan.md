# Implementation Plan: Arcade Shell — Eight Caves, Timer, Score, Lives, and Game Over

**Branch**: `005-arcade-shell-caves` | **Date**: 2026-08-31 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-arcade-shell-caves/spec.md`

## Summary

Features 001–004 shipped a cave simulation that behaves correctly forever and
can never actually be lost: death only resets the same single cave, nothing
is counted, and there is exactly one cave. This feature turns that sandbox
into a game — a title screen, eight original caves in a fixed
difficulty-teaching order, a session that tracks score/lives/current cave
across them, and exactly **one** new simulation rule: an optional per-cave
clock that kills the kid on the tick it reaches zero, counted in the sim's
own ticks and reported to the shell as whole seconds by a read-only accessor
(FR-009–FR-015). Everything else this feature adds — screens, score, lives,
retry, pause, persistence, the eight caves' data, and every new player-visible
string — is new shell-owned code that reads the sim through accessors and
never reimplements it, per `CLAUDE.md`'s sim/shell line.

The sim's one change is additive and small: `CaveDefinition` gains an
optional `timeLimitSeconds`, converted at parse time (using a tick-rate
constant relocated from the shell into `src/sim/cave.ts` so both sides read
the same number, research.md Decision 2) into a cave-wide
`remainingTimeTicks` scalar, decremented by a pre-scan pass gated on
`status === 'inPlay'` — the same shape feature 004 already used for the
magic wall's countdown. On the tick it reaches zero in a cave still in play,
the kid dies by setting `status = 'dying'` directly (no `stampBlast`, no
explosion cell), which the tick's existing closing check immediately resolves
to `'dead'` in that same tick since there is no explosion to wait out —
reusing the one status machine every death already travels through without
producing a blast (research.md Decision 3). A cave declaring no time limit
stores `remainingTimeTicks: undefined` and is untouched, so every existing
test cave keeps behaving exactly as it does today (FR-052).

Everything shell-owned lives in a new plain-TypeScript session module,
`src/lib/session/`, not Svelte — because FR-045 requires score, lives, and
current cave to be "readable and testable without a browser, canvas, or
storage," the same standard the sim already meets. A `SessionState` record
(screen, score, lives, current cave index, an embedded `CaveState`) is
advanced by pure functions: one drives a sim tick only while
`session.screen === 'playing'` (which is what makes pause, the cave intro,
the tally, and the terminal screens all correctly stop the clock, FR-011/
FR-028–FR-030, with the sim never knowing a screen exists); others handle
start, pause/resume, restart, and screen-advance/skip. Score is computed by
diffing `getCollected()` before and after each tick (10 or 15 points,
depending on whether the quota was already met *before* that collection —
research.md's flagged decision on the boundary star) and by reading
`getRemainingSeconds()` the tick `getStatus()` first reports `'completed'`
(one point per second, added once); the bonus tally is presentation only,
animating toward an already-final number, so a skipped or interrupted tally
can never disagree with a completed one (FR-020). A single shared
`endAttempt(session, cause)` transition, called by both a tick-detected death
and a voluntary restart, is guarded to fire at most once per attempt, which
is what keeps FR-023/FR-027/FR-027a's "exactly one life, however the attempt
ends" true even when both triggers land on the same tick (research.md's
`endAttempt` decision). `App.svelte` shrinks to plumbing: its existing
accumulator tick loop calls into the session module, and its template grows
from two overlay `<div>`s to a small set of screen overlays plus a HUD, all
reading through session/sim accessors, never keeping a local copy.

Eight small, individually-retunable cave-definition modules
(`src/caves/cave-01-*.ts` … `cave-08-*.ts`, collected by `src/caves/index.ts`)
replace the single `starter.ts`, each declaring its own quota, time limit,
and (where used) explicit amoeba/magic-wall tuning — still pure declarative
data, touching no simulation or rendering file (FR-037). A new, exported,
allocation-light flood-fill (`src/sim/reachability.ts`) implements FR-035's
conservative quota-attainability check, run once per shipped cave inside the
existing `vitest` suite rather than as new build tooling (research.md's
reachability decision). Persistence is one new best-effort `localStorage`
module (`src/lib/storage/save.ts`) reading/writing a single JSON record
(`highScore`, `furthestCave`) at exactly the points the spec names, with
every failure swallowed silently and never reaching the player (FR-038–
FR-042). Theme data (`src/lib/themes/types.ts`, `classroom.ts`) gains roughly
a dozen new string fields — title, cave-intro template, paused label,
life-lost/game-over/win wording, and HUD labels — following the existing
`readout.template` placeholder pattern; no rendering or session code branches
on theme identity anywhere in this feature (FR-046, FR-047).

## Technical Context

**Language/Version**: TypeScript 5.x, compiled by Vite; Svelte 5 (runes) —
unchanged from features 001–004

**Primary Dependencies**: Unchanged — Svelte 5, Vite, `vite-plugin-singlefile`,
`@sveltejs/vite-plugin-svelte`, vitest. No new runtime dependency. The seeded
PRNG gains **no** new consumer (FR-051 — the clock consumes no randomness);
this feature's only sim change is the cave-clock decrement/expiry rule.

**Storage**: Browser `localStorage`, best-effort, one JSON record
(`highScore: number`, `furthestCave: number`) — **new for this feature**
(FR-038–FR-042). Every read and write is wrapped so a throwing, full, or
absent `localStorage` degrades to "values absent," never a crash or a
visible warning (FR-041). Nothing else is persisted; nothing leaves the
device (constitution Product Constraints).

**Testing**: vitest, run headless (`npm test`, which builds first — the
build test needs a fresh `dist/`), no DOM/canvas/audio-device/browser-
automation packages — unchanged. Session, scoring, storage, and
cave-reachability logic are plain unit tests over plain data (FR-054),
exactly like the existing ASCII-cave sim tests are over grids.

**Target Platform**: Any modern browser via `file://`, one build artifact —
unchanged

**Project Type**: Single front-end project — unchanged. No router, no
second HTML page: the eight screens (FR-001) are UI state within the one
existing Svelte component tree, not routes.

**Performance Goals**: Steady frame rate — 60fps target / 30fps floor
(constitution Principle VI, spec SC-xxx) — through the full session shell
(HUD, screen overlays, the cave clock, the bonus tally animation) running
on top of the existing tick/render loops, across all eight shipped caves.
The clock's per-tick cost is one integer comparison and, at most, one
decrement — no new per-tick allocation; the session tick handler reads two
existing-shape accessor values (`getCollected`, `getStatus`) via a diff,
not a new array.

**Constraints**: Zero network requests at play time (unchanged); zero new
image/font/audio files (all new visuals are theme-data strings/colors, per
Principle III); sim code still contains no wall-clock time, no DOM access,
no `Math.random` (FR-050); the tick-rate constant now has exactly one
declaration, imported by both the sim (to convert `timeLimitSeconds` at
parse time) and the shell (for its own tick-loop interval), per FR-010 and
research.md Decision 2; every rule that changes the grid ships an ASCII-cave
test, and every session/score/persistence rule ships a plain unit test over
plain data (FR-054).

**Scale/Scope**: Eight shipped caves (replacing the single starter cave),
each individually declared and validated; one new optional `CaveDefinition`
field and one new read accessor on the sim's public surface; one new
shell-owned session module with roughly five pure transition functions; one
new storage module; one new reachability-check module; ~12 new theme string
fields on one shipped theme (Classroom); three input bindings added
(start/confirm, pause; restart already exists) with no collisions
(FR-048); no new element ids, no new `Grid` typed arrays.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Status |
|---|---|---|
| I. One Self-Contained Page | Every new screen/HUD element is markup in the existing single Svelte component tree, drawn from theme data and existing canvas/DOM machinery — no new asset files, no new page, no CDN/network call; `localStorage` is a same-origin browser API, not a network request (FR-038, FR-041) | PASS |
| II. Deterministic, Tick-Based Sim | The cave clock is the sim's only change: a cave-wide scalar decremented by a pre-scan pass gated on `status === 'inPlay'`, resolved through the existing scan/moved-flag machinery and the existing `dying → dead` closing check, consuming zero PRNG draws (FR-050, FR-051); replay determinism is extended to `remainingTimeTicks` (FR-051, SC-002) | PASS |
| III. Themes Are Data, Not Code | All ~12 new player-visible strings (title, cave intro, paused, life-lost, game over, win, HUD labels) are new theme fields following the existing `readout.template` pattern (FR-046); zero shell logic branches on theme identity; a further theme needs only a new registry entry (FR-047) | PASS |
| IV. Simple, Dependency-Light Svelte | No new runtime dependency; the session module (score/lives/screens) is plain TypeScript with no Svelte import, exactly like the sim; `App.svelte` grows only as thin plumbing over that module and existing render/input machinery | PASS |
| V. Keyboard-First Input | Start/confirm and pause are two new, documented keys, chosen not to collide with movement, grab, or the existing restart key (FR-048); every screen transition, retry, and the whole game is reachable with a keyboard alone (FR-048); touch/gamepad remain explicitly out of scope per the spec, and nothing in the session module assumes keyboard is the only possible input source | PASS |
| VI. Performance Is A Feature | The clock adds one integer field and one comparison per tick, no per-tick allocation; the session's score diff reads two existing accessor values, no new array; SC- targets require holding frame rate through all eight caves with the full shell running | PASS |
| VII. Verifiable Without A Browser | The cave clock's every rule (fall rate, freeze conditions, expiry-vs-completion precedence, no-time-limit no-op, determinism) is pinned by ASCII-cave `vitest` tests (FR-054, FR-055); screens/score/lives/persistence/reachability are pinned by plain unit tests over plain data, no DOM/canvas/storage device, no browser-automation tooling added; `npm test` still builds first and runs headless | PASS |

No violations. Complexity Tracking is not needed.

## Project Structure

### Documentation (this feature)

```text
specs/005-arcade-shell-caves/
├── plan.md                  # This file (/speckit-plan command output)
├── research.md               # Phase 0 output (/speckit-plan command)
├── data-model.md              # Phase 1 output (/speckit-plan command)
├── quickstart.md              # Phase 1 output (/speckit-plan command)
├── contracts/                 # Phase 1 output (/speckit-plan command)
│   ├── sim-api.md             # extends 004's sim-api.md — the cave clock
│   └── session-api.md         # new — the shell-owned session module's surface
├── checklists/
│   └── requirements.md
└── tasks.md                   # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

Additive over the feature-001–004 skeleton; the largest change is a new
`src/lib/session/` module and the replacement of the single starter cave
with eight declared caves. No new top-level directories beyond
`src/lib/session/` and `src/lib/storage/`.

```text
src/
├── sim/
│   ├── elements.ts            # UNCHANGED — no new element ids
│   ├── grid.ts                 # UNCHANGED — no new per-cell typed array; the clock is cave-wide, not per-cell
│   ├── prng.ts                 # UNCHANGED — no new consumer (FR-051)
│   ├── cave.ts                 # + TICK_RATE_HZ (relocated from App.svelte, research.md Decision 2);
│   │                            #   + timeLimitSeconds (optional) on CaveDefinition, validated at parse (FR-015);
│   │                            #   + remainingTimeTicks on CaveState, set from timeLimitSeconds * TICK_RATE_HZ
│   │                            #   (undefined when no limit declared);
│   │                            #   + read-only accessor getRemainingSeconds (FR-012, ceil, never negative)
│   ├── tick.ts                  # + pre-scan pass: decrement remainingTimeTicks while status === 'inPlay'
│   │                             #   (alongside ageExplosions/magic-wall countdown);
│   │                             #   + post-scan check: if remainingTimeTicks reaches 0 and status is still
│   │                             #   'inPlay' (i.e. the door didn't also open this tick, FR-014), set
│   │                             #   status = 'dying' directly — no stampBlast (research.md Decision 3)
│   ├── ascii.ts                  # + AsciiCave gains one optional pass-through field (timeLimitSeconds)
│   └── reachability.ts            # NEW — FR-035's conservative reachable-stars flood-fill over a
│                                   #   CaveDefinition; pure, exported, no grid mutation
├── lib/
│   ├── session/                    # NEW — plain TypeScript, no Svelte import (FR-045)
│   │   ├── types.ts                # Screen union (title/caveIntro/playing/paused/lifeLost/caveComplete/
│   │   │                           #   gameOver/won), SessionState shape
│   │   ├── session.ts               # pure transition functions: startGame, tickSession, pauseToggle,
│   │   │                            #   restartAttempt, advanceScreen (intro/tally/life-lost/game-over/win
│   │   │                            #   auto-advance-or-skip), endAttempt (shared by death and restart,
│   │   │                            #   research.md's endAttempt decision)
│   │   └── scoring.ts                # pure: starValue(preCollected, quota) -> 10 | 15; bonusFor(remainingSeconds)
│   ├── storage/                       # NEW
│   │   └── save.ts                    # best-effort readSave()/writeSave({highScore, furthestCave}); every
│   │                                  #   operation try/catch-wrapped, absent/invalid treated as absent (FR-041, FR-042)
│   ├── input/
│   │   └── keyboard.ts                 # + one-shot start/confirm key; + one-shot pause key; existing
│   │                                   #   direction/grab/restart bindings unchanged, no collisions (FR-048, FR-049)
│   ├── render/
│   │   ├── camera.ts                    # UNCHANGED
│   │   └── canvas.ts                     # UNCHANGED grid-drawing; no canvas-drawn HUD/screen text — HUD and
│   │                                     #   screen overlays are DOM/Svelte markup, same pattern as today's
│   │                                     #   .readout/.status-banner
│   └── themes/
│       ├── types.ts                       # + ~12 new string fields (title, caveIntro template, paused label,
│       │                                  #   lifeLost/gameOver/won wording, HUD labels for score/lives/time),
│       │                                  #   following the existing readout.template placeholder pattern
│       └── classroom.ts                    # + values for every new field (FR-046)
├── caves/
│   ├── cave-01-dig-and-collect.ts           # NEW — replaces starter.ts (FR-032.1)
│   ├── cave-02-falling.ts                    # NEW (FR-032.2)
│   ├── cave-03-rolling-and-pushing.ts         # NEW (FR-032.3)
│   ├── cave-04-fireflies.ts                    # NEW (FR-032.4)
│   ├── cave-05-butterflies.ts                   # NEW (FR-032.5)
│   ├── cave-06-magic-wall.ts                     # NEW (FR-032.6)
│   ├── cave-07-amoeba.ts                          # NEW (FR-032.7)
│   ├── cave-08-finale.ts                           # NEW (FR-032.8)
│   └── index.ts                                     # NEW — CAVES: readonly CaveDefinition[], length 8, in order
│                                                     #   (starter.ts retired — spec Assumptions)
└── App.svelte                                        # rewritten: owns a SessionState instead of a bare
                                                        # CaveState; tick loop calls session.tickSession(); template
                                                        # gains screen-conditional overlays (title/caveIntro/
                                                        # paused/lifeLost/caveComplete/gameOver/won) and a HUD
                                                        # (stars/quota, time, score, lives), all reading through
                                                        # session/sim accessors, no locally duplicated state (FR-044)

tests/
├── sim/
│   ├── cave-clock.test.ts                  # NEW — FR-009–FR-015: fall rate, freeze conditions, expiry-vs-
│   │                                        #   completion precedence, no-limit no-op, determinism
│   ├── reachability.test.ts                 # NEW — the flood-fill's own unit behavior in isolation
│   ├── cave-parsing.test.ts                  # UPDATED — timeLimitSeconds validation (FR-015)
│   ├── determinism.test.ts                    # UPDATED — replay extended to cover remainingTimeTicks
│   └── (elements/grid/movement/falling/rolling/pushing/crushing/grab/enemies/detonation/explosions/
│        amoeba/magic-wall/expanding-wall/quota-and-door/stack-resolution/terminal-and-restart)
│                                               # UNCHANGED assertions; re-run to confirm no regression (FR-052)
├── caves/
│   ├── shipped-caves.test.ts                  # NEW — count is 8, documented order, FR-034 structural checks,
│   │                                           #   FR-035 reachability check, every cave parses (FR-033)
│   └── cave-one-winning-sequence.test.ts       # NEW — FR-036's recorded input tape, quota-met → door-open →
│                                               #   cave-complete end to end
├── lib/
│   ├── session/
│   │   ├── session.test.ts                    # NEW — screens, lives 3→2→1→0, restart from every screen,
│   │   │                                       #   pause/resume, attempt-over sharing (FR-023/FR-027/FR-027a)
│   │   └── scoring.test.ts                     # NEW — 10/15 boundary, bonus arithmetic, tally-skip equality
│   ├── storage/
│   │   └── save.test.ts                        # NEW — round-trip, throwing storage, absent/invalid values
│   └── themes/
│       └── classroom.test.ts                    # UPDATED — every new field present and distinguishable
└── build/
    └── single-file.test.ts                      # UNCHANGED
```

**Structure Decision**: Same single Svelte/Vite project as features 001–004;
no new top-level directories beyond two small additions under `src/lib/`
(`session/`, `storage/`). The one sim change lives entirely in `src/sim/`,
following the same cave-wide-scalar-plus-pre-scan-pass shape feature 004
already established for the magic wall. Everything else — screens, score,
lives, retry, pause, persistence, and the eight caves' data — is new
shell-owned code under `src/lib/` and `src/caves/`, reading the sim only
through its existing and one newly added read-only accessor, never
reimplementing it. Tests continue to live under `tests/`, mirroring
`src/`'s shape, with new directories (`tests/caves/`, `tests/lib/session/`,
`tests/lib/storage/`) matching the new source directories one-to-one.

## Complexity Tracking

*No violations — table not needed.*
