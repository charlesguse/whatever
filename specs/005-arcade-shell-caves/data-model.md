# Phase 1 Data Model: Arcade Shell — Eight Caves, Timer, Score, Lives, and Game Over

Entities below extend feature 004's data model
([`specs/004-amoeba-magic-walls/data-model.md`](../004-amoeba-magic-walls/data-model.md)),
which itself extends features 001–003's. Sim entities not listed here
(Element, Grid, Roll Surface, Push Resolution, Enemy Step, Blast/Chain,
Amoeba/Magic Wall/Expanding Wall) are unchanged and not repeated. This
feature adds one sim entity (the cave clock) and several new shell-owned
entities that did not exist before this feature.

## Cave Definition (extends feature 001's shape, unchanged since)

| Field | Type | Notes |
|---|---|---|
| timeLimitSeconds | `number` (optional) | **New.** Whole seconds (FR-009). Omitted means no clock — the cave behaves exactly as caves do today (FR-009, FR-052). All eight shipped caves declare one (FR-009). |

**Validation rule (FR-015):** if present, `timeLimitSeconds` MUST be a
positive whole number; a violation fails the same way every other
`parseCave` rule does — naming the cave and the offending value, producing
no partial grid.

## Cave State (extends feature 004's `CaveState`)

| Field | Type | Notes |
|---|---|---|
| remainingTimeTicks | `number \| undefined` | **New.** `undefined` when the cave declares no time limit (never times out). Otherwise starts at `timeLimitSeconds * TICK_RATE_HZ` at parse time (an exact integer — both operands are whole numbers) and is decremented by exactly `1`, once per tick, by a pass that runs before the main scan, for every tick `status === 'inPlay'` at the start of that tick (research.md Decision 1). Never decremented below `0`. Frozen — unchanged — the instant `status` leaves `'inPlay'` (dying, dead, or completed), including for the rest of that same tick once a death or completion is detected (FR-011). |

`TICK_RATE_HZ` (new, exported constant, relocated from `App.svelte` into
`src/sim/cave.ts`, research.md Decision 2): the single conversion between
seconds and ticks, value `8` (unchanged from the shell's existing tick-loop
rate — this feature does not change the game's speed, only names the
constant it already ran at). Both `parseCave` (seconds → ticks at parse
time) and `App.svelte`'s tick-loop interval calculation import this one
value.

## Read Accessor (new, added to `src/sim/cave.ts` alongside existing accessors)

| Accessor | Returns | Notes |
|---|---|---|
| `getRemainingSeconds(state)` | `number` | **New (FR-012).** `undefined` when the cave has no time limit (`remainingTimeTicks === undefined`); otherwise `Math.ceil(remainingTimeTicks / TICK_RATE_HZ)`, never negative. On tick zero this equals the cave's full `timeLimitSeconds` exactly (ceiling of an exact multiple); it reaches `0` only once `remainingTimeTicks` has actually reached `0`, never earlier from rounding. This is the only way anything outside `src/sim/` may observe the clock — the shell's HUD and the bonus calculation both read only this accessor, never `remainingTimeTicks` directly (FR-044). |

## Timeout Death (new — extends the tick's per-tick phase order, research.md Decision 3)

| Concept | Notes |
|---|---|
| Trigger (FR-013) | Evaluated once, after the main scan has run (so a same-tick door entry has already had the chance to set `status = 'completed'` — FR-014, "completion beats expiry"). Fires only if, at that point, `status === 'inPlay'` and `remainingTimeTicks === 0`. |
| Effect | `status` is set to `'dying'` directly. No `stampBlast` call; no cell is touched; nothing is appended to `pendingBlasts` (FR-013 — "MUST NOT produce an explosion, MUST NOT destroy anything else"). |
| Resolution | The tick's existing closing check (`if (status === 'dying' && !hasAnyExplosion(grid)) status = 'dead'`, unchanged from feature 003) finds no explosion cells present — because none were ever stamped — and flips `status` to `'dead'` in this same tick. The shell's attempt-over handling therefore sees a `'dead'` status on the very tick the clock reached zero, exactly as it does for any other death, just without an explosion to render (FR-013). |
| Cannot recur while dying/dead/completed | Guaranteed structurally: `remainingTimeTicks` only decrements while `status === 'inPlay'` (Cave State, above), so once a cave leaves `'inPlay'` — by this rule or any other death, or by completion — the clock is frozen and this trigger's `remainingTimeTicks === 0` condition can only be evaluated (and can only newly become true) while still `'inPlay'` (spec Edge Cases: "the clock reaches zero while the cave is already dying" cannot happen). |

## Cave Sequence (new — the game's content, `src/caves/index.ts`)

