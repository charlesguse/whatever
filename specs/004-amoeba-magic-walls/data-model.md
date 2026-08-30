# Phase 1 Data Model: Amoeba, Magic Wall, and Expanding Wall

Entities below extend feature 003's data model
([`specs/003-enemies-explosions/data-model.md`](../003-enemies-explosions/data-model.md)),
which itself extends features 001/002's. Only fields and rules new or changed
in this feature are listed; everything else (Element identity, Character
Mapping, Camera, Roll Surface, Push Resolution, Enemy Step, Blast/Chain) is
unchanged and not repeated here.

## Element

**Unchanged set** — no new element ids. `amoeba`, `magicWall`, and
`expandingWall` move from "declared, inert" to "declared, behavioral" in this
feature — the last three of the fourteen declared ids to gain behavior. Every
element now has behavior; none remain inert.

## Grid

**No new fields.** Unlike feature 003, this feature adds no per-cell parallel
typed array. Amoeba and expanding wall growth need no state beyond the
element id already occupying a cell (research.md, Decision 1); the magic
wall's phase and countdown are cave-wide, not per-cell (see Cave State
below).

## Cave State

Extends feature 003's `CaveState`.

| Field | Type | Notes |
|---|---|---|
| amoebaGrowthRate | `number` | **New.** Copied from the parsed `CaveDefinition` at parse time (FR-028); immutable for the life of the cave. A per-cell, per-tick success probability in `(0, 1]`, compared against one PRNG draw per amoeba cell per tick (FR-005). |
| amoebaSizeLimit | `number` | **New.** Copied from `CaveDefinition` at parse time; immutable. A positive whole cell count — the collective's ceiling (FR-007). |
| magicWallDuration | `number` | **New.** Copied from `CaveDefinition` at parse time; immutable. Ticks of active life granted on activation (FR-019). |
| magicWallPhase | `'dormant' \| 'active' \| 'dead'` | **New.** One cave-wide value shared by every magic wall cell (FR-015). Starts `'dormant'` (FR-016). Set to `'active'` the tick a falling boulder/diamond first enters any magic wall cell (FR-016, FR-017). Set to `'dead'` by the pre-scan countdown pass (below) the tick `magicWallCountdown` reaches `0`. Permanent once `'dead'` — nothing reactivates it; a cave restart re-parses and starts `'dormant'` again (FR-016). |
| magicWallCountdown | `number` | **New.** Meaningful only while `magicWallPhase === 'active'`; otherwise unspecified/irrelevant. Set to `magicWallDuration` at the instant `magicWallPhase` becomes `'active'`. Decremented by exactly `1`, once per tick, by a pass that runs before the main scan, for every tick the phase is `'active'` — including while the cave is `'dying'` (FR-019). When the decrement reaches `0`, `magicWallPhase` becomes `'dead'` in that same pass, before the main scan runs, so a body falling into the wall that same tick sees `'dead'` and is not converted. |

**Amoeba collective** is not tracked as a stored field — its size and
sealed/open status are recomputed each tick by scanning the grid after the
main scan finishes (research.md, Decision 3), since blasts and growth can
both change the collective within the same tick and a stored count would
need to be kept in perfect sync with every site that touches an amoeba cell.

## Cave Definition

Extends feature 001's `CaveDefinition` shape (unchanged since; features
002/003 added no new definition fields).

| Field | Type | Notes |
|---|---|---|
| amoebaGrowthRate | `number` (optional) | **New.** Per-cell, per-tick growth probability (FR-028). Default **`0.03`** (a 3-in-100 chance) if omitted — slow enough that a single-cell blob takes a couple of seconds to double at the shipped 8-ticks-per-second rate, per spec Assumptions. |
| amoebaSizeLimit | `number` (optional) | **New.** Cell count above which the collective turns to boulders (FR-028). Default **`200`** if omitted. |
| magicWallDuration | `number` (optional) | **New.** Ticks of active life (FR-028). Default **`40`** if omitted (five seconds at 8 ticks/second — "a few seconds," per spec Assumptions). |

**Validation rules** (extends features 001–003's, all reported with cave name
+ the offending value, producing no partial grid on failure — unchanged
framing from FR-029):

- **New (FR-029):** `amoebaSizeLimit` and `magicWallDuration`, if present,
  MUST each be a positive whole number; a violation fails naming the cave and
  the offending value.
