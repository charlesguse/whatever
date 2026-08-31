// Best-effort localStorage persistence (FR-038–FR-042): one JSON record
// under a single key. Every operation is wrapped so a throwing, full, or
// absent storage degrades to "values absent" — never a crash, never a
// visible warning (FR-041).

const STORAGE_KEY = 'recess-rocks:save';

// FR-002: furthestCave is always in [1, 8] — the eight shipped caves,
// 1-based. Not read from src/caves/ (this module has no game-content
// dependency); the range is simply this feature's fixed cave count.
const MIN_CAVE = 1;
const MAX_CAVE = 8;

export interface SaveRecord {
  readonly highScore: number;
  readonly furthestCave: number;
}

const DEFAULT_SAVE: SaveRecord = { highScore: 0, furthestCave: MIN_CAVE };

// The minimal storage surface this module needs — satisfied by the real
// `localStorage` in a browser, and by a plain stub in tests (there is no
// DOM in this project's node-environment vitest run, per CLAUDE.md).
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function defaultStorage(): StorageLike | undefined {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : undefined;
  } catch {
    return undefined;
  }
}

function isValidHighScore(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isValidFurthestCave(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= MIN_CAVE &&
    value <= MAX_CAVE
  );
}

// FR-042: a stored value that is missing, unreadable, negative/non-numeric,
// or (for furthestCave) out of [1, 8] is treated as absent.
export function readSave(storage: StorageLike | undefined = defaultStorage()): SaveRecord {
  try {
    if (!storage) return DEFAULT_SAVE;
    const raw = storage.getItem(STORAGE_KEY);
    if (raw === null) return DEFAULT_SAVE;

    const parsed: unknown = JSON.parse(raw);
    const record = parsed as { highScore?: unknown; furthestCave?: unknown } | null;

    return {
      highScore: isValidHighScore(record?.highScore) ? record.highScore : DEFAULT_SAVE.highScore,
      furthestCave: isValidFurthestCave(record?.furthestCave)
        ? record.furthestCave
        : DEFAULT_SAVE.furthestCave,
    };
  } catch {
    return DEFAULT_SAVE;
  }
}

// FR-039: highScore only ever grows via Math.max(stored, finalScore);
// furthestCave only ever grows via Math.max(stored, caveNumber). Never
// throws to its caller (FR-041).
export function writeSave(
  record: SaveRecord,
  storage: StorageLike | undefined = defaultStorage()
): void {
  try {
    if (!storage) return;
    const current = readSave(storage);
    const next: SaveRecord = {
      highScore: Math.max(current.highScore, record.highScore),
      furthestCave: Math.max(current.furthestCave, record.furthestCave),
    };
    storage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Best-effort — a full, disabled, or throwing store never reaches the
    // player (FR-041).
  }
}
