---

description: "Task list for Arcade Shell — Eight Caves, Timer, Score, Lives, and Game Over"
---

# Tasks: Arcade Shell — Eight Caves, Timer, Score, Lives, and Game Over

**Input**: Design documents from `/specs/005-arcade-shell-caves/`

**Prerequisites**: [plan.md](./plan.md) (required), [spec.md](./spec.md) (required for user stories), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/sim-api.md](./contracts/sim-api.md), [contracts/session-api.md](./contracts/session-api.md), [quickstart.md](./quickstart.md)

**Tests**: Included — `CLAUDE.md` and this feature's spec (FR-054, FR-055) require every rule that changes the grid to ship an ASCII-cave `vitest` test and every session/score/persistence rule to ship a plain unit test over plain data, so test tasks are mandatory here, not optional. Keyboard/DOM wiring (`src/lib/input/keyboard.ts`, `src/App.svelte`) has no automated test today and gets none here either — it is verified by the maintainer at review time per `quickstart.md`, same as features 001–004.

**Organization**: Tasks are grouped by user story (spec.md priorities) so each story is independently implementable and testable. The one sim change (the cave clock) is User Story 2's alone; everything else — session, scoring, the eight caves, persistence, pause/restart — is new shell-owned code under `src/lib/` and `src/caves/`, per `CLAUDE.md`'s sim/shell line.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, or independent additive regions of the same file, no dependency on an incomplete task in this list)
- **[Story]**: US1–US6, matching spec.md's user stories
- Every task names its exact file path(s)

## Path Conventions

Single front-end project (unchanged from features 001–004): sim code under `src/sim/`, sim tests under `tests/sim/`; new session code under `src/lib/session/`, its tests under `tests/lib/session/`; new storage code under `src/lib/storage/`, its tests under `tests/lib/storage/`; the eight caves under `src/caves/`, their tests under `tests/caves/`; theme data under `src/lib/themes/`, its tests under `tests/lib/themes/`.

---

## Phase 1: Setup

**Purpose**: Confirm the branch is a clean base for this feature before any code changes

- [X] T001 Run `npm test` on the current branch (build + full vitest suite) and confirm the feature-001–004 baseline passes with no failures, establishing the pre-change state this feature's work is measured against

**Checkpoint**: Baseline confirmed green. No source files touched yet.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The one shared constant, the session module's type shape, and a real (if temporary) cave list that every user story's session code compiles against. Nothing here is independently player-visible yet.

**⚠️ CRITICAL**: No user story task can start until this phase is complete.

