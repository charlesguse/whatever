import { ELEMENT_IDS, type ElementId } from '../../sim/elements';
import type { SoundTable, Theme, ThemeEntry } from './types';

// One synthesized voice per SoundEventId (FR-034, FR-035) — a harsher,
// retro-chiptune palette, distinct from Classroom's per event id
// (FR-039), every level within the [0.2, 0.6] band shared across both
// themes.
const sounds: SoundTable = {
  dirtStep: { waveform: 'square', frequencyHz: 220, durationMs: 50, attackMs: 1, releaseMs: 15, level: 0.2, noiseMix: 0.5 },
  fallStart: { waveform: 'sawtooth', frequencyHz: 500, frequencyEndHz: 250, durationMs: 110, attackMs: 3, releaseMs: 35, level: 0.28, noiseMix: 0.05 },
  fallLand: { waveform: 'square', frequencyHz: 120, frequencyEndHz: 60, durationMs: 150, attackMs: 1, releaseMs: 70, level: 0.5, noiseMix: 0.4 },
  diamondCollected: { waveform: 'triangle', frequencyHz: 1100, frequencyEndHz: 1600, durationMs: 160, attackMs: 3, releaseMs: 70, level: 0.55, noiseMix: 0 },
  doorOpen: { waveform: 'sawtooth', frequencyHz: 400, frequencyEndHz: 700, durationMs: 240, attackMs: 8, releaseMs: 90, level: 0.35, noiseMix: 0 },
  explosion: { waveform: 'noise', frequencyHz: 100, durationMs: 260, attackMs: 1, releaseMs: 140, level: 0.6, noiseMix: 1 },
  timeLow: { waveform: 'sawtooth', frequencyHz: 1000, durationMs: 80, attackMs: 1, releaseMs: 15, level: 0.3, noiseMix: 0 },
  bonusTally: { waveform: 'square', frequencyHz: 850, frequencyEndHz: 1050, durationMs: 90, attackMs: 1, releaseMs: 25, level: 0.25, noiseMix: 0 },
};

// The Classic theme: an homage to the original cave-digging classic, in
// look and wording only — no trademarked name (FR-011). One entry per
// declared element id (all 14, FR-007).
const elements: Record<ElementId, ThemeEntry> = {
  empty: { fillColor: '#000000', glyph: '', label: 'Cave' },
  dirt: { fillColor: '#7b4a24', glyph: '.', label: 'Dirt' },
  boulder: { fillColor: '#9a9a9a', glyph: '●', label: 'Boulder' },
  diamond: { fillColor: '#ffffff', glyph: '♦', label: 'Diamond' },
  brickWall: { fillColor: '#b5502e', glyph: '▤', label: 'Brick Wall' },
  steelWall: { fillColor: '#5a5a5a', glyph: '▩', label: 'Steel Wall' },
  player: { fillColor: '#3d7dd8', glyph: '☺', label: 'Rockford' },
  firefly: { fillColor: '#e8342a', glyph: '✦', label: 'Firefly' },
  butterfly: { fillColor: '#c86dd7', glyph: '✷', label: 'Butterfly' },
  amoeba: { fillColor: '#39b54a', glyph: '~', label: 'Amoeba' },
  magicWall: { fillColor: '#c9a227', glyph: '▦', label: 'Magic Wall' },
  expandingWall: { fillColor: '#8a6d3b', glyph: '▧', label: 'Expanding Wall' },
  // Closed-door appearance MUST match steelWall exactly (FR-008) — the
  // exit is indistinguishable from a steel wall until the quota is met.
  exit: { fillColor: '#5a5a5a', glyph: '▩', label: 'Steel Wall' },
  explosion: { fillColor: '#ffeb3b', glyph: '✺', label: 'Explosion' },
};

export const classicTheme: Theme = {
  id: 'classic',
  displayName: 'Classic',
  elements,
  background: '#000000',
  // Visibly distinct from elements.exit (the closed steel-wall look).
  doorOpenEntry: { fillColor: '#ffffff', glyph: '▢', label: 'Open Exit' },
  // FR-009: the wall's "running" look — distinct from the inert
  // elements.magicWall entry and from every other entry.
  magicWallActiveEntry: { fillColor: '#26c6da', glyph: '✧', label: 'Magic Wall (Active)' },
  messages: {
    dead: 'You perished in the cave. Try again.',
    completed: 'You reached the exit!',
  },
  readout: { template: '{count} / {quota} Diamonds' },
  title: 'Cave Runner',
  caveIntro: { template: '{name} — collect {quota} diamonds!' },
  lifeLost: { label: 'You lost a life! Get ready to try again.' },
  gameOver: { label: 'Game over! No more lives left.' },
  won: { label: 'You cleared every cave! Cave Runner champion!' },
  paused: { label: 'Paused' },
  hud: {
    lives: 'Lives: {lives}',
    time: 'Time: {seconds}',
    score: 'Score: {score}',
    highScore: 'Best: {score}',
    furthestCave: 'Furthest Cave: {cave}',
  },
  caveComplete: { label: 'Cave cleared! Score: {score}' },
  sounds,
};

// Sanity check at module load: every declared element id must have an
// entry, mirroring classroom.ts's existing pattern.
for (const id of ELEMENT_IDS) {
  if (!(id in elements)) {
    throw new Error(`Classic theme is missing an entry for element id "${id}"`);
  }
}
