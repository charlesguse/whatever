// Encodes FR-027, FR-027a, FR-029, and FR-030 as pure functions over plain
// values — no DOM read inside this file.

export type LastInputSource = 'none' | 'discrete' | 'touch';

export interface PlatformCapabilities {
  readonly hasTouch: boolean;
}

// FR-027a: there is no eventType for pointer/mouse movement — mousemove and
// its equivalents are never wired to call this function at all in
// App.svelte, which is what makes "pointer movement MUST NOT hide the
// controls" structural rather than a branch inside this reducer.
export function nextLastInputSource(
  current: LastInputSource,
  eventType: 'keydown' | 'click' | 'touchstart'
): LastInputSource {
  if (eventType === 'touchstart') return 'touch';
  return 'discrete';
}

// FR-030: capability gates everything; among touch-capable platforms, the
// controls are visible until a keydown/click hides them (FR-027a).
export function shouldShowTouchControls(
  capabilities: PlatformCapabilities,
  lastInputSource: LastInputSource
): boolean {
  return capabilities.hasTouch && lastInputSource !== 'discrete';
}
