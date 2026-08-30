# Sim Contract: `src/sim/` Public Surface (extends feature 001)

This extends
[`specs/001-foundation-cave-grid/contracts/sim-api.md`](../../001-foundation-cave-grid/contracts/sim-api.md).
Everything there still holds (FR-048: feature 001's rules and tests are
unchanged). This document adds only what's new or changed in this feature.

## Types

```ts
// ElementId: UNCHANGED set. boulder, diamond, and exit gain tick behavior
// below; they were already valid, inert grid contents in feature 001.

type CaveStatus = 'inPlay' | 'dead' | 'completed';

type TickInput = {
  direction?: Direction;
  grab?: boolean; // NEW
};

interface CaveDefinition {
  name: string;
  width: number;
  height: number;
  seed: number;
  quota: number;   // NEW — FR-022
  rows: string[];
}

interface CaveState {
  readonly width: number;
  readonly height: number;
  readonly tick: number;
  // opaque beyond this — see read accessors below
}
```

## Parse: `parseCave(def: CaveDefinition): CaveState` (extends feature 001)

- **New guarantees**:
  - Throws (no partial grid) if `def.quota` exceeds the number of `diamond`
    cells in the parsed grid, naming the cave, the declared quota, and the
    actual diamond count (FR-027).
  - Throws if more than one `exit` character appears in the grid, mirroring
    the existing "exactly one player" check, for the same reason (an
    ambiguous cave fails loudly rather than silently picking one door).
  - On success, `CaveState.collected` starts at `0`, `CaveState.quota` is
    copied from `def.quota`, and `CaveState.status` starts `'inPlay'`
    (FR-018, FR-028).

## Advance: `tick(state: CaveState, input: TickInput): CaveState` (extends feature 001)

- **New guarantees, evaluated inside the same fixed top-to-bottom,
  left-to-right scan feature 001 established, still with the per-cell
  moved-this-tick flag (FR-045, Constitution Principle II)**:

  - **Terminal short-circuit**: if `getStatus(state) !== 'inPlay'`, `tick`
    returns `state` unchanged — no clone, no scan, nothing moves (FR-029).

  - **Falling** (`boulder`/`diamond` cells, FR-001–FR-006): if the cell
    below is empty, the body moves down one cell and is marked falling. A
    falling body whose cell below is occupied by anything other than the kid
    stops and is unmarked falling on that tick. Falling applies identically
    to `boulder` and `diamond`.

  - **Crushing** (FR-010–FR-011): if the cell below a body is the kid, the
    kid dies **only if that body is currently marked falling** — the body
    takes the kid's cell and `CaveState.status` becomes `'dead'`. A resting
    body directly above the kid does nothing, this tick or any later one, for
    as long as it stays resting.

  - **Rolling** (FR-007–FR-009): a body whose cell below holds `boulder`,
    `diamond`, or `brickWall` rolls one cell horizontally — left checked
    first, right only if left doesn't qualify — when that side and the cell
    diagonally below it are both empty, and is marked falling on the roll. A
    body never rolls off `steelWall`, `dirt`, the kid, `exit` (open or
    closed), or any element with no behavior yet.

  - **Pushing** (FR-012–FR-016): when the player presses left/right into a
    resting `boulder` whose beyond-cell (same direction) is empty and
    in-grid, the tick draws once from the cave's seeded generator against
    the single named `PUSH_CHANCE` constant (~1/8, `src/sim/tick.ts`); on a
    draw below that threshold the boulder moves into the beyond-cell and the
    kid moves into the boulder's old cell, both in this tick; otherwise
    neither moves. Every other press against a boulder (vertical, beyond-cell
    occupied or off-grid, boulder currently falling) fails with **zero**
    calls to the generator — `state`'s rng is passed through byte-identical.

  - **Collecting** (FR-017–FR-018): moving into a `diamond` removes it,
    moves the kid in, and increments `CaveState.collected` by exactly 1.

  - **Grab** (FR-019–FR-021): when `input.grab` is true, a direction press
    acts on the neighboring cell **without moving the kid**: `dirt` is
    cleared, a `diamond` is collected and counted, and every other content
    (empty, `boulder`, either wall, `exit` open or closed, out-of-grid) is
    left untouched. Grab never pushes and never enters the door.

  - **The door** (`exit`, FR-022–FR-026): while `!isDoorOpen(state)`, `exit`
    behaves exactly like `steelWall` — blocks the kid, nothing rolls off it,
    it cannot be dug. Once `isDoorOpen(state)` (i.e. `collected >= quota`),
    moving into it moves the kid in and sets `CaveState.status` to
    `'completed'`. This is permanent for the cave — `isDoorOpen` never
    becomes false again once true, since `collected` never decreases.

  - **Determinism** (FR-049, extends feature 001's FR-010): same `state` +
    same `input` (now including `grab`) always produces the same next
    `state`, including the exact sequence of push successes/failures, for
    any replay of the same seed and ordered inputs.

## Read accessors (new, alongside feature 001's `getCell`/`getPlayerPosition`)

```ts
function getCollected(state: CaveState): number;
function getQuota(state: CaveState): number;
function isDoorOpen(state: CaveState): boolean; // getCollected(state) >= getQuota(state)
function getStatus(state: CaveState): CaveStatus;
function isFalling(state: CaveState, x: number, y: number): boolean;
```

- **Guarantees**: Pure reads, no mutation path exists (FR-043). The renderer,
  camera, and HUD use only these plus feature 001's accessors — never sim
  internals.

## ASCII helpers (extends feature 001's `caveFromAscii`/`asciiFromState`)

```ts
function caveFromAscii(ascii: {
  name: string;
  seed: number;
  quota: number; // NEW
  rows: string[];
}): CaveDefinition;
```

- **Guarantees**: Same as feature 001, plus passing `quota` straight through
  to `CaveDefinition.quota` for `parseCave` to validate. `asciiFromState` is
  unchanged in signature — falling/status/collected/quota are not part of
  the ASCII grid representation; tests that need to assert on them use the
  new read accessors directly alongside `expectAscii`.

## What is explicitly NOT part of this contract

- Same exclusions as feature 001 (camera, theme data, keyboard held-key
  logic), plus: door-flash timing (`src/lib/render/canvas.ts`, computed from
  the render loop's own frame time per FR-039, never from `CaveState`); the
  restart key (shell-only — it calls `parseCave` again on the existing
  `CaveDefinition`, not a new sim entry point, per research.md).
