import { describe, expect, it } from 'vitest';
import {
  cloneGrid,
  clearMovedFlags,
  createGrid,
  getCellIndex,
  inBounds,
  isMoved,
  setCellIndex,
  setMoved,
  setPlayerPosition,
} from '../../src/sim/grid';

describe('grid construction', () => {
  it('creates a grid of the given dimensions, all cells empty', () => {
    const grid = createGrid(5, 3, { x: 0, y: 0 });
    expect(grid.width).toBe(5);
    expect(grid.height).toBe(3);
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 5; x++) {
        expect(getCellIndex(grid, x, y)).toBe('empty');
      }
    }
  });

  it('reads dimensions from construction args, not a hardcoded constant', () => {
    const grid = createGrid(7, 11, { x: 0, y: 0 });
    expect(grid.width).toBe(7);
    expect(grid.height).toBe(11);
  });

  it('sets and reads individual cell contents', () => {
    const grid = createGrid(3, 3, { x: 0, y: 0 });
    setCellIndex(grid, 1, 1, 'dirt');
    expect(getCellIndex(grid, 1, 1)).toBe('dirt');
    expect(getCellIndex(grid, 0, 0)).toBe('empty');
  });

  it('tracks player position and allows it to be updated', () => {
    const grid = createGrid(3, 3, { x: 0, y: 0 });
    setPlayerPosition(grid, { x: 2, y: 1 });
    expect(grid.playerPos).toEqual({ x: 2, y: 1 });
  });

  it('reports bounds correctly at and beyond the edges', () => {
    const grid = createGrid(4, 4, { x: 0, y: 0 });
    expect(inBounds(grid, 0, 0)).toBe(true);
    expect(inBounds(grid, 3, 3)).toBe(true);
    expect(inBounds(grid, -1, 0)).toBe(false);
    expect(inBounds(grid, 0, -1)).toBe(false);
    expect(inBounds(grid, 4, 0)).toBe(false);
    expect(inBounds(grid, 0, 4)).toBe(false);
  });

  it('clears every moved-this-tick flag, and only those explicitly set are true beforehand', () => {
    const grid = createGrid(2, 2, { x: 0, y: 0 });
    setMoved(grid, 0, 0);
    setMoved(grid, 1, 1);
    expect(isMoved(grid, 0, 0)).toBe(true);
    expect(isMoved(grid, 1, 1)).toBe(true);
    expect(isMoved(grid, 0, 1)).toBe(false);

    clearMovedFlags(grid);
    expect(isMoved(grid, 0, 0)).toBe(false);
    expect(isMoved(grid, 1, 1)).toBe(false);
  });

  it('clones a grid independently of the original', () => {
    const grid = createGrid(2, 2, { x: 0, y: 0 });
    setCellIndex(grid, 0, 0, 'dirt');
    const clone = cloneGrid(grid);
    setCellIndex(clone, 0, 0, 'boulder');
    setPlayerPosition(clone, { x: 1, y: 1 });

    expect(getCellIndex(grid, 0, 0)).toBe('dirt');
    expect(getCellIndex(clone, 0, 0)).toBe('boulder');
    expect(grid.playerPos).toEqual({ x: 0, y: 0 });
    expect(clone.playerPos).toEqual({ x: 1, y: 1 });
  });
});
