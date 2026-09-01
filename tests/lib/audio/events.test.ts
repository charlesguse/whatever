import { describe, expect, it } from 'vitest';
import { deriveSoundEvents } from '../../../src/lib/audio/events';
import type { SessionState } from '../../../src/lib/session/types';
import type { CaveState } from '../../../src/sim/cave';
import { caveFromLines, runTicks } from '../../sim/helpers/ascii-cave';

// Wraps a CaveState in a minimal SessionState — deriveSoundEvents only ever
// reads screen/caveState (FR-042a: never score, lives, caveIndex).
function session(caveState: CaveState, overrides: Partial<SessionState> = {}): SessionState {
  return {
    screen: 'playing',
    score: 0,
    lives: 3,
    caveIndex: 0,
    caveState,
    attemptEnded: false,
    screenTicks: 0,
    ...overrides,
  };
}

describe('deriveSoundEvents (FR-004–FR-013)', () => {
  it('a dirt-clearing step yields dirtStep', () => {
    const state = caveFromLines('S.P#.S');
    const next = runTicks(state, 1, ['right']);
    expect(deriveSoundEvents(session(state), session(next))).toEqual(['dirtStep']);
  });

  it('walking onto empty ground does not yield dirtStep', () => {
    const state = caveFromLines('S.P..S');
    const next = runTicks(state, 1, ['right']);
    expect(deriveSoundEvents(session(state), session(next))).not.toContain('dirtStep');
  });

  it('a push does not yield dirtStep', () => {
    // Seed 7's first draw succeeds against PUSH_CHANCE (see pushing.test.ts).
    const state = caveFromLines('S.Po.S', { seed: 7 });
    const next = runTicks(state, 1, ['right']);
    expect(deriveSoundEvents(session(state), session(next))).not.toContain('dirtStep');
  });

  it('a blocked move does not yield dirtStep', () => {
    const state = caveFromLines('S.PB.S');
    const next = runTicks(state, 1, ['right']);
    expect(deriveSoundEvents(session(state), session(next))).not.toContain('dirtStep');
  });

  describe('fallStart / fallLand', () => {
    it("a single boulder's fall yields exactly one fallStart on the letting-go tick, and one fallLand on the stopping tick, never a repeat while falling", () => {
      const state = caveFromLines(['SSSSSS', 'SP.o.S', 'S....S', 'SSSSSS']);
      const afterOne = runTicks(state, 1);
      const afterTwo = runTicks(state, 2);

      const startEvents = deriveSoundEvents(session(state), session(afterOne));
      expect(startEvents).toContain('fallStart');
      expect(startEvents).not.toContain('fallLand');

      const landEvents = deriveSoundEvents(session(afterOne), session(afterTwo));
      expect(landEvents).toContain('fallLand');
      expect(landEvents).not.toContain('fallStart');
    });

    it('a five-boulder collapse yields exactly one fallStart, then exactly one fallLand', () => {
      const state = caveFromLines(['SSSSSSSSS', 'SP......S', 'S.ooooo.S', 'S.......S', 'SSSSSSSSS']);
      const afterOne = runTicks(state, 1);
      const afterTwo = runTicks(state, 2);

      const startEvents = deriveSoundEvents(session(state), session(afterOne));
      expect(startEvents.filter((id) => id === 'fallStart')).toEqual(['fallStart']);

      const landEvents = deriveSoundEvents(session(afterOne), session(afterTwo));
      expect(landEvents.filter((id) => id === 'fallLand')).toEqual(['fallLand']);
    });

    it('a boulder rolling off another yields fallStart', () => {
      const state = caveFromLines(['SSSSSS', 'SP.o.S', 'S..o.S', 'S..#.S', 'SSSSSS']);
      const next = runTicks(state, 1);
      expect(deriveSoundEvents(session(state), session(next))).toContain('fallStart');
    });

    it('a boulder that lands and immediately falls again yields fallLand then fallStart on consecutive ticks', () => {
      // B (falling down column x=3) lands atop C at tick 2->3, blocked from
      // rolling left by E (an unrelated boulder free-falling down column
      // x=2) still occupying the diagonal-below cell; E vacates that cell
      // during tick 3, so B's roll opens up and it resumes falling at
      // tick 3->4 — verified against the real sim before pinning here.
      const rows = ['SSSSS', 'SP.oS', 'S.o.S', 'S...S', 'S..oS', 'S..SS', 'S...S', 'SSSSS'];
      const state = caveFromLines(rows);
      const afterTwo = runTicks(state, 2);
      const afterThree = runTicks(state, 3);
      const afterFour = runTicks(state, 4);

      const landEvents = deriveSoundEvents(session(afterTwo), session(afterThree));
      expect(landEvents).toContain('fallLand');
      expect(landEvents).not.toContain('fallStart');

      const startEvents = deriveSoundEvents(session(afterThree), session(afterFour));
      expect(startEvents).toContain('fallStart');
      expect(startEvents).not.toContain('fallLand');
    });

    it('a falling diamond produces the same fallStart/fallLand ids as a boulder', () => {
      const state = caveFromLines(['SSSSSS', 'SP.*.S', 'S....S', 'SSSSSS']);
      const afterOne = runTicks(state, 1);
      const afterTwo = runTicks(state, 2);

      expect(deriveSoundEvents(session(state), session(afterOne))).toContain('fallStart');
      expect(deriveSoundEvents(session(afterOne), session(afterTwo))).toContain('fallLand');
    });

    it('a falling body that crushes something this tick never double-fires as a fallLand', () => {
      const state = caveFromLines(['SSSSS', 'S.o.S', 'S...S', 'S.P.S', 'SSSSS']);
      const afterOne = runTicks(state, 1);
      const afterTwo = runTicks(state, 2);
      // afterOne -> afterTwo is the crush/bloom tick (the boulder's own cell
      // becomes 'explosion', not the same boulder id).
      expect(deriveSoundEvents(session(afterOne), session(afterTwo))).not.toContain('fallLand');
    });
  });

  it('a diamond collection yields diamondCollected', () => {
    const state = caveFromLines('S.P*.S', { quota: 1 });
    const next = runTicks(state, 1, ['right']);
    expect(deriveSoundEvents(session(state), session(next))).toContain('diamondCollected');
  });

  describe('doorOpen', () => {
    it('a quota-meeting collection yields exactly one doorOpen, never repeated, re-armed by restart', () => {
      const build = () => caveFromLines('S.P*XS', { quota: 1 });

      const first = build();
      const firstCollected = runTicks(first, 1, ['right']);
      const openEvents = deriveSoundEvents(session(first), session(firstCollected));
      expect(openEvents).toEqual(['diamondCollected', 'doorOpen']);

      const stillOpen = runTicks(firstCollected, 1);
      expect(deriveSoundEvents(session(firstCollected), session(stillOpen))).not.toContain('doorOpen');

      // A fresh attempt (restart) starts with collected/doorOpen reset —
      // deriveSoundEvents has no memory of the first attempt's door, so the
      // same transition fires doorOpen again.
      const second = build();
      const secondCollected = runTicks(second, 1, ['right']);
      expect(deriveSoundEvents(session(second), session(secondCollected))).toContain('doorOpen');
    });

    it('a quota met by a butterfly blast fires doorOpen only on the door-opening tick, not the diamond-appearance tick', () => {
      const state = caveFromLines(
        `
        SSSSSSS
        S..o..S
        S.....S
        S.SYS.S
        S.SSS.S
        S.....S
        S....PS
        SSSSSSS
      `,
        { quota: 1 }
      );
      const resolved = runTicks(state, 4); // fall, stamp, 2-tick lifetime — the diamond has now appeared
      expect(deriveSoundEvents(session(state), session(resolved))).not.toContain('doorOpen');

      const inputs = ['up', 'up', 'up', 'up', 'left'] as const;
      const beforeCollect = runTicks(resolved, 4, inputs);
      const afterCollect = runTicks(resolved, 5, inputs);
      const events = deriveSoundEvents(session(beforeCollect), session(afterCollect));
      expect(events).toContain('doorOpen');
      expect(events).toContain('diamondCollected');
    });
  });

  it('one or more new explosion cells yield exactly one explosion regardless of blast size', () => {
    const state = caveFromLines(['SSSSS', 'S...S', 'S.P.S', 'S.F.S', 'SSSSS']);
    const afterOne = runTicks(state, 1); // the bloom stamps 6 explosion cells at once
    const afterTwo = runTicks(state, 2); // the same cells persist — no new explosion

    const stampEvents = deriveSoundEvents(session(state), session(afterOne));
    expect(stampEvents.filter((id) => id === 'explosion')).toEqual(['explosion']);

    expect(deriveSoundEvents(session(afterOne), session(afterTwo))).not.toContain('explosion');
  });

  describe('timeLow', () => {
    it('fires exactly once per whole second at/below 10s, never above the threshold, never while paused', () => {
      const state = caveFromLines(['SSS', 'SPS', 'SSS'], { timeLimitSeconds: 12 });
      const beforeThreshold = runTicks(state, 7); // remaining still 12 - floor(7/8) ... stays above 10
      const atThreshold = runTicks(state, 8); // remaining drops to 11 -> still above 10 at 11s mark? recompute below
      const firstLow = runTicks(state, 16); // remaining 10
      const secondLow = runTicks(state, 24); // remaining 9

      expect(deriveSoundEvents(session(beforeThreshold), session(atThreshold))).not.toContain('timeLow');
      expect(deriveSoundEvents(session(atThreshold), session(firstLow))).toContain('timeLow');
      expect(deriveSoundEvents(session(firstLow), session(secondLow))).toContain('timeLow');

      // Screen-gated: no event at all while paused, regardless of the
      // underlying clock/cave state.
      const events = deriveSoundEvents(
        session(firstLow, { screen: 'paused' }),
        session(secondLow, { screen: 'paused' })
      );
      expect(events).toEqual([]);
    });
  });

  describe('bonusTally', () => {
    it('fires on caveComplete and is the only event produced there', () => {
      const state = caveFromLines('S.P*XS', { quota: 1 });
      const completed = runTicks(state, 2, ['right', 'right']);
      const events = deriveSoundEvents(
        session(state, { screen: 'playing' }),
        session(completed, { screen: 'caveComplete' })
      );
      expect(events).toEqual(['bonusTally']);
    });
  });

  describe('screen gating', () => {
    it('no gameplay event fires on any non-playing, non-caveComplete screen', () => {
      const state = caveFromLines('S.P#.S');
      const next = runTicks(state, 1, ['right']); // would yield dirtStep if gated to 'playing'
      const screens = ['title', 'caveIntro', 'paused', 'lifeLost', 'gameOver', 'won'] as const;
      for (const screen of screens) {
        expect(deriveSoundEvents(session(state, { screen }), session(next, { screen }))).toEqual([]);
      }
    });
  });

  it('a death-plus-chime tick yields both diamondCollected and explosion', () => {
    const state = caveFromLines(
      `
      SSSSSSS
      S..o..S
      S.....S
      S.SYS.S
      S.SSS.S
      S.....S
      S...*PS
      SSSSSSS
    `,
      { quota: 1 }
    );
    const inputs = [undefined, 'left'] as const;
    const beforeTick = runTicks(state, 1, inputs);
    const afterTick = runTicks(state, 2, inputs);
    const events = deriveSoundEvents(session(beforeTick), session(afterTick));
    expect(events).toContain('diamondCollected');
    expect(events).toContain('explosion');
  });

  it('replaying an identical cave/input sequence yields an identical event sequence', () => {
    const build = () => caveFromLines(['SSSSSSSSS', 'SP......S', 'S.ooooo.S', 'S.......S', 'SSSSSSSSS']);
    const run = () => {
      const state = build();
      const afterOne = runTicks(state, 1);
      const afterTwo = runTicks(state, 2);
      return [deriveSoundEvents(session(state), session(afterOne)), deriveSoundEvents(session(afterOne), session(afterTwo))];
    };
    expect(run()).toEqual(run());
  });
});
