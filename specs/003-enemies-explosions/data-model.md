# Phase 1 Data Model: Fireflies, Butterflies, and Explosions

Entities below extend feature 002's data model
([`specs/002-rock-physics-exit/data-model.md`](../002-rock-physics-exit/data-model.md)),
which itself extends feature 001's. Only fields and rules new or changed in
this feature are listed; everything else (Element identity, Character
Mapping, Camera, Roll Surface, Push Resolution) is unchanged and not
repeated here.

## Element

**Unchanged set** — no new element ids. `firefly` and `butterfly` move from
"declared, inert" to "declared, behavioral" in this feature, joining
`empty`, `dirt`, `boulder`, `diamond`, `brickWall`, `steelWall`, `player`,
`exit` from features 001/002. `explosion` moves from "declared, inert" to
"declared, behavioral" as well — it existed as a valid character/grid value
since feature 001 but nothing ever produced or acted on it until now. The
remaining three (`amoeba`, `magicWall`, `expandingWall`) stay inert, per
FR-039.

## Grid / Cave State

Extends feature 002's Grid.

| Field | Type | Notes |
|---|---|---|
| facing | typed array (`Uint8Array`, length `width*height`) | **New.** Per-cell enemy facing (FR-003), parallel to `movedThisTick`/`falling`, indexed the same way. Meaningful only where the cell currently holds `firefly` or `butterfly`; every other cell's value is unspecified and never read. Set to **left** for every enemy at parse time (FR-007). Set to the new facing whenever an enemy turns or moves (FR-004). **Not** cleared at the start of every tick — carried tick-to-tick, like `falling`. Cloned in `cloneGrid` alongside the existing arrays. |
| explosionRemaining | typed array (`Uint8Array`, length `width*height`) | **New.** `0` for a cell that is not currently an explosion; otherwise the number of ticks left before it converts (FR-019). Set to `2` when a blast is stamped on a cell. Decremented by exactly 1 once per tick, for every cell where it is nonzero, in the age/convert pass that runs before the main scan; when a cell's value reaches `0` in that pass, the cell converts to `explosionContent` on that same tick. Cloned in `cloneGrid`. |
| explosionContent | typed array (`Uint8Array`, length `width*height`) | **New.** The element index (`empty` or `diamond`) an explosion cell will become (FR-018, FR-019). Meaningful only while the paired `explosionRemaining` entry is nonzero. Cloned in `cloneGrid`. |

`Direction` (`'up' \| 'down' \| 'left' \| 'right'`) moves to `src/sim/grid.ts`
in this feature (previously defined in `src/sim/tick.ts`), since it is now
shared by `TickInput.direction` and enemy facing. `src/sim/tick.ts`
re-exports it so existing importers are unaffected.

## Cave State

Extends feature 002's `CaveState` (still opaque beyond its fields and the
read accessors).

