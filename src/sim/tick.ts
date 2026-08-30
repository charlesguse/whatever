import {
  clearFallingIndex,
  clearMovedFlags,
  cloneGrid,
  getCellIndex,
  inBounds,
  isFallingIndex,
  isMoved,
  setCellIndex,
  setFallingIndex,
  setMoved,
  setPlayerPosition,
  type Grid,
} from './grid';
import type { CaveState } from './cave';
import { nextPrng, type PrngState } from './prng';

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface TickInput {
  readonly direction?: Direction;
  readonly grab?: boolean;
}

// The seeded generator's only consumer this feature: a fixed per-tick chance
// (research.md Push Resolution) that an eligible push against a resting
// eraser succeeds. Named, not repeated at any call site (FR-015).
const PUSH_CHANCE = 1 / 8;

const DIRECTION_DELTA: Readonly<Record<Direction, readonly [number, number]>> = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
};

// Mutable accumulator threaded through one tick's scan — avoids allocating a
// fresh object per cell on the hot path (constitution Principle VI).
interface TickContext {
  readonly grid: Grid;
  rngState: PrngState;
  collected: number;
  readonly quota: number;
  status: 'inPlay' | 'dead' | 'completed';
}

// The tick function: (grid, input) -> next grid (FR-006, FR-007). Pure —
// never mutates the input state, always returns a new CaveState. Scans cells
// in a fixed top-to-bottom, left-to-right order, clearing the moved-this-tick
// flag for every cell first, and never processing a cell twice in one scan.
// A body (or the kid) that moves into an already-scanned cell resumes next
// tick — this is what makes stacked bodies resolve over several ticks rather
// than simultaneously (see CLAUDE.md — do not "simplify" it away).
export function tick(state: CaveState, input: TickInput): CaveState {
  // FR-029: once terminal, further ticks are a no-op — no clone, no scan.
  if (state.status !== 'inPlay') {
    return state;
  }

  const grid = cloneGrid(state.grid);
  clearMovedFlags(grid);

  const ctx: TickContext = {
    grid,
    rngState: state.rngState,
    collected: state.collected,
    quota: state.quota,
    status: state.status,
  };

  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      if (isMoved(grid, x, y)) continue;
      const id = getCellIndex(grid, x, y);
      if (id === 'player') {
        movePlayer(ctx, x, y, input);
      } else if (id === 'boulder' || id === 'diamond') {
        processBody(ctx, x, y);
      }
    }
  }

  return {
    width: state.width,
    height: state.height,
    tick: state.tick + 1,
    grid,
    rngState: ctx.rngState,
    collected: ctx.collected,
    quota: state.quota,
    status: ctx.status,
  };
}

// Moves whatever content is at (fromX, fromY) to (toX, toY): the origin
// becomes empty, the destination takes on the origin's content, both cells'
// falling flags are cleared (the mover's caller re-marks the destination
// falling if that's the right physics for this move), and the destination is
// marked moved-this-tick so the scan does not reprocess it this tick.
function moveContent(grid: Grid, fromX: number, fromY: number, toX: number, toY: number): void {
  const id = getCellIndex(grid, fromX, fromY);
  setCellIndex(grid, fromX, fromY, 'empty');
  setCellIndex(grid, toX, toY, id);
  clearFallingIndex(grid, fromX, fromY);
  clearFallingIndex(grid, toX, toY);
  setMoved(grid, toX, toY);
}

function isDoorOpenCtx(ctx: TickContext): boolean {
  return ctx.collected >= ctx.quota;
}

// The per-body falling/rolling/crushing state machine (FR-001–FR-011,
// research.md), run for every boulder/diamond cell not yet processed this
// tick, in a fixed order: (1) fall if the cell below is empty; (2) else kill
// the kid if the cell below holds them AND this body is currently falling —
// a resting body above the kid is furniture; (3) else roll off another body
// or a brick wall, left-first then right, when the side and its
// diagonal-below are both empty; (4) otherwise the body is at rest.
function processBody(ctx: TickContext, x: number, y: number): void {
  const grid = ctx.grid;
  const belowInBounds = inBounds(grid, x, y + 1);
  const belowId = belowInBounds ? getCellIndex(grid, x, y + 1) : undefined;

  if (belowId === 'empty') {
    moveContent(grid, x, y, x, y + 1);
    setFallingIndex(grid, x, y + 1);
    return;
  }

  if (belowId === 'player') {
    if (isFallingIndex(grid, x, y)) {
      moveContent(grid, x, y, x, y + 1);
      setFallingIndex(grid, x, y + 1);
      ctx.status = 'dead';
    }
    return;
  }

  const isRollSurface = belowId === 'boulder' || belowId === 'diamond' || belowId === 'brickWall';
  if (isRollSurface) {
    for (const dx of [-1, 1] as const) {
      const sideX = x + dx;
      if (!inBounds(grid, sideX, y)) continue;
      if (getCellIndex(grid, sideX, y) !== 'empty') continue;
      if (!inBounds(grid, sideX, y + 1)) continue;
      if (getCellIndex(grid, sideX, y + 1) !== 'empty') continue;
      moveContent(grid, x, y, sideX, y);
      setFallingIndex(grid, sideX, y);
      return;
    }
  }

  clearFallingIndex(grid, x, y);
}

