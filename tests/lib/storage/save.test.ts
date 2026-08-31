import { describe, expect, it } from 'vitest';
import { readSave, writeSave, type StorageLike } from '../../../src/lib/storage/save';

// A plain in-memory stub — there is no DOM/localStorage in this project's
// node-environment vitest run (CLAUDE.md).
function memoryStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
  };
}

function throwingStorage(): StorageLike {
  return {
    getItem: () => {
      throw new Error('storage disabled');
    },
    setItem: () => {
      throw new Error('storage disabled');
    },
  };
}

describe('readSave/writeSave round-trip (FR-038)', () => {
  it('reads back what was written', () => {
    const storage = memoryStorage();
    writeSave({ highScore: 250, furthestCave: 4 }, storage);
    expect(readSave(storage)).toEqual({ highScore: 250, furthestCave: 4 });
  });

  it('reads absent values (0 / 1) when nothing has been written', () => {
    const storage = memoryStorage();
    expect(readSave(storage)).toEqual({ highScore: 0, furthestCave: 1 });
  });
});

describe('writeSave only ever grows a stored value (FR-039)', () => {
  it('highScore is written via Math.max(stored, finalScore)', () => {
    const storage = memoryStorage();
    writeSave({ highScore: 100, furthestCave: 1 }, storage);
    writeSave({ highScore: 40, furthestCave: 1 }, storage); // lower — ignored
    expect(readSave(storage).highScore).toBe(100);
    writeSave({ highScore: 150, furthestCave: 1 }, storage); // higher — kept
    expect(readSave(storage).highScore).toBe(150);
  });

  it('furthestCave is written via Math.max(stored, caveNumber)', () => {
    const storage = memoryStorage();
    writeSave({ highScore: 0, furthestCave: 5 }, storage);
    writeSave({ highScore: 0, furthestCave: 2 }, storage); // lower — ignored
    expect(readSave(storage).furthestCave).toBe(5);
    writeSave({ highScore: 0, furthestCave: 8 }, storage); // higher — kept
    expect(readSave(storage).furthestCave).toBe(8);
  });
});

describe('a throwing storage degrades silently (FR-041)', () => {
  it('readSave returns absent values instead of throwing', () => {
    expect(readSave(throwingStorage())).toEqual({ highScore: 0, furthestCave: 1 });
  });

  it('writeSave does not throw to its caller', () => {
    expect(() => writeSave({ highScore: 999, furthestCave: 8 }, throwingStorage())).not.toThrow();
  });
});

describe('invalid or out-of-range stored values are treated as absent (FR-042)', () => {
  it('a missing key reads as absent', () => {
    expect(readSave(memoryStorage())).toEqual({ highScore: 0, furthestCave: 1 });
  });

  it('a negative or non-numeric highScore reads as 0', () => {
    const negative = memoryStorage();
    negative.setItem('recess-rocks:save', JSON.stringify({ highScore: -5, furthestCave: 1 }));
    expect(readSave(negative).highScore).toBe(0);

    const nonNumeric = memoryStorage();
    nonNumeric.setItem('recess-rocks:save', JSON.stringify({ highScore: 'lots', furthestCave: 1 }));
    expect(readSave(nonNumeric).highScore).toBe(0);
  });

  it('a furthestCave outside [1, 8], or non-numeric, reads as 1', () => {
    const zero = memoryStorage();
    zero.setItem('recess-rocks:save', JSON.stringify({ highScore: 0, furthestCave: 0 }));
    expect(readSave(zero).furthestCave).toBe(1);

    const tooHigh = memoryStorage();
    tooHigh.setItem('recess-rocks:save', JSON.stringify({ highScore: 0, furthestCave: 9 }));
    expect(readSave(tooHigh).furthestCave).toBe(1);

    const nonNumeric = memoryStorage();
    nonNumeric.setItem('recess-rocks:save', JSON.stringify({ highScore: 0, furthestCave: 'eight' }));
    expect(readSave(nonNumeric).furthestCave).toBe(1);
  });

  it('malformed JSON reads as fully absent', () => {
    const malformed = memoryStorage();
    malformed.setItem('recess-rocks:save', '{not json');
    expect(readSave(malformed)).toEqual({ highScore: 0, furthestCave: 1 });
  });
});
