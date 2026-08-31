# Input Merge Contract: `src/lib/input/merge.ts` (new)

This is the one file that encodes FR-005 (direction precedence) and
FR-006 (one-shot/grab OR). Every other input-related module — keyboard,
touch, gamepad — is unaware that the other two exist.

```ts
export function resolveDirection(
  keyboard: Direction | undefined,
  touch: Direction | undefined,
  gamepad: Direction | undefined
): Direction | undefined;

export function orAll(...values: boolean[]): boolean;
```

## `resolveDirection` (FR-005)

| keyboard | touch | gamepad | result |
|---|---|---|---|
| `'left'` | `'right'` | `'up'` | `'left'` (keyboard wins) |
| `undefined` | `'right'` | `'up'` | `'right'` (touch wins over gamepad) |
| `undefined` | `undefined` | `'up'` | `'up'` (gamepad used, nothing above it) |
| `undefined` | `undefined` | `undefined` | `undefined` |

Implementation is exactly `keyboard ?? touch ?? gamepad`. The precedence
is fixed and documented (FR-005) — never dependent on which source's
listener happened to run first.

## `orAll` (FR-006)

`orAll(a, b, c)` returns `true` iff at least one argument is `true`; it
never distinguishes "fired by one source" from "fired by two sources on
the same tick" — both produce exactly one action, never two.

## The call-site rule this contract depends on (research.md)

`orAll`'s arguments MUST be fully evaluated **before** the call — every
source's `consume*()` method is a side-effecting read that clears its own
one-shot flag, so:

```ts
// CORRECT — every source's flag is cleared this tick regardless of
// which one(s) actually fired:
const restart = orAll(
  keyboard.consumeRestart(),
  touch.consumeRestart(),
  gamepad.consumeRestart()
);

// WRONG — if keyboard fires, `||`'s short-circuit means touch's and
// gamepad's pending flags are never cleared, leaking into next tick:
const restart = keyboard.consumeRestart() || touch.consumeRestart() || gamepad.consumeRestart();
```

Both lines *look* equivalent; only the first is correct. A test in
`tests/lib/input/merge.test.ts` pins this by asserting that calling
`orAll` with three pre-computed booleans never re-invokes anything (it
takes primitives, not functions), and a comment at every `App.svelte`
call site cross-references this contract.

## What is explicitly NOT part of this contract

- How each source computes its own `Direction | undefined` or `boolean` —
  that is [touch-api.md](./touch-api.md) and [gamepad-api.md](./gamepad-api.md).
- Which screen is active, or whether a given tick's merged result is ever
  used — `merge.ts` has no knowledge of `SessionState` or `Screen`.
- Gamepad's own cross-pad merge (multiple controllers merging into one
  gamepad-source result) — that happens *inside* `GamepadInput`, before
  its single `consumeDirection()`/etc. call reaches `merge.ts` at all
  (see [gamepad-api.md](./gamepad-api.md)).
