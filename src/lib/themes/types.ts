import type { ElementId } from '../../sim/elements';

// Element identity lives in the sim; appearance lives here, keyed by element
// id (constitution Principle III). Adding a theme touches only a new entry
// in the registry — never src/sim/ and never rendering logic.
export interface ThemeEntry {
  readonly fillColor: string;
  readonly glyph: string;
  readonly label: string;
}

export interface Theme {
  readonly id: string;
  readonly elements: Readonly<Record<ElementId, ThemeEntry>>;
  readonly background: string;
  // The door's open/flashing appearance (FR-038). elements.exit stays the
  // door's closed appearance, visually identical to elements.steelWall.
  readonly doorOpenEntry: ThemeEntry;
  // The magic wall's "running" appearance while active (FR-033), parallel
  // to doorOpenEntry. elements.magicWall is the one inert entry, covering
  // both dormant and dead (FR-034) — never a third entry.
  readonly magicWallActiveEntry: ThemeEntry;
  readonly messages: {
    readonly dead: string;
    readonly completed: string;
  };
  // A template string for the collected/quota HUD, e.g. containing
  // "{count}" and "{quota}" placeholders the shell substitutes — plain
  // data, no function value (constitution Principle III).
  readonly readout: {
    readonly template: string;
  };
  // The game's name, shown on the title screen (FR-002).
  readonly title: string;
  // Names the cave and states its quota before play begins (FR-003), with
  // "{name}"/"{quota}"-style placeholders, following the readout pattern.
  readonly caveIntro: {
    readonly template: string;
  };
  readonly lifeLost: {
    readonly label: string;
  };
  readonly gameOver: {
    readonly label: string;
  };
  // HUD labels, following the readout.template placeholder pattern
  // (FR-043, FR-046).
  readonly hud: {
    readonly lives: string;
    readonly time: string;
    readonly score: string;
  };
  // The bonus tally overlay, shown while screen === 'caveComplete' (FR-006,
  // FR-019, FR-020) — the arithmetic is already final; this only labels it.
  readonly caveComplete: {
    readonly label: string;
  };
}
