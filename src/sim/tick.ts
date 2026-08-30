import {
  cloneGrid,
  clearMovedFlags,
  getCellIndex,
  inBounds,
  isMoved,
  setCellIndex,
  setMoved,
  setPlayerPosition,
  type Grid,
} from './grid';
import type { CaveState } from './cave';

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface TickInput {
  readonly direction?: Direction;
}

const DIRECTION_DELTA: Readonly<Record<Direction, readonly [number, number]>> = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
};

// The tick function: (grid, input) -> next grid (FR-006, FR-007). Pure —
// never mutates the input state, always returns a new CaveState. Scans cells
// in a fixed top-to-bottom, left-to-right order, clearing the moved-this-tick
// flag for every cell first, and never processing a cell twice in one scan.
// This feature has only one behavioral, mobile element (the player); the
// scan itself is still real groundwork later falling-body physics rely on
// (see CLAUDE.md — do not "simplify" it away).
export function tick(state: CaveState, input: TickInput): CaveState {
  const grid = cloneGrid(state.grid);
  clearMovedFlags(grid);

  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      if (isMoved(grid, x, y)) continue;
      const id = getCellIndex(grid, x, y);
      if (id === 'player') {
        movePlayer(grid, x, y, input.direction);
      }
    }
  }

  return {
    width: state.width,
    height: state.height,
    tick: state.tick + 1,
    grid,
    rngState: state.rngState,
  };
}

function movePlayer(grid: Grid, x: number, y: number, direction: Direction | undefined): void {
  if (direction === undefined) return; // FR-017: no input, no move

  const [dx, dy] = DIRECTION_DELTA[direction];
  const nx = x + dx;
  const ny = y + dy;

  if (!inBounds(grid, nx, ny)) return; // FR-016: boundary blocks movement

  const destId = getCellIndex(grid, nx, ny);
  if (destId === 'brickWall' || destId === 'steelWall') return; // FR-015

  if (destId === 'empty' || destId === 'dirt') {
    // FR-013 (empty) / FR-014 (dirt is cleared permanently)
    setCellIndex(grid, x, y, 'empty');
    setCellIndex(grid, nx, ny, 'player');
    setMoved(grid, nx, ny);
    setPlayerPosition(grid, { x: nx, y: ny });
  }
}
