import { caveFromAscii } from '../sim/ascii';
import type { CaveDefinition } from '../sim/cave';

// Cave 4 — fireflies (FR-032.4): a firefly patrol loop the player has to
// time a run past. The loop is a small ring carved out of the dirt, well
// away from the player's spawn column so the firefly is never orthogonally
// adjacent to the kid at tick zero. Stars sit on both sides of the loop so
// the player has to actually pass it to make quota.
const WIDTH = 20;
const HEIGHT = 12;
const QUOTA = 4;

function setChar(rows: string[], x: number, y: number, char: string): void {
  const row = rows[y];
  rows[y] = row.slice(0, x) + char + row.slice(x + 1);
}

function buildRows(): string[] {
  const rows: string[] = [];
  for (let y = 0; y < HEIGHT; y++) {
    if (y === 0 || y === HEIGHT - 1) {
      rows.push('S'.repeat(WIDTH));
    } else {
      rows.push('S' + '#'.repeat(WIDTH - 2) + 'S');
    }
  }

  // Player start, near the top-left corner of the interior.
  setChar(rows, 2, 2, 'P');

  // A star close to spawn, before the patrol loop.
  setChar(rows, 4, 2, '*');
  setChar(rows, 2, 5, '*');

  // The firefly's patrol ring — an 8-cell loop carved out of the dirt in
  // the middle of the cave, far enough from (2, 2) that it is never
  // orthogonally adjacent to the kid at load.
  for (const [x, y] of [
    [9, 4],
    [10, 4],
    [11, 4],
    [11, 5],
    [11, 6],
    [10, 6],
    [9, 6],
    [9, 5],
  ] as const) {
    setChar(rows, x, y, '.');
  }
  setChar(rows, 9, 4, 'F');

  // Stars beyond the loop, requiring the player to route past the patrol.
  setChar(rows, 16, 3, '*');
  setChar(rows, 16, 8, '*');
  setChar(rows, 6, 9, '*');

  // The classroom door, past the loop.
  setChar(rows, WIDTH - 2, HEIGHT - 2, 'X');

  return rows;
}

export const cave04: CaveDefinition = caveFromAscii({
  name: 'Recess Patrol',
  seed: 20260904,
  quota: QUOTA,
  rows: buildRows(),
  timeLimitSeconds: 150,
});
