# Keyboard Input Contract: `src/lib/input/keyboard.ts` Public Surface (extends feature 005)

Feature 005 established the named-action pattern this feature follows for
its one addition: a `Set<string>` of keys per action, a private
pending/held field, handling inside `onKeyDown`/`onKeyUp`, and a public
`consumeX()` method the shell calls exactly once per tick. This document
lists the full surface after this feature's one addition, `cycleTheme`
(FR-033).

## Existing actions (unchanged)

| Action | Keys | Model | Consume method |
|---|---|---|---|
| direction | Arrow keys, WASD | held-state array + one-shot tap | `consumeDirection(): Direction \| undefined` |
| grab | `Shift` | held boolean | `consumeGrab(): boolean` |
| restart | `r`/`R` | one-shot pending flag | `consumeRestart(): boolean` |
| start/confirm | `' '` (space), `Enter` | one-shot pending flag | `consumeStart(): boolean` |
| pause | `p`/`P` | one-shot pending flag | `consumePause(): boolean` |

## New action: `cycleTheme` (FR-033)

| Concept | Value |
|---|---|
| Keys | `{'t', 'T'}` (default — research.md's flagged decision; a one-line, maintainer-reassignable constant, not a call-site change) |
| Model | One-shot pending flag, identical shape to `restart`/`pause` — a held key reports once, cleared on consume, not re-armed until key-up/key-down again |
| Consume method | `consumeCycleTheme(): boolean` |
| `event.repeat` handling | Ignored, same as every other one-shot action — OS key-repeat never re-arms the pending flag |
| `event.preventDefault()` | Called, same as every other bound key, so the browser's default handling for that key (if any) never fires while the game has focus |

```ts
class KeyboardInput {
  // ...existing members unchanged...
  consumeCycleTheme(): boolean; // NEW
}
```

## Disjointness guarantee (SC-011, FR-020)

`CYCLE_THEME_KEYS` MUST share no member with `KEY_TO_DIRECTION`'s keys,
`GRAB_KEYS`, `RESTART_KEYS`, `START_KEYS`, or `PAUSE_KEYS`. This is
checkable structurally — by comparing the declared key sets directly, not
by exercising runtime behavior — and is exactly what SC-011 asks a test to
assert: "comparing the declared theme bindings against the declared
gameplay bindings, with an empty intersection required."

## Consumption order (FR-020, FR-035) — a contract on the caller, `App.svelte`

`consumeCycleTheme()` MUST be called **unconditionally, once per tick,
before any `session.screen`-conditional branch** — the same position
`consumeRestart()` already occupies in `stepTickInner()`. This placement
is what the caller relies on for two guarantees this module's methods
alone cannot provide:

- **FR-021** (the control is reachable from all eight named screens):
  calling it unconditionally means a press registers regardless of which
  screen is active.
- **FR-035** (inert on the title screen's start path): because
  `cycleTheme` is consumed *before* the `'title'` branch's
  `consumeStart()`/`consumeDirection()`/`consumeGrab()` checks, and
  `CYCLE_THEME_KEYS` is disjoint from those actions' key sets by the
  guarantee above, a `cycleTheme` press can never also be interpreted as
  a start/direction/grab press on the same keydown — there is nothing left
  for the title-screen branch to see from that keypress. No screen-name
  check inside `keyboard.ts` itself is needed or added; the guarantee is
  structural (disjoint key sets) plus ordering (consumed first), matching
  FR-020's requirement that the no-swallowed-input guarantee "holds
  structurally rather than by careful handling."

## What is explicitly NOT part of this contract

Which screen(s) the cycle actually changes the active theme on (all of
them — see [theme-registry-api.md](./theme-registry-api.md)'s selection
functions, called from `App.svelte`, not from this module); pointer/click
handling for the theme list (DOM event handlers in `App.svelte`'s markup,
entirely separate from `KeyboardInput`, per FR-034 — "additive," not a
second code path this class needs to know about).
