# Phase 1 Data Model: Foundation — Cave Grid, Deterministic Tick, Themed Renderer, Digging Player

Entities below correspond to the spec's Key Entities section, expanded to the
field level needed to implement `src/sim/` and the theme/camera layers.

## Element

The closed, shared vocabulary of what a cell can be. Identity only — no
appearance data lives here (Constitution Principle III).

| Field | Type | Notes |
|---|---|---|
| id | string literal union / numeric enum | One of: `empty`, `dirt`, `boulder`, `diamond`, `brickWall`, `steelWall`, `player`, `firefly`, `butterfly`, `amoeba`, `magicWall`, `expandingWall`, `exit`, `explosion` (FR-002) |

Represented in the grid as small integers (for typed-array storage), with a
single lookup table mapping id <-> integer <-> ASCII character (FR-032). Only
`empty`, `dirt`, `brickWall`, `steelWall`, `player` have tick behavior in this
feature; the rest are valid grid contents that the tick must pass over
unchanged (FR-003).

**Validation rules**: The element set is fixed at compile time; parsing
rejects any ASCII character not in the shared mapping (FR-033).

## Character Mapping

The single shared correspondence between ASCII characters and element ids
(FR-032), used identically by `src/caves/starter.ts` and by
`tests/sim/helpers/ascii-cave.ts`.

| Field | Type | Notes |
|---|---|---|
| char | single character | e.g. `.` empty, `#` dirt, `P` player, `B` brick wall, `S` steel wall (exact glyph-to-id table is an implementation choice made once in `src/sim/elements.ts`) |
| elementId | Element id | The element the character denotes |

**Validation rules**: Bijective within the declared set — every declared
element id used by shipped cave data or tests has exactly one character, and
every character in a parsed cave must resolve to a declared element id or
parsing fails naming the offending coordinate (FR-033).

## Cave Definition

The declarative, hand-authored description of a starting cave (FR-031).

| Field | Type | Notes |
|---|---|---|
| name | string | Used in parse-failure messages (FR-033) |
| width | integer | Declared column count; must match the ASCII grid's actual column count (FR-033, FR-036) |
| height | integer | Declared row count; must match the ASCII grid's actual row count (FR-033, FR-036) |
| seed | integer (or string hashed to integer) | Seeds the sim's PRNG (FR-009) |
| rows | string[] | The ASCII grid, one string per row, each of length `width` |

**Validation rules** (FR-033, all reported with cave name + offending
coordinates, producing no partial grid on failure):
- Every row's length equals `width`; row count equals `height`.
- Every character in every row resolves via the Character Mapping.
- Exactly one `player` character appears across the whole grid (zero or
  more than one is rejected).

**Relationships**: One Cave Definition parses into exactly one initial Grid /
Cave State. The starter cave (`src/caves/starter.ts`) is one instance of this
shape, 40 wide by 22 tall (FR-036), bordered entirely by an indestructible
wall element (FR-035).

## Grid / Cave State

The live, mutable-only-by-the-sim state a tick operates on (FR-005, FR-006).

| Field | Type | Notes |
|---|---|---|
| width, height | integer | Copied from the Cave Definition; never hardcoded elsewhere (FR-036) |
| cells | typed array (e.g. `Uint8Array`, length `width*height`) | Element id per cell, row-major so scan order (FR-007) is a simple index walk |
| movedThisTick | typed array (e.g. `Uint8Array`/bitset, length `width*height`) | Cleared at the start of every tick (FR-004); set when a cell's occupant has already been processed this scan |
| playerPos | `{x: integer, y: integer}` | Read-only externally (FR-005) |
| tick | integer | Monotonically increasing counter |
| rngState | opaque (whatever the chosen PRNG algorithm needs, e.g. a single `uint32`) | Part of cave state so replays reproduce it exactly (per Key Entities: Random generator); not consumed by any rule in this feature |

**Validation rules**: Never constructed directly by callers outside
`src/sim/` other than via the cave parser or the tick function — enforced by
only exporting read-only accessors plus the parse/tick entry points from
`src/sim/index.ts`-equivalent surface (FR-005).

**State transitions**: `tick(gridState, input) -> gridState'`. The only
producer of a new Grid/Cave State besides initial parse. See
`contracts/sim-api.md` for the exact signature and per-element transition
rules for this feature's five behavioral elements.

## Tick Input

The only channel through which the outside world influences the simulation
(FR-006, FR-019).

| Field | Type | Notes |
|---|---|---|
| direction | `'up' \| 'down' \| 'left' \| 'right' \| undefined` | Exactly one direction or nothing, decided by the shell before the tick runs (FR-019, FR-020) |

**Validation rules**: At most one direction per tick; no diagonal value is
representable (FR-012 is enforced by the type, not by a runtime check).

## Random Generator

The sim's own seeded PRNG (FR-008, FR-009, FR-010).

| Field | Type | Notes |
|---|---|---|
| state | integer (algorithm-dependent) | Seeded once from the Cave Definition's `seed` field at parse time; advances only when the sim itself draws from it |

**Relationships**: Embedded in Grid/Cave State (`rngState`) so that
serializing/replaying state reproduces the exact random stream (FR-010). No
rule in this feature consumes it yet (Assumptions).

## Camera

The rendering layer's own derived state — never part of Grid/Cave State,
never read by the sim (FR-029).

| Field | Type | Notes |
|---|---|---|
| offsetX, offsetY | number (cells or pixels, implementation's choice) | Top-left of the visible viewport within the cave |
| viewportWidth, viewportHeight | number | Derived from window/canvas size each frame |
| deadZone | rectangle within the viewport | Player must exit this zone before the camera moves (FR-029) |

**Validation rules**: `offsetX`/`offsetY` are always clamped so the visible
viewport never extends past `[0, width)` / `[0, height)` of the cave (FR-029);
when the cave fits entirely within the viewport, offset is fixed so the cave
is centered and never scrolls (FR-029, edge case).

**Relationships**: Computed each render frame from `playerPos` (read via the
sim's read-only accessor), the Cave Definition's `width`/`height`, and the
current canvas size. Strictly downstream of the sim; contributes nothing
back to it.

## Theme

A plain data table mapping every element id to appearance (FR-024–FR-027).

| Field | Type | Notes |
|---|---|---|
| id | string | Theme identifier, e.g. `classroom` |
| elements | `Record<ElementId, ThemeEntry>` | Must have one entry per declared element id (FR-025, FR-026), including the 9 with no behavior yet |
| background | appearance value (e.g. a fill/gradient descriptor) | The cave background appearance for the theme as a whole (FR-025) |

### ThemeEntry

| Field | Type | Notes |
|---|---|---|
| fillColor | color value | Required (FR-025) |
| glyph | string/drawing descriptor | Required (FR-025) |
| label | string | Human-readable, required (FR-025) |

**Validation rules**: Every element id declared in Element MUST have a
`ThemeEntry` in every registered theme (FR-025, FR-026) — checked by a test
that iterates the declared element set against the Classroom theme (User
Story 4's Independent Test).

**Relationships**: Keyed 1:1 by Element id. Adding a second theme is adding
one more `Theme` object to the registry (FR-027) — touches no other entity.