| Field | Type | Notes |
|---|---|---|
| `CAVES` | `readonly CaveDefinition[]`, length 8 | The eight shipped caves, in the fixed documented order (FR-031, FR-032): (1) dig and collect, (2) falling, (3) rolling and pushing, (4) fireflies, (5) butterflies, (6) magic wall, (7) amoeba, (8) finale. Each cave sets its own `quota`, `timeLimitSeconds`, and — where the cave uses the element — explicit `amoebaGrowthRate`/`amoebaSizeLimit`/`magicWallDuration` rather than relying on defaults (FR-031). |

**Structural requirements every cave in `CAVES` MUST satisfy (FR-034),**
checked by `tests/caves/shipped-caves.test.ts` by parsing each and
inspecting the result: exactly one `player`; enclosed by an indestructible
border (`steelWall`) on all four sides; nothing capable of killing the kid
on tick zero or the immediately following ticks before the player has
acted; exactly one `exit`; winnable within its `timeLimitSeconds` using only
the keyboard (this last property is verified by the maintainer at review
time for caves 2–8, per FR-036, and by a recorded input tape for cave 1).

## Quota Reachability Check (new entity — `src/sim/reachability.ts`, research.md's reachability decision)

Pure, exported, static analysis over a `CaveDefinition` — no grid mutation,
no PRNG use, no relationship to `tick()`.

