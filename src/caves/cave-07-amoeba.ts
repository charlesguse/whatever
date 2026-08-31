import { caveFromAscii } from '../sim/ascii';
import type { CaveDefinition } from '../sim/cave';

// Cave 7 — the amoeba (FR-032.7): a blob sealed entirely inside its own
// steel-ringed pocket, well clear of the player's path — every cell it
// could ever reach is steel or the small patch of dirt already inside the
// ring, so no matter how long the cave runs it can never spread onto a path
// the player needs. Left alone, it fills its pocket and, once it has no
// empty/dirt neighbor left to grow into, turns entirely to gold stars — a
// bonus a patient player can watch happen, not a requirement for quota.
const WIDTH = 18;
const HEIGHT = 13;
const QUOTA = 3;
const AMOEBA_GROWTH_RATE = 0.1;
const AMOEBA_SIZE_LIMIT = 20;

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
  setChar(rows, 14, 2, '*');
  setChar(rows, 4, 10, '*');
  setChar(rows, 14, 10, '*');

  // The sealed amoeba pocket: a steel ring around a 3x3 patch of dirt,
  // nowhere near the player's spawn, path, or stars.
  for (let y = 3; y <= 7; y++) {
    for (let x = 11; x <= 15; x++) {
      if (x === 11 || x === 15 || y === 3 || y === 7) {
        setChar(rows, x, y, 'S');
      }
    }
  }
  setChar(rows, 13, 5, 'A');

  // The classroom door.
  setChar(rows, WIDTH - 3, HEIGHT - 3, 'X');

  return rows;
}

export const cave07: CaveDefinition = caveFromAscii({
  name: 'Spilled Glue',
  seed: 20260907,
  quota: QUOTA,
  rows: buildRows(),
  amoebaGrowthRate: AMOEBA_GROWTH_RATE,
  amoebaSizeLimit: AMOEBA_SIZE_LIMIT,
  timeLimitSeconds: 180,
});
