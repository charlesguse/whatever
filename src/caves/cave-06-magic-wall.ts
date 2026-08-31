import { caveFromAscii } from '../sim/ascii';
import type { CaveDefinition } from '../sim/cave';

// Cave 6 — the magic wall (FR-032.6): a two-cell-thick sticker machine worth
// feeding. A boulder rests on dirt directly above it; digging that dirt
// sends the boulder down through the wall, and it emerges below as a gold
// star, landing on dirt so it comes to rest and can be collected normally.
// Quota is met from plain stars alone (the reachability check cannot credit
// a diamond that exists only after the wall converts something), so the
// magic wall is a bonus a player can lean on, not a requirement the
// automated check depends on.
const WIDTH = 16;
const HEIGHT = 11;
const QUOTA = 3;
const MAGIC_WALL_DURATION = 20;

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

  // Plain stars — enough alone to make quota.
  setChar(rows, 4, 2, '*');
  setChar(rows, 12, 2, '*');
  setChar(rows, 4, 8, '*');
  setChar(rows, 12, 8, '*');

  // The magic wall stretch: a boulder resting on dirt at (8, 4)/(8, 5),
  // the wall itself at (8, 6)-(8, 7), and an empty landing cell at (8, 8)
  // resting on dirt below, so whatever emerges comes to rest and can be
  // collected.
  setChar(rows, 8, 4, 'o');
  setChar(rows, 8, 6, 'M');
  setChar(rows, 8, 7, 'M');
  setChar(rows, 8, 8, '.');

  // The classroom door.
  setChar(rows, WIDTH - 3, HEIGHT - 3, 'X');

  return rows;
}

export const cave06: CaveDefinition = caveFromAscii({
  name: 'Sticker Machine',
  seed: 20260906,
  quota: QUOTA,
  rows: buildRows(),
  magicWallDuration: MAGIC_WALL_DURATION,
  timeLimitSeconds: 180,
});
