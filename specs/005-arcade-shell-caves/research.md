# Phase 0 Research: Arcade Shell — Eight Caves, Timer, Score, Lives, and Game Over

The spec (`spec.md`) contains no `[NEEDS CLARIFICATION]` markers — every open
question was resolved in the Assumptions section during drafting. This
document records the implementation-pattern decisions needed to turn those
resolved rules into code over the existing feature-001–004 sim and the
current single-cave shell, plus two places where the spec's own wording
leaves more than one defensible reading and a single implementation choice
has to be picked. Both are called out below and repeated in the plan-stage
issue comment as decisions made without further clarification.

## Decisions

### Decision: The cave clock is one scalar (`remainingTimeTicks`) on `CaveState`, decremented by a pre-scan pass gated on `status === 'inPlay'` — the same shape as the magic wall's countdown

- **Rationale**: FR-010/FR-011 need "advances only while in play," "never
  wall-clock," and "the project's single documented tick-rate constant."
  Feature 004 already solved an identical shape problem for the magic wall's
  countdown (`research.md` Decision 2 there): a cave-wide scalar, decremented
  once per tick by a small pass before the main scan, gated on a status
  condition rather than derived from elapsed tick count at read time. Reusing
  it here means `remainingTimeTicks` starts at `timeLimitSeconds *
  TICK_RATE_HZ` (both integers, so this is exact) at parse time, and the
  pre-scan pass — right alongside `ageExplosions` and the magic-wall
  countdown — does `if (ctx.status === 'inPlay' && remainingTimeTicks !==
  undefined && remainingTimeTicks > 0) remainingTimeTicks -= 1`. Gating the
  decrement on `status === 'inPlay'` (checked at the *start* of this tick,
  before anything in it can change status) is what makes the clock freeze
  the instant a cave stops being in play and never needs a stored
  "tick dying began" timestamp — it simply stops decrementing that same
  tick a death is detected, satisfying FR-011 with no derived time-at-read
  logic (constitution Principle II). A cave with no declared time limit
  stores `remainingTimeTicks: undefined` and this pass no-ops for it
  forever, satisfying "every existing test cave is unaffected" (FR-052) with
  zero special-casing elsewhere.
- **Alternatives considered**: Deriving remaining time from
  `state.tick` and a stored "tick the attempt started" value (rejected —
  `state.tick` keeps advancing during `dying`, so remaining time would need
  its own separate freeze-point tracking anyway, which is exactly the stored
  countdown this decision already uses, just indirected through a subtraction
  for no benefit); a wall-clock-independent frame counter owned by the shell
  instead of the sim (rejected outright by the spec's own Assumptions section
  and by constitution Principle II — "did this cave time out" must be a pure
  function of ticks, testable and replayable with no browser).

### Decision: `TICK_RATE_HZ` moves from `App.svelte` into `src/sim/cave.ts` as an exported constant; the shell imports it instead of redeclaring it

