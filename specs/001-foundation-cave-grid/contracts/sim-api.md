# Sim Contract: `src/sim/` Public Surface

This project has no network API — its only "external interface" is the
boundary `CLAUDE.md` draws between the sim (`src/sim/**`, plain TypeScript)
and the shell (`src/lib/**`, `src/*.svelte`, and `tests/`). This document is
that contract: exactly what the shell (and the test harness) may call, and
what each call guarantees. Nothing outside `src/sim/` may reach past this
surface into sim internals.

## Types

```ts
type ElementId =
  | 'empty' | 'dirt' | 'boulder' | 'diamond'
  | 'brickWall' | 'steelWall' | 'player'
  | 'firefly' | 'butterfly' | 'amoeba'
  | 'magicWall' | 'expandingWall' | 'exit' | 'explosion';

type Direction = 'up' | 'down' | 'left' | 'right';

type TickInput = { direction?: Direction };

interface CaveDefinition {
  name: string;
  width: number;
  height: number;
  seed: number;
  rows: string[]; // length === height, each entry length === width
}

interface CaveState {
  readonly width: number;
  readonly height: number;
  readonly tick: number;
  // opaque beyond this — see read accessors below
}
```

## Parse: `parseCave(def: CaveDefinition): CaveState`

- **Input**: A `CaveDefinition` (FR-031).
- **Guarantees**:
  - Throws (does not return a partial state) if rows are not all `width`
    long, if `rows.length !== height`, if any character is not in the shared
    Character Mapping, or if the grid contains zero or more than one
    `player` character (FR-033). The thrown error names the cave (`name`)
    and the offending coordinate(s).
  - On success, returns a `CaveState` with the parsed grid, the player's
    position located, `tick` at 0, and the PRNG seeded from `seed` (FR-009).
- **Callers**: the shell, at load time, and the test harness's ASCII-cave
  helper.

## Advance: `tick(state: CaveState, input: TickInput): CaveState`

- **Input**: The current `CaveState` and this tick's input (FR-006).
- **Guarantees**:
  - Pure function: never mutates `state`; returns a new `CaveState` (or the
    same reference if nothing changed — implementation's choice, but callers
    must not rely on identity).
  - Scans cells in fixed top-to-bottom, left-to-right order; clears the
    moved-this-tick flag for every cell first, and never processes a cell
    twice in one scan (FR-004, FR-007).
  - Moves the player at most one cell, in the direction given, never
    diagonally (FR-011, FR-012).
  - `empty` destination: player moves in, origin becomes `empty` (FR-013).
  - `dirt` destination: dirt is permanently removed, player moves in, origin
    becomes `empty` (FR-014).
  - `brickWall`/`steelWall` destination: player does not move, wall
    unchanged (FR-015).
  - Destination outside `[0,width) x [0,height)`: player does not move
    (FR-016) — reachable only if a cave omits a solid border; the shipped
    starter cave always has one (FR-035).
  - `input.direction === undefined`: player does not move (FR-017).
  - Never reads wall-clock time, never touches the DOM, never calls
    `Math.random` — the only randomness source is the PRNG embedded in
    `state`, and this feature's tick does not consume it (no rule here uses
    randomness yet) (FR-008).
  - Deterministic: same `state` + same `input` always produces the same next
    `state`, and a full replay of a same-seed cave with the same input
    sequence is byte-for-byte identical at every tick (FR-010).
- **Callers**: the shell's tick loop, once per fixed timestep, and the test
  harness's run-N-ticks helper.

## Read accessors (read-only, no mutation path exists)

```ts
function getCell(state: CaveState, x: number, y: number): ElementId;
function getPlayerPosition(state: CaveState): { x: number; y: number };
```

- **Guarantees**: Pure reads; there is no exported function that lets a
  caller write into `state.cells` or `state.playerPos` directly (FR-005).
  The renderer and the camera use only these two functions (plus
  `state.width`/`state.height`) — they never import sim internals.

## ASCII helpers (shared by cave data and tests — FR-032, FR-038, FR-040)

```ts
function caveFromAscii(ascii: { name: string; seed: number; rows: string[] }): CaveDefinition;
function asciiFromState(state: CaveState): string; // one row per line, using the same Character Mapping
```

- **Guarantees**: `caveFromAscii` derives `width`/`height` from the rows
  themselves (never hardcoded), and uses the one shared Character Mapping
  also used by `src/caves/starter.ts`. `asciiFromState` is the inverse,
  used by the test harness to render actual-vs-expected grids as readable
  ASCII on assertion failure (FR-040), never as raw cell values.

## What is explicitly NOT part of this contract

- Camera/viewport state (`src/lib/render/camera.ts`) — rendering-only, never
  imported by or exported from `src/sim/` (FR-029).
- Theme data (`src/lib/themes/`) — appearance only, keyed by `ElementId` but
  otherwise has no relationship to sim internals (FR-024–FR-027).
- Keyboard state tracking (`src/lib/input/keyboard.ts`) — produces
  `TickInput.direction` values but the key-repeat/held-key logic itself is
  shell-only (FR-021).
