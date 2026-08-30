import { describe, it } from 'vitest';
import { caveFromLines, expectAscii, runTicks } from './helpers/ascii-cave';

describe('stack resolution (scan order, CLAUDE.md / constitution Principle II)', () => {
  it('a vertical stack whose support is removed resolves over several ticks, not all at once', () => {
    // Three boulders stacked directly on the floor. On tick 1, only the
    // bottom one has empty space below it (the floor cell was dug the tick
    // before this test's clock starts, conceptually — here it's simply
    // empty from the start). Because the scan runs top-to-bottom, the top
    // boulder sees its support (the middle one) still in place on tick 1 —
    // it takes 3 ticks for the whole stack to resolve, one cell at a time,
    // never all three falling in the same tick.
    const state = caveFromLines(`
      SSSSSS
      SPSoSS
      SSSoSS
      SSSoSS
      SSS.SS
      SSSSSS
    `);

    const afterOne = runTicks(state, 1);
    expectAscii(
      afterOne,
      `
      SSSSSS
      SPSoSS
      SSSoSS
      SSS.SS
      SSSoSS
      SSSSSS
    `
    );

    const afterTwo = runTicks(state, 2);
    expectAscii(
      afterTwo,
      `
      SSSSSS
      SPSoSS
      SSS.SS
      SSSoSS
      SSSoSS
      SSSSSS
    `
    );

    const afterThree = runTicks(state, 3);
    expectAscii(
      afterThree,
      `
      SSSSSS
      SPS.SS
      SSSoSS
      SSSoSS
      SSSoSS
      SSSSSS
    `
    );
  });
});
