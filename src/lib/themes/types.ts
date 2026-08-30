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
}
