import { ELEMENT_TO_CHAR } from './elements';
import { getCell, type CaveDefinition, type CaveState } from './cave';

export interface AsciiCave {
  readonly name: string;
  readonly seed: number;
  readonly quota?: number;
  readonly rows: readonly string[];
}

// Derives width/height from the rows themselves — never hardcoded (FR-036)
// — using the one shared Character Mapping also used by src/caves/starter.ts
// (FR-032).
export function caveFromAscii(ascii: AsciiCave): CaveDefinition {
  const height = ascii.rows.length;
  const width = height > 0 ? ascii.rows[0].length : 0;
  return {
    name: ascii.name,
    width,
    height,
    seed: ascii.seed,
    quota: ascii.quota ?? 0,
    rows: ascii.rows,
  };
}

// The inverse of caveFromAscii — one row per line, using the same Character
// Mapping. Used by the test harness to render actual-vs-expected grids as
// readable ASCII on assertion failure (FR-040).
export function asciiFromState(state: CaveState): string {
  const rows: string[] = [];
  for (let y = 0; y < state.height; y++) {
    let row = '';
    for (let x = 0; x < state.width; x++) {
      row += ELEMENT_TO_CHAR[getCell(state, x, y)];
    }
    rows.push(row);
  }
  return rows.join('\n');
}
