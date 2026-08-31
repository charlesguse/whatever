import { starterCave } from './starter';
import type { CaveDefinition } from '../sim/cave';

// Placeholder (User Story 1/2/3) wrapping the existing starter cave —
// sufficient for session.ts's startGame()/advanceScreen() to compile and be
// tested against a real array from day one. User Story 4 replaces this with
// the eight shipped caves and retires starter.ts.
export const CAVES: readonly CaveDefinition[] = [starterCave];
