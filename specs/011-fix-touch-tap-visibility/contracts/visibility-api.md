# Visibility Contract: `src/lib/input/visibility.ts` (changed)

Supersedes the `nextLastInputSource` section of
[`specs/007-touch-gamepad-input/contracts/visibility-api.md`](../../007-touch-gamepad-input/contracts/visibility-api.md)
(007's spec itself is unmodified, per FR-012b — this is a new contract for a
later feature, not an edit to 007's). Encodes FR-001 through FR-010 as pure
functions over plain values — no DOM read inside this file, same as 007.

```ts
export type InputOrigin = 'touch' | 'mouse' | 'keyboard' | 'pen' | 'unknown';

export type LastInputSource = 'none' | 'discrete' | 'touch'; // unchanged from 007

export interface PlatformCapabilities { // unchanged from 007
  readonly hasTouch: boolean;
}

export function nextLastInputSource(
  current: LastInputSource,
  origin: InputOrigin // was: eventType: 'keydown' | 'click' | 'touchstart'
): LastInputSource;

export function shouldShowTouchControls( // unchanged signature from 007
  capabilities: PlatformCapabilities,
  lastInputSource: LastInputSource
): boolean;
```

## `nextLastInputSource` (FR-004, FR-004a, FR-005, FR-006)

| current | origin | result |
|---|---|---|
| `'none'` | `'touch'` | `'touch'` |
| `'none'` | `'pen'` | `'touch'` |
| `'none'` | `'keyboard'` | `'discrete'` |
| `'none'` | `'mouse'` | `'discrete'` |
| `'none'` | `'unknown'` | `'none'` (no-op) |
| `'touch'` | `'keyboard'` | `'discrete'` |
| `'touch'` | `'mouse'` | `'discrete'` |
| `'touch'` | `'unknown'` | `'touch'` (no-op — FR-004) |
| `'discrete'` | `'touch'` | `'touch'` |
| `'discrete'` | `'pen'` | `'touch'` |
| `'discrete'` | `'unknown'` | `'discrete'` (no-op — FR-004) |
| any | `'touch'` or `'pen'` (repeat) | `'touch'` (no-op) |
| any | `'keyboard'` or `'mouse'` (repeat) | `'discrete'` (no-op) |

This is a total function of its two arguments — no clock, no timer, no
re-entrant state (FR-007). `'unknown'` is the only origin whose result
depends on `current`; every other origin's result is fixed regardless of
`current`, per data-model.md's transition table.

There remains no `origin` value produced by pointer/mouse *movement*
(`pointermove`, `mousemove`, `touchmove`) — those are never wired to call
this function at all, structurally guaranteeing FR-003 the same way 007's
contract guaranteed FR-027a: nothing calls the reducer for a movement event,
so no branch could accidentally be written to accept one.

## `shouldShowTouchControls` — unchanged from 007

Same signature, same table (007's contract), re-verified unmodified by this
feature's suite:

| `hasTouch` | `lastInputSource` | result |
|---|---|---|
| `false` | `'none'` \| `'touch'` \| `'discrete'` | `false` |
| `true` | `'none'` \| `'touch'` | `true` |
| `true` | `'discrete'` | `false` |

## Call-site classification (`src/App.svelte`, plumbing — not part of this pure module)

| DOM listener | how `origin` is derived |
|---|---|
| `keydown` | always `'keyboard'` |
| `pointerdown` | `event.pointerType` mapped 1:1 (`'mouse'`, `'touch'`, `'pen'`); anything else → `'unknown'` |
| `touchstart` | always `'touch'` (fallback, additive to `pointerdown` — research.md Decision 4) |
| `click` | always `'unknown'` — no longer authoritative for any origin (research.md Decision 1) |

`audioEngine.unlock(...)` continues to be called from these same listeners;
that wiring is unrelated to this contract and unchanged in shape.

## What is explicitly NOT part of this contract

- The window-level listener registration/teardown itself — plumbing in
  `App.svelte`'s `onMount`.
- Which DOM elements appear/disappear when the result flips — markup in
  `App.svelte`, unchanged from 007 (`{#if controlsVisible}`-driven).
- Anything about touch gesture handling on the pad/buttons themselves
  (`src/lib/input/touch/TouchInput.ts`, [touch-api.md](../../007-touch-gamepad-input/contracts/touch-api.md)) —
  this feature does not change hit areas, zones, or action mapping (FR-011).
