import { caveFromAscii } from '../sim/ascii';
import type { CaveDefinition } from '../sim/cave';

// Cave 5 — butterflies (FR-032.5): includes the classic boulder-drop trick.
// A boulder rests on a single dirt cell directly above a butterfly; digging
// that one cell lets the boulder fall onto the butterfly while still
// falling, detonating it into a 3x3 burst of gold stars. The butterfly sits
// well clear of the player's spawn (never orthogonally adjacent at load),
// in ordinary open dirt, so the conservative reachability check — which
// credits 9 stars for any butterfly bordering the reachable region — passes
// without needing the trick proven necessary; a few plain stars alone fall
// short of quota, so pulling the trick off is how the cave is actually won.
const WIDTH = 18;
const HEIGHT = 11;
const QUOTA = 6;

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

  // A few plain stars — not enough alone to reach quota.
  setChar(rows, 4, 2, '*');
  setChar(rows, 14, 3, '*');
  setChar(rows, 6, 8, '*');

  // The boulder-drop-onto-butterfly setup: a boulder at (10, 3) rests on
  // the dirt at (10, 4); the butterfly sits at (10, 5), directly beneath
  // that dirt. Digging (10, 4) lets the boulder fall onto the butterfly
  // while still falling, detonating it.
  setChar(rows, 10, 3, 'o');
  setChar(rows, 10, 5, 'Y');

  // The classroom door.
  setChar(rows, WIDTH - 3, HEIGHT - 3, 'X');

  return rows;
}

export const cave05: CaveDefinition = caveFromAscii({
  name: 'Butterfly Burst',
  seed: 20260905,
  quota: QUOTA,
  rows: buildRows(),
  timeLimitSeconds: 180,
});
