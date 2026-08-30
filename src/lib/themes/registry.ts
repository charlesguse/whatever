import type { Theme } from './types';

// A registry keyed by theme id (FR-027). Adding a second theme is adding one
// more Theme object here — touches no sim or rendering code.
const themes = new Map<string, Theme>();

export function registerTheme(theme: Theme): void {
  themes.set(theme.id, theme);
}

export function getTheme(id: string): Theme {
  const theme = themes.get(id);
  if (!theme) {
    throw new Error(`Unknown theme "${id}"`);
  }
  return theme;
}