function movePlayer(ctx: TickContext, x: number, y: number, input: TickInput): void {
  const grid = ctx.grid;

  if (input.grab) {
    resolveGrab(ctx, x, y, input.direction);
    return;
  }

  const direction = input.direction;
  if (direction === undefined) return; // FR-017: no input, no move

  const [dx, dy] = DIRECTION_DELTA[direction];
  const nx = x + dx;
  const ny = y + dy;

  if (!inBounds(grid, nx, ny)) return; // FR-016: boundary blocks movement

  const destId = getCellIndex(grid, nx, ny);

  if (destId === 'brickWall' || destId === 'steelWall') return; // FR-015

  if (destId === 'exit') {
    if (!isDoorOpenCtx(ctx)) return; // FR-023: closed door blocks exactly like steel wall
    moveContent(grid, x, y, nx, ny);
    setPlayerPosition(grid, { x: nx, y: ny });
    ctx.status = 'completed'; // FR-026
    return;
  }

  if (destId === 'boulder') {
    resolvePush(ctx, x, y, nx, ny, direction);
    return;
  }

  if (destId === 'diamond') {
    moveContent(grid, x, y, nx, ny);
    setPlayerPosition(grid, { x: nx, y: ny });
    ctx.collected += 1; // FR-017, FR-018
    return;
  }

  if (destId === 'empty' || destId === 'dirt') {
    // FR-013 (empty) / FR-014 (dirt is cleared permanently)
    moveContent(grid, x, y, nx, ny);
    setPlayerPosition(grid, { x: nx, y: ny });
  }
}

// Push resolution (FR-012–FR-016, data-model.md Push Resolution). Eligible
// iff the press is horizontal, the boulder is currently resting, and the
// cell beyond it (same direction) is in-grid and empty — every other case
// returns before touching the generator at all, so an ineligible push never
// consumes randomness.
function resolvePush(
  ctx: TickContext,
  px: number,
  py: number,
  bx: number,
  by: number,
  direction: Direction
): void {
  const grid = ctx.grid;

  if (direction !== 'left' && direction !== 'right') return; // FR-013: vertical press
  if (isFallingIndex(grid, bx, by)) return; // FR-014: falling boulder

  const [dx] = DIRECTION_DELTA[direction];
  const beyondX = bx + dx;
  const beyondY = by;

  if (!inBounds(grid, beyondX, beyondY)) return; // FR-013: off-grid beyond-cell
  if (getCellIndex(grid, beyondX, beyondY) !== 'empty') return; // FR-013: occupied beyond-cell

  const draw = nextPrng(ctx.rngState);
  ctx.rngState = draw.state;
  if (draw.value >= PUSH_CHANCE) return; // failed draw — neither moves, rngState still advances

  // Boulder moves first — it must vacate (bx, by) before the kid moves in.
  // Not marked falling here: the next tick's fall check picks it up if it's
  // unsupported (FR-012).
  moveContent(grid, bx, by, beyondX, beyondY);
  moveContent(grid, px, py, bx, by);
  setPlayerPosition(grid, { x: bx, y: by });
}

// Grab (FR-019–FR-021): acts on the neighboring cell in the pressed
// direction without moving the kid. Dirt is cleared, a diamond is collected;
// every other content — including a resting or falling boulder, either
// wall, the door open or closed, and out-of-grid — is left untouched. Grab
// never pushes and never enters the door.
function resolveGrab(ctx: TickContext, x: number, y: number, direction: Direction | undefined): void {
  if (direction === undefined) return;

  const grid = ctx.grid;
  const [dx, dy] = DIRECTION_DELTA[direction];
  const nx = x + dx;
  const ny = y + dy;

  if (!inBounds(grid, nx, ny)) return;

  const destId = getCellIndex(grid, nx, ny);

  if (destId === 'dirt') {
    setCellIndex(grid, nx, ny, 'empty');
    return;
  }

  if (destId === 'diamond') {
    setCellIndex(grid, nx, ny, 'empty');
    clearFallingIndex(grid, nx, ny);
    ctx.collected += 1;
  }
}
