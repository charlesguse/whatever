import { caveFromAscii } from '../sim/ascii';
import type { CaveDefinition } from '../sim/cave';

// Cave 2 — falling (FR-032.2): boulders resting on dirt, ready to drop once
// the dirt beneath them is dug out. Every boulder rests on dirt (never an
// empty cell) at load time, so nothing falls on tick zero; none sits above
// the player's spawn column, and digging beneath any of them is optional —
// each one is off to the side of the direct route to its nearest stars, not
// a trap the player stumbles into.
const WIDTH = 18;
const HEIGHT = 11;
const QUOTA = 3;

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

  // Player start.
  setChar(rows, 2, 2, 'P');

  // Boulders resting on dirt — nothing falls until the player digs beneath
  // one of them.
  setChar(rows, 6, 3, 'o');
  setChar(rows, 10, 3, 'o');
  setChar(rows, 13, 6, 'o');

  // Stars: some in the open, some reachable only by routing around (or past)
  // a boulder's landing spot.
  setChar(rows, 4, 2, '*');
  setChar(rows, 9, 2, '*');
  setChar(rows, 14, 2, '*');
  setChar(rows, 6, 7, '*');
  setChar(rows, 11, 7, '*');

  // The classroom door.
  setChar(rows, WIDTH - 2, HEIGHT - 2, 'X');

  return rows;
}

export const cave02: CaveDefinition = caveFromAscii({
  name: 'Falling Erasers',
  seed: 20260902,
  quota: QUOTA,
  rows: buildRows(),
  timeLimitSeconds: 150,
});
