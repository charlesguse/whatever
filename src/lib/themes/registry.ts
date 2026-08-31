import type { Theme } from './types';

// A registry keyed by theme id (FR-027). Adding a second theme is adding one
// more Theme object here — touches no sim or rendering code.
const themes = new Map<string, Theme>();

export function registerTheme(theme: Theme): void {
  if (themes.has(theme.id)) {
    throw new Error(`Theme "${theme.id}" is already registered`);
  }
  themes.set(theme.id, theme);
}

export function getTheme(id: string): Theme {
  const theme = themes.get(id);
  if (!theme) {
    throw new Error(`Unknown theme "${id}"`);
  }
  return theme;
}

// FR-004: non-throwing existence check, so a stored or cycled id can be
// validated with no try/catch at the call site.
export function hasTheme(id: string): boolean {
  return themes.has(id);
}

// FR-001, FR-005: the only source the UI's theme list is built from — a
// hardcoded pair of options anywhere in shell code is a defect. The
// internal Map already preserves insertion (registration) order.
export function listThemes(): readonly Theme[] {
  return [...themes.values()];
}