- **New (FR-029):** `amoebaGrowthRate`, if present, MUST be a number greater
  than `0` and at most `1`; a violation fails naming the cave and the
  offending value.
- Every feature 001–003 validation rule (declared dimensions match row data,
  exactly one player, at most one exit, unrecognized characters, the
  quota-vs-diamonds-plus-butterfly-payout ceiling) is unchanged.

## Tick Input

**Unchanged shape** — this feature adds no new input.

## Amoeba Growth (new entity — computed fresh each tick, no state beyond the grid)

Dispatched as one more branch of the existing main-scan dispatch (research.md,
Decision 1), for every cell holding `amoeba` at the moment the scan visits it.

| Concept | Notes |
|---|---|
| Growth attempt (FR-004, FR-005, FR-005a) | Exactly one PRNG draw per `amoeba` cell the scan visits, whether or not the cell can grow. Succeeds iff the drawn value is less than `amoebaGrowthRate`. A cell already destroyed (e.g. by FR-011 detonation) before the scan reaches it no longer holds `amoeba` and is not dispatched here at all — see research.md, Decision 5. |
| Eligible neighbors | Computed live from the current grid at the moment of the attempt: the subset of `up, down, left, right` (fixed order, the same order `stepEnemy` uses) that is in-bounds and currently holds `empty` or `dirt` (FR-006). Every other content — either body, either wall, the door, the kid, an enemy, an explosion, another amoeba cell, the magic wall, the expanding wall, and the grid boundary — is ineligible. |
| Direction draw (FR-006, SC-004; research.md, Decision 4) | Taken on **every** successful attempt, regardless of how many neighbors are eligible. If the eligible list is nonempty, `index = floor(draw * eligibleList.length)` selects the target from the fixed-order list; if the list is empty, the draw is consumed and nothing changes. |
| Growth result | The chosen target cell becomes `amoeba` and is marked moved-this-tick (so it does not grow again until the following tick, FR-006's last sentence). The source cell is unchanged (amoeba growth never removes the source). |

## Amoeba Collective Conversion (new entity — an end-of-tick pass, research.md Decision 3)

Runs once, after the main scan finishes, only ever reading/writing cells
still holding `amoeba` at that point:

| Step | Notes |
|---|---|
| 1. Count + sealed check | One linear scan over the grid: count cells holding `amoeba`; for each, check its four orthogonal neighbors (in-bounds only) for `empty` or `dirt` — if any amoeba cell has such a neighbor, the collective is "open" this tick, otherwise "sealed" (FR-003: every amoeba cell in the cave counts toward one collective, connected or not). |
| 2. Size limit (FR-007, FR-009) | If the count **exceeds** `amoebaSizeLimit`, a second linear scan converts every cell still holding `amoeba` to `boulder`, each marked moved-this-tick (so it does not fall on its creation tick, FR-009) and not marked falling. This step is checked, and if it fires nothing else in this pass runs. |
| 3. Sealed check (FR-008, FR-009) | Only evaluated if step 2 did not fire. If the count is nonzero and the collective is "sealed" (no amoeba cell has an eligible neighbor), a second linear scan converts every cell still holding `amoeba` to `diamond`, each marked moved-this-tick and not marked falling. |
| 4. Otherwise | Count is zero, or the collective is open and under its limit: no scan 2, nothing further happens, no randomness consumed by this pass (FR-010, FR-021 — this pass itself never touches `rngState`). |

## Falling-Body-Into-Amoeba Detonation (extends feature 003's Detonation table)

| Trigger | When checked | Center | Content |
|---|---|---|---|
| Falling body reaches amoeba (FR-011) | On a falling boulder/diamond's per-tick check (the existing `processBody`), if the cell directly below holds `amoeba` and the body is currently falling | The amoeba cell (one row below the body) | `empty` |

Uses the existing `stampBlast` helper unchanged (feature 003) — amoeba is
simply one more content type `stampBlast` overwrites like any other
destructible cell, and (FR-012) is never itself appended to
`pendingBlasts`, since that queuing only happens for `firefly`/`butterfly`
cells. A resting body above amoeba triggers nothing, exactly like a resting
body above the kid or an enemy (feature 002/003 precedent).

## Magic Wall Conversion (new entity — research.md Decision 6)

| Concept | Notes |
|---|---|
| Trigger (FR-016, FR-017) | A **falling** boulder/diamond whose cell directly below holds `magicWall`, checked in the same `processBody` branch structure as the amoeba/enemy/kid checks. A body that is not falling is left untouched (matches the existing "resting body above a non-empty, non-roll-surface cell just rests" default). |
| Activation (FR-016, FR-017, FR-018a) | If `magicWallPhase === 'dormant'` at the moment of the trigger, it becomes `'active'` and `magicWallCountdown` is set to `magicWallDuration`, unconditionally — before the destination is even computed. This is what makes "the wall still activates" true even when the body that triggers it is later destroyed by FR-018a. |
| Dead phase (FR-020) | If `magicWallPhase === 'dead'`, nothing converts: the body's falling flag is cleared (it comes to rest in its own cell, unchanged content), exactly like resting on a non-roll-surface. |
| Destination (FR-018) | Only computed when the phase is `'dormant'` (just activated) or already `'active'`. Walk down from the entered wall cell while the current cell holds `magicWall`; the destination is the first cell that does not (research.md Decision 6). |
| Blocked destination (FR-018a) | If the destination is off-grid or does not hold `empty`, the body is removed from its origin cell (now `empty`) and nothing else happens — no blast, no sound, no emergence. The activation (if any) and the countdown's normal running are unaffected. |
| Successful conversion (FR-018) | The body is removed from its origin cell; the destination cell receives the opposite element (`boulder` → `diamond`, `diamond` → `boulder`), marked falling and moved-this-tick (continues falling from the next tick by the ordinary rule). The body never occupies a magic-wall cell itself — it appears only at the destination, in the same tick. |

## Expanding Wall Growth (new entity — computed fresh each tick, no state beyond the grid)

Dispatched as one more branch of the existing main-scan dispatch, for every
cell holding `expandingWall` at the moment the scan visits it.

| Concept | Notes |
|---|---|
| Growth (FR-024, FR-025) | If the cell immediately to the **left** currently holds `empty`, it becomes `expandingWall`, marked moved-this-tick. Independently, if the cell immediately to the **right** currently holds `empty`, it becomes `expandingWall`, marked moved-this-tick. Both may happen on the same tick, from the same source cell (FR-024). Any other content — dirt, either body, either wall, the door, the kid, an enemy, an explosion, amoeba, the magic wall, another expanding wall cell, and the grid boundary — blocks growth on that side (FR-025). Growth is never vertical or diagonal, and never destroys, displaces, crushes, or harms anything — it only ever writes into a cell already `empty`. |
| Randomness | None — this pass never touches `rngState` (FR-027). |
| Cadence | Every tick, unconditionally, for every `expandingWall` cell present at the moment the scan visits it — no per-cave rate, no gating condition (FR-027). |

## Read Accessors (new, added to `src/sim/cave.ts` alongside existing accessors)

Per FR-036, this is the only way anything outside `src/sim/` may observe the
magic wall's phase:

| Accessor | Returns | Notes |
|---|---|---|
| `getMagicWallPhase(state)` | `'dormant' \| 'active' \| 'dead'` | The cave-wide phase. The shell's only permitted use is choosing between the theme's inert and active magic-wall entries (FR-033); it MUST NOT be used to distinguish `'dormant'` from `'dead'` in anything shown to the player (FR-034a) — both map to the same inert theme entry. |

Amoeba and expanding wall need no new accessor — their content is fully
observable through the existing `getCell`.

## Theme

Extends feature 003's `Theme`/`ThemeEntry` shape (unchanged since features
001/002).

| Field | Type | Notes |
|---|---|---|
| `magicWallActiveEntry` | `ThemeEntry` | **New.** Parallel to the existing `doorOpenEntry` (FR-033). Selected by the renderer, via `getMagicWallPhase`, only while the phase is `'active'`. `elements.magicWall` becomes the single **inert** entry, covering both `'dormant'` and `'dead'` (FR-034) — the theme therefore carries exactly two magic-wall-related entries, never three. |

Data values only: Classroom's `elements.amoeba` keeps its existing label
"Spilled Glue" (already set in feature 001/002 as a placeholder, now
accurate); `elements.magicWall` is relabeled "Sticker Machine" (FR-032),
distinct from the firefly's "Pencil Sharpener" (feature 003, unchanged);
`elements.expandingWall` keeps "Bookshelf". `magicWallActiveEntry` gets a new
label, glyph, and color that read as "running" and are distinguishable from
every other entry, including the inert `elements.magicWall` entry (FR-032,
FR-033).
