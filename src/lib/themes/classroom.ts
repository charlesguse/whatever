import { ELEMENT_IDS, type ElementId } from '../../sim/elements';
import type { Theme, ThemeEntry } from './types';

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
};

// Sanity check at module load: every declared element id must have an entry.
// (Also exercised explicitly by tests/lib/themes/classroom.test.ts.)
for (const id of ELEMENT_IDS) {
  if (!(id in elements)) {
    throw new Error(`Classroom theme is missing an entry for element id "${id}"`);
  }
}
