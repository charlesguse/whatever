import { ELEMENT_ID_TO_INDEX, INDEX_TO_ELEMENT_ID, type ElementId } from './elements';

export interface Position {
  readonly x: number;
  readonly y: number;
}

// The live, mutable-only-by-the-sim grid a tick operates on (FR-005). Cell
// contents are stored as small integers in a typed array so the hot per-tick
// scan is allocation-free; movedThisTick is a parallel flag array cleared at
// the start of every tick (FR-004).
// falling is a second parallel flag array, alongside movedThisTick, but
// unlike movedThisTick it is NOT cleared at the start of every tick — it is
// carried cell-to-cell state, only ever written by the falling/rolling
// algorithm in tick.ts (FR-002, data-model.md Grid/Cave State).
export interface Grid {
  readonly width: number;
  readonly height: number;
  readonly cells: Uint8Array;
  readonly movedThisTick: Uint8Array;
  readonly falling: Uint8Array;
  playerPos: Position;
}

export function setPlayerPosition(grid: Grid, pos: Position): void {
  grid.playerPos = pos;
}

export function createGrid(width: number, height: number, playerPos: Position): Grid {
  return {
    width,
    height,
    cells: new Uint8Array(width * height),
    movedThisTick: new Uint8Array(width * height),
    falling: new Uint8Array(width * height),
    playerPos,
  };
}

export function cloneGrid(grid: Grid): Grid {
  return {
    width: grid.width,
    height: grid.height,
    cells: grid.cells.slice(),
    movedThisTick: grid.movedThisTick.slice(),
    falling: grid.falling.slice(),
    playerPos: { ...grid.playerPos },
  };
}

export function inBounds(grid: Grid, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < grid.width && y < grid.height;
}

function index(grid: Grid, x: number, y: number): number {
  return y * grid.width + x;
}

export function getCellIndex(grid: Grid, x: number, y: number): ElementId {
  return INDEX_TO_ELEMENT_ID[grid.cells[index(grid, x, y)]];
}

export function setCellIndex(grid: Grid, x: number, y: number, id: ElementId): void {
  grid.cells[index(grid, x, y)] = ELEMENT_ID_TO_INDEX[id];
}

export function isMoved(grid: Grid, x: number, y: number): boolean {
  return grid.movedThisTick[index(grid, x, y)] !== 0;
}

export function setMoved(grid: Grid, x: number, y: number): void {
  grid.movedThisTick[index(grid, x, y)] = 1;
}

export function clearMovedFlags(grid: Grid): void {
  grid.movedThisTick.fill(0);
}

export function isFallingIndex(grid: Grid, x: number, y: number): boolean {
  return grid.falling[index(grid, x, y)] !== 0;
}

export function setFallingIndex(grid: Grid, x: number, y: number): void {
  grid.falling[index(grid, x, y)] = 1;
}

export function clearFallingIndex(grid: Grid, x: number, y: number): void {
  grid.falling[index(grid, x, y)] = 0;
}
