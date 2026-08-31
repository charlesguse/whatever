# Quickstart: Touch Controls And Gamepad Support

How to validate this feature end-to-end once implemented. See
[data-model.md](./data-model.md) for entity shapes and
[contracts/input-merge-api.md](./contracts/input-merge-api.md),
[contracts/touch-api.md](./contracts/touch-api.md),
[contracts/gamepad-api.md](./contracts/gamepad-api.md), and
[contracts/visibility-api.md](./contracts/visibility-api.md) for the new
module surfaces. This extends features 001–006's quickstarts — their
checks (single-file build, sim physics, the arcade shell's screens/score/
lives/persistence, the theme registry and switcher) still apply
unchanged, and this feature adds no new check to any of them beyond
"still passes with zero modification" (FR-033, FR-034, SC-008).

## Prerequisites

- `npm install` at the repo root (unchanged from features 001–006)

## Validate the input model in isolation (no browser)

```bash
npm test
```

**Expected outcome**: builds first, then the full `vitest` suite passes
with no browser, canvas, touchscreen, or controller present, covering —
per the spec's Independent Tests (SC-014) — every case in the checklist
below.

**Touch mapping (User Story 1):**

- a pad geometry plus a touch coordinate resolves to exactly one
  direction or none — dead center, all four zones, and outside the outer
  radius all covered ([contracts/touch-api.md](./contracts/touch-api.md));
- sliding a touch between zones re-targets immediately with no gap and no
  diagonal result;
- a touch that leaves the pad and returns re-acquires a direction with no
  special-cased state;
- concurrent touch identifiers on the pad and the grab button both
  register, and releasing one does not disturb the other (FR-011);
- a touch landing on no control is ignored — it never produces or cancels
  a direction, even with several such touches active at once (the "palm
  on the glass" edge case);
- `reservedRect` and `caveRect` never intersect for every sampled inset
  box and orientation (SC-011a), and every control rect is fully inside
  the inset box in both orientations (SC-011);
- a tap on the playfield acts as start/confirm only when no touch control
  layout is active, matching the keyboard's start key's screen coverage
  (FR-014);
- the per-tick action set touch produces for a held direction is
  identical, tick for tick, to what the keyboard produces for the same
  held direction (SC-003's touch half).

**Gamepad mapping (User Story 2):**

- a stick at rest or nudged below the release threshold reports no
  direction in 100% of sampled magnitudes (SC-004);
- a stick held exactly on the deadzone boundary does not oscillate across
  any number of simulated ticks (SC-004, the hysteresis band holds
  `previous`);
- an exact diagonal deflection resolves to exactly one direction, broken
  the same documented way every time (SC-005);
- the d-pad and the stick disagreeing on the same tick resolves to the
  d-pad's direction (FR-021);
- a held gamepad direction produces exactly one direction per simulated
  tick regardless of polling frequency assumptions (FR-022);
- a one-shot action (pause, restart, confirm, cycle theme) held across
  many simulated polls fires exactly once (SC-006);
- a non-standard button-count `Gamepad` snapshot (missing indices) never
  throws from any mapping function (FR-018's best-effort clause);
- the per-tick action set gamepad produces for a held direction is
  identical, tick for tick, to what the keyboard produces for the same
  held direction (SC-003's gamepad half).

**Source merging and visibility (User Story 3):**

- `resolveDirection`'s full precedence table (keyboard, then touch, then
  gamepad; a lower-precedence source used only when every higher one
  reports nothing) (FR-005);
- `orAll` treats two sources firing the same one-shot on the same tick as
  a single fire, and — critically — every source's `consume*()` call site
  in the merge is confirmed to run unconditionally (no short-circuit) so
  no source's flag is ever left stuck pending (see
  [contracts/input-merge-api.md](./contracts/input-merge-api.md));
- `shouldShowTouchControls`'s full (capability, last-input-source) table
  (SC-011b): no touch capability yields `false` regardless of last input;
  touch capability with no input yet or with touch as the last input
  yields `true`; touch capability with a keydown/click as the last input
  yields `false`;
- `nextLastInputSource` only ever changes on `keydown`/`click`/
  `touchstart` — no fourth event type is accepted by its signature, which
  is what makes pointer-movement-never-changes-it a compile-time fact
  rather than a runtime filter;
- the full keyboard binding table (`KEY_TO_DIRECTION`, `GRAB_KEYS`,
  `RESTART_KEYS`, `START_KEYS`, `PAUSE_KEYS`, `CYCLE_THEME_KEYS`) is
  byte-identical to feature 006's, and every existing
  `tests/lib/input/keyboard.test.ts` case passes unmodified (FR-034,
  SC-008);
- every named action's declared coverage is compared across the three
  sources: keyboard declares all six, and no action is reachable from
  touch or gamepad alone without also being in keyboard's set (SC-012).

**Hotplug safety (User Story 4):**

- connecting a synthetic pad between two ticks: the next tick's poll
  reads it, with no field of `SessionState` (score, lives, cave index,
  timer, pause state, tick count) different from a run with no connect
  event at that point (US4 AC1, AC3);
- disconnecting a synthetic pad while a direction and grab are held: the
  very next tick reports no direction and no grab from that pad, the run
  is not paused, and no `SessionState` field differs from a no-event run
  (US4 AC2, AC3, FR-025);
- a reconnect under the same or a different `Gamepad.index` carries no
  stale held direction or pressed-edge state forward (US4 AC4);
- two simultaneously "connected" synthetic pads: either one's held input
  drives the merged result, and neither cancels the other's (FR-024).

**No sim regression (FR-033):**

- every existing sim test from features 001–006 (elements, grid,
  movement, falling, rolling, pushing, crushing, grab, enemies,
  detonation, explosions, amoeba, magic wall, expanding wall, the cave
  clock, quota-and-door, stack-resolution, terminal-and-restart,
  determinism, theme registry/switcher) passes unchanged;
- `git diff` (or the PR's file list) touches no file under `src/sim/`.

## Validate the build is still a single, dependency-free file

```bash
npm run build
```

**Expected outcome**: unchanged — `dist/index.html` is the only file play
depends on, now with conditionally-rendered touch controls and gamepad
polling included inline, no new runtime dependency, no new network
request.

## Validate on real devices (maintainer, per the spec's Maintainer Review Notes)

CI cannot exercise a real touchscreen, a real controller, or a real
notch — the full checklist for those is already written out in
`spec.md`'s **Maintainer Review Notes** section (tablet/phone in both
orientations, desktop with a controller, touchscreen laptop with both
touch and keyboard, plain desktop with neither). Run `npm run build` and
open `dist/index.html` from disk on each of those, and work through that
section directly rather than a duplicate checklist here; it already
enumerates exactly what to try and what "correct" looks like for each
case (gesture suppression, safe-area placement, feel parity across
sources, hotplug behavior, and the plain-desktop no-op check against
`src/sim/` and the keyboard binding table).
