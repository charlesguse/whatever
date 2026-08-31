import { caveFromAscii } from '../sim/ascii';
import type { CaveDefinition } from '../sim/cave';

// Cave 1 — dig and collect (FR-032.1): the welcoming first cave. Dirt, gold
// stars, and the open classroom door — no boulders, no enemies, no amoeba,
// no magic wall, nothing that can ever fall or move on its own. The whole
// interior is dirt to dig through; five gold stars for a quota of four, so
// there's a real (if gentle) choice about which one to skip.
const WIDTH = 16;
const HEIGHT = 10;
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

  // Five gold stars, scattered through the dirt.
  setChar(rows, 5, 2, '*');
  setChar(rows, 9, 3, '*');
  setChar(rows, 3, 5, '*');
  setChar(rows, 12, 5, '*');
  setChar(rows, 7, 7, '*');

  // The classroom door, in the far corner — reachable once the quota is met.
  setChar(rows, WIDTH - 2, HEIGHT - 2, 'X');

  return rows;
}

export const cave01: CaveDefinition = caveFromAscii({
  name: 'Dig and Collect',
  seed: 20260901,
  quota: QUOTA,
  rows: buildRows(),
  timeLimitSeconds: 120,
});
