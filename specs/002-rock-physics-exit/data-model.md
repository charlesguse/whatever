# Phase 1 Data Model: Rock Physics — Falling, Rolling, Pushing, Crushing, and the Exit

Entities below extend feature 001's data model
([`specs/001-foundation-cave-grid/data-model.md`](../001-foundation-cave-grid/data-model.md)).
Only fields and rules new or changed in this feature are listed; everything
else from feature 001 (Element identity, Character Mapping, Camera) is
unchanged and not repeated here.

## Element

**Unchanged set** — no new element ids. `boulder`, `diamond`, and `exit`
move from "declared, inert" to "declared, behavioral" in this feature, joining
`empty`, `dirt`, `brickWall`, `steelWall`, `player` from feature 001. The
remaining five (`firefly`, `butterfly`, `amoeba`, `magicWall`, `expandingWall`)
stay inert, per the spec's Edge Cases ("a body falls onto an element with no
behavior yet... stops and rests there").

## Grid / Cave State

Extends feature 001's Grid/Cave State.

| Field | Type | Notes |
|---|---|---|
| falling | typed array (`Uint8Array`, length `width*height`) | **New.** Per-cell flag, parallel to `movedThisTick` and indexed the same way. Set when a boulder/diamond starts falling or rolls (FR-003, FR-009); cleared the tick it comes to rest (FR-004, FR-005). Unlike `movedThisTick`, **not** cleared at the start of every tick — it is state carried tick-to-tick (FR-002), only ever written by the falling/rolling algorithm. Cloned in `cloneGrid` alongside `cells`/`movedThisTick`. |

`playerPos` may point at a cell now occupied by a body that killed the kid
(status `dead`) — the position is not moved off the death cell, since FR-010
says the body *takes* that cell; rendering the death is a maintainer-verified
concern (spec "Verified by the maintainer at review time"), not a grid
invariant.

## Cave State

Extends feature 001's `CaveState` (still opaque beyond the fields below and
the read accessors — FR-005 from feature 001, FR-043 here).

| Field | Type | Notes |
|---|---|---|
| collected | integer | **New.** Gold stars collected this cave (FR-018). Starts at 0 (parse time); only ever incremented, by exactly 1, when a diamond is collected by move or grab (FR-017). Part of `CaveState` so replay reproduces it exactly. |
| quota | integer | **New.** Copied from `CaveDefinition.quota` at parse time (FR-022). Never changes after parse. |
| status | `'inPlay' \| 'dead' \| 'completed'` | **New.** Starts `'inPlay'` (FR-028). Set to `'dead'` the tick a falling body's downward move lands on the kid's cell (FR-010). Set to `'completed'` the tick the kid moves into an open door (FR-026). Once non-`'inPlay'`, `tick()` returns the same state unchanged — no clone, no scan (FR-029). |

**Relationships**: `isDoorOpen(state)` (see Read Accessors) is a *derived*
fact — `collected >= quota` — not a stored field, because collected is
monotonically non-decreasing in this feature (only collection increments it,
nothing decrements it), which already makes "door open" permanent (FR-025)
without a second flag that could drift from the comparison.

## Cave Definition

Extends feature 001's `CaveDefinition`.

| Field | Type | Notes |
|---|---|---|
| quota | integer | **New.** Declared per cave (FR-022). Cave data, not code (Key Entities: Quota). |

**Validation rules** (new, in addition to feature 001's, all reported with
cave name + numbers, producing no partial grid on failure — FR-027):
- `quota` MUST NOT exceed the number of `diamond` characters found while
  parsing the rows. Violation fails naming the cave, the declared quota, and
  the actual diamond count.
- Exactly one `exit` character is expected across the whole grid, mirroring
  the existing "exactly one player" rule's shape (Assumptions: "Caves with
  more than one door are not supported and none ships" — enforced the same
  way the single-player rule already is, for the same reason: an ambiguous
  cave should fail loudly at parse time rather than pick one exit silently).

## Tick Input

Extends feature 001's `TickInput`.

| Field | Type | Notes |
|---|---|---|
| grab | `boolean \| undefined` | **New.** Whether the grab modifier is held this tick (FR-021, Key Entities: Grab input). Falsy/absent behaves as not held. Travels with `direction` so a recorded input sequence (direction + grab pairs) replays identically. |

**Validation rules**: `grab` with `direction === undefined` is a no-op, same
as any other tick with no direction (Assumptions: "Grab plus a direction that
is not adjacent to anything actionable is a no-op, not an error" generalizes
to no direction at all).

