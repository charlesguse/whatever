import { describe, expect, it, vi } from 'vitest';
import { asciiFromState, caveFromAscii } from '../../../src/sim/ascii';
import { getRemainingSeconds, parseCave, type CaveDefinition } from '../../../src/sim/cave';
import type { SessionState } from '../../../src/lib/session/types';
import { advanceScreen, startGame, tickSession } from '../../../src/lib/session/session';
import { bonusFor, starValue } from '../../../src/lib/session/scoring';

// A tiny fixture cave (the crushing.test.ts shape): a boulder falls twice,
// crushing the kid on the second tick, blooming to dead by the fourth
// tickSession call — small and fast enough to drive the 3->2->1->0 lives
// sequence without a real cave's size (FR-023–FR-025). Built inside
// vi.hoisted since vi.mock's factory is hoisted above ordinary top-level
// declarations.
const { FIXTURE_CAVE } = vi.hoisted(() => {
  // Inlined caveFromAscii shape (the real helper isn't hoisted either) —
  // width/height derived from the rows, matching src/sim/ascii.ts exactly.
  const rows = ['SSSSS', 'S.o.S', 'S...S', 'S.P.S', 'SSSSS'];
  return {
    FIXTURE_CAVE: {
      name: 'Fixture',
      width: rows[0].length,
      height: rows.length,
      seed: 1,
      quota: 0,
      rows,
    },
  };
}) as { FIXTURE_CAVE: CaveDefinition };

vi.mock('../../../src/caves', () => ({ CAVES: [FIXTURE_CAVE] }));

// Advances a playing session one sim tick per call, with no input, until the
// screen leaves 'playing' (a death routing through endAttempt) or a ceiling
// is hit — robust to the exact tick count a fixture's death takes.
function runUntilNotPlaying(session: SessionState, maxTicks = 10): SessionState {
  let s = session;
  for (let i = 0; i < maxTicks && s.screen === 'playing'; i++) {
    s = tickSession(s, {});
  }
  return s;
}

describe('startGame (FR-002, Acceptance Scenario 1)', () => {
  it('starts a fresh session at cave intro, score 0, lives 3, cave 0, built from CAVES[0]', () => {
    const session = startGame();
    expect(session.screen).toBe('caveIntro');
    expect(session.score).toBe(0);
    expect(session.lives).toBe(3);
    expect(session.caveIndex).toBe(0);
    expect(asciiFromState(session.caveState)).toBe(asciiFromState(parseCave(FIXTURE_CAVE)));
  });
});

describe('tickSession outside playing (FR-011, FR-028)', () => {
  const screens = ['title', 'caveIntro', 'paused', 'lifeLost', 'caveComplete', 'gameOver', 'won'] as const;

  it.each(screens)('is a no-op on screen "%s" — no sim tick() call', (screen) => {
    const caveState = parseCave(FIXTURE_CAVE);
    const session: SessionState = {
      screen,
      score: 5,
      lives: 2,
      caveIndex: 0,
      caveState,
      attemptEnded: true,
      screenTicks: 3,
    };
    const next = tickSession(session, { direction: 'up' });
    expect(next).toBe(session);
    expect(next.caveState.tick).toBe(caveState.tick);
  });
});

describe('a lethal tick during play (FR-005, FR-013, FR-023, FR-024, FR-027b)', () => {
  it('routes through endAttempt("death"): one life lost, screen lifeLost, caveState rebuilt fresh', () => {
    let session = advanceScreen(startGame());
    expect(session.screen).toBe('playing');

    session = runUntilNotPlaying(session);

    expect(session.screen).toBe('lifeLost');
    expect(session.lives).toBe(2);
    // Grid-identical to a brand-new parseCave call, not a snapshot of the
    // crashed grid.
    expect(asciiFromState(session.caveState)).toBe(asciiFromState(parseCave(FIXTURE_CAVE)));
    expect(session.caveState.tick).toBe(0);
  });
});

describe('the 3 -> 2 -> 1 -> 0 lives sequence (FR-025, Acceptance Scenario 5, SC-006)', () => {
  it('the third death produces game over; a subsequent startGame() resets fully', () => {
    let session = advanceScreen(startGame());

    session = runUntilNotPlaying(session); // death 1
    expect(session.screen).toBe('lifeLost');
    expect(session.lives).toBe(2);
    session = advanceScreen(advanceScreen(session)); // lifeLost -> caveIntro -> playing

    session = runUntilNotPlaying(session); // death 2
    expect(session.screen).toBe('lifeLost');
    expect(session.lives).toBe(1);
    session = advanceScreen(advanceScreen(session));

    session = runUntilNotPlaying(session); // death 3
    expect(session.screen).toBe('gameOver');
    expect(session.lives).toBe(0);

    const fresh = startGame();
    expect(fresh.score).toBe(0);
    expect(fresh.lives).toBe(3);
    expect(fresh.caveIndex).toBe(0);
  });
});

