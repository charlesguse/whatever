import { ELEMENT_IDS, type ElementId } from '../../sim/elements';
import type { SoundTable, Theme, ThemeEntry } from './types';

// One synthesized voice per SoundEventId (FR-034, FR-035) — a bright,
// playful palette distinct from Classic's per event id (FR-039), every
// level within the [0.2, 0.6] band shared across both themes.
const sounds: SoundTable = {
  dirtStep: { waveform: 'noise', frequencyHz: 300, durationMs: 60, attackMs: 2, releaseMs: 20, level: 0.25, noiseMix: 0.8 },
  fallStart: { waveform: 'triangle', frequencyHz: 600, frequencyEndHz: 300, durationMs: 120, attackMs: 5, releaseMs: 40, level: 0.3, noiseMix: 0.1 },
  fallLand: { waveform: 'sine', frequencyHz: 150, frequencyEndHz: 90, durationMs: 140, attackMs: 2, releaseMs: 60, level: 0.45, noiseMix: 0.3 },
  diamondCollected: { waveform: 'sine', frequencyHz: 900, frequencyEndHz: 1400, durationMs: 180, attackMs: 5, releaseMs: 80, level: 0.5, noiseMix: 0 },
  doorOpen: { waveform: 'triangle', frequencyHz: 500, frequencyEndHz: 800, durationMs: 260, attackMs: 10, releaseMs: 100, level: 0.4, noiseMix: 0 },
  explosion: { waveform: 'noise', frequencyHz: 150, durationMs: 220, attackMs: 2, releaseMs: 120, level: 0.55, noiseMix: 0.9 },
  timeLow: { waveform: 'square', frequencyHz: 1200, durationMs: 90, attackMs: 2, releaseMs: 20, level: 0.35, noiseMix: 0 },
  bonusTally: { waveform: 'sine', frequencyHz: 1000, frequencyEndHz: 1200, durationMs: 100, attackMs: 2, releaseMs: 30, level: 0.3, noiseMix: 0 },
};

// The Classroom theme: one entry per declared element id (all 14, FR-026),
// including the 9 with no sim behavior yet. Only appearance lives here —
// element identity/behavior is fixed in src/sim/.
const elements: Record<ElementId, ThemeEntry> = {
  empty: { fillColor: '#e9e2cf', glyph: '', label: 'Hallway Floor' },
  dirt: { fillColor: '#f5f1e3', glyph: '≡', label: 'Notebook Paper' },
  boulder: { fillColor: '#c9a06b', glyph: '●', label: 'Rubber Eraser' },
  diamond: { fillColor: '#ffd54a', glyph: '★', label: 'Gold Star Sticker' },
  brickWall: { fillColor: '#b5502e', glyph: '▦', label: 'Cinder Brick Wall' },
  steelWall: { fillColor: '#8a93a0', glyph: '▥', label: 'Locker Door' },
  player: { fillColor: '#4c8bf5', glyph: '☺', label: 'Kid With A Backpack' },
  // FR-029, FR-030: corrected from feature 001's placeholder labels now that
  // both elements have behavior — appearance-only, no sim/render change.
  firefly: { fillColor: '#ff8a3d', glyph: '✂', label: 'Pencil Sharpener' },
  butterfly: { fillColor: '#c86dd7', glyph: '✈', label: 'Paper Airplane' },
  amoeba: { fillColor: '#8bc34a', glyph: '~', label: 'Spilled Glue' },
  // FR-032: relabeled now that the magic wall has behavior — this entry
  // covers both the dormant and dead phases (FR-034), never distinguished.
  magicWall: { fillColor: '#5c6bc0', glyph: '✦', label: 'Sticker Machine' },
  expandingWall: { fillColor: '#795548', glyph: '▧', label: 'Bookshelf' },
  // Closed-door appearance MUST match steelWall exactly (FR-024) — the
  // door is indistinguishable from a locker until the quota is met.
  exit: { fillColor: '#8a93a0', glyph: '▥', label: 'Locker Door' },
  explosion: { fillColor: '#ffeb3b', glyph: '✺', label: 'Confetti Burst' },
};

export const classroomTheme: Theme = {
  id: 'classroom',
  displayName: 'Classroom',
  elements,
  background: '#cfc09a',
  // Visibly distinct from elements.exit (the closed-door/locker look).
  doorOpenEntry: { fillColor: '#ffd54a', glyph: '▢', label: 'Open Classroom Door' },
  // FR-033, FR-034: the wall's "running" look — distinct from the inert
  // elements.magicWall entry and from every other entry (FR-034 test).
  magicWallActiveEntry: { fillColor: '#26c6da', glyph: '✧', label: 'Sticker Machine (Running)' },
  messages: {
    dead: 'Ouch! Head back to the classroom and try again.',
    completed: 'You made it out the door!',
  },
  readout: { template: '{count} / {quota} Gold Stars' },
  title: 'Recess Rocks',
  caveIntro: { template: '{name} — collect {quota} gold stars!' },
  // Distinct from the in-play messages.dead banner above — this is the
  // full-screen state shown between the crash and the reload (FR-005).
  lifeLost: { label: 'You lost a life! Get ready to try again.' },
  gameOver: { label: 'Game over! No more lives left.' },
  won: { label: 'You cleared every classroom! Recess Rocks champion!' },
  paused: { label: 'Paused' },
  hud: {
    lives: 'Lives: {lives}',
    time: 'Time: {seconds}',
    score: 'Score: {score}',
    highScore: 'Best: {score}',
    furthestCave: 'Furthest Classroom: {cave}',
  },
  caveComplete: { label: 'Room cleared! Score: {score}' },
  sounds,
};

// Sanity check at module load: every declared element id must have an entry.
// (Also exercised explicitly by tests/lib/themes/classroom.test.ts.)
for (const id of ELEMENT_IDS) {
  if (!(id in elements)) {
    throw new Error(`Classroom theme is missing an entry for element id "${id}"`);
  }
}