## Random Generator

**Unchanged shape** (`PrngState`, `seedPrng`, `nextPrng` from feature 001).
New relationship: this feature gives it its **first and only consumer**
(FR-016) — exactly one `nextPrng` call per *eligible* push, per tick (see
Push Resolution below). No other rule in this feature draws from it.

## Push Resolution (new entity — not persisted, computed fresh each tick)

The per-tick evaluation of a player press against an eraser (Key Entities:
Push chance).

| Concept | Notes |
|---|---|
| Eligibility | A press is *eligible* iff: direction is horizontal, the pressed-into cell holds a resting (non-falling) boulder, and the cell beyond that boulder in the same direction is in-grid and `empty` (FR-012). Any other combination — vertical press into a boulder, cell beyond occupied or off-grid, or the boulder currently falling — is *ineligible* (FR-013, FR-014). |
| PUSH_CHANCE | One named constant (`src/sim/tick.ts`), value `1/8` (FR-015). The generator's only read site. |
| Resolution | Eligible: draw once via `nextPrng`; if the value is `< PUSH_CHANCE`, the boulder moves into the beyond-cell (marked falling, per the normal falling check next tick) and the kid moves into the boulder's old cell, both within this tick (FR-012); otherwise neither moves, but the draw still happened and the new `rngState` is kept (FR-015, FR-016). Ineligible: nothing moves, and `rngState` is passed through byte-identical — **no** call to `nextPrng` (FR-013, FR-016). |

**Relationships**: Exactly one push can be attempted per tick (the kid
occupies exactly one cell); resolution happens inside the same top-to-bottom,
left-to-right scan as falling/rolling, at the player's cell, using whatever
`rngState` the scan has accumulated so far this tick (in this feature that is
always the state carried in from the previous tick, since nothing else in
the scan consumes it).

## Roll Surface (new entity — a closed classification, not stored)

The set of cell contents a resting body will roll off (Key Entities: Roll
surface): `boulder`, `diamond`, `brickWall`. Everything else — `steelWall`,
`dirt`, `player`, `exit` (open or closed), and any element with no behavior
yet — supports a body without ever letting it roll (FR-007, FR-008, and the
Edge Cases about resting on an inert element or on the door).

## Theme

Extends feature 001's `Theme`/`ThemeEntry` (both unchanged in shape for
existing fields).

| Field | Type | Notes |
|---|---|---|
| elements.exit | `ThemeEntry` | **Reused, not new.** Now specifically documented as the door's **closed** appearance, and MUST be visually identical to `elements.steelWall` in every shipped theme (FR-024) — checked by a test comparing the two entries, not by sharing object identity. |
| doorOpenEntry | `ThemeEntry` | **New.** The door's open/flashing appearance (FR-038). The renderer alternates between this and `elements.exit` purely on its own frame timer (FR-039), only once `isDoorOpen(state)` is true. |
| messages | `{ dead: string; completed: string }` | **New.** The two terminal-state messages, in the theme's own words (FR-038, FR-030). |
| readout | `{ template: string }` | **New.** A template string for the collected/quota HUD (FR-038, FR-041), e.g. containing `{count}` and `{quota}` placeholders the shell substitutes — no function value, so the field stays plain data (Constitution Principle III). |

**Validation rules**: Every registered theme MUST supply `doorOpenEntry`,
`messages.dead`, `messages.completed`, and `readout.template`, and MUST make
`elements.exit` visually identical to `elements.steelWall` (fillColor, glyph,
and label all equal) — checked by tests extending feature 001's
"every element id has an entry" check (FR-038, FR-040).

## Read Accessors (new, added to `src/sim/cave.ts` alongside feature 001's `getCell`/`getPlayerPosition`)

Per FR-043, these are the only way anything outside `src/sim/` may observe
the new state:

| Accessor | Returns | Notes |
|---|---|---|
| `getCollected(state)` | integer | Current collected count. |
| `getQuota(state)` | integer | The cave's declared quota. |
| `isDoorOpen(state)` | boolean | `collected >= quota`. |
| `getStatus(state)` | `'inPlay' \| 'dead' \| 'completed'` | Current cave status. |
| `isFalling(state, x, y)` | boolean | Whether the body in cell `(x, y)` is currently falling. Used by rendering only if a theme ever wants to distinguish falling vs. resting visually (not required by this feature, but the accessor is required by FR-043 regardless). |
