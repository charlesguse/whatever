// Plain TypeScript, no Svelte import (constitution Principle IV) — the
// active theme id itself lives in App.svelte's $state, not here.

// Returns the id following currentId in order; wraps to order[0] past the
// last entry, or when currentId is not present in order at all. A no-op
// (returns currentId unchanged) when order has fewer than 2 entries.
export function cycleThemeId(currentId: string, order: readonly string[]): string {
  if (order.length < 2) return currentId;
  const index = order.indexOf(currentId);
  if (index === -1) return order[0];
  return order[(index + 1) % order.length];
}

// FR-025: returns stored unchanged only if it is a string present in
// registeredIds; every other input — undefined, null, a number, an
// object, or an unregistered string — resolves to fallbackId. Total,
// never throws.
export function resolveStoredThemeId(
  stored: unknown,
  registeredIds: readonly string[],
  fallbackId: string
): string {
  if (typeof stored === 'string' && registeredIds.includes(stored)) {
    return stored;
  }
  return fallbackId;
}
