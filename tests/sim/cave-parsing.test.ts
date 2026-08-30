import { describe, expect, it } from 'vitest';
import { caveFromAscii } from '../../src/sim/ascii';
import { parseCave, type CaveDefinition } from '../../src/sim/cave';
import { asciiLines } from './helpers/ascii-cave';

const CAVE_NAME = 'Room 9';

describe('cave parsing rejections', () => {
  it('rejects a row whose length disagrees with the other rows (unequal row lengths)', () => {
    const def = caveFromAscii({
      name: CAVE_NAME,
      seed: 1,
      rows: ['SSS', 'S.S', 'SS'], // row 2 is short by one
    });

    expect(() => parseCave(def)).toThrowError(/Room 9/);
    expect(() => parseCave(def)).toThrowError(/row 2/);
  });

  it('rejects a declared height that disagrees with the actual row count', () => {
    const def: CaveDefinition = {
      name: CAVE_NAME,
      width: 3,
      height: 5, // only 3 rows actually supplied
      seed: 1,
      rows: ['SSS', 'S.S', 'SSS'],
    };

    expect(() => parseCave(def)).toThrowError(/Room 9/);
    expect(() => parseCave(def)).toThrowError(/height/i);
  });

  it('rejects a declared width that disagrees with the actual row length', () => {
    const def: CaveDefinition = {
      name: CAVE_NAME,
      width: 5, // rows are actually 3 wide
      height: 3,
      seed: 1,
      rows: ['SSS', 'S.S', 'SSS'],
    };

    expect(() => parseCave(def)).toThrowError(/Room 9/);
    expect(() => parseCave(def)).toThrowError(/row 0/);
  });

  it('rejects an unrecognized character, naming the offending coordinate', () => {
    const def = caveFromAscii({
      name: CAVE_NAME,
      seed: 1,
      rows: asciiLines(`
        SSS
        SZS
        SSS
      `),
    });

    expect(() => parseCave(def)).toThrowError(/Room 9/);
    expect(() => parseCave(def)).toThrowError(/\(1, 1\)/);
  });

  it('rejects a cave with zero players', () => {
    const def = caveFromAscii({
      name: CAVE_NAME,
      seed: 1,
      rows: asciiLines(`
        SSS
        S.S
        SSS
      `),
    });

    expect(() => parseCave(def)).toThrowError(/Room 9/);
    expect(() => parseCave(def)).toThrowError(/player/i);
  });

  it('rejects a cave with more than one player, naming both coordinates', () => {
    const def = caveFromAscii({
      name: CAVE_NAME,
      seed: 1,
      rows: asciiLines(`
        SSSS
        SP.S
        S.PS
        SSSS
      `),
    });

    expect(() => parseCave(def)).toThrowError(/Room 9/);
    expect(() => parseCave(def)).toThrowError(/\(1, 1\)/);
    expect(() => parseCave(def)).toThrowError(/\(2, 2\)/);
  });
});
