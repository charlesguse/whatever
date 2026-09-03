# Phase 1 Data Model: Taps Never Hide The Touch Controls

Extends feature 007's data model
([`specs/007-touch-gamepad-input/data-model.md`](../007-touch-gamepad-input/data-model.md)),
which extends 001–006's. Every sim entity, theme entity, `SessionState`
field, and `TickInput` field is unchanged and not repeated — this feature
touches no file under `src/sim/` (FR-011). This feature adds one entity
(`InputOrigin`) and changes the signature of one existing function
(`nextLastInputSource`). `PlatformCapabilities`, `LastInputSource`, and
`shouldShowTouchControls` are unchanged from 007.

## Input Origin (new — `src/lib/input/visibility.ts`)

```ts
export type InputOrigin = 'touch' | 'mouse' | 'keyboard' | 'pen' | 'unknown';
```

What actually produced an input, independent of which DOM event type
delivered it (spec's Key Entities: "Distinct from the kind of event
delivered, because one touch can produce several events of different
kinds"). Closed set of five values — every browser signal this feature reads
maps into exactly one of them (research.md Decision 1):

| Signal read at the call site | `InputOrigin` |
|---|---|
| `keydown` fires | `'keyboard'` |
| `pointerdown` fires with `event.pointerType === 'mouse'` | `'mouse'` |
| `pointerdown` fires with `event.pointerType === 'touch'` | `'touch'` |
| `pointerdown` fires with `event.pointerType === 'pen'` | `'pen'` |
| `pointerdown` fires with any other/absent `pointerType` | `'unknown'` |
| `touchstart` fires (fallback, research.md Decision 4) | `'touch'` |
| `click` fires | `'unknown'` (research.md Decision 1) |

## Last Input Source (unchanged type, changed reducer — `src/lib/input/visibility.ts`)

```ts
export type LastInputSource = 'none' | 'discrete' | 'touch';

export function nextLastInputSource(
  current: LastInputSource,
  origin: InputOrigin
): LastInputSource;
```

The classification the game keeps of what the player most recently used —
same three-value type as 007, now derived from `InputOrigin` instead of a raw
DOM `eventType` string. Transition table (research.md Decision 5, 2, 3):

| `origin` | result |
|---|---|
| `'touch'` | `'touch'` |
| `'pen'` | `'touch'` |
| `'keyboard'` | `'discrete'` |
| `'mouse'` | `'discrete'` |
| `'unknown'` | `current` (no-op) |

There is still no `origin` value for pointer/mouse *movement* — `pointermove`
and its equivalents are never wired to call this function, which is what
keeps "pointer movement MUST NOT hide the controls" (FR-003, 007 FR-027a)
structural rather than a branch that could be miscoded.

## Platform Capabilities (unchanged from 007)

```ts
export interface PlatformCapabilities {
  readonly hasTouch: boolean;
}
```

## Visibility Decision (unchanged signature from 007)

```ts
export function shouldShowTouchControls(
  capabilities: PlatformCapabilities,
  lastInputSource: LastInputSource
): boolean;
```

The pure function from capabilities and last input source to whether the
touch controls exist on screen. Its own signature does not change — origin's
effect is fully absorbed by `LastInputSource` upstream (research.md Decision
5) — but its *meaning* changes because `lastInputSource` can no longer become
`'discrete'` as a side effect of a tap's synthesized click, which is the
entire fix. Its existing transition table (007 contract, capability ×
`lastInputSource`) is unchanged and re-asserted unmodified by this feature's
tests (FR-010's "the existing 007 visibility assertions MUST continue to
pass").

## State ownership (`src/App.svelte`, unchanged shape from 007)

`lastInputSource: LastInputSource` remains the single `$state` field owned by
`App.svelte`, advanced only by window-level listeners calling
`nextLastInputSource`. This feature changes which listeners exist and what
they pass as `origin`, not where the state lives or how it is read by
`controlsVisible` (`$derived`).
