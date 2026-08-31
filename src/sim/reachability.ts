import { CHAR_TO_ELEMENT } from './elements';
import type { CaveDefinition } from './cave';

// FR-035: a conservative, necessary-condition check that a cave's quota is
// attainable from its layout — not a solvability proof (data-model.md Quota
// Reachability Check). Pure, exported, static analysis over a
// CaveDefinition; no grid mutation, no PRNG use, no relationship to tick().

const ENTERABLE = new Set(['empty', 'dirt', 'diamond', 'exit']);

export interface ReachabilityResult {
  readonly reachableStars: number;
  readonly attainable: boolean;
}

// A flood fill from the kid's spawn cell, through cells the kid can enter
// (empty, dirt, diamond, exit) — every wall, every body that is not already
// a diamond, an enemy, amoeba, the magic wall, and the expanding wall is a
// boundary the fill does not cross. Reachable stars: every diamond visited
// by the fill, plus 9 for every butterfly bordering the reachable region
// (a butterfly is never itself enterable, but its payout is reachable by
// detonating it from next door — mirroring parseCave's own quota ceiling).
export function checkReachability(def: CaveDefinition): ReachabilityResult {
  const { width, height, rows, quota } = def;

  let startX = -1;
  let startY = -1;
  for (let y = 0; y < height && startX === -1; y++) {
    for (let x = 0; x < width; x++) {
      if (rows[y][x] === 'P') {
        startX = x;
        startY = y;
        break;
      }
    }
  }
  if (startX === -1) {
    return { reachableStars: 0, attainable: quota <= 0 };
  }

  const visited = new Uint8Array(width * height);
  const butterflyCounted = new Uint8Array(width * height);
  const stack: number[] = [startY * width + startX];
  visited[startY * width + startX] = 1;

  let reachableStars = 0;

  while (stack.length > 0) {
    const idx = stack.pop()!;
    const x = idx % width;
    const y = Math.floor(idx / width);

    const elementId = CHAR_TO_ELEMENT[rows[y][x]];
    if (elementId === 'diamond') reachableStars += 1;

    for (const [dx, dy] of [
      [0, -1],
      [0, 1],
      [-1, 0],
      [1, 0],
    ] as const) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const nIdx = ny * width + nx;

      const neighborId = CHAR_TO_ELEMENT[rows[ny][nx]];

      if (neighborId === 'butterfly') {
        if (!butterflyCounted[nIdx]) {
          butterflyCounted[nIdx] = 1;
          reachableStars += 9;
        }
        continue;
      }

      if (visited[nIdx]) continue;
      // The player's own spawn cell is always enterable (it is where the
      // kid already stands); every other cell must be one the kid can
      // actually walk/dig into to be crossed by the fill.
      if (neighborId !== 'player' && !ENTERABLE.has(neighborId)) continue;

      visited[nIdx] = 1;
      stack.push(nIdx);
    }
  }

  return { reachableStars, attainable: quota <= reachableStars };
}
