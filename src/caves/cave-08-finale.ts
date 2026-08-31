import { caveFromAscii } from '../sim/ascii';
import type { CaveDefinition } from '../sim/cave';

// Cave 8 — the finale (FR-032.8): every mechanic from caves 1-7 in one
// larger cave. A near side (reachable from spawn by plain digging) carries
// enough stars alone to make quota — matching the conservative reachability
// check, which cannot model a push — while a brick wall with a single
// boulder-held gap seals off a far side holding the firefly patrol, the
// butterfly trick, the magic wall, the sealed amoeba pocket, and the door.
// Actually finishing the cave (reaching the door) requires the push, same
// as cave 3; the maintainer verifies that at review time (FR-036).
const WIDTH = 26;
const HEIGHT = 16;
const QUOTA = 4;
const WALL_X = 13;
const GAP_Y = 8;
const AMOEBA_GROWTH_RATE = 0.1;
const AMOEBA_SIZE_LIMIT = 20;
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

  // The brick wall dividing near side from far side, with one boulder-held
  // gap.
  for (let y = 1; y <= HEIGHT - 2; y++) {
    setChar(rows, WALL_X, y, y === GAP_Y ? 'o' : 'B');
  }
  setChar(rows, WALL_X + 1, GAP_Y, '.');

  // Near side (dig-and-collect + falling + rolling demo): plain stars,
  // enough alone to make quota.
  setChar(rows, 4, 2, '*');
  setChar(rows, 7, 2, '*');
  setChar(rows, 10, 2, '*');
  setChar(rows, 2, 5, '*');
  setChar(rows, 5, 9, '*');

  // Falling demo: a boulder resting on dirt, away from the player's path.
  setChar(rows, 7, 3, 'o');

  // Rolling demo: a boulder on a brick shelf with an escape path to the
  // left — rolls and comes to rest on its own, far from the player.
  setChar(rows, 10, 6, 'B');
  setChar(rows, 10, 5, 'o');
  setChar(rows, 9, 5, '.');
  setChar(rows, 9, 6, '.');

  // Far side: firefly patrol loop.
  for (const [x, y] of [
    [17, 3],
    [18, 3],
    [19, 3],
    [19, 4],
    [19, 5],
    [18, 5],
    [17, 5],
    [17, 4],
  ] as const) {
    setChar(rows, x, y, '.');
  }
  setChar(rows, 17, 3, 'F');

  // Far side: the boulder-drop-onto-butterfly trick.
  setChar(rows, 21, 3, 'o');
  setChar(rows, 21, 5, 'Y');

  // Far side: the magic wall stretch.
  setChar(rows, 16, 9, 'o');
  setChar(rows, 16, 11, 'M');
  setChar(rows, 16, 12, 'M');
  setChar(rows, 16, 13, '.');

  // Far side: the sealed amoeba pocket.
  for (let y = 9; y <= 13; y++) {
    for (let x = 20; x <= 24; x++) {
      if (x === 20 || x === 24 || y === 9 || y === 13) {
        setChar(rows, x, y, 'S');
      }
    }
  }
  setChar(rows, 22, 11, 'A');

  // The classroom door, far side.
  setChar(rows, 23, 4, 'X');

  return rows;
}

export const cave08: CaveDefinition = caveFromAscii({
  name: 'Field Day',
  seed: 20260908,
  quota: QUOTA,
  rows: buildRows(),
  amoebaGrowthRate: AMOEBA_GROWTH_RATE,
  amoebaSizeLimit: AMOEBA_SIZE_LIMIT,
  magicWallDuration: MAGIC_WALL_DURATION,
  timeLimitSeconds: 240,
});
