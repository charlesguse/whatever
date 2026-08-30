import {
  clearFallingIndex,
  clearMovedFlags,
  cloneGrid,
  DIRECTION_DELTA,
  getCellIndex,
  getExplosionContent,
  getExplosionRemaining,
  getFacing,
  inBounds,
  isFallingIndex,
  isMoved,
  setCellIndex,
  setExplosion,
  setFacing,
  setFallingIndex,
  setMoved,
  setPlayerPosition,
  type Direction,
  type Grid,
} from './grid';
import type { CaveState, CaveStatus, PendingBlast } from './cave';
import { nextPrng, type PrngState } from './prng';

export type { Direction } from './grid';

export interface TickInput {
  readonly direction?: Direction;
  readonly grab?: boolean;
}

// The seeded generator's only consumer this feature: a fixed per-tick chance
// (research.md Push Resolution) that an eligible push against a resting
// eraser succeeds. Named, not repeated at any call site (FR-015).
const PUSH_CHANCE = 1 / 8;

const ORTHOGONAL_DIRS = ['up', 'down', 'left', 'right'] as const;

type EnemyId = 'firefly' | 'butterfly';

// FR-018: what each enemy type's own blast leaves behind.
const ENEMY_BLAST_CONTENT: Readonly<Record<EnemyId, 'empty' | 'diamond'>> = {
  firefly: 'empty',
  butterfly: 'diamond',
};

// Turning 90 degrees relative to a current facing (FR-004, FR-005).
const TURN_LEFT: Readonly<Record<Direction, Direction>> = {
  up: 'left',
  left: 'down',
  down: 'right',
  right: 'up',
};
const TURN_RIGHT: Readonly<Record<Direction, Direction>> = {
  up: 'right',
  right: 'down',
  down: 'left',
  left: 'up',
};

// FR-005: fixed per element id, never per instance — firefly prefers left,
// butterfly prefers right.
const PREFERRED_TURN: Readonly<Record<EnemyId, Readonly<Record<Direction, Direction>>>> = {
  firefly: TURN_LEFT,
  butterfly: TURN_RIGHT,
};
const NON_PREFERRED_TURN: Readonly<Record<EnemyId, Readonly<Record<Direction, Direction>>>> = {
  firefly: TURN_RIGHT,
  butterfly: TURN_LEFT,
};

// Mutable accumulator threaded through one tick's scan — avoids allocating a
// fresh object per cell on the hot path (constitution Principle VI).
interface TickContext {
  readonly grid: Grid;
  rngState: PrngState;
  collected: number;
  readonly quota: number;
  status: CaveStatus;
  // Enemies a blast destroys this tick queue their own blast here, to be
  // stamped at the very start of next tick (FR-023) — rebuilt fresh every
  // tick, never appended-to across ticks (data-model.md Cave State).
  readonly nextPendingBlasts: PendingBlast[];
}

// The tick function: (grid, input) -> next grid (FR-006, FR-007). Pure —
// never mutates the input state, always returns a new CaveState. Scans cells
// in a fixed top-to-bottom, left-to-right order, clearing the moved-this-tick
// flag for every cell first, and never processing a cell twice in one scan.
// A body (or the kid) that moves into an already-scanned cell resumes next
// tick — this is what makes stacked bodies resolve over several ticks rather
// than simultaneously (see CLAUDE.md — do not "simplify" it away).
export function tick(state: CaveState, input: TickInput): CaveState {
  // FR-015.2/FR-029 (amended): only 'dead'/'completed' are terminal —
  // 'dying' keeps advancing so a bloom or chain can finish.
  if (state.status === 'dead' || state.status === 'completed') {
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
    nextPendingBlasts: [],
  };

  ageExplosions(ctx);

  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      if (isMoved(grid, x, y)) continue;
      const id = getCellIndex(grid, x, y);
      if (id === 'player') {
        movePlayer(ctx, x, y, input);
      } else if (id === 'boulder' || id === 'diamond') {
        processBody(ctx, x, y);
      } else if (id === 'firefly' || id === 'butterfly') {
        // FR-002: an enemy steps only on an odd post-increment tick number.
        if ((state.tick + 1) % 2 === 1) {
          stepEnemy(ctx, x, y, id);
        }
      }
    }
  }

  // FR-015.3: the first tick that ends dying with no explosion cell left
  // anywhere in the grid settles into dead.
  if (ctx.status === 'dying' && !hasAnyExplosion(grid)) {
    ctx.status = 'dead';
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
    pendingBlasts: ctx.nextPendingBlasts,
  };
}

