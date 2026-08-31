import { caveFromAscii } from '../sim/ascii';
import type { CaveDefinition } from '../sim/cave';

// Cave 3 — rolling and pushing (FR-032.3): a boulder perched on a brick
// shelf with an escape path to one side rolls off on its own over the first
// few ticks (safely, far from the player's spawn) to demonstrate rolling;
// separately, a single boulder sits in the only gap of a brick wall dividing
// the cave in two, and the player must push it aside — into the empty cell
// waiting beyond it — to reach the door and the stars on the far side. The
// quota is met entirely from stars on the near side of that wall, so the
// conservative reachability check (which cannot model a push) still passes;
// pushing through is still necessary to actually finish the cave.
const WIDTH = 20;
const HEIGHT = 13;
const QUOTA = 2;
const WALL_X = 9;
const GAP_Y = 8;

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

  // A brick wall dividing the cave into a near (left) half and a far
  // (right) half, with exactly one gap — held by a boulder the player must
  // push aside.
  for (let y = 1; y <= HEIGHT - 2; y++) {
    setChar(rows, WALL_X, y, y === GAP_Y ? 'o' : 'B');
  }
  // The cell beyond the gap, empty so the boulder has somewhere to go.
  setChar(rows, WALL_X + 1, GAP_Y, '.');

  // Player start, near side.
  setChar(rows, 2, 2, 'P');

  // Near-side stars — enough alone to make quota, so the automated
  // reachability check (which never models a push) still passes.
  setChar(rows, 3, 4, '*');
  setChar(rows, 7, 3, '*');
  setChar(rows, 5, 9, '*');

  // A rolling demonstration, far side: a boulder on a brick shelf with an
  // escape path to its left. It rolls and falls on its own over the first
  // few ticks, coming to rest on dirt — far from the player, so this never
  // endangers anyone during the no-input safety window.
  setChar(rows, 14, 5, 'B');
  setChar(rows, 14, 4, 'o');
  setChar(rows, 13, 4, '.');
  setChar(rows, 13, 5, '.');

  // Far-side stars and the door, reachable only after the push.
  setChar(rows, 13, 3, '*');
  setChar(rows, 16, 9, '*');
  setChar(rows, WIDTH - 3, HEIGHT - 3, 'X');

  return rows;
}

export const cave03: CaveDefinition = caveFromAscii({
  name: 'Push and Roll',
  seed: 20260903,
  quota: QUOTA,
  rows: buildRows(),
  timeLimitSeconds: 180,
});