| Field | Type | Notes |
|---|---|---|
| status | `'inPlay' \| 'dying' \| 'dead' \| 'completed'` | **Extended.** `'dying'` is new (FR-015). Set (from `'inPlay'` only — never re-set once already `'dying'` or later, FR-024) the tick the kid's cell is covered by any stamped blast, by the same code path regardless of what triggered that blast. `tick()`'s terminal early-return now checks `status === 'dead' \|\| status === 'completed'` — `'dying'` **does not** short-circuit; the cave keeps advancing (FR-015.2). Becomes `'dead'` on the first tick, while `'dying'`, that ends with no explosion cell left anywhere in the grid (FR-015.3). |
| pendingBlasts | `readonly { x: number; y: number; content: 'empty' \| 'diamond' }[]` | **New.** The chain queue (Key Entities: Pending detonation). Holds one entry per enemy destroyed by a blast during the *previous* tick, each naming the cell that enemy stood in and the content its own blast will leave. Stamped as blasts at the very start of the next `tick()` call, before the main scan (FR-023). Rebuilt fresh every tick (cleared, then repopulated with whatever this tick's stamping newly destroys) — never appended-to across ticks, so it cannot grow unboundedly over a long run. Empty in a cave with no enemies, or whenever no chain is in flight. |

**Relationships**: A chain "terminates" (Key Entities: Pending detonation)
simply when `pendingBlasts` comes out of a tick's stamping empty — no
separate terminal marker is needed, and "each enemy detonates at most once"
(FR-023) holds because a cell already converted to `explosion` is never
re-recognized as `firefly`/`butterfly` by the code that populates
`pendingBlasts` (see Detonation below).

## Cave Definition

**Unchanged shape.** The relaxed quota rule (FR-025) is a validation-rule
change at parse time, not a field change — see Cave Definition Validation
below.

**Validation rules** (extends feature 002's, all reported with cave name +
numbers, producing no partial grid on failure — unchanged framing from
FR-027):
- **Amended (FR-025, names feature 002's FR-027 as amended):** `quota` MUST
  NOT exceed `diamondCount + 9 * butterflyCount`, where `butterflyCount` is
  tallied in the same parse-time loop that already counts diamonds. A
  violation fails naming the cave, the declared quota, the diamond count,
  and the butterfly count (so both the old ceiling and the new allowance are
  visible in one message). A cave whose quota exceeds `diamondCount` alone
  but not the combined figure now loads successfully.
- Every other feature 001/002 validation rule (declared dimensions match
  row data, exactly one player, at most one exit, unrecognized characters)
  is unchanged.

## Tick Input

**Unchanged shape** (`direction`, `grab`, both optional) — this feature adds
no new input.

## Detonation (new entity — an event, not persisted; its effect is `stampBlast`)

The trigger conditions from FR-010–FR-013, each resolved by calling the
shared `stampBlast(centerX, centerY, content)` operation described below.

| Trigger | When checked | Center | Content |
|---|---|---|---|
| Enemy-kid contact (FR-010) | On that enemy's own step (its cadence tick), before attempting to move, if the kid occupies any of its 4 orthogonal neighbors | The enemy's own cell | The enemy's blast content (empty for firefly, diamond for butterfly) |
| Falling body reaches an enemy (FR-011) | On a falling boulder/diamond's per-tick check, if the cell directly below holds an enemy | The enemy's cell (one row below the body) | The enemy's blast content |
| Falling body reaches the kid — crush (FR-013, amends feature 002's FR-010) | Same falling-body check, if the cell directly below holds the kid | The kid's cell (one row below the body) | `empty` |
| Enemy caught in a blast (FR-012, FR-023) | Whenever `stampBlast` is about to overwrite a cell — other than its own center — that currently holds `firefly` or `butterfly` | (Not this detonation's own trigger — see Blast/Chain below; this row exists to name the case FR-012 requires) | — |

In both falling-body cases, the body itself is **not** moved into the
target cell (FR-011: "MUST NOT move into that cell"); it is destroyed
instead, because the target cell is the blast's center and the body's own
cell — one row above — is inside the same 3x3 and is therefore overwritten
to `explosion` by the same `stampBlast` call. No separate "remove the body"
step is needed.

## Blast / Chain (new entities)

| Concept | Notes |
|---|---|
| `stampBlast(cx, cy, content)` | The one operation every detonation calls. Visits the 3x3 centered on `(cx, cy)`, clipped to the grid (FR-016). For each in-bounds cell: if it is `steelWall` or `exit` (open or closed), it is left completely untouched (FR-017); otherwise, if it currently holds `player` and `status === 'inPlay'`, `status` becomes `'dying'` (FR-015); if it currently holds `firefly`/`butterfly` **and it is not the center cell**, its own cell/content is appended to the *next* tick's `pendingBlasts` (FR-023) — the center is excluded because it is the thing detonating *now*, not a future link; finally the cell is overwritten to `explosion` with `explosionRemaining = 2` and `explosionContent = content`. |
| Resolution order (FR-022) | Applied automatically: `pendingBlasts` from the previous tick are stamped first, in the order they were queued (itself the grid scan order in which their originating blast destroyed them); then triggers discovered during this tick's own main scan stamp in that scan's top-to-bottom, left-to-right order. Because every stamp writes immediately, the later call in this sequence always wins on any cell two blasts share — no separate conflict-resolution step exists or is needed. |
| Chain termination | Implicit — see Cave State above. A chain "reaches no further enemy" (FR-023) exactly when a tick's stamping populates an empty `pendingBlasts` for the next tick. |
| Explosion cell blocking (FR-021) | Enforced by existing content checks: the kid's move logic, the push logic, and the new enemy-step logic all treat any non-`empty` destination as blocked, and `explosion` is never `empty`; the roll-surface set (feature 002) does not include `explosion`, so a body above an explosion cell rests without rolling, exactly as it would above any other non-roll-surface content. |

## Enemy Step (new entity — computed fresh each cadence tick, not persisted beyond `facing`)

| Concept | Notes |
|---|---|
| Cadence (FR-002) | An enemy steps on tick `T` (the post-increment tick number, i.e. `state.tick + 1` for the tick being computed) iff `T` is odd. `T=1` steps (count 1 after 1 tick), `T=2` does not (count stays 1 after 2 ticks), `T=3` steps (count 2 after 3 ticks) — matching the spec's worked example exactly. Derived solely from the tick counter already on `CaveState`; no new state. |
| Turning preference (FR-005) | Fixed per element id, not per instance: firefly turns toward its left (relative to current facing), butterfly toward its right. Never consults `rngState`. |
| Step algorithm (FR-004) | In order: (1) if the cell on the preferred-turn side is `empty`, face that side and move into it; (2) else if the cell straight ahead (current facing) is `empty`, move into it, facing unchanged; (3) else stay in place and turn 90° toward the *non*-preferred side. "Empty" here means the single element id `empty` — dirt, either body, either wall, the door open or closed, another enemy, an explosion, and out-of-bounds are all non-empty/blocked (FR-006). |
| Initial facing (FR-007) | `left`, for every enemy, set once at parse time. |
| Scan-order interaction (FR-008) | An enemy that moves into a cell later in this tick's scan order is not stepped again this tick — the existing `movedThisTick` flag (set by the same `moveContent` helper bodies already use) already guarantees this with no enemy-specific code. |

## Read Accessors (new, added to `src/sim/cave.ts` alongside existing accessors)

Per FR-033, these are the only way anything outside `src/sim/` may observe
the new state:

| Accessor | Returns | Notes |
|---|---|---|
| `getEnemyFacing(state, x, y)` | `Direction \| undefined` | The facing at `(x, y)` if that cell currently holds `firefly` or `butterfly`; `undefined` otherwise. |
| `isExplosion(state, x, y)` | `boolean` | Whether `(x, y)` currently holds an explosion cell. Equivalent to `getCell(state, x, y) === 'explosion'`, provided as its own named accessor for symmetry with `isFalling` and because FR-033 names it explicitly. |

`getStatus(state)`'s return type gains `'dying'` — no new accessor, per
FR-033's "as a new value rather than a second accessor."

## Theme

**No shape change.** `ThemeEntry`/`Theme` (feature 001/002) are unchanged.
Only data values change: `elements.firefly.label` becomes `"Pencil
Sharpener"` and `elements.butterfly.label` becomes `"Paper Airplane"`
(FR-029), with glyph/color adjusted only as needed so the two remain
distinguishable from each other and from every other element at the shipped
cell size (FR-029, checked by `tests/lib/themes/classroom.test.ts`).
`elements.explosion` is unchanged — it already exists from feature 001 and
is simply exercised for the first time (FR-031).