// The once-per-tick explosion age/convert pass (FR-019, FR-020): every cell
// with a nonzero explosionRemaining ages by exactly one tick; a cell that
// reaches zero converts to its explosionContent on this same tick, and — only
// when that content is a gold star — is marked moved-this-tick so it does not
// also fall/roll on its creation tick.
function ageExplosions(ctx: TickContext): void {
  const grid = ctx.grid;
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      const remaining = getExplosionRemaining(grid, x, y);
      if (remaining === 0) continue;

      const content = getExplosionContent(grid, x, y);
      const next = remaining - 1;
      if (next === 0) {
        setExplosion(grid, x, y, 0, content);
        setCellIndex(grid, x, y, content);
        if (content === 'diamond') {
          setMoved(grid, x, y);
        }
      } else {
        setExplosion(grid, x, y, next, content);
      }
    }
  }
}

function hasAnyExplosion(grid: Grid): boolean {
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      if (getExplosionRemaining(grid, x, y) !== 0) return true;
    }
  }
  return false;
}

// stampBlast (data-model.md Blast/Chain, FR-016–FR-018, FR-021): the one
// operation every detonation calls. Visits the 3x3 centered on (cx, cy),
// clipped to the grid — no wrapping, no error at an edge or corner (FR-016).
// A steel wall or the door (open or closed) is left completely untouched
// (FR-017); every other visited cell becomes an explosion cell with this
// blast's content, including the kid's own cell if caught, which is how a
// death blooms rather than freezing silently — a cell that held 'player'
// while status was still 'inPlay' also moves the cave into the dying state
// (FR-015) before being overwritten.
function stampBlast(ctx: TickContext, cx: number, cy: number, content: 'empty' | 'diamond'): void {
  const grid = ctx.grid;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const x = cx + dx;
      const y = cy + dy;
      if (!inBounds(grid, x, y)) continue;

      const id = getCellIndex(grid, x, y);
      if (id === 'steelWall' || id === 'exit') continue; // FR-017

      if (id === 'player' && ctx.status === 'inPlay') {
        ctx.status = 'dying'; // FR-015
      }

      setCellIndex(grid, x, y, 'explosion');
      setExplosion(grid, x, y, 2, content); // FR-016, FR-018, FR-019
    }
  }
}

// The wall-follower enemy step (FR-001–FR-009, data-model.md Enemy Step),
// run for every firefly/butterfly cell not yet processed this tick, on a
// cadence tick. Detonates instead of moving if the kid is orthogonally
// adjacent (FR-010); otherwise: preferred-turn side if empty, else straight
// ahead if empty, else turn 90° toward the non-preferred side in place
// (FR-004). Facing is read from and written to the grid's facing array only
// via the grid.ts helpers, never recomputed from anything else (FR-003).
function stepEnemy(ctx: TickContext, x: number, y: number, id: EnemyId): void {
  const grid = ctx.grid;

  for (const dir of ORTHOGONAL_DIRS) {
    const [dx, dy] = DIRECTION_DELTA[dir];
    const nx = x + dx;
    const ny = y + dy;
    if (inBounds(grid, nx, ny) && getCellIndex(grid, nx, ny) === 'player') {
      stampBlast(ctx, x, y, ENEMY_BLAST_CONTENT[id]); // FR-010
      return;
    }
  }

  const facing = getFacing(grid, x, y);

  const preferredDir = PREFERRED_TURN[id][facing];
  const [pdx, pdy] = DIRECTION_DELTA[preferredDir];
  const px = x + pdx;
  const py = y + pdy;
  if (inBounds(grid, px, py) && getCellIndex(grid, px, py) === 'empty') {
    moveContent(grid, x, y, px, py);
    setFacing(grid, px, py, preferredDir);
    return;
  }

  const [fdx, fdy] = DIRECTION_DELTA[facing];
  const fx = x + fdx;
  const fy = y + fdy;
  if (inBounds(grid, fx, fy) && getCellIndex(grid, fx, fy) === 'empty') {
    moveContent(grid, x, y, fx, fy);
    setFacing(grid, fx, fy, facing);
    return;
  }

  setFacing(grid, x, y, NON_PREFERRED_TURN[id][facing]);
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
      // FR-013 (amends feature 002's FR-010): a crushing death blooms too —
      // the body is destroyed as part of the same blast that overwrites its
      // own cell, one row above the kid's.
      stampBlast(ctx, x, y + 1, 'empty');
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
