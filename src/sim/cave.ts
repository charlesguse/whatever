import { CHAR_TO_ELEMENT, type ElementId } from './elements';
import {
  createGrid,
  getCellIndex,
  isFallingIndex,
  setCellIndex,
  type Grid,
  type Position,
} from './grid';
import { seedPrng, type PrngState } from './prng';

export type CaveStatus = 'inPlay' | 'dead' | 'completed';

export interface CaveDefinition {
  readonly name: string;
  readonly width: number;
  readonly height: number;
  readonly seed: number;
  readonly quota: number;
  readonly rows: readonly string[];
}

// Opaque beyond width/height/tick — everything outside src/sim/ must go
// through the read accessors in grid.ts (FR-005), never these fields.
export interface CaveState {
  readonly width: number;
  readonly height: number;
  readonly tick: number;
  readonly grid: Grid;
  readonly rngState: PrngState;
  readonly collected: number;
  readonly quota: number;
  readonly status: CaveStatus;
}

function fail(caveName: string, message: string): never {
  throw new Error(`Cave "${caveName}": ${message}`);
}

// Validates and parses a CaveDefinition into an initial CaveState (FR-031,
// FR-033). Throws — never returns a partial grid — naming the cave and the
// offending coordinate(s) on any failure.
export function parseCave(def: CaveDefinition): CaveState {
  const { name, width, height, seed, quota, rows } = def;

  if (rows.length !== height) {
    fail(name, `declared height ${height} but got ${rows.length} row(s)`);
  }

  for (let y = 0; y < rows.length; y++) {
    if (rows[y].length !== width) {
      fail(
        name,
        `row ${y} has length ${rows[y].length}, expected declared width ${width}`
      );
    }
  }

  let playerPos: Position | undefined;
  const playerPositions: Position[] = [];
  const exitPositions: Position[] = [];
  let diamondCount = 0;

  for (let y = 0; y < height; y++) {
    const row = rows[y];
    for (let x = 0; x < width; x++) {
      const char = row[x];
      const elementId = CHAR_TO_ELEMENT[char];
      if (elementId === undefined) {
        fail(name, `unrecognized character "${char}" at (${x}, ${y})`);
      }
      if (elementId === 'player') {
        playerPositions.push({ x, y });
      }
      if (elementId === 'exit') {
        exitPositions.push({ x, y });
      }
      if (elementId === 'diamond') {
        diamondCount++;
      }
    }
  }

  if (playerPositions.length === 0) {
    fail(name, 'no player character found (expected exactly one)');
  }
  if (playerPositions.length > 1) {
    const coords = playerPositions.map((p) => `(${p.x}, ${p.y})`).join(', ');
    fail(name, `expected exactly one player character, found ${playerPositions.length} at ${coords}`);
  }

  if (exitPositions.length > 1) {
    const coords = exitPositions.map((p) => `(${p.x}, ${p.y})`).join(', ');
    fail(name, `expected at most one exit character, found ${exitPositions.length} at ${coords}`);
  }

  if (quota > diamondCount) {
    fail(name, `quota ${quota} exceeds the ${diamondCount} diamond(s) found in the grid`);
  }

  playerPos = playerPositions[0];

  const grid = createGrid(width, height, playerPos);
  for (let y = 0; y < height; y++) {
    const row = rows[y];
    for (let x = 0; x < width; x++) {
      const elementId = CHAR_TO_ELEMENT[row[x]];
      // Player occupies its cell as 'player' content, same as any other element.
      setCellIndex(grid, x, y, elementId);
    }
  }

  return {
    width,
    height,
    tick: 0,
    grid,
    rngState: seedPrng(seed),
    collected: 0,
    quota,
    status: 'inPlay',
  };
}

// Read-only accessors (FR-005) — the only way anything outside src/sim/ may
// observe grid contents or player position. The renderer and the camera use
// only these two functions, plus state.width/state.height.
export function getCell(state: CaveState, x: number, y: number): ElementId {
  return getCellIndex(state.grid, x, y);
}

export function getPlayerPosition(state: CaveState): Position {
  return { ...state.grid.playerPos };
}

export function getCollected(state: CaveState): number {
  return state.collected;
}

export function getQuota(state: CaveState): number {
  return state.quota;
}

// Derived, not stored — collected only ever increases, so this comparison
// is already permanent once true (FR-025, data-model.md Cave State).
export function isDoorOpen(state: CaveState): boolean {
  return state.collected >= state.quota;
}

export function getStatus(state: CaveState): CaveStatus {
  return state.status;
}

export function isFalling(state: CaveState, x: number, y: number): boolean {
  return isFallingIndex(state.grid, x, y);
}
