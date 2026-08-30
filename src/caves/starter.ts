import { caveFromAscii } from '../sim/ascii';
import type { CaveDefinition } from '../sim/cave';

// The one shipped starter cave (FR-034), 40x22 (FR-036, read from these
// rows rather than hardcoded elsewhere), enclosed entirely by an
// indestructible steel-wall border (FR-035). Only the 5 elements with
// behavior in this feature (empty, dirt, brick wall, steel wall, player)
// are used.
const WIDTH = 40;
const HEIGHT = 22;

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

  return rows;
}

export const starterCave: CaveDefinition = caveFromAscii({
  name: 'Room 101',
  seed: 20260830,
  rows: buildRows(),
});