describe('advanceScreen (FR-003, FR-005, FR-007)', () => {
  it('caveIntro -> playing', () => {
    const session: SessionState = {
      screen: 'caveIntro',
      score: 0,
      lives: 3,
      caveIndex: 0,
      caveState: parseCave(FIXTURE_CAVE),
      attemptEnded: true,
      screenTicks: 0,
    };
    expect(advanceScreen(session).screen).toBe('playing');
    expect(advanceScreen(session).attemptEnded).toBe(false);
  });

  it('lifeLost -> caveIntro, for the already-reloaded cave', () => {
    const reloaded = parseCave(FIXTURE_CAVE);
    const session: SessionState = {
      screen: 'lifeLost',
      score: 0,
      lives: 2,
      caveIndex: 0,
      caveState: reloaded,
      attemptEnded: true,
      screenTicks: 0,
    };
    const next = advanceScreen(session);
    expect(next.screen).toBe('caveIntro');
    expect(next.caveState).toBe(reloaded);
  });

  it('gameOver -> title', () => {
    const session: SessionState = {
      screen: 'gameOver',
      score: 10,
      lives: 0,
      caveIndex: 0,
      caveState: parseCave(FIXTURE_CAVE),
      attemptEnded: true,
      screenTicks: 0,
    };
    expect(advanceScreen(session).screen).toBe('title');
  });
});

describe('scoring in tickSession (FR-016–FR-018, FR-019, FR-020)', () => {
  it('adds starValue(preCollected, quota) to score on a collection during playing', () => {
    const caveState = parseCave(
      caveFromAscii({ name: 'scoring-1', seed: 1, quota: 1, rows: ['SSSS', 'SP*S', 'SSSS'] })
    );
    const session: SessionState = {
      screen: 'playing',
      score: 0,
      lives: 3,
      caveIndex: 0,
      caveState,
      attemptEnded: false,
      screenTicks: 0,
    };
    const next = tickSession(session, { direction: 'right' });
    expect(next.score).toBe(starValue(0, 1));
  });

  it('adds nothing to score on a tick with no collection', () => {
    const caveState = parseCave(
      caveFromAscii({ name: 'scoring-2', seed: 1, quota: 0, rows: ['SSSS', 'SP.S', 'SSSS'] })
    );
    const session: SessionState = {
      screen: 'playing',
      score: 0,
      lives: 3,
      caveIndex: 0,
      caveState,
      attemptEnded: false,
      screenTicks: 0,
    };
    const next = tickSession(session, { direction: 'right' });
    expect(next.score).toBe(0);
  });

  it('adds the completion bonus exactly once and moves to caveComplete, already at the final total', () => {
    const def = caveFromAscii({
      name: 'scoring-3',
      seed: 1,
      quota: 1,
      rows: ['SSSS', 'SP*X', 'SSSS'],
      timeLimitSeconds: 10,
    });
    let session: SessionState = {
      screen: 'playing',
      score: 0,
      lives: 3,
      caveIndex: 0,
      caveState: parseCave(def),
      attemptEnded: false,
      screenTicks: 0,
    };

    session = tickSession(session, { direction: 'right' }); // collects the diamond, opens the door
    const starPoints = starValue(0, 1);
    expect(session.score).toBe(starPoints);
    expect(session.screen).toBe('playing');

    const remainingBeforeDoor = getRemainingSeconds(session.caveState)!;
    session = tickSession(session, { direction: 'right' }); // steps through the open door
    expect(session.screen).toBe('caveComplete');

    const expectedBonus = bonusFor(remainingBeforeDoor);
    expect(session.score).toBe(starPoints + expectedBonus);
  });
});

describe('score survives a failed attempt (FR-017a, FR-021)', () => {
  it('a star collected earlier in the attempt stays scored after a death', () => {
    let session = advanceScreen(startGame());
    session = { ...session, score: 25 };
    session = runUntilNotPlaying(session);
    expect(session.screen).toBe('lifeLost');
    // endAttempt never touches score — a failed attempt does not roll it
    // back (there is no per-attempt snapshot, only the running total).
    expect(session.score).toBe(25);
  });
});
