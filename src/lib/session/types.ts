import type { CaveState } from '../../sim/cave';

// The one active screen at any moment (FR-001, data-model.md Screen).
export type Screen =
  | 'title'
  | 'caveIntro'
  | 'playing'
  | 'paused'
  | 'lifeLost'
  | 'caveComplete'
  | 'gameOver'
  | 'won';

// Plain TypeScript, no Svelte import (FR-045) — readable and testable
// without a browser, canvas, or storage.
export interface SessionState {
  readonly screen: Screen;
  readonly score: number;
  readonly lives: number;
  readonly caveIndex: number;
  readonly caveState: CaveState;
  // Internal — guards endAttempt against firing twice for the same attempt
  // (research.md's endAttempt decision, FR-023/FR-027a).
  readonly attemptEnded: boolean;
  // Internal — ticks elapsed on the current non-'playing' screen, driving
  // each screen's documented auto-advance delay (FR-003, FR-005, FR-007).
  readonly screenTicks: number;
}
