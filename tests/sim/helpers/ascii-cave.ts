import { caveFromAscii, asciiFromState } from '../../../src/sim/ascii';
import { parseCave, type CaveState } from '../../../src/sim/cave';
import { tick, type Direction } from '../../../src/sim/tick';

// The test harness FR-038-FR-040 require: build a grid from inline ASCII,
// run N ticks (optionally driven by a per-tick input sequence), and assert
// the resulting grid matches an expected ASCII grid — reporting mismatches
// as readable side-by-side actual/expected grids, never raw cell values.

export interface CaveOptions {
  readonly name?: string;
  readonly seed?: number;
  readonly quota?: number;
  readonly amoebaGrowthRate?: number;
  readonly amoebaSizeLimit?: number;
  readonly magicWallDuration?: number;
}

// Strips a template literal's common leading indentation and its
// leading/trailing blank lines, so tests can write caves indented to match
// surrounding code:
//
//   const rows = asciiLines(`
//     SSSSS
//     S.P.S
//     SSSSS
//   `);
export function asciiLines(template: string): string[] {
  const raw = template.split('\n');
  while (raw.length > 0 && raw[0].trim() === '') raw.shift();
  while (raw.length > 0 && raw[raw.length - 1].trim() === '') raw.pop();

  const indents = raw
    .filter((line) => line.trim() !== '')
    .map((line) => line.length - line.trimStart().length);
  const commonIndent = indents.length > 0 ? Math.min(...indents) : 0;

  return raw.map((line) => line.slice(commonIndent));
}

// Builds a parsed CaveState directly from ASCII rows (as an array, or a
// single indented template-literal string via asciiLines).
export function caveFromLines(rows: string[] | string, options: CaveOptions = {}): CaveState {
  const lines = typeof rows === 'string' ? asciiLines(rows) : rows;
  const def = caveFromAscii({
    name: options.name ?? 'test-cave',
    seed: options.seed ?? 1,
    quota: options.quota ?? 0,
    rows: lines,
    amoebaGrowthRate: options.amoebaGrowthRate,
    amoebaSizeLimit: options.amoebaSizeLimit,
    magicWallDuration: options.magicWallDuration,
  });
  return parseCave(def);
}

// One tick's worth of input: a bare direction (or undefined, for no input),
// or a richer { direction, grab } pair for tests that need to drive a held
// grab alongside movement.
export type TickInputLike = Direction | undefined | { direction?: Direction; grab?: boolean };

function toTickInput(input: TickInputLike): { direction?: Direction; grab?: boolean } {
  if (input === undefined || typeof input === 'string') {
    return { direction: input };
  }
  return input;
}

// Runs `count` ticks. `inputs`, if given, supplies one input per tick, by
// index — either a bare direction or a { direction, grab } pair; ticks
// beyond the end of `inputs` get no input.
export function runTicks(
  state: CaveState,
  count: number,
  inputs?: readonly TickInputLike[]
): CaveState {
  let next = state;
  for (let i = 0; i < count; i++) {
    next = tick(next, toTickInput(inputs?.[i]));
  }
  return next;
}

function sideBySide(actual: string, expected: string): string {
  const actualLines = actual.split('\n');
  const expectedLines = expected.split('\n');
  const colWidth = Math.max(0, ...actualLines.map((l) => l.length));
  const rowCount = Math.max(actualLines.length, expectedLines.length);

  const lines = [`${'ACTUAL'.padEnd(colWidth)}   EXPECTED`];
  for (let i = 0; i < rowCount; i++) {
    const a = (actualLines[i] ?? '').padEnd(colWidth);
    const e = expectedLines[i] ?? '';
    lines.push(`${a}   ${e}`);
  }
  return lines.join('\n');
}

// Asserts the state's grid matches the expected ASCII rows (array, or a
// single indented template-literal string). On mismatch, throws with a
// readable side-by-side actual/expected grid rather than raw cell values
// (FR-040).
export function expectAscii(state: CaveState, expected: string[] | string): void {
  const expectedLines = typeof expected === 'string' ? asciiLines(expected) : expected;
  const expectedAscii = expectedLines.join('\n');
  const actualAscii = asciiFromState(state);

  if (actualAscii !== expectedAscii) {
    throw new Error(`Grid mismatch:\n${sideBySide(actualAscii, expectedAscii)}`);
  }
}
