import { describe, expect, it } from 'vitest';
import { CHAR_TO_ELEMENT, ELEMENT_IDS, ELEMENT_TO_CHAR } from '../../src/sim/elements';

describe('character mapping (FR-032)', () => {
  it('maps every declared element id to exactly one character', () => {
    const mappedIds = Object.keys(ELEMENT_TO_CHAR);
    expect(mappedIds.sort()).toEqual([...ELEMENT_IDS].sort());
  });

  it('round-trips every element id through char -> element -> char', () => {
    for (const id of ELEMENT_IDS) {
      const char = ELEMENT_TO_CHAR[id];
      expect(CHAR_TO_ELEMENT[char]).toBe(id);
    }
  });

  it('round-trips every mapped character through element -> char -> element', () => {
    for (const [char, id] of Object.entries(CHAR_TO_ELEMENT)) {
      expect(ELEMENT_TO_CHAR[id]).toBe(char);
    }
  });

  it('never maps two element ids to the same character', () => {
    const chars = ELEMENT_IDS.map((id) => ELEMENT_TO_CHAR[id]);
    expect(new Set(chars).size).toBe(chars.length);
  });
});
