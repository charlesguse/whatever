# Gamepad Contract: `src/lib/input/gamepad/{bindings,mapping,GamepadInput}.ts` (new)

## `gamepad/bindings.ts` — plain data (FR-018)

```ts
export const DPAD_BUTTON_INDEX: Readonly<Record<Direction, number>> = {
  up: 12, down: 13, left: 14, right: 15,
};
export const FACE_BUTTON_GRAB_CONFIRM_INDEX = 0;
export const PAUSE_BUTTON_INDEX = 9;      // Start
export const RESTART_BUTTON_INDEX = 8;    // Back / Select
export const CYCLE_THEME_BUTTON_INDEX = 5; // right shoulder/bumper — flagged, see research.md
export const STICK_X_AXIS_INDEX = 0;
export const STICK_Y_AXIS_INDEX = 1;
export const STICK_ENGAGE_THRESHOLD = 0.5;  // FR-019
export const STICK_RELEASE_THRESHOLD = 0.35; // FR-019
```

Indices are the W3C Gamepad API "standard" mapping's own published
layout. Reassigning any one constant at review is a one-line change with
no call-site edit anywhere (FR-018).

## `gamepad/mapping.ts` — pure functions

```ts
export function resolveDpadDirection(buttons: readonly GamepadButton[]): Direction | undefined;
export function resolveStickDirection(
  x: number,
  y: number,
  previous: Direction | undefined
): Direction | undefined;
export function resolveDirection(
  dpad: Direction | undefined,
  stick: Direction | undefined
): Direction | undefined;
export function mapOneShotButtons(
  buttons: readonly GamepadButton[],
  previousPressed: ReadonlySet<number>
): { pressedNow: ReadonlySet<number>; edges: ReadonlySet<number> };
```

### `resolveDpadDirection`

Reads `buttons[DPAD_BUTTON_INDEX[dir]]?.pressed` for each of up/down/
left/right in that order; the first `true` wins (only one is expected
pressed at a time on real hardware; if a non-standard pad reports two,
this order is the documented, deterministic tiebreak — FR-018's best-
effort clause). A missing index (`buttons[idx]` is `undefined`, e.g. a
non-standard pad with fewer buttons) is treated as not-pressed, never
throws.

### `resolveStickDirection` — deadzone with hysteresis (FR-019, SC-004)

```
magnitude = Math.hypot(x, y)

magnitude < RELEASE_THRESHOLD        -> undefined              (released)
magnitude >= ENGAGE_THRESHOLD        -> resolveDominantAxis(x, y, previous)  (engaged)
otherwise (between the two)          -> previous                (hysteresis band — holds)
```

| magnitude | previous | result |
|---|---|---|
| `0.1` | `'up'` | `undefined` (below release, resets even if previously engaged) |
| `0.4` | `'up'` | `'up'` (in the hysteresis band — holds, does not oscillate) |
| `0.4` | `undefined` | `undefined` (in the band, but nothing to hold — never engages purely from the band) |
| `0.6` | `undefined` | `resolveDominantAxis` result — engages |
| `0.6` (exact diagonal) | `'up'` | `'up'` (tie broken toward previous, per `resolveDominantAxis`'s rule) |
| `0.6` (exact diagonal) | `undefined` | horizontal direction (tie's default) |

### `resolveDirection` (FR-021 — d-pad wins)

`dpad ?? stick`. If both report a direction, the d-pad's is used; the
stick is only consulted when the d-pad reports nothing.

### `mapOneShotButtons` (FR-023 — edge-triggered)

Given the set of tracked indices (`PAUSE_BUTTON_INDEX`,
`RESTART_BUTTON_INDEX`, `CYCLE_THEME_BUTTON_INDEX`, and
`FACE_BUTTON_GRAB_CONFIRM_INDEX` for its confirm reading — see below),
`edges` contains an index iff it is `.pressed` this poll and was **not**
in `previousPressed` — i.e., held across many polls fires once, on the
poll where it first became pressed, never again until released and
re-pressed.

## `gamepad/GamepadInput.ts`

```ts
export class GamepadInput {
  attach(target: Window = window): void;   // gamepadconnected/disconnected listeners only
  detach(target: Window = window): void;
  poll(): void;                            // called once per tick; no-op if unsupported

  consumeDirection(): Direction | undefined;
  consumeGrab(): boolean;      // held — bottom face button, level read
  consumeConfirm(): boolean;   // one-shot — same button, edge read (research.md)
  consumeRestart(): boolean;
  consumePause(): boolean;
  consumeCycleTheme(): boolean;
}
```

- `poll()` is a no-op (does not call `navigator.getGamepads()`, does not
  throw, does not log) when `typeof navigator.getGamepads !== 'function'`
  (FR-028).
- Every `consume*()` reads from the result `poll()` computed earlier in
  the same tick; `App.svelte` calls `poll()` exactly once per tick, before
  any `consume*()` call, only when gamepad support was detected at mount.
- **Cross-pad merge (FR-024):** direction is the first non-`undefined`
  direction found scanning connected pads in `Gamepad.index` order;
  `consumeGrab()`/every one-shot's edge set is OR'd across all connected
  pads. No pad's held input is ever cancelled by another's.
- **Connect (FR-025, US4 AC1):** a pad present in `navigator.getGamepads()`
  that has no entry yet in `padStates` gets one created on the very next
  `poll()` — no reload, no dependency on a `'gamepadconnected'` event
  firing first (some browsers report an already-connected-at-load pad
  without ever firing that event; `poll()`'s own scan is the source of
  truth, the event is only used to prune on disconnect).
- **Disconnect (FR-025, US4 AC2/AC3):** the `'gamepaddisconnected'`
  listener deletes that `Gamepad.index`'s `padStates` entry immediately.
  Because `navigator.getGamepads()` also stops listing a disconnected pad,
  the very next `poll()` naturally excludes it from the cross-pad merge —
  its held direction and grab are gone from that tick onward, with no
  code path that could touch `SessionState`, score, lives, cave index,
  the timer, or pause state (none of those are fields `GamepadInput` ever
  references).
- **Reconnect (US4 AC4):** a reused `Gamepad.index` after a disconnect
  starts with a fresh `padStates` entry (the old one was deleted), so
  `previousStickDirection`/`previousPressed` both start blank — no stale
  hysteresis anchor or edge-state carries across the gap.

## What is explicitly NOT part of this contract

- Any UI — FR-026 is explicit that the gamepad adds none; this module has
  no rendering surface at all, not even a "controller connected" toast.
- Which screen interprets `consumeGrab()` vs. `consumeConfirm()` as which
  named action — that split is `App.svelte`'s, following the exact
  pattern `keyboard.consumeGrab()`/`consumeStart()` already establish
  per-screen (research.md's dual-read decision explains why both methods
  exist; this contract only specifies their individual behavior).
