import { ELEMENT_IDS, type ElementId } from '../../sim/elements';
import type { Theme, ThemeEntry } from './types';

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
};

// Sanity check at module load: every declared element id must have an
// entry, mirroring classroom.ts's existing pattern.
for (const id of ELEMENT_IDS) {
  if (!(id in elements)) {
    throw new Error(`Classic theme is missing an entry for element id "${id}"`);
  }
}
