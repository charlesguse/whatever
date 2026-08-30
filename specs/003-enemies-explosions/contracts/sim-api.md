# Sim Contract: `src/sim/` Public Surface (extends feature 002)

This extends
[`specs/002-rock-physics-exit/contracts/sim-api.md`](../../002-rock-physics-exit/contracts/sim-api.md)
(which itself extends feature 001's). Everything there still holds except
the three amendments FR-038 names (feature 002's FR-010 crush behavior,
FR-027 quota check, FR-029 freeze-on-death — see below). This document adds
only what's new or changed in this feature.

## Types

```ts
// ElementId: UNCHANGED set. firefly, butterfly, and explosion gain tick
// behavior below; they were already valid, inert grid contents.

type CaveStatus = 'inPlay' | 'dying' | 'dead' | 'completed'; // 'dying' is NEW

type Direction = 'up' | 'down' | 'left' | 'right'; // moved here from tick.ts, re-exported there — UNCHANGED shape

type TickInput = {
  direction?: Direction;
  grab?: boolean;
}; // UNCHANGED shape from feature 002

interface CaveDefinition {
  name: string;
  width: number;
  height: number;
  seed: number;
  quota: number;
  rows: string[];
} // UNCHANGED shape — the quota rule checked at parse time changes, not the field

interface CaveState {
  readonly width: number;
  readonly height: number;
  readonly tick: number;
  // opaque beyond this — see read accessors below
}
```

## Parse: `parseCave(def: CaveDefinition): CaveState` (extends feature 002)

- **Amended guarantee (FR-025, names feature 002's FR-027 as amended)**:
  Throws (no partial grid) if `def.quota` exceeds `diamondCount + 9 *
  butterflyCount`, naming the cave, the declared quota, the diamond count,
  and the butterfly count. A cave whose quota exceeds the diamond count
  alone, but not this combined figure, now parses successfully — this is
  strictly a relaxation of the old check, never a new rejection.
- **Unchanged**: exactly one `player`, at most one `exit`, declared
  dimensions must match row data, unrecognized characters fail — all from
  features 001/002.
- **New, on success**: every `firefly`/`butterfly` cell's facing starts
  `'left'` (FR-007); `CaveState.pendingBlasts` starts as an empty array;
  `CaveState.status` still starts `'inPlay'`.

## Advance: `tick(state: CaveState, input: TickInput): CaveState` (extends feature 002)

- **New guarantees, evaluated inside the same fixed top-to-bottom,
  left-to-right scan features 001/002 established, still with the per-cell
  moved-this-tick flag**:

  - **Terminal short-circuit (amended)**: `tick` returns `state` unchanged
    (no clone, no scan) iff `getStatus(state) === 'dead' || getStatus(state)
    === 'completed'`. **`'dying'` does NOT short-circuit** — the cave keeps
    advancing (FR-015.2). This amends feature 002's FR-029.

  - **Per-tick phase order**: (1) clear moved-this-tick flags; (2) age every
    explosion cell — decrement `explosionRemaining` where nonzero, and
    convert to `explosionContent` (marking the cell moved-this-tick iff it
    converts to `diamond`, FR-020) wherever it reaches zero; (3) stamp every
    entry in `state.pendingBlasts` as a blast (FR-023), collecting any newly
    destroyed enemies into the *next* tick's pending list; (4) run the main
    scan — player movement (unchanged from feature 002 except crushing, see
    below), body falling/rolling/pushing (unchanged except the new
    enemy-below and player-below-crush branches, see below), and — new —
    enemy steps, gated by cadence.

  - **Enemy steps (FR-002–FR-009)**: on a cadence tick (`(state.tick + 1) %
    2 === 1`), each `firefly`/`butterfly` cell not yet processed this tick
    either detonates (its four orthogonal neighbors include the kid,
    FR-010) or moves per the wall-follower algorithm (FR-004): preferred
    side if empty, else straight ahead if empty, else turn away in place.
    "Empty" means the single element id `empty`; every other content,
    including another enemy, an explosion, and the grid boundary, blocks
    movement (FR-006). An enemy never falls, is never pushed, and is never a
    roll surface. Facing is read from and written to the new `facing` array,
    never recomputed (FR-003). An enemy that moves into a cell not yet
    scanned this tick is not stepped again this tick (FR-008, via the
    existing moved-this-tick flag).

  - **Falling body reaches an enemy (FR-011)**: extends the existing
    falling-body check — if the cell below a *falling* body holds an enemy,
    the body does not move into that cell; instead a blast is stamped
    centered on the enemy's cell, with that enemy's blast content. The body
    is destroyed as part of the same blast (its own cell is inside the
    stamped 3x3). A body that is not currently falling never triggers this.

  - **Crushing (amended, FR-013, names feature 002's FR-010 as amended)**:
    if the cell below a *falling* body holds the kid, the body does not move
    onto the kid's cell as feature 002 did; instead a blast is stamped
    centered on the kid's cell with content `empty`, `status` becomes
    `'dying'` (not directly `'dead'`), and the body is destroyed as part of
    the same blast. A resting body above the kid still does nothing, this
    tick or any later one, for as long as it stays resting (unchanged from
    feature 002).

  - **Blasts and chains (FR-016–FR-024)**: a blast covers the 3x3 centered
    on its trigger, clipped at the grid boundary (FR-016), destroying
    everything except `steelWall` and `exit` (open or closed), which are
    left completely untouched (FR-017). Every cell of one blast resolves to
    the same content — `empty` for a firefly or the kid, `diamond` for a
    butterfly (FR-018) — and persists as an explosion cell for exactly 2
    ticks after the tick it was stamped, then converts, all its cells at
    once (FR-019). An enemy caught anywhere in a stamped 3x3 other than the
    center is destroyed on that tick and its own blast is stamped on the
    *following* tick, centered on the cell where it stood (FR-023); each
    enemy detonates at most once, so every chain terminates. When two blasts
    in the same tick cover the same cell, the one stamped later in this
    tick's fixed order wins (FR-022).

  - **The dying state (FR-015)**: entered (from `'inPlay'` only) the instant
    any blast covers the kid's cell. Player input is never consulted again
    from that point on — not because of an explicit check, but because the
    kid's cell is no longer `'player'`, so `movePlayer` is never dispatched
    again. Everything else keeps advancing: explosions age and convert,
    chains keep propagating, enemies keep patrolling, freed bodies fall and
    roll normally. On the first tick that ends with no explosion cell
    remaining anywhere in the grid, `status` becomes `'dead'`, and from then
    on `tick` short-circuits exactly as it does for feature 002's `'dead'`.

  - **Determinism (FR-040, extends feature 002's FR-049)**: same `state` +
    same `input` always produces the same next `state`, including enemy
    positions, facings, explosion state, and the exact chain sequence, for
    any replay of the same seed and ordered inputs. This feature adds no
    consumer of `rngState` (FR-034) — the exact same `nextPrng` call site
    (push resolution) is still the only one.

## Read accessors (new, alongside existing accessors)

```ts
function getEnemyFacing(state: CaveState, x: number, y: number): Direction | undefined;
function isExplosion(state: CaveState, x: number, y: number): boolean;
// getStatus's return type gains 'dying' — no new accessor for it.
```

- **Guarantees**: Pure reads, no mutation path exists (FR-033). The
  renderer uses only these plus the existing accessors — never sim
  internals. `getEnemyFacing` returns `undefined` for any cell that is not
  currently `firefly`/`butterfly`.

## ASCII helpers (extends feature 001/002's `caveFromAscii`/`asciiFromState`)

**Unchanged signatures.** Enemies (`F`, `Y`) and explosions (`!`) are
already valid characters in the existing shared mapping (`src/sim/elements.ts`)
from feature 001; this feature is the first to give them behavior. Facing,
explosion remaining-ticks, and the pending-blast queue are not part of the
ASCII grid representation — tests that need to assert on them use
`getEnemyFacing`/`isExplosion`/`getStatus` directly alongside `expectAscii`.

## What is explicitly NOT part of this contract

Same exclusions as feature 001/002 (camera, theme data, keyboard held-key
logic, door-flash timing, the restart key), plus: whether the renderer
orients an enemy's glyph by its facing (FR-033 provides the accessor; using
it is a maintainer review-time judgement, not a requirement); audio for
enemy movement or detonation (out of scope, per spec); score value for a
detonated butterfly (out of scope, per spec — it is worth exactly the gold
stars it leaves).
