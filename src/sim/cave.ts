import { CHAR_TO_ELEMENT, type ElementId } from './elements';
import {
  createGrid,
  getCellIndex,
  getExplosionRemaining,
  getFacing,
  isFallingIndex,
  setCellIndex,
  setFacing,
  type Direction,
  type Grid,
  type Position,
} from './grid';
import { seedPrng, type PrngState } from './prng';

export type CaveStatus = 'inPlay' | 'dying' | 'dead' | 'completed';

// The single seconds<->ticks conversion (research.md Decision 2), relocated
// here from App.svelte's local constant so parseCave (seconds -> ticks at
// parse time) and the shell's own tick-loop interval read the same number.
export const TICK_RATE_HZ = 8;

// FR-015: one cave-wide value shared by every magic wall cell — never
// per-cell. 'dormant' until a falling boulder/diamond first enters a wall
// cell; 'active' for magicWallDuration ticks; 'dead' permanently after,
// indistinguishable in the theme from 'dormant' (FR-034/FR-034a).
export type MagicWallPhase = 'dormant' | 'active' | 'dead';

// The chain queue (data-model.md Cave State: Pending detonation). Holds one
// entry per enemy destroyed by a blast during the previous tick, each naming
// the cell that enemy stood in and the content its own blast will leave.
export interface PendingBlast {
  readonly x: number;
  readonly y: number;
  readonly content: 'empty' | 'diamond';
}

export interface CaveDefinition {
  readonly name: string;
  readonly width: number;
  readonly height: number;
  readonly seed: number;
  readonly quota: number;
  readonly rows: readonly string[];
  // FR-028: optional, validated cave-scoped parameters (FR-029). Documented
  // defaults applied at parse time when omitted so every existing cave and
  // test loads unchanged.
  readonly amoebaGrowthRate?: number; // default 0.03
  readonly amoebaSizeLimit?: number; // default 200
  readonly magicWallDuration?: number; // default 40
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
  readonly pendingBlasts: readonly PendingBlast[];
  readonly amoebaGrowthRate: number;
  readonly amoebaSizeLimit: number;
  readonly magicWallDuration: number;
  readonly magicWallPhase: MagicWallPhase;
  readonly magicWallCountdown: number;
}

const DEFAULT_AMOEBA_GROWTH_RATE = 0.03;
const DEFAULT_AMOEBA_SIZE_LIMIT = 200;
const DEFAULT_MAGIC_WALL_DURATION = 40;

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
  let butterflyCount = 0;

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
      if (elementId === 'butterfly') {
        butterflyCount++;
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

  // FR-025 (amends feature 002's FR-027): a butterfly's blast pays out 9
  // gold stars, so quota may draw on that payout too — reject only when it
  // exceeds diamonds already on the grid plus every butterfly's potential.
  const butterflyPayout = 9 * butterflyCount;
  if (quota > diamondCount + butterflyPayout) {
    fail(
      name,
      `quota ${quota} exceeds the ${diamondCount} diamond(s) plus ${butterflyPayout} possible from ${butterflyCount} butterfly(ies) found in the grid`
    );
  }

  // FR-029: the three new cave-scoped parameters, if present, must be valid
  // — checked with the same failure discipline as every rule above (throws
  // naming the cave and the offending value, no partial grid).
  if (
    def.amoebaSizeLimit !== undefined &&
    (!Number.isInteger(def.amoebaSizeLimit) || def.amoebaSizeLimit <= 0)
  ) {
    fail(name, `amoebaSizeLimit must be a positive whole number, got ${def.amoebaSizeLimit}`);
  }
  if (
    def.magicWallDuration !== undefined &&
    (!Number.isInteger(def.magicWallDuration) || def.magicWallDuration <= 0)
  ) {
    fail(name, `magicWallDuration must be a positive whole number, got ${def.magicWallDuration}`);
  }
  if (
    def.amoebaGrowthRate !== undefined &&
    !(def.amoebaGrowthRate > 0 && def.amoebaGrowthRate <= 1)
  ) {
    fail(name, `amoebaGrowthRate must be a number greater than 0 and at most 1, got ${def.amoebaGrowthRate}`);
  }

  playerPos = playerPositions[0];

  const grid = createGrid(width, height, playerPos);
  for (let y = 0; y < height; y++) {
    const row = rows[y];
    for (let x = 0; x < width; x++) {
      const elementId = CHAR_TO_ELEMENT[row[x]];
      // Player occupies its cell as 'player' content, same as any other element.
      setCellIndex(grid, x, y, elementId);
      if (elementId === 'firefly' || elementId === 'butterfly') {
        setFacing(grid, x, y, 'left'); // FR-007: every enemy starts facing left
      }
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
    pendingBlasts: [],
    amoebaGrowthRate: def.amoebaGrowthRate ?? DEFAULT_AMOEBA_GROWTH_RATE,
    amoebaSizeLimit: def.amoebaSizeLimit ?? DEFAULT_AMOEBA_SIZE_LIMIT,
    magicWallDuration: def.magicWallDuration ?? DEFAULT_MAGIC_WALL_DURATION,
    magicWallPhase: 'dormant',
    magicWallCountdown: 0,
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

// FR-033: the only way anything outside src/sim/ may observe enemy facing or
// explosion cells.
export function getEnemyFacing(state: CaveState, x: number, y: number): Direction | undefined {
  const id = getCellIndex(state.grid, x, y);
  if (id !== 'firefly' && id !== 'butterfly') return undefined;
  return getFacing(state.grid, x, y);
}

export function isExplosion(state: CaveState, x: number, y: number): boolean {
  return getExplosionRemaining(state.grid, x, y) !== 0;
}

// FR-036: the only way anything outside src/sim/ may observe the magic
// wall's phase. Permitted use is choosing between the theme's inert and
// active entries — never to distinguish 'dormant' from 'dead' (FR-034a).
export function getMagicWallPhase(state: CaveState): MagicWallPhase {
  return state.magicWallPhase;
}
