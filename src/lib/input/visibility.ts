// Encodes FR-001 through FR-010 as pure functions over plain values — no DOM
// read inside this file.

export type LastInputSource = 'none' | 'discrete' | 'touch';

export type InputOrigin = 'touch' | 'mouse' | 'keyboard' | 'pen' | 'unknown';

export interface PlatformCapabilities {
  readonly hasTouch: boolean;
}

// FR-027a: there is no origin for pointer/mouse movement — mousemove and its
// equivalents are never wired to call this function at all in App.svelte,
// which is what makes "pointer movement MUST NOT hide the controls"
// structural rather than a branch inside this reducer. 'unknown' (e.g. a
// tap's synthesized click) is a no-op that leaves `current` unchanged
// (FR-004), since it carries no reliable evidence of touch or discrete input.
export function nextLastInputSource(
  current: LastInputSource,
  origin: InputOrigin
): LastInputSource {
  if (origin === 'touch' || origin === 'pen') return 'touch';
  if (origin === 'keyboard' || origin === 'mouse') return 'discrete';
  return current;
}

// FR-030: capability gates everything; among touch-capable platforms, the
// controls are visible until a keydown/click hides them (FR-027a).
export function shouldShowTouchControls(
  capabilities: PlatformCapabilities,
  lastInputSource: LastInputSource
): boolean {
  return capabilities.hasTouch && lastInputSource !== 'discrete';
}
