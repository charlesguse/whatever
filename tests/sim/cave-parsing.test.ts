import { describe, expect, it } from 'vitest';
import { caveFromAscii } from '../../src/sim/ascii';
import { parseCave, type CaveDefinition } from '../../src/sim/cave';
import { asciiLines, caveFromLines } from './helpers/ascii-cave';

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

  it('rejects a cave whose quota exceeds its diamond count, naming the cave and both numbers (FR-027)', () => {
    const def = caveFromAscii({
      name: CAVE_NAME,
      seed: 1,
      quota: 2,
      rows: asciiLines(`
        SSSS
        SP*S
        SSSS
      `),
    });

    expect(() => parseCave(def)).toThrowError(/Room 9/);
    expect(() => parseCave(def)).toThrowError(/quota 2/);
    expect(() => parseCave(def)).toThrowError(/1 diamond/);
  });

  it('accepts a quota exceeding the diamond count when within diamonds + 9*butterflies (FR-025)', () => {
    const def = caveFromAscii({
      name: CAVE_NAME,
      seed: 1,
      quota: 5, // exceeds the 1 diamond, but well within 1 + 9*1 = 10
      rows: asciiLines(`
        SSSS
        SP*S
        SYSS
        SSSS
      `),
    });

    expect(() => parseCave(def)).not.toThrow();
  });

  it('rejects a quota exceeding diamonds + 9*butterflies, naming the cave, quota, diamond count, and butterfly count (FR-025)', () => {
    const def = caveFromAscii({
      name: CAVE_NAME,
      seed: 1,
      quota: 11, // exceeds 1 + 9*1 = 10
      rows: asciiLines(`
        SSSS
        SP*S
        SYSS
        SSSS
      `),
    });

    expect(() => parseCave(def)).toThrowError(/Room 9/);
    expect(() => parseCave(def)).toThrowError(/quota 11/);
    expect(() => parseCave(def)).toThrowError(/1 diamond/);
    expect(() => parseCave(def)).toThrowError(/1 butterfly/i);
  });

  it('rejects a cave with more than one exit, naming both coordinates', () => {
    const def = caveFromAscii({
      name: CAVE_NAME,
      seed: 1,
      rows: asciiLines(`
        SSSS
        SPXS
        SX.S
        SSSS
      `),
    });

    expect(() => parseCave(def)).toThrowError(/Room 9/);
    expect(() => parseCave(def)).toThrowError(/\(2, 1\)/);
    expect(() => parseCave(def)).toThrowError(/\(1, 2\)/);
  });
});

// FR-028, FR-029: the three new cave-scoped parameters — explicit values,
// documented defaults, and validation in both directions.
describe('cave parameters (FR-028, FR-029)', () => {
  it('loads with explicit amoebaGrowthRate/amoebaSizeLimit/magicWallDuration values', () => {
    const state = caveFromLines('S.P.S', {
      amoebaGrowthRate: 0.5,
      amoebaSizeLimit: 12,
      magicWallDuration: 7,
    });
    expect(state.amoebaGrowthRate).toBe(0.5);
    expect(state.amoebaSizeLimit).toBe(12);
    expect(state.magicWallDuration).toBe(7);
  });

  it('loads with the documented defaults (0.03/200/40) when all three are omitted', () => {
    const state = caveFromLines('S.P.S');
    expect(state.amoebaGrowthRate).toBe(0.03);
    expect(state.amoebaSizeLimit).toBe(200);
    expect(state.magicWallDuration).toBe(40);
  });

  it('rejects a non-positive amoebaSizeLimit, naming the cave and the offending value', () => {
    const def = caveFromAscii({
      name: CAVE_NAME,
      seed: 1,
      rows: ['S.P.S'],
      amoebaSizeLimit: 0,
    });
    expect(() => parseCave(def)).toThrowError(/Room 9/);
    expect(() => parseCave(def)).toThrowError(/amoebaSizeLimit/);
    expect(() => parseCave(def)).toThrowError(/0/);
  });

  it('rejects a non-whole amoebaSizeLimit, naming the cave and the offending value', () => {
    const def = caveFromAscii({
      name: CAVE_NAME,
      seed: 1,
      rows: ['S.P.S'],
      amoebaSizeLimit: 2.5,
    });
    expect(() => parseCave(def)).toThrowError(/Room 9/);
    expect(() => parseCave(def)).toThrowError(/amoebaSizeLimit/);
    expect(() => parseCave(def)).toThrowError(/2\.5/);
  });

  it('rejects a non-positive magicWallDuration, naming the cave and the offending value', () => {
    const def = caveFromAscii({
      name: CAVE_NAME,
      seed: 1,
      rows: ['S.P.S'],
      magicWallDuration: -3,
    });
    expect(() => parseCave(def)).toThrowError(/Room 9/);
    expect(() => parseCave(def)).toThrowError(/magicWallDuration/);
    expect(() => parseCave(def)).toThrowError(/-3/);
  });

  it('rejects a non-whole magicWallDuration, naming the cave and the offending value', () => {
    const def = caveFromAscii({
      name: CAVE_NAME,
      seed: 1,
      rows: ['S.P.S'],
      magicWallDuration: 4.2,
    });
    expect(() => parseCave(def)).toThrowError(/Room 9/);
    expect(() => parseCave(def)).toThrowError(/magicWallDuration/);
    expect(() => parseCave(def)).toThrowError(/4\.2/);
  });

  it('rejects an amoebaGrowthRate of 0, naming the cave and the offending value', () => {
    const def = caveFromAscii({
      name: CAVE_NAME,
      seed: 1,
      rows: ['S.P.S'],
      amoebaGrowthRate: 0,
    });
    expect(() => parseCave(def)).toThrowError(/Room 9/);
    expect(() => parseCave(def)).toThrowError(/amoebaGrowthRate/);
  });

  it('rejects a negative amoebaGrowthRate, naming the cave and the offending value', () => {
    const def = caveFromAscii({
      name: CAVE_NAME,
      seed: 1,
      rows: ['S.P.S'],
      amoebaGrowthRate: -0.1,
    });
    expect(() => parseCave(def)).toThrowError(/Room 9/);
    expect(() => parseCave(def)).toThrowError(/amoebaGrowthRate/);
    expect(() => parseCave(def)).toThrowError(/-0\.1/);
  });

  it('rejects an amoebaGrowthRate greater than 1, naming the cave and the offending value', () => {
    const def = caveFromAscii({
      name: CAVE_NAME,
      seed: 1,
      rows: ['S.P.S'],
      amoebaGrowthRate: 1.5,
    });
    expect(() => parseCave(def)).toThrowError(/Room 9/);
    expect(() => parseCave(def)).toThrowError(/amoebaGrowthRate/);
    expect(() => parseCave(def)).toThrowError(/1\.5/);
  });
});