- **Rationale**: FR-010 requires seconds and ticks to be "related by the
  project's single documented tick-rate constant, the same one the shell's
  loop uses." Today `TICK_RATE_HZ = 8` is declared only in `App.svelte`
  (the shell's tick-loop interval), and the sim has no notion of a tick
  rate at all — a mismatch this feature must close, since `parseCave` now
  needs the same number to convert a cave's declared `timeLimitSeconds`
  into `remainingTimeTicks`, and `getRemainingSeconds` needs it to convert
  back. Making `src/sim/cave.ts` the single source (alongside the existing
  `DEFAULT_AMOEBA_GROWTH_RATE`-style cave constants) and having
  `App.svelte` import it for its own `TICK_INTERVAL_MS` calculation is the
  only way both sides read literally the same number rather than two
  numbers a future edit could let drift apart.
- **Alternatives considered**: Leaving the constant in `App.svelte` and
  passing it into `parseCave` as a parameter (rejected — every call site
  would need to thread it through, including every test's `caveFromLines`
  helper call, for no benefit over importing one constant); duplicating the
  literal `8` in both places with a comment linking them (rejected — exactly
  the "two sources of truth" FR-010 is written to prevent).

### Decision: Timeout death skips `stampBlast` entirely — it sets `status = 'dying'` directly, which resolves to `'dead'` in the same tick because no explosion cell exists to wait out

- **Rationale**: FR-013 asks for two things that look like they pull apart —
  "entering exactly the same death path any lethal event produces today"
  *and* "MUST NOT produce an explosion, MUST NOT destroy anything else."
  Every existing death path funnels through one mechanism: `stampBlast`
  sets `ctx.status = 'dying'` the instant it overwrites a cell holding
  `'player'` while `status === 'inPlay'` (feature 003), and the tick's
  closing check — `if (status === 'dying' && !hasAnyExplosion(grid))
  status = 'dead'` — flips it to terminal once the blast's explosion cells
  finish aging. Timeout can reuse the *second half* of that mechanism
  without the first: after the main scan (so a same-tick door entry has
  already had the chance to set `status = 'completed'`, satisfying FR-014),
  if `status` is still `'inPlay'` and `remainingTimeTicks` has reached `0`,
  set `ctx.status = 'dying'` directly — no `stampBlast` call, no cell
  touched, nothing added to `pendingBlasts`. Since no explosion cell was
  ever created, the very same closing check that normally waits out a
  blast's two-tick aging finds `hasAnyExplosion(grid)` already false and
  flips `dying → dead` in that same tick — a same-tick, explosion-free
  death that still travels through the one status machine every other
  death uses, which is what "the same death path" means without
  contradicting "no explosion."
- **Alternatives considered**: Setting `status = 'dead'` directly, skipping
  `'dying'` altogether (rejected — this would be a second, parallel
  terminal-transition rule existing only for timeout, instead of reusing the
  one path the constitution already requires every death to take; `'dying'`
  already resolves same-tick here for free, so there is no cost to routing
  through it).

### Decision: Score and lives are computed entirely in a new shell-owned session module (`src/lib/session/`), never inside `src/sim/`

- **Rationale**: FR-045 is explicit — score, lives, and current cave "MUST
  live in one session record" that is shell-owned, plain data, and testable
  without a browser; FR-050 keeps the sim itself free of any concept of
  "points." `src/lib/session/session.ts` holds a `SessionState` (screen,
  score, lives, current cave index, an embedded `CaveState`) advanced by
  pure functions with no Svelte import and no DOM access — plain TypeScript
  living under `src/lib/`, which `CLAUDE.md`'s sim/shell line permits (the
  line is about Svelte/DOM/`Math.random`/wall-clock, not about which
  directory a file sits in). One function, `tickSession(session, input)`,
  is the only place that calls the sim's `tick()`; it does so only when
  `session.screen === 'playing'`, which gives "pause runs zero ticks" and
  "the clock doesn't advance during the cave intro/tally/life-lost/game-over"
  (FR-011, FR-028–FR-030) for free at the shell layer, without the sim ever
  needing to know a screen exists.
- **Alternatives considered**: Tracking score inside `CaveState` alongside
  `collected` (rejected — directly contradicts FR-045 and FR-050, and would
  make score a per-cave value needing its own carry-forward plumbing instead
  of the one running session total the spec describes); a Svelte store
  holding session state (rejected — Svelte stores are shell/UI machinery
  exactly like `App.svelte`'s current local `$state`, and FR-045's "readable
  and testable without a browser" is satisfied much more directly by plain
  objects and pure functions than by anything reactive).

### Decision: Score arithmetic is one diff per tick — `getCollected()` before vs. after, and `getStatus()` transitioning to `'completed'` — not a sim-side event feed

