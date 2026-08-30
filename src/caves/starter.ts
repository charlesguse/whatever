import { caveFromAscii } from '../sim/ascii';
import type { CaveDefinition } from '../sim/cave';

// The one shipped starter cave (FR-033–FR-036), 40x22 (read from these rows
// rather than hardcoded elsewhere), enclosed entirely by an indestructible
// steel-wall border. Erasers (boulder) and gold stars (diamond) are placed
// away from the player's spawn column so nothing can fall onto the kid on
// tick zero; the classroom door sits in the open clearing, reachable once
// the quota is met; there are more gold stars than the quota requires.
const WIDTH = 40;
const HEIGHT = 22;
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

  // A clear horizontal corridor near the top for an easy first stretch.
  for (let x = 2; x <= WIDTH - 3; x++) {
    setChar(rows, x, 2, x === 2 ? 'P' : '.');
  }

  // A brick-wall spine down the middle, impassable but not diggable, to
  // give the player something to route around.
  for (let y = 4; y <= HEIGHT - 4; y++) {
    setChar(rows, WIDTH / 2, y, 'B');
  }

  // A small open clearing in the bottom-right for a change of texture.
  for (let y = HEIGHT - 6; y <= HEIGHT - 3; y++) {
    for (let x = WIDTH - 8; x <= WIDTH - 3; x++) {
      setChar(rows, x, y, '.');
    }
  }

  // Erasers, resting on dirt or the clearing floor — never directly above
  // the player's spawn column, and never with an empty cell beneath them
  // at load time, so nothing falls unexpectedly the instant the cave loads.
  setChar(rows, 15, 8, 'o');
  setChar(rows, 25, 12, 'o');
  setChar(rows, 8, 18, 'o');
  setChar(rows, 34, 18, 'o');

  // Gold stars — five of them, one more than the quota, so there's a real
  // choice about which one to skip.
  setChar(rows, 10, 6, '*');
  setChar(rows, 30, 6, '*');
  setChar(rows, 10, 15, '*');
  setChar(rows, 33, 17, '*');
  setChar(rows, 6, 10, '*');

  // The classroom door, in the clearing — reachable once the quota is met.
  setChar(rows, WIDTH - 4, HEIGHT - 5, 'X');

  return rows;
}

export const starterCave: CaveDefinition = caveFromAscii({
  name: 'Room 101',
  seed: 20260830,
  quota: QUOTA,
  rows: buildRows(),
});
