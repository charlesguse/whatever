// Total, never throws — the same defensive shape resolveStoredThemeId
// already has for themeId (FR-032): anything not literally `boolean`
// resolves to `false` (first-time player is unmuted).
export function resolveStoredMute(stored: unknown): boolean {
  return typeof stored === 'boolean' ? stored : false;
}

// Trivial negation, named/exported so the "N toggles land on the parity of
// N" independent test — and App.svelte's own call site — read as calling a
// named action, matching cycleThemeId's existing precedent.
export function toggleMute(muted: boolean): boolean {
  return !muted;
}
