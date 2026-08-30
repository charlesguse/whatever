# Sim Contract: `src/sim/` Public Surface (extends feature 003)

This extends
[`specs/003-enemies-explosions/contracts/sim-api.md`](../../003-enemies-explosions/contracts/sim-api.md)
(which itself extends features 001/002's). Everything there still holds
unchanged. This document adds only what's new or changed in this feature.

## Types

```ts
// ElementId: UNCHANGED set. amoeba, magicWall, and expandingWall gain tick
// behavior below; they were already valid, inert grid contents. Every
// declared element id now has behavior.

type CaveStatus = 'inPlay' | 'dying' | 'dead' | 'completed'; // UNCHANGED

type MagicWallPhase = 'dormant' | 'active' | 'dead'; // NEW

interface CaveDefinition {
  name: string;
  width: number;
  height: number;
  seed: number;
  quota: number;
  rows: string[];
  amoebaGrowthRate?: number;   // NEW, optional — default 0.03
  amoebaSizeLimit?: number;    // NEW, optional — default 200
  magicWallDuration?: number;  // NEW, optional — default 40
}

interface CaveState {
  readonly width: number;
  readonly height: number;
  readonly tick: number;
  // opaque beyond this — see read accessors below
}
```

## Parse: `parseCave(def: CaveDefinition): CaveState` (extends features 001–003)

- **New guarantee (FR-029)**: throws (no partial grid) if `amoebaSizeLimit`
  or `magicWallDuration`, when present, is not a positive whole number, or if
  `amoebaGrowthRate`, when present, is not a number in `(0, 1]` — naming the
  cave and the offending value.
- **New, on success**: `CaveState` carries `amoebaGrowthRate` (default
  `0.03` if omitted), `amoebaSizeLimit` (default `200`), and
  `magicWallDuration` (default `40`); `magicWallPhase` starts `'dormant'`;
  `magicWallCountdown` starts unspecified (not read until the phase is
  `'active'`).
- **Unchanged**: exactly one `player`, at most one `exit`, declared
  dimensions must match row data, unrecognized characters fail, the quota
  ceiling relative to diamonds plus butterfly payout — all from features
  001–003.

## Advance: `tick(state: CaveState, input: TickInput): CaveState` (extends features 001–003)

- **New guarantees, evaluated inside the same fixed top-to-bottom,
  left-to-right scan features 001–003 established, still with the per-cell
  moved-this-tick flag**:

  - **Per-tick phase order (amended)**: (1) clear moved-this-tick flags; (2)
    age every explosion cell (unchanged from feature 003); (3) — **new** —
    if `magicWallPhase === 'active'`, decrement `magicWallCountdown` by 1,
    and if it reaches `0`, set `magicWallPhase = 'dead'`; this runs
    unconditionally, including while `status === 'dying'` (FR-019); (4)
    stamp every entry in `state.pendingBlasts` (unchanged from feature 003);
    (5) run the main scan — player movement, body falling/rolling/pushing
    (extended with two new branches, see below), enemy steps (unchanged),
    and — new — amoeba growth and expanding wall growth, gated only by the
    scan reaching a cell that currently holds that element id; (6) — **new**
    — after the main scan, evaluate the amoeba collective's size limit and
    sealed conditions (see below) and convert if either fires.

  - **Amoeba growth (FR-004–FR-006, FR-005a)**: for every `amoeba` cell the
    scan visits, take exactly one PRNG draw; on success (drawn value less
    than `amoebaGrowthRate`), compute the eligible orthogonal neighbors
    (`empty` or `dirt`, fixed order `up, down, left, right`), take exactly
    one more PRNG draw, and if the eligible list is nonempty use that draw to
    select and grow into one of them (the draw is still consumed, and
    nothing changes, if the list is empty). A cell already destroyed earlier
    in the same tick's scan (e.g. by detonation, see below) no longer holds
    `amoeba` and is not dispatched here at all — see this feature's
    research.md, Decision 5. Growth never enters a cell holding anything but
    `empty` or `dirt`, and a cell created by growth is marked moved-this-tick
    (does not itself grow again until the following tick).

  - **Amoeba collective conversion (FR-007–FR-009)**: after the main scan, a
    read pass counts amoeba cells and whether any has an eligible
    (`empty`/`dirt`) orthogonal neighbor. If the count exceeds
    `amoebaSizeLimit`, every remaining `amoeba` cell becomes `boulder`,
    marked moved-this-tick and not falling. Otherwise, if the count is
    nonzero and no cell has an eligible neighbor, every remaining `amoeba`
    cell becomes `diamond`, marked moved-this-tick and not falling. At most
    one of the two fires per tick; the size-limit check is evaluated first.
    A cave with zero amoeba cells at this point does nothing here and
    consumes no randomness anywhere in this feature's code for that tick
    (FR-010).

  - **Falling body reaches amoeba (FR-011, extends feature 003's
    falling-body-reaches-an-enemy pattern)**: if the cell below a *falling*
    boulder/diamond holds `amoeba`, the body does not move into that cell;
    instead a blast is stamped centered on the amoeba cell with content
    `empty`, using the existing `stampBlast` helper unchanged. The body is
    destroyed as part of the same blast. A body that is not currently
    falling never triggers this (FR-011's second sentence). The amoeba cell
    is never appended to `pendingBlasts` — it does not chain (FR-012).

  - **Magic wall conversion (FR-016–FR-020, FR-018a)**: if the cell below a
    *falling* boulder/diamond holds `magicWall`: if `magicWallPhase ===
    'dead'`, the body simply comes to rest, unchanged, exactly like resting
    on any non-roll-surface. Otherwise (`'dormant'` or `'active'`): if
    `'dormant'`, the phase becomes `'active'` and `magicWallCountdown` is set
    to `magicWallDuration`, unconditionally; the destination cell is found by
    walking down through the unbroken run of `magicWall` cells beneath the
    entry point to the first non-`magicWall` cell. If that destination is
    off-grid or not `empty`, the body is destroyed with nothing emerging
    (FR-018a) — the activation and countdown already happened and are
    unaffected. Otherwise the body is removed from its origin, and the
    opposite element (`boulder` ↔ `diamond`) appears at the destination,
    marked falling and moved-this-tick. `magicWall` is never a roll surface
    in any phase (FR-013), and a body that is not falling never triggers any
    of this.

  - **Expanding wall growth (FR-024–FR-027)**: for every `expandingWall` cell
    the scan visits, independently: if the cell to its left is `empty`, it
    becomes `expandingWall`, marked moved-this-tick; if the cell to its right
    is `empty`, likewise. No randomness, no cadence gating — runs every tick
    for every such cell present at the moment the scan visits it. A cell
    created this tick does not grow again until the next (via the same
    moved-flag mechanism).

  - **Kid movement blocking (FR-002, FR-014, FR-023)**: `movePlayer`'s
    existing wall-block check (`brickWall`, `steelWall`) is extended to
    include `amoeba`, `magicWall`, and `expandingWall` — the move is refused
    exactly as it is for a brick wall, in every phase of the magic wall.

  - **Push and grab (unchanged code, per this feature's research.md,
    Decision 7)**: pushing a boulder toward any of the three new elements
    already fails today's "beyond cell must be empty" check; grabbing toward
    any of the three already falls through today's "every content but dirt
    and diamond is left untouched" default. No new branches needed.

  - **Determinism (FR-037, FR-042, FR-043, extends feature 003's FR-040)**:
    same `state` + same `input` always produces the same next `state`,
    including amoeba extent, magic wall phase and countdown, and expanding
    wall extent, for any replay of the same seed and ordered inputs. Amoeba
    growth is the seeded generator's **second** consumer (after push
    resolution); a cave with no amoeba takes no additional draws and
    replays exactly as it did before this feature.

## Read accessors (new, alongside existing accessors)

```ts
function getMagicWallPhase(state: CaveState): MagicWallPhase;
```

- **Guarantees**: A pure read, no mutation path exists. The renderer's only
  permitted use is choosing between the theme's inert and active
  magic-wall entries (FR-033); it MUST NOT be used, directly or indirectly,
  to show the player whether an inert wall is `'dormant'` or `'dead'`
  (FR-034a). Amoeba and expanding wall need no new accessor — `getCell`
  already reports their content.

## ASCII helpers (extends features 001–003's `caveFromAscii`/`asciiFromState`)

**Unchanged signatures.** Amoeba (`A`), magic wall (`M`), and expanding wall
(`E`) are already valid characters in the existing shared mapping
(`src/sim/elements.ts`) from feature 001; this feature is the first to give
them behavior. `caveFromAscii`'s `AsciiCave`/test-helper `CaveOptions` gain
three new optional pass-through fields (`amoebaGrowthRate`,
`amoebaSizeLimit`, `magicWallDuration`) so ASCII-cave tests can set
cave-scoped parameters without hand-building a `CaveDefinition`. Magic wall
phase/countdown are not part of the ASCII grid representation — tests that
need to assert on phase use `getMagicWallPhase` directly alongside
`expectAscii`.

## What is explicitly NOT part of this contract

Same exclusions as features 001–003 (camera, theme data beyond the field
named above, keyboard held-key logic, door-flash timing, the restart key),
plus: whether the renderer gives the amoeba an ambient sound that scales with
size (out of scope, per spec — a note for a future audio feature); any visual
distinction between a dormant and a dead magic wall (explicitly forbidden,
FR-034/FR-034a, not merely out of scope).
