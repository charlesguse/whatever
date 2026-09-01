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

describe('themeId (FR-025, FR-027)', () => {
  it('readSave() returns themeId: undefined for a missing stored value', () => {
    expect(readSave(memoryStorage()).themeId).toBeUndefined();
  });

  it('readSave() returns themeId: undefined for an unreadable/non-string stored value', () => {
    const number = memoryStorage();
    number.setItem('recess-rocks:save', JSON.stringify({ highScore: 0, furthestCave: 1, themeId: 5 }));
    expect(readSave(number).themeId).toBeUndefined();

    const object = memoryStorage();
    object.setItem('recess-rocks:save', JSON.stringify({ highScore: 0, furthestCave: 1, themeId: { id: 'classic' } }));
    expect(readSave(object).themeId).toBeUndefined();

    const nullValue = memoryStorage();
    nullValue.setItem('recess-rocks:save', JSON.stringify({ highScore: 0, furthestCave: 1, themeId: null }));
    expect(readSave(nullValue).themeId).toBeUndefined();
  });

  it('writeSave merges themeId per-field, not as a full-record overwrite', () => {
    const storage = memoryStorage();
    writeSave({ themeId: 'a' }, storage);
    writeSave({ highScore: 5 }, storage); // no themeId in this call
    expect(readSave(storage).themeId).toBe('a');
    expect(readSave(storage).highScore).toBe(5);
  });

  it('writeSave is last-write-wins for themeId, not Math.max-shaped', () => {
    const storage = memoryStorage();
    writeSave({ themeId: 'z-later' }, storage);
    writeSave({ themeId: 'a-earlier' }, storage);
    expect(readSave(storage).themeId).toBe('a-earlier');
  });
});

describe('muted (FR-031, FR-032, FR-033)', () => {
  it('readSave() returns muted: undefined for a missing stored value', () => {
    expect(readSave(memoryStorage()).muted).toBeUndefined();
  });

  it('readSave() returns muted: undefined for an unreadable/non-boolean stored value', () => {
    const string = memoryStorage();
    string.setItem('recess-rocks:save', JSON.stringify({ highScore: 0, furthestCave: 1, muted: 'true' }));
    expect(readSave(string).muted).toBeUndefined();

    const number = memoryStorage();
    number.setItem('recess-rocks:save', JSON.stringify({ highScore: 0, furthestCave: 1, muted: 1 }));
    expect(readSave(number).muted).toBeUndefined();

    const nullValue = memoryStorage();
    nullValue.setItem('recess-rocks:save', JSON.stringify({ highScore: 0, furthestCave: 1, muted: null }));
    expect(readSave(nullValue).muted).toBeUndefined();
  });

  it('writeSave merges muted per-field, not as a full-record overwrite', () => {
    const storage = memoryStorage();
    writeSave({ muted: true }, storage);
    writeSave({ highScore: 5 }, storage); // no muted in this call
    expect(readSave(storage).muted).toBe(true);
    expect(readSave(storage).highScore).toBe(5);
  });

  it('writeSave is last-write-wins for muted, not Math.max-shaped', () => {
    const storage = memoryStorage();
    writeSave({ muted: true }, storage);
    writeSave({ muted: false }, storage);
    expect(readSave(storage).muted).toBe(false);
  });

  it('a throwing/absent store degrades to session-only for muted, exactly like themeId', () => {
    expect(readSave(throwingStorage()).muted).toBeUndefined();
    expect(() => writeSave({ muted: true }, throwingStorage())).not.toThrow();
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
