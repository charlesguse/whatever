# Visibility Contract: `src/lib/input/visibility.ts` (new)

Encodes FR-027, FR-027a, FR-029, and FR-030 as pure functions over plain
values — no DOM read inside this file.

```ts
export type LastInputSource = 'none' | 'discrete' | 'touch';

export interface PlatformCapabilities {
  readonly hasTouch: boolean;
}

export function nextLastInputSource(
  current: LastInputSource,
  eventType: 'keydown' | 'click' | 'touchstart'
): LastInputSource;

export function shouldShowTouchControls(
  capabilities: PlatformCapabilities,
  lastInputSource: LastInputSource
): boolean;
```

## `nextLastInputSource` (FR-027a)

| current | eventType | result |
|---|---|---|
| `'none'` | `'touchstart'` | `'touch'` |
| `'none'` | `'keydown'` | `'discrete'` |
| `'none'` | `'click'` | `'discrete'` |
| `'touch'` | `'keydown'` | `'discrete'` |
| `'discrete'` | `'touchstart'` | `'touch'` |
| `'touch'` | `'touchstart'` | `'touch'` (no-op) |
| `'discrete'` | `'click'` | `'discrete'` (no-op) |

There is no `eventType` for pointer/mouse movement — `mousemove` and its
equivalents are never wired to call this function at all in `App.svelte`.
This is what makes "pointer movement MUST NOT hide the controls" a
structural fact (nothing calls the reducer) rather than a branch inside it
that could be miscoded (e.g. an accidental `'mousemove'` case added
later). A test asserts the reducer's three-input closed set is exhaustive
and that no fourth event type is accepted by its TypeScript signature.

## `shouldShowTouchControls` (FR-030, table form for SC-011b)

| `hasTouch` | `lastInputSource` | result |
|---|---|---|
| `false` | `'none'` | `false` (FR-027 — capability gates everything) |
| `false` | `'touch'` | `false` |
| `false` | `'discrete'` | `false` |
| `true` | `'none'` | `true` (FR-027a — visible before any input) |
| `true` | `'touch'` | `true` |
| `true` | `'discrete'` | `false` (hidden after a keydown/click) |

This function alone does not decide whether controls are rendered — see
[touch-api.md](./touch-api.md)'s note that `App.svelte` additionally gates
on `session.screen` (FR-008). The three gates are independent and each
individually testable; this contract covers only the capability/last-
input gate.

## Capability detection (FR-029)

`hasTouch` is computed once, at mount, as:

```ts
const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
```

No user-agent string, device name, or screen dimension is read anywhere
in this feature. `gamepadSupported` (a separate, ungrouped boolean —
see [gamepad-api.md](./gamepad-api.md)) is computed the same way:
`typeof navigator.getGamepads === 'function'`.

## What is explicitly NOT part of this contract

- The window-level `keydown`/`click`/`touchstart` listeners that call
  `nextLastInputSource` — those are plumbing in `App.svelte`'s `onMount`,
  not part of this pure module.
- Which DOM elements actually appear/disappear when the result flips —
  markup in `App.svelte`, driven by reading this function's result inside
  a `{#if}`.