- [X] T002 In `src/sim/cave.ts`, add `export const TICK_RATE_HZ = 8;` (relocated from `App.svelte`'s local constant, research.md Decision 2) — the single seconds↔ticks conversion both `parseCave` (User Story 2) and the shell's tick-loop interval (User Story 1) will import from here. Do not touch `App.svelte` yet; its own rewrite (T011) switches to importing this constant.
- [X] T003 [P] Create `src/lib/session/types.ts`: `export type Screen = 'title' | 'caveIntro' | 'playing' | 'paused' | 'lifeLost' | 'caveComplete' | 'gameOver' | 'won';` and `export interface SessionState { readonly screen: Screen; readonly score: number; readonly lives: number; readonly caveIndex: number; readonly caveState: CaveState; readonly attemptEnded: boolean; readonly screenTicks: number; }` per contracts/session-api.md and data-model.md's Game Session table. Plain TypeScript, no Svelte import (FR-045).
- [X] T004 [P] Create `src/caves/index.ts` exporting `export const CAVES: readonly CaveDefinition[] = [starterCave];` — a placeholder wrapping the existing `src/caves/starter.ts` cave, sufficient for `src/lib/session/session.ts`'s `startGame()`/`advanceScreen()` (User Story 1) to compile and be tested against a real array from day one. User Story 4 replaces this placeholder with the eight shipped caves and retires `starter.ts`.

**Checkpoint**: Shared tick-rate constant, session types, and a real (placeholder) cave list exist. User story implementation can now begin.

---

## Phase 3: User Story 1 - A run, from the title screen to game over (Priority: P1) 🎯 MVP

**Goal**: `startGame()` → `caveIntro` → `playing`; a lethal tick ends the attempt (`endAttempt('death')`), costing exactly one life and reloading the same cave fresh from its definition, through `lifeLost` back to `playing`; a third such death ends the game (`gameOver`) with the final score, returning to `title`; every screen is visibly distinct, in theme-data wording, and reachable with a documented start key.

**Independent Test**: Drive the session through a scripted sequence with no browser — start a game, kill the kid three times in a tiny fixture cave, and confirm lives go 3 → 2 → 1 → 0, that each death reloads the same cave in its starting state, and that the third produces game over and a return to the title with the score preserved for the high-score comparison.

### Tests for User Story 1

- [ ] T005 [P] [US1] In `tests/lib/session/session.test.ts`, write a test for `startGame()`: `screen: 'caveIntro'`, `score: 0`, `lives: 3`, `caveIndex: 0`, `caveState` freshly built from `CAVES[0]` (FR-002, Acceptance Scenario 1).
- [ ] T006 [P] [US1] In the same file, write a test that `tickSession(session, input)` returns `session` unchanged — no sim `tick()` call, asserted by an unchanged `caveState.tick` — for every screen other than `'playing'` (title, caveIntro, paused, lifeLost, caveComplete, gameOver, won) (FR-011, FR-028).
- [ ] T007 [P] [US1] In the same file, write a test that a lethal tick during `'playing'` (new `getStatus()` is `'dead'`) routes through `endAttempt('death')`: `lives` decrements by exactly 1, `screen` becomes `'lifeLost'`, and `caveState` is rebuilt fresh from the cave's declared definition — grid-identical to a brand-new `parseCave` call, not a snapshot of the crashed grid (FR-005, FR-013, FR-023, FR-024, FR-027b).
- [ ] T008 [P] [US1] In the same file, write a test driving the 3 → 2 → 1 → 0 lives sequence across three scripted deaths in a tiny fixture cave: the third death produces `screen: 'gameOver'`; a subsequent `startGame()` call produces `score: 0`, `lives: 3`, `caveIndex: 0` again (FR-025, Acceptance Scenario 5, SC-006).
- [ ] T009 [P] [US1] In the same file, write tests for `advanceScreen(session)`: `'caveIntro'` → `'playing'`; `'lifeLost'` → `'caveIntro'` for the already-reloaded cave; `'gameOver'` → `'title'`; each on a call standing in for a keypress, and independently once `session.screenTicks` reaches that screen's documented delay (FR-003, FR-005, FR-007).

### Implementation for User Story 1

- [ ] T010 [US1] Create `src/lib/session/session.ts` implementing `startGame()`, `tickSession(session, input)` (gated on `screen === 'playing'`; on a new `'dead'` status, calls `endAttempt(session, 'death')`; otherwise returns the advanced `caveState` with `score` unchanged — scoring itself lands in User Story 3), `advanceScreen(session)` (covering `'caveIntro'`/`'lifeLost'`/`'gameOver'` for now; `'caveComplete'`/`'won'` land in User Story 4), and the internal `endAttempt(session, cause: 'death' | 'restart')` guarded by `session.attemptEnded` (idempotent per attempt; decrements `lives`; `gameOver` at 0; otherwise rebuilds `caveState` from `CAVES[caveIndex]` via a fresh `parseCave` call and resets `attemptEnded: false`) per contracts/session-api.md and research.md's `endAttempt` decision. Only the `'death'` cause is exercised until User Story 5 adds `restartAttempt`. Depends on T002, T003, T004.
- [ ] T011 [US1] Rewrite `src/App.svelte` to own a `SessionState` (from `startGame()`) instead of a bare `CaveState`: the tick loop calls `tickSession()` only while `screen === 'playing'`, and `advanceScreen()` otherwise, driven by a keypress or by counting elapsed frames against each screen's documented delay; import `TICK_RATE_HZ` from `src/sim/cave.ts` instead of the local constant (T002). Template grows from the two existing overlay `<div>`s to screen-conditional overlays for `title`/`caveIntro`/`lifeLost`/`gameOver`, plus a HUD showing stars-of-quota and lives (score and time land in later stories) — every value read fresh each frame through session/sim accessors, never a local copy (FR-044). On the title screen, any of the documented start/confirm key, a movement key, or grab starts the game (spec Edge Cases: "a movement key ... starts the game like any other key, and is not also delivered to the kid on the first tick"). Every string comes from theme data (FR-046, T013). Depends on T010.
- [ ] T012 [US1] Add a one-shot **start/confirm** key to `src/lib/input/keyboard.ts` (`consumeStart()`), documented, not colliding with the existing movement/grab/restart keys (FR-048); a held key is reported only once until released, matching the existing grab/restart discipline (FR-049).
- [ ] T013 [P] [US1] In `src/lib/themes/types.ts`, add `title: string`, `caveIntro: { template: string }`, `lifeLost: { label: string }`, `gameOver: { label: string }` to `Theme`; in `src/lib/themes/classroom.ts`, add Classroom-voice values for each, following the existing `readout.template` `{placeholder}` pattern (FR-002, FR-003, FR-005, FR-007, FR-046). Distinct from the existing `messages.dead`/`messages.completed` in-play banners.
- [ ] T014 [US1] Update `tests/lib/themes/classroom.test.ts` to assert the four new fields from T013 are present and non-empty. Depends on T013.

**Checkpoint**: The title → play → death → life-lost → reload → … → game-over → title loop works end to end and is unit-tested; score stays 0 throughout (User Story 3 wires it up).

---

## Phase 4: User Story 2 - The clock runs out (Priority: P1)

**Goal**: A cave with a declared time limit counts down at exactly one second per second of ticks; reaching zero while in play kills the kid with no explosion, the same death path any other lethal event takes; a cave with no declared limit never times out.

**Independent Test**: Load a fixture cave with a short time limit, run ticks with no input, and confirm the remaining time falls by one per second of ticks, that the kid dies on the tick the clock reaches zero, and that the cave never reports negative time.

### Tests for User Story 2

- [ ] T015 [P] [US2] Write ASCII-cave tests in `tests/sim/cave-clock.test.ts`: `getRemainingSeconds` falls by exactly one per `TICK_RATE_HZ` ticks, reports the cave's full `timeLimitSeconds` at tick zero, and never goes negative (FR-010, FR-012, SC-002).
- [ ] T016 [P] [US2] In the same file: on the tick `remainingTimeTicks` reaches `0` while `status === 'inPlay'`, the kid dies with **no explosion** and `status` resolves to `'dead'` in that same tick (FR-013).
- [ ] T017 [P] [US2] In the same file: the clock does not advance once `status` is `'dying'`, `'dead'`, or `'completed'` (FR-011).
- [ ] T018 [P] [US2] In the same file: a cave with no declared `timeLimitSeconds` never times out over a long run (≥1000 ticks) and `getRemainingSeconds` returns `undefined` (FR-009, FR-052).
- [ ] T019 [P] [US2] In the same file: completion beats expiry — a cave whose door opens on the same tick the clock would reach zero ends `'completed'`, not `'dead'` (FR-014).
- [ ] T020 [P] [US2] In the same file: the same cave, seed, and inputs time out on exactly the same tick across two independent runs (FR-051, SC-002).
- [ ] T021 [P] [US2] In `tests/sim/cave-parsing.test.ts`, add cases rejecting a `timeLimitSeconds` that is zero, negative, fractional, or non-numeric — naming the cave and the offending value, no partial grid — and accepting a positive whole number (FR-015).
- [ ] T022 [P] [US2] Extend `tests/sim/determinism.test.ts`'s full-replay assertion to also cover `remainingTimeTicks`/`getRemainingSeconds` for a cave with a time limit (FR-051).

### Implementation for User Story 2

- [ ] T023 [US2] In `src/sim/cave.ts`: add optional `timeLimitSeconds?: number` to `CaveDefinition`; add `remainingTimeTicks: number | undefined` to `CaveState`; in `parseCave`, validate it (positive whole number, same failure discipline as the existing checks) and set `remainingTimeTicks = timeLimitSeconds * TICK_RATE_HZ` when present, else `undefined`; add `export function getRemainingSeconds(state: CaveState): number | undefined` returning `Math.ceil(remainingTimeTicks / TICK_RATE_HZ)`, never negative, `undefined` when the cave has no limit (FR-009, FR-010, FR-012, FR-015, data-model.md). Depends on T002.
- [ ] T024 [US2] In `src/sim/tick.ts`'s `tick()`: add a pre-scan decrement step alongside `ageExplosions`/`ageMagicWall` — if `status === 'inPlay'` (read at the start of the tick) and `remainingTimeTicks !== undefined` and `> 0`, decrement it by 1; after the main scan (so a same-tick door-entry completion has already had the chance to set `status = 'completed'`), if `status === 'inPlay'` and `remainingTimeTicks === 0`, set `status = 'dying'` directly — no `stampBlast`, no cell touched, nothing queued in `pendingBlasts` — so the existing `dying && !hasAnyExplosion(grid) → dead` closing check resolves it to `'dead'` in the same tick (FR-011, FR-013, FR-014, research.md Decisions 1 and 3). Depends on T023.
- [ ] T025 [P] [US2] In `src/sim/ascii.ts`, add optional `timeLimitSeconds?: number` to `AsciiCave`, forwarded into the `CaveDefinition` returned by `caveFromAscii`. Depends on T023.
- [ ] T026 [P] [US2] In `tests/sim/helpers/ascii-cave.ts`, add matching optional `timeLimitSeconds?: number` to `CaveOptions`, forwarded through `caveFromLines`. Depends on T025.
- [ ] T027 [US2] In `src/App.svelte`'s HUD (T011), add the seconds-remaining readout, read via `getRemainingSeconds` every frame and shown only when defined (FR-043, FR-044); add the `hud.time` label field to `Theme` in `src/lib/themes/types.ts` and `classroomTheme` in `src/lib/themes/classroom.ts` (FR-046). Depends on T011, T023.

**Checkpoint**: The clock is implemented, tested, and deterministic; it is visible on the HUD; every existing no-time-limit cave is unaffected.

---

## Phase 5: User Story 3 - Stars, the quota, and the bonus at the door (Priority: P1)

**Goal**: A collected star is worth 10 points before the quota is met and 15 after; completing a cave adds one point per second remaining, computed once and only presented as a skippable tally; score carries forward across caves and never rolls back on a failed attempt.

**Independent Test**: With no browser, feed a session a sequence of collected counts and confirm the score matches the documented arithmetic at every step, including the switch to the higher value once the quota is met; complete a fixture cave with a known number of seconds left and confirm exactly that many bonus points are added, once.

### Tests for User Story 3

- [ ] T028 [P] [US3] Write `tests/lib/session/scoring.test.ts` covering `starValue(preCollected, quota)`: below quota → 10, at-or-above quota → 15, and the boundary star (`preCollected === quota - 1`) → 10, the pre-quota reading (FR-017, research.md's flagged boundary-star decision).
- [ ] T029 [P] [US3] In the same file, cover `bonusFor(remainingSeconds)`: identity (`N` → `N`), and `0` → `0` (FR-019, spec Edge Cases).
- [ ] T030 [P] [US3] In `tests/lib/session/session.test.ts`, add a test that `tickSession` adds `starValue(preCollected, quota)` to `score` on a collection during `'playing'` and adds nothing on any other tick outcome (FR-016–FR-018); and a test that on the tick `getStatus()` first reports `'completed'`, `score` rises by `bonusFor(getRemainingSeconds(...))` exactly once and `screen` becomes `'caveComplete'` (FR-006, FR-019, FR-020).
- [ ] T031 [P] [US3] In the same file, add a test that a star collected during an attempt that ends in death stays scored — `score` is not rolled back to its value at attempt start (FR-017a) — and a test that `score` is unaffected by `caveIndex` changing across a cave transition (FR-021).
- [ ] T032 [P] [US3] In the same file, add a test that the score at the moment `'caveComplete'` is entered already equals the full documented total (star points + bonus), so a skipped or interrupted tally can never disagree with one that ran to completion (FR-020).

### Implementation for User Story 3

- [ ] T033 [US3] Create `src/lib/session/scoring.ts`: `export function starValue(preCollected: number, quota: number): 10 | 15` and `export function bonusFor(remainingSeconds: number): number` per contracts/session-api.md.
- [ ] T034 [US3] In `src/lib/session/session.ts`'s `tickSession`, add the scoring diff (`getCollected` before vs. after the sim `tick()` call → `starValue`, added to `score`) and the completion bonus (`getStatus` transitioning to `'completed'` → `bonusFor(getRemainingSeconds(...))`, added once, `screen: 'caveComplete'`, `screenTicks: 0`). Depends on T010, T023, T033.
- [ ] T035 [US3] In `src/App.svelte`'s HUD (T011), add the score readout (FR-021, shown during play and on game-over/win); add a `caveComplete` screen overlay presenting the bonus tally, animating toward the already-final `score` from T034 (the arithmetic is not a side effect of the animation, FR-020), skippable on the start/confirm key; add the `hud.score` label field to `Theme`/`classroomTheme`. Depends on T011, T034.

**Checkpoint**: Score arithmetic is complete and carries across a cave transition; the tally can never disagree with the final total.

---

## Phase 6: User Story 4 - Eight caves that teach, and a win (Priority: P1)

**Goal**: Eight original, individually-tuned caves ship in a fixed difficulty-curve order, each passing structural and quota-reachability checks; completing a non-final cave advances to the next with score and lives carried forward; completing the eighth produces a win, not a ninth cave.

**Independent Test**: Run every shipped cave through the parser and the static cave checks with no browser — each parses, has exactly one kid, is fully enclosed, cannot kill the kid on tick zero, and carries a quota the layout can actually supply. Then drive cave one to completion from a recorded input sequence and confirm the door opens, the cave completes, and the session moves to cave two.

### Tests for User Story 4

- [ ] T036 [P] [US4] Write `tests/sim/reachability.test.ts` for the flood-fill in isolation: reachable stars counted through cells the kid can enter (`empty`, `dirt`, `diamond`, `exit`); blocked by any wall, body, enemy, amoeba, magic wall, or expanding wall; a `butterfly` in the reachable region counted as 9 stars; `attainable = quota <= reachableStars` (FR-035, data-model.md).
- [ ] T037 [US4] Write `tests/caves/shipped-caves.test.ts`: `CAVES.length === 8`, in the documented order; every cave parses without error; each has exactly one `player`, an indestructible border on all four sides, exactly one `exit`, and nothing capable of killing the kid on tick zero or the immediately following ticks before the player has acted (FR-031, FR-034, SC-010). Depends on T050 (needs the real eight-cave `CAVES`).
- [ ] T038 [US4] In the same file, add a case that every shipped cave passes the FR-035 reachability check via `src/sim/reachability.ts` (SC-010). Depends on T036, T041, T050.
- [ ] T039 [US4] Write `tests/caves/cave-one-winning-sequence.test.ts`: a recorded input sequence for cave one drives it from tick zero to `status === 'completed'` via quota-met → door-open (FR-036, SC-011). Depends on T042, T050.
- [ ] T040 [US4] In `tests/lib/session/session.test.ts`, add a test that `advanceScreen` from `'caveComplete'` increments `caveIndex` and rebuilds `caveState` from the next cave in `CAVES` (own quota/clock restarting), and a test that from the eighth cave's `'caveComplete'` it transitions to `'won'` instead of a ninth cave (FR-006, SC-001). Depends on T050, T051.

### Implementation for User Story 4

- [ ] T041 [US4] Create `src/sim/reachability.ts`: a pure, exported flood-fill from the kid's spawn cell over `empty`/`dirt`/`diamond`/`exit`, counting reachable `diamond` cells plus 9 per reachable `butterfly`, no grid mutation, no PRNG use (FR-035, data-model.md).
- [ ] T042 [US4] Write `src/caves/cave-01-dig-and-collect.ts`: dirt, stars, the door, no hazards (FR-032.1) — enclosed border, one kid, one door, explicit `quota` and `timeLimitSeconds`.
- [ ] T043 [P] [US4] Write `src/caves/cave-02-falling.ts`: boulders that drop when the dirt beneath them goes (FR-032.2).
- [ ] T044 [P] [US4] Write `src/caves/cave-03-rolling-and-pushing.ts`: stacks that roll, and at least one push the player must make to progress (FR-032.3).
- [ ] T045 [P] [US4] Write `src/caves/cave-04-fireflies.ts`: a patrol to time a run past (FR-032.4).
- [ ] T046 [P] [US4] Write `src/caves/cave-05-butterflies.ts`: includes the boulder-drop-onto-butterfly trick that turns one into stars (FR-032.5).
- [ ] T047 [P] [US4] Write `src/caves/cave-06-magic-wall.ts`: a stretch worth feeding, and a wall that dies once spent, explicit `magicWallDuration` (FR-032.6).
- [ ] T048 [P] [US4] Write `src/caves/cave-07-amoeba.ts`: a blob that must be sealed or outrun, explicit `amoebaGrowthRate`/`amoebaSizeLimit` (FR-032.7).
- [ ] T049 [P] [US4] Write `src/caves/cave-08-finale.ts`: combines dig-and-collect, falling, rolling/pushing, a firefly, a butterfly, the magic wall, and the amoeba (FR-032.8).
- [ ] T050 [US4] Rewrite `src/caves/index.ts` to export `CAVES` as the eight caves above, in order, replacing the T004 placeholder; delete `src/caves/starter.ts` (FR-031, FR-037). Depends on T042–T049.
- [ ] T051 [US4] In `src/lib/session/session.ts`'s `advanceScreen`, implement the `'caveComplete'` transition: increment `caveIndex` and rebuild `caveState` from `CAVES[caveIndex]`, or transition to `'won'` after the eighth (FR-006). Depends on T010, T050.
- [ ] T052 [US4] Add a `won: { label: string }` field to `Theme`/`classroomTheme`, and a `won` screen overlay in `src/App.svelte` showing the final score (FR-007, FR-008, FR-046). Depends on T011.

**Checkpoint**: Eight original, reachability-checked caves ship in the documented order; cave one is provably completable end to end; completing the eighth wins the game instead of loading a ninth cave.

---

## Phase 7: User Story 5 - Pause, and a restart that is always one key away (Priority: P2)

**Goal**: A pause key freezes the simulation (grid, clock, tick count) until pressed again; a restart key reloads the current cave at any point in an attempt's life, costing exactly one life when the attempt was still live and nothing when it had already ended or not yet begun; a restart on the last life ends the game exactly as a death would.

**Independent Test**: Toggle pause in a headless session and confirm no ticks advance while paused and that the tick count, clock, and grid are identical before and after; press restart from play, from pause, while the cave is dying, and from the death screen, and confirm each yields a fresh copy of the current cave, that the first three each spend exactly one life, that the fourth spends none, and that a restart on the last life ends the game.

### Tests for User Story 5

- [ ] T053 [P] [US5] In `tests/lib/session/session.test.ts`, add tests for `pauseToggle`: `'playing'` ⇄ `'paused'`; a no-op from every other screen; `caveState` byte-identical before and after any number of toggle cycles (FR-028–FR-030, SC-008).
- [ ] T054 [P] [US5] In the same file, add tests for `restartAttempt`: from `'playing'`, `'paused'`, and while the cave is `'dying'`, each costs exactly one life and reloads at once (skipping `'lifeLost'`) (FR-005 last sentence, FR-027); from `'lifeLost'` and from `'caveIntro'`, each costs nothing (FR-027a); a restart on the last life produces `'gameOver'` exactly as a death does (FR-025, SC-009).
- [ ] T055 [P] [US5] In the same file, add a test that a death detected by `tickSession` and a `restartAttempt` call landing on the same tick cost one life in total, not two — `endAttempt`'s idempotency guarantee (FR-023, FR-027a, spec Edge Cases).

### Implementation for User Story 5

- [ ] T056 [US5] In `src/lib/session/session.ts`, implement `pauseToggle(session)` (screen swap only, never calls `tick()`) and `restartAttempt(session)` (calls `endAttempt(session, 'restart')`) per contracts/session-api.md. Depends on T010.
- [ ] T057 [US5] Add a one-shot **pause** key to `src/lib/input/keyboard.ts` (`consumePause()`), not colliding with movement/grab/restart/start (FR-048).
- [ ] T058 [US5] In `src/App.svelte`, wire the pause key to `pauseToggle()` and the existing restart key to `restartAttempt()` (replacing the tick loop's direct `parseCave` call); add a `paused` screen overlay with a visible paused indicator (FR-028); add a `paused: { label: string }` field to `Theme`/`classroomTheme` (FR-046). Depends on T011, T056, T057.

**Checkpoint**: Pause and restart both work from every reachable point, each spending exactly the documented number of lives.

---

## Phase 8: User Story 6 - Coming back to a high score (Priority: P3)

**Goal**: The high score and the furthest cave number reached survive a reload, are shown on the title screen, and degrade silently to "absent" when storage is unavailable, full, throwing, or holds nonsense.

**Independent Test**: Record a score and a cave reached, simulate a reload, and confirm both come back; then simulate storage being unavailable and confirm the game starts and plays normally with the values simply absent.

### Tests for User Story 6

- [ ] T059 [P] [US6] Write `tests/lib/storage/save.test.ts`: a round-trip — `writeSave({ highScore, furthestCave })` then `readSave()` — returns the same values (FR-038).
- [ ] T060 [P] [US6] In the same file, add tests that `highScore` is written only via `Math.max(stored, finalScore)` and `furthestCave` only via `Math.max(stored, caveNumber)` (FR-039).
- [ ] T061 [P] [US6] In the same file, add a test using a storage stub that throws on every read and write: `readSave()` still returns absent values and `writeSave()` does not throw to its caller (FR-041).
- [ ] T062 [P] [US6] In the same file, add tests that a stored value which is missing, negative, non-numeric, or (for `furthestCave`) outside `[1, 8]` is treated as absent — `highScore` defaults to `0`, `furthestCave` to `1` (FR-042).

### Implementation for User Story 6

- [ ] T063 [US6] Create `src/lib/storage/save.ts`: `readSave()`/`writeSave(record)` over one JSON object under a single `localStorage` key, both wrapped in `try`/`catch`, with out-of-range/invalid values treated as absent (FR-038, FR-041, FR-042, data-model.md Saved Record).
- [ ] T064 [US6] In `src/App.svelte`, call `writeSave` with the greater of the stored and final `score` whenever `screen` becomes `'gameOver'` or `'won'` (FR-039), and with the greater of the stored and current `caveIndex + 1` whenever a cave begins (`'caveIntro'`, FR-039); call `readSave` once at the title screen and show both values there, blank when absent (FR-040). Depends on T011, T063.

**Checkpoint**: The high score and furthest cave survive a reload and never crash or warn when storage is unavailable.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Full-suite regression, theme-contract verification, and the final headless/build gate

- [ ] T065 [P] Re-run `tests/sim/elements.test.ts`, `grid.test.ts`, `movement.test.ts`, `falling.test.ts`, `rolling.test.ts`, `pushing.test.ts`, `crushing.test.ts`, `grab.test.ts`, `enemies.test.ts`, `detonation.test.ts`, `explosions.test.ts`, `amoeba.test.ts`, `magic-wall.test.ts`, `expanding-wall.test.ts`, `quota-and-door.test.ts`, `stack-resolution.test.ts`, and `terminal-and-restart.test.ts`, and confirm every assertion still passes unchanged against the new tick phase order (FR-052, SC-014).
- [ ] T066 Update `tests/lib/themes/classroom.test.ts` to assert every field this feature adds (`title`, `caveIntro.template`, `lifeLost.label`, `gameOver.label`, `won.label`, `paused.label`, `hud.time`, `hud.score`, and any remaining HUD labels) is present, non-empty, and distinguishable, and that the existing `messages.dead`/`messages.completed` in-play banners are unchanged and distinct from the new full-screen wording (FR-046, SC-013). Depends on T013, T027, T035, T052, T058.
- [ ] T067 Run `npm test` (builds `dist/` first, then the full vitest suite) and confirm every case in FR-055/quickstart.md's checklist passes headless with no browser, canvas, storage, or audio device, and that `dist/` still holds exactly one self-contained `index.html` (SC-014, SC-015).
- [ ] T068 Maintainer-only (not automatable, per quickstart.md): play through `dist/index.html` via `file://` — the curve across all eight caves, each cave's time limit and quota, HUD legibility, the bonus tally's feel, retry latency, the paused state, and the title/win screens' voice — and decide whether losing window focus should auto-pause (spec's explicitly deferred judgment call).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — run first
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS every user story (T003's `SessionState`/`Screen` shape and T004's `CAVES` array are imported by every session function in every later phase; T002's `TICK_RATE_HZ` is imported by both User Story 1's tick loop and User Story 2's clock)
- **User Stories (Phase 3–8)**: All depend on Foundational completion
  - US1 (P1) has no dependency on any other story and is the MVP loop
  - US2 (P1) depends only on Foundational — its sim work is independent of US1, though its HUD/theme task (T027) touches files US1 already created (T011, T013)
  - US3 (P1) depends on US1's `tickSession`/`endAttempt` (T010) and US2's `getRemainingSeconds` (T023) to wire scoring and the bonus into the tick handler
  - US4 (P1) depends on US1's `advanceScreen` (T010) to add the `caveComplete`/`won` transitions, and stands up the real eight-cave `CAVES` array US1–US3's placeholder (T004) was standing in for
  - US5 (P2) depends only on US1's `session.ts`/`App.svelte` (T010, T011) — pause and restart are additive functions in the same module
  - US6 (P3) depends only on US1's `App.svelte` (T011) for the moments it writes/reads storage
- **Polish (Phase 9)**: Depends on all desired user stories being complete

### Within Each Story

- Tests are written before implementation (write the test, confirm it fails, then implement)
- `session.ts`'s functions are added incrementally to the same file across stories (`startGame`/`tickSession`/`advanceScreen`/`endAttempt` in US1; scoring added to `tickSession` in US3; `caveComplete`/`won` added to `advanceScreen` in US4; `pauseToggle`/`restartAttempt` added in US5) — each story's session task depends on the prior story's session task, never the reverse
- `App.svelte` is rewritten once in US1 (T011) and then extended by one small addition per later story (T027, T035, T052, T058, T064) — never re-rewritten
- Within US4, the eight cave files (T042–T049) can be written in parallel; `caves/index.ts` (T050) depends on all eight; the reachability check (T038) and cave-one's winning sequence (T039) both depend on T050

### Parallel Opportunities

- Foundational's T003 and T004 can run in parallel once T002 lands (T002 has no dependency on either)
- All "Tests for USn" tasks marked [P] within one story's phase can run together — they are independent test cases, mostly in the same file
- Cave files T043–T049 (all of US4 except cave one, T042) can be written in parallel by different people once Foundational is done
- US2's sim work (T015–T026) and US1's shell work (T005–T014) can proceed in parallel once Foundational is done, since neither touches the other's files except the small, later HUD addition (T027)

---

## Parallel Example: User Story 1

```bash
# Launch all US1 test-writing tasks together (same file, independent describe/it blocks):
Task: "Write startGame() test in tests/lib/session/session.test.ts"
Task: "Write tickSession no-op-outside-playing test in tests/lib/session/session.test.ts"
Task: "Write death → endAttempt('death') test in tests/lib/session/session.test.ts"
Task: "Write 3→2→1→0 → gameOver test in tests/lib/session/session.test.ts"
Task: "Write advanceScreen transition tests in tests/lib/session/session.test.ts"

# Then implement sequentially (same file, App.svelte depends on session.ts existing):
Task: "Implement startGame/tickSession/advanceScreen/endAttempt in src/lib/session/session.ts"
Task: "Rewrite src/App.svelte to own a SessionState"
```

---

## Implementation Strategy

### MVP First (User Stories 1–4 — all P1)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks every story)
3. Complete Phase 3: User Story 1 (the title-to-game-over loop, one placeholder cave)
4. Complete Phase 4: User Story 2 (the clock, tested and on the HUD)
5. Complete Phase 5: User Story 3 (scoring and the bonus)
6. Complete Phase 6: User Story 4 (the real eight caves, win state)
7. **STOP and VALIDATE**: `npm test`, then the maintainer's browser checklist in quickstart.md
8. This is the MVP: a full, scored, eight-cave run from title to win or game over

### Incremental Delivery

1. Setup + Foundational → session types and a placeholder cave list exist, nothing observable yet
2. Add User Story 1 → the game loop is playable end to end on one cave, unscored
3. Add User Story 2 → the clock can kill you, and shows on the HUD
4. Add User Story 3 → stars and completion are worth points → this plus US1/US2 is a scored, single-cave loop
5. Add User Story 4 → the real eight caves replace the placeholder, win state lands → **MVP**
6. Add User Story 5 → pause and instant restart
7. Add User Story 6 → the high score survives a reload
8. Polish → full regression, theme-contract check, headless suite + build gate

### Parallel Team Strategy

With multiple developers, after Foundational lands:

- Developer A: User Story 1, then User Story 5 (both own `session.ts`'s screen/attempt machinery)
- Developer B: User Story 2 (pure sim, independent of A's work except the small HUD addition)
- Developer C: the eight cave files for User Story 4 (independent data, parallel by cave)
- Developer D: User Story 6 (storage is fully independent of everything but `App.svelte`'s existence)
- User Story 3 waits on A's `tickSession`/`endAttempt` and B's `getRemainingSeconds`, so it is the natural next task for whoever finishes first

---

## Notes

- [P] tasks touch different files (or independent additive regions of the same file) and have no unmet dependency within this list
- [Story] labels map every phase-3+ task to its user story for traceability
- This feature adds zero new `Grid` typed arrays and no new element ids — no task touches `src/sim/elements.ts` or `src/sim/grid.ts`, and `src/sim/prng.ts` gains no new consumer (FR-050, FR-051)
- `src/lib/render/camera.ts` and `src/lib/render/canvas.ts` are unchanged — no task touches them; all new HUD/screen content is DOM/Svelte markup in `App.svelte`, not canvas-drawn
- Every task that changes the grid ships or updates an ASCII-cave test in the same story phase (FR-054); every session/score/persistence rule ships a plain unit test over plain data in the same story phase (FR-054)
- Verify each new test fails before its paired implementation task, then passes after
- Commit after each task or logical group; stop at any checkpoint to validate a story independently