- **Rationale**: In this sim, the kid moves at most one cell per tick, so at
  most one star is ever collected in a single tick; `tickSession` can
  compare `getCollected(prevCaveState)` to `getCollected(nextCaveState)`
  after calling `tick()` and, on an increase, look at whether the *pre-tick*
  collected count already met the *pre-tick* quota to choose 10 or 15 points
  (see the next decision for the boundary case). Completion's one-time bonus
  is added the tick `getStatus()` first reports `'completed'`, using
  `getRemainingSeconds()` read on that same tick (FR-019 — "the number the
  HUD was showing at the moment of completion"). Both computations are
  synchronous, run exactly once per triggering tick, and produce the final
  score number immediately; the bonus tally screen only ever animates
  *toward* an already-final number (FR-020), so an interrupted or skipped
  tally can never disagree with a completed one.
- **Alternatives considered**: Having the sim emit a discrete event list
  per tick (e.g. `{type: 'starCollected'}`) for the shell to score
  (rejected — this is a new sim-to-shell contract surface FR-044 doesn't
  ask for and FR-050 discourages by keeping "points" a concept the sim
  never touches; a two-read diff against the existing accessors is simpler
  and needs no new sim state).

### Decision (flagged — spec wording admits two readings): the star that first meets the quota is scored at the **pre-quota** value

- **Rationale**: FR-017 says a star's value "depends only on whether the
  quota was **met** at the moment of collection" but does not say whether
  "met" is evaluated using the collected count immediately before that
  star's own collection, or immediately after. FR-055 requires a test for
  "the boundary star that meets the quota exactly" without stating which
  value it should score. This plan reads "met" as a precondition checked
  *before* the collection resolves — the star that raises `collected` from
  `quota - 1` to `quota` is, at the instant it is collected, closing a gap
  that was still open, so it scores the ordinary (10-point) value; only a
  star collected *after* the door is already open scores the higher
  (15-point) value. This matches the plain-language framing in User Story 3
  ("a player who has **met** the quota has a reason to keep collecting") —
  the quota is described as already met, i.e. a state the player is in
  *before* the next collection, not a state a collection itself can jump
  into for its own credit. **This is a decision made without further
  clarification.**
- **Alternatives considered**: Scoring the boundary star at the post-quota
  (15-point) value, by checking `collected` *after* incrementing (rejected —
  no textual signal favors this reading over the one chosen, and the chosen
  reading keeps "met the quota" describing a stable state a collection
  observes rather than one a collection can retroactively satisfy for
  itself, which is the more common arcade-scoring convention this project's
  constitution already leans on for other arithmetic, e.g. falling-vs-resting
  being a stored flag rather than a derived one).

### Decision: One shared `endAttempt` transition, called by both a tick-detected death and a voluntary restart, guarded so it fires at most once per attempt

- **Rationale**: FR-023/FR-027/FR-027a require exactly one life spent per
  attempt no matter which of the two triggers (a lethal tick result, or the
  player's restart key) reaches the session first, including the case where
  both are "true" on the same tick (the kid is mid-explosion and the player
  also presses restart). `tickSession` and the restart handler both route
  through one function, `endAttempt(session, cause)`, which no-ops if the
  session's current attempt has already ended (checked via the screen no
  longer being `'playing'`/`'paused'`/`'caveIntro'`-mid-attempt) — so
  whichever call arrives first performs the life decrement, cave reload, and
  screen transition, and the second finds nothing left to do. This is the
  single place lives decrement and the single place a cave reloads
  (FR-027), satisfying the spec's edge case "whichever arrives first is the
  one that ends the attempt, and the other finds it already ended" by
  construction rather than by a race-condition check.
- **Alternatives considered**: Separate death-handling and restart-handling
  code paths, each independently decrementing lives (rejected — this is
  exactly the shape that risks double-decrementing on the same-tick overlap
  case FR-027a's edge case describes, and the spec is explicit that one
  shared transition is the intended design, not an incidental
  simplification).

### Decision: The quota-attainability check (FR-035) is a pure, exported flood-fill (`src/sim/reachability.ts`), run once per shipped cave inside a plain `vitest` unit test — not a build step

- **Rationale**: FR-035's "necessary condition, not a proof of solvability"
  measure — reachable region from spawn, counting stars in it plus nine per
  butterfly in it — is a static analysis over a `CaveDefinition`'s rows,
  identical in spirit to `parseCave`'s existing quota-vs-diamonds ceiling
  check, just reachability-aware instead of whole-grid. Living in
  `src/sim/` (plain TypeScript, grid-shaped, no Svelte/DOM) and being
  exported lets one test (`tests/caves/shipped-caves.test.ts`) call it once
  per cave in the shipped `CAVES` array — satisfying "checked automatically"
  without inventing a new build-time tool or touching `vite.config.ts`,
  keeping the check inside the same `npm test` gate everything else runs
  through (constitution Principle VII: no new browser-automation or
  build-time test infrastructure).
- **Alternatives considered**: A `postbuild`/`prebuild` script that fails
  the build on an unattainable cave (rejected — the constitution's merge
  gate is already `npm test`, which builds first and then runs `vitest`;
  adding a second, separate build-time check is more moving parts for a
  property `vitest` can already assert directly on the same
  `CaveDefinition` objects the shell imports).

### Decision: Eight small cave-definition modules replace `src/caves/starter.ts`; each stays plain declarative data, collected by one `caves/index.ts`

- **Rationale**: FR-031/FR-037 require exactly eight caves, in a fixed
  order, as declarative data that "MUST NOT touch any simulation file and
  MUST NOT touch rendering logic." Following `starter.ts`'s existing
  `caveFromAscii()`-over-rows pattern, one file per cave
  (`src/caves/cave-01-dig-and-collect.ts` … `cave-08-finale.ts`), each
  exporting one `CaveDefinition`, keeps every cave small, individually
  reviewable, and independently retunable (spec's "Verified by the
  maintainer" section calls out quotas and time limits as the most likely
  things to need retuning after play — one file per cave makes that a
  one-file diff). `src/caves/index.ts` exports the ordered
  `CAVES: readonly CaveDefinition[]` array both the shell and the test
  suite import, so "the shipped cave count is exactly eight, in the
  documented order" (FR-031, SC-010) is a property of one array's length
  and order, not something spread across call sites.
- **Alternatives considered**: One large `caves.ts` file with all eight
  definitions (rejected — 004's starter cave alone was 132 lines for one
  cave; eight caves in one file would be large enough to make per-cave
  review and retuning harder than the constitution's "keep specs/diffs
  small" spirit intends, for no behavioral difference).

## Outstanding Unknowns

None. Every Technical Context field in `plan.md` is resolved by the
constitution, the spec's own Assumptions section, or the decisions above.
The two genuine readings found while researching — the boundary-star
scoring value, and reconciling FR-013's "same death path" with its "no
explosion" clause — are resolved above and are both reported as decisions
made without further clarification.