| Concept | Notes |
|---|---|
| Reachable region (FR-035) | A flood fill from the kid's spawn cell, through cells the kid can enter: `empty`, `dirt`, `diamond` (gold star), and `exit`. Every other content — either wall, either body not already a diamond, an enemy, amoeba, the magic wall, the expanding wall — is a boundary the fill does not cross. |
| Reachable stars | The count of `diamond` cells found inside the reachable region, plus `9` for every `butterfly` cell inside the reachable region (mirroring `parseCave`'s existing whole-grid quota ceiling, but restricted to the reachable set). |
| Verdict | `attainable = quota <= reachableStars`. A necessary condition only — FR-035 is explicit this is not a solvability proof; it exists to catch a quota typo or a star walled off behind steel, not to guarantee a path a player can actually execute. |

## Screen (new — `src/lib/session/types.ts`)

```ts
type Screen =
  | 'title'
  | 'caveIntro'
  | 'playing'
  | 'paused'
  | 'lifeLost'
  | 'caveComplete'
  | 'gameOver'
  | 'won';
```

Exactly one `Screen` is active at any moment (FR-001). Transitions are
listed in the Session Transitions table below; every transition is driven
by a player action (a key press) or a documented state change reported by
the cave (`getStatus()` becoming `'dead'` or `'completed'`) — never by
anything else (FR-001).

## Game Session (new — `src/lib/session/types.ts`, the `SessionState` shape)

| Field | Type | Notes |
|---|---|---|
| `screen` | `Screen` | The one active screen (FR-001). |
| `score` | `number` | Non-negative, starts at `0` on a new game, never decreases (FR-016). Carries forward across caves within a game (FR-021). |
| `lives` | `number` | Starts at `3` on a new game (FR-022); never regenerates (FR-024); reaching `0` after an attempt ends triggers `'gameOver'` (FR-025). |
| `caveIndex` | `number` | `0`-based index into `CAVES`; a new game always starts at `0` regardless of any stored "furthest cave" value (FR-002). |
| `caveState` | `CaveState` | The current cave's live sim state, rebuilt from `CAVES[caveIndex]` (never a snapshot) on every cave start and on every reload (FR-027b). |
| `attemptEnded` | `boolean` | **New, internal.** Set `true` by `endAttempt` the first time the current attempt ends (by death or by restart); guards `endAttempt` against firing twice for the same attempt (research.md's `endAttempt` decision, FR-023/FR-027a). Reset `false` whenever a fresh attempt begins (a new cave, or a reload after a life is spent). |
| `screenTicks` | `number` | **New, internal.** Ticks elapsed on the current non-`'playing'` screen, used to drive each screen's documented auto-advance delay (FR-003, FR-005, FR-007); irrelevant/unused while `screen === 'playing'`. |

Created fresh at the title screen on a documented start key (FR-002);
destroyed (replaced by a fresh session) at game over or at a win, once the
player starts again (FR-002, Acceptance Scenario 5).

## Session Transitions (new — `src/lib/session/session.ts`, the pure function surface)

| Function | From screen(s) | To screen | Effect |
|---|---|---|---|
| `startGame()` | (none — creates a session) | `caveIntro` | `score = 0`, `lives = 3`, `caveIndex = 0`, `caveState` built from `CAVES[0]` (FR-002, Acceptance Scenario 1 and 5). |
| `tickSession(session, input)` | `playing` | `playing`, `lifeLost`, or `caveComplete` | Calls `tick(caveState, input)`. Diffs `getCollected()` before/after to add star points (scoring.ts, `starValue`). If the new `getStatus()` is `'dead'`, calls `endAttempt(session, 'death')`. If `'completed'`, adds the bonus (`bonusFor(getRemainingSeconds(caveState))`) once and moves to `caveComplete`. Any screen other than `playing` is a no-op — no tick runs (FR-011, FR-028). |
| `pauseToggle(session)` | `playing` ⇄ `paused` | the other of the pair | No sim call either direction; `caveState`, `tick`, and `remainingTimeTicks` are byte-identical before and after (FR-028, FR-030). |
| `restartAttempt(session)` | `playing`, `paused`, `caveIntro`, `lifeLost` (any point in an attempt's life, FR-027) | reload of the current cave, or `gameOver` | Calls `endAttempt(session, 'restart')`, which is a no-op if the attempt already ended this tick by death (FR-027a's "whichever arrives first" case). |
| `advanceScreen(session)` | `caveIntro`, `lifeLost`, `caveComplete`, `gameOver`, `won` | the screen's documented next screen | Fires on a keypress or once `screenTicks` reaches that screen's documented delay, whichever first (FR-003, FR-005, FR-007). `caveComplete`'s advance also increments `caveIndex` and rebuilds `caveState` from the next cave, or transitions to `won` after cave 8 (FR-006). |
| `endAttempt(session, cause)` | any attempt-live screen | `lifeLost` (death) or straight to a reload (restart, FR-005/FR-027a) or `gameOver` | **Internal, shared** (research.md's `endAttempt` decision). No-ops if `session.attemptEnded` is already `true`. Otherwise: decrements `lives` by exactly `1`; if `lives === 0`, transitions to `gameOver`; else reloads `caveState` from `CAVES[caveIndex]` (fresh `parseCave` call, never a snapshot, FR-027b) and, for a death, goes to `lifeLost` — for a restart, skips `lifeLost` entirely and reloads at once (FR-005's last sentence, FR-027a). |

## Score (new — `src/lib/session/scoring.ts`)

| Function | Signature | Notes |
|---|---|---|
| `starValue(preCollected, quota)` | `(number, number) => 10 \| 15` | `preCollected >= quota ? 15 : 10` — evaluated using the collected count *before* the collection that triggers this call, so the star that first raises `collected` to meet `quota` scores `10` (research.md's flagged boundary-star decision, FR-017). |
| `bonusFor(remainingSeconds)` | `(number) => number` | Identity (`remainingSeconds` points, `1` per second, FR-019); `0` seconds yields `0` bonus (spec Edge Cases). Called exactly once per cave completion. |

No other event scores (FR-018): detonating an enemy, surviving, or
finishing with lives in hand adds nothing by itself. A star collected
during an attempt that later ends in death stays scored — there is no
per-attempt snapshot to roll back to, only the one running `session.score`
(FR-017a).

## Saved Record (new — `src/lib/storage/save.ts`)

| Field | Type | Notes |
|---|---|---|
| `highScore` | `number` | Written with `Math.max(stored, finalScore)` whenever a game ends — by game over or by winning (FR-039). Treated as `0` if the stored value is missing, unreadable, negative, or non-numeric (FR-042). |
| `furthestCave` | `number` (1-based cave number) | Written with `Math.max(stored, caveNumber)` whenever a cave begins (FR-039). A plain cave number, not a badge string or flag, so a later cave-select feature can read it with no migration (FR-038). Treated as `1` if the stored value is missing, unreadable, out of `[1, 8]` range, or non-numeric (FR-042). Never used to choose a starting cave (FR-002) — display only. |

Stored as one JSON object under a single `localStorage` key. `readSave()`
and `writeSave(record)` are both wrapped in `try`/`catch`; any thrown error
(storage disabled, full, or a `SecurityError` in a restricted context) is
swallowed and treated the same as "nothing stored" (FR-041) — the caller
never sees or handles a failure differently from an absent value.

## Theme (extends feature 004's `Theme`/`ThemeEntry` shape)

| Field | Type | Notes |
|---|---|---|
| `title` | `string` | The game's name, shown on the title screen (FR-002). |
| `hud.stars` / `hud.time` / `hud.score` / `hud.lives` | `string` (templates) | HUD labels, following the existing `readout.template` `{placeholder}` pattern (FR-043, FR-046). |
| `caveIntro.template` | `string` | Names the cave and states its quota/time limit before play begins (FR-003), with `{name}`/`{quota}`/`{time}`-style placeholders. |
| `paused.label` | `string` | The visible paused indicator (FR-028). |
| `lifeLost.label`, `gameOver.label`, `won.label` | `string` | Screen wording (FR-007, FR-008). `messages.dead`/`messages.completed` (features 001–004) are unchanged and distinct from these — those are the per-cave in-play banners; these are the new full-screen states. |

All new fields are plain strings/templates, following `CLAUDE.md`'s "if
you're writing `if (theme === ...)` the theme contract is missing a field"
rule — every string this feature shows the player lives here, and a
further theme needs only a new registry entry (FR-046, FR-047).
