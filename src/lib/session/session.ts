import { getCollected, getStatus, parseCave } from '../../sim/cave';
import { tick, type TickInput } from '../../sim/tick';
import { CAVES } from '../../caves';
import type { SessionState } from './types';

// A new game always begins at cave one (FR-002) — startGame() never reads a
// stored "furthest cave" value; that is display-only, read separately by the
// title screen from src/lib/storage/save.ts.
export function startGame(): SessionState {
  return {
    screen: 'caveIntro',
    score: 0,
    lives: 3,
    caveIndex: 0,
    caveState: parseCave(CAVES[0]),
    // The attempt has not begun — no tick of it has run yet (FR-027a).
    attemptEnded: true,
    screenTicks: 0,
  };
}

// FR-011, FR-028: the sim's tick() is called only while screen === 'playing'
// — this alone is what makes pause, the cave intro, the tally, and every
// terminal screen freeze the clock and the grid, with the sim never knowing
// a screen exists.
export function tickSession(session: SessionState, input: TickInput): SessionState {
  if (session.screen !== 'playing') return session;

  const preStatus = getStatus(session.caveState);
  const nextCaveState = tick(session.caveState, input);
  const nextStatus = getStatus(nextCaveState);

  // Scoring (star value, completion bonus) is wired in by User Story 3 —
  // score is carried through unchanged here.
  if (nextStatus === 'dead' && preStatus !== 'dead') {
    return endAttempt({ ...session, caveState: nextCaveState }, 'death');
  }

  return { ...session, caveState: nextCaveState, screen: 'playing' };
}

// The shared attempt-over transition (research.md's endAttempt decision):
// the one place an attempt ends, lives decrement, and the cave resets,
// reached either by a tick-detected death or by a voluntary restart
// (User Story 5's restartAttempt).
//
// `attemptEnded` tracks whether the *current* attempt is still live: false
// while screen is 'playing'/'paused' (a restart here costs a life, FR-027);
// true while screen is 'caveIntro'/'lifeLost' (the attempt has not yet
// begun, or has already ended — a restart here costs nothing, FR-027a).
// This is what makes a death and a restart landing on the same tick cost
// exactly one life (FR-023, FR-027a, spec Edge Cases): whichever fires
// first flips attemptEnded, and the second either no-ops (a same-tick
// second death, impossible in practice but guarded anyway) or, for a
// restart, only fast-forwards the screen without spending another life.
export function endAttempt(session: SessionState, cause: 'death' | 'restart'): SessionState {
  if (session.attemptEnded) {
    if (cause === 'restart') {
      // FR-026, FR-027a: reachable immediately, no waiting — the cave is
      // already fresh (from the death, or from never having started), so
      // this only fast-forwards the screen, spending nothing.
      return { ...session, screen: 'playing', attemptEnded: false, screenTicks: 0 };
    }
    return session;
  }

  const lives = session.lives - 1;
  if (lives === 0) {
    // FR-025: the game is over — caveState is not reloaded.
    return { ...session, lives, attemptEnded: true, screen: 'gameOver' };
  }

  // FR-027b: every reload rebuilds from the cave's declared definition and
  // seed — never from a stored snapshot.
  const caveState = parseCave(CAVES[session.caveIndex]);

  if (cause === 'death') {
    return { ...session, lives, caveState, attemptEnded: true, screen: 'lifeLost', screenTicks: 0 };
  }

  // cause === 'restart': skips 'lifeLost' entirely, reloading straight into
  // play (FR-005's last sentence, FR-027a).
  return { ...session, lives, caveState, attemptEnded: false, screen: 'playing', screenTicks: 0 };
}

// Applies only to 'caveIntro', 'lifeLost', 'caveComplete', 'gameOver', and
// 'won' — a no-op elsewhere. 'caveComplete'/'won' land in User Story 4.
export function advanceScreen(session: SessionState): SessionState {
  switch (session.screen) {
    case 'caveIntro':
      // The attempt's first tick has not run yet — it begins live now.
      return { ...session, screen: 'playing', attemptEnded: false, screenTicks: 0 };
    case 'lifeLost':
      return { ...session, screen: 'caveIntro', screenTicks: 0 };
    case 'gameOver':
    case 'won':
      return { ...session, screen: 'title', screenTicks: 0 };
    default:
      return session;
  }
}
