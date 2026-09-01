# Phase 1 Data Model: Touch Controls And Gamepad Support

Entities below extend feature 006's data model
([`specs/006-classic-theme-switcher/data-model.md`](../006-classic-theme-switcher/data-model.md)),
which itself extends features 001–005's. Sim entities (Element, Grid, Cave
Definition/State, the cave clock, Roll Surface, Push Resolution, Enemy
Step, Blast/Chain, Amoeba/Magic Wall/Expanding Wall, `Screen`,
`SessionState`, Score) and every theme entity are unchanged and not
repeated — this feature touches no file under `src/sim/` (FR-033), no
theme file, and adds no field to `SessionState` or `TickInput`. This
feature adds: two new input-source classes shaped like the existing
`KeyboardInput`, a merge layer, a visibility layer, a touch geometry
model, and a gamepad binding/mapping model.

## Named Action (unchanged — `spec.md` Key Entities)

move (one direction or none), grab (held), pause, restart, start/confirm,
cycle theme. Still the whole vocabulary (FR-001). Every source below
produces only these six.

## Input Source (documentation shape — not an enforced TypeScript
`interface`, per research.md's decision to leave `KeyboardInput` untouched)

| Method | Returns | Model | Implemented by |
|---|---|---|---|
| `consumeDirection()` | `Direction \| undefined` | one-direction-or-none per tick | keyboard, touch, gamepad |
| `consumeGrab()` | `boolean` | held, re-read every tick, no bookkeeping | keyboard, touch, gamepad |
| `consumeRestart()` | `boolean` | one-shot, cleared on read | keyboard, touch, gamepad |
| `consumeStart()` | `boolean` | one-shot, cleared on read | keyboard, touch |
| `consumeConfirm()` | `boolean` | one-shot, cleared on read | gamepad only (research.md's dual-read decision — touch and keyboard use `consumeStart()` for the same role) |
| `consumePause()` | `boolean` | one-shot, cleared on read | keyboard, touch, gamepad |
| `consumeCycleTheme()` | `boolean` | one-shot, cleared on read | keyboard, touch (a themed control tap, see below), gamepad |

Every method is called **exactly once per tick** by `App.svelte`,
regardless of which screen is active, for every source that declares it —
mirroring `KeyboardInput.consumeRestart()`'s and `consumeCycleTheme()`'s
existing unconditional-call placement, which is what keeps a one-shot
flag from leaking into a later tick or a later screen (FR-004).

Touch has no distinct "cycle theme" button (Assumptions: theme choice
stays reachable via a *tap on the theme picker*, not a new on-screen
control) — `consumeCycleTheme()` on the touch side is a thin method that
always returns `false`; the theme picker's own tap handler in
`App.svelte` calls `selectTheme(id)` directly, exactly as pointer clicks
already do since feature 006 (FR-036: touch adds a *route to the same
choice* — a tap on an existing list entry — not a new gesture the input-
merge layer needs to know about).

## Merged Input (`src/lib/input/merge.ts`)

| Function | Signature | Rule |
|---|---|---|
| `resolveDirection` | `(keyboard: Direction \| undefined, touch: Direction \| undefined, gamepad: Direction \| undefined) => Direction \| undefined` | `keyboard ?? touch ?? gamepad` (FR-005) |
| `orAll` | `(...values: boolean[]) => boolean` | `values.some(Boolean)` (FR-006) — callers MUST compute every argument before calling (research.md) |

`App.svelte`'s `stepTickInner()` builds the tick's `TickInput` as
`{ direction: resolveDirection(kbDir, touchDir, gpDir), grab: orAll(kbGrab,
touchGrab, gpGrab) }`, and resolves every one-shot the same way:
`orAll(keyboard.consumeRestart(), touch.consumeRestart(),
gamepad.consumeRestart())`, etc. This is the only file that encodes
FR-005/FR-006; no other file compares sources against each other.

## Last Input Source / Visibility (`src/lib/input/visibility.ts`)

| Concept | Type / Signature | Notes |
|---|---|---|
| `LastInputSource` | `'none' \| 'discrete' \| 'touch'` | `'none'` until the first key/click/touch (FR-027a's "initial state is visible" bullet) |
| `nextLastInputSource` | `(current: LastInputSource, eventType: 'keydown' \| 'click' \| 'touchstart') => LastInputSource` | pure reducer: `'touchstart' -> 'touch'`; `'keydown' \| 'click' -> 'discrete'`; nothing else is ever passed in — `mousemove`/`pointermove` are never wired to a call site, which is what makes "pointer movement never changes it" structural rather than a filtered-out case inside the function |
| `PlatformCapabilities` | `{ readonly hasTouch: boolean }` | read once at mount via `'ontouchstart' in window \|\| navigator.maxTouchPoints > 0` (FR-029 — a capability read, not a UA/device/screen-size sniff) |
| `shouldShowTouchControls` | `(capabilities: PlatformCapabilities, lastInputSource: LastInputSource) => boolean` | `capabilities.hasTouch && lastInputSource !== 'discrete'` (FR-030) |

`App.svelte` holds `lastInputSource` as plain `$state<LastInputSource>`
(mirroring `activeThemeId`'s existing plain-`$state` pattern from feature
006), advanced by three window-level listeners
(`keydown`/`click`/`touchstart`) that each call `nextLastInputSource` and
assign the result — no debounce, no delay, matching FR-027a's "both
transitions are instant" requirement structurally (an assignment has no
timer to add one).

The controls actually render only when three independent, separately
testable conditions all hold: `capabilities.hasTouch` (FR-027 — absent
entirely without touch capability, checked before anything else),
`shouldShowTouchControls(capabilities, lastInputSource)` (FR-027a), and
`session.screen === 'playing' || session.screen === 'paused'` (FR-008).

## Platform Capabilities, Gamepad side (no dedicated type — a local
`const gamepadSupported = typeof navigator.getGamepads === 'function'`
read once at mount)

Used only to decide whether `GamepadInput.poll()` is ever called from the
tick loop (FR-028 — no call, no listener side effect, no error when
absent). `'gamepadconnected'`/`'gamepaddisconnected'` listeners are cheap
to attach unconditionally (they are inert if the API can never fire them),
but `poll()` itself is gated on this flag so a platform without the API
incurs literally zero per-tick work beyond the one boolean check.

## Touch Control Layout (`src/lib/input/touch/layout.ts`)

| Type | Shape | Notes |
|---|---|---|
| `InsetBox` | `{ x, y, width, height }` (px, all `number`) | the safe-area-inset box, computed in `App.svelte` (research.md), never read from inside this module |
| `Orientation` | `'portrait' \| 'landscape'` | `computeOrientation(insetBox)`: `'portrait'` when `height >= width`, else `'landscape'` — a pure comparison, no `matchMedia`, no screen API |
| `Rect` | `{ x, y, width, height }` (px) | a plain axis-aligned rectangle, reused for every control, for `caveRect`, and for each entry of `reservedRects` |
| `PadZone` | `{ direction: Direction; rect: Rect }` | one of four, purely descriptive (hit-testing goes through `resolveTouchPoint`, not per-zone containment) |
| `TouchControlLayout` | `{ reservedRects: readonly Rect[]; caveRect: Rect; pad: { center: {x,y}; deadRadius: number; outerRadius: number; zones: readonly PadZone[] }; grabButton: Rect; pauseButton: Rect; restartButton: Rect }` | the full output of `computeTouchControlLayout(insetBox, orientation)` — `reservedRects` holds one rect in portrait (the bottom band) and two in landscape (the left and right margins) |
| `ControlHit` | `{ kind: 'pad'; direction: Direction \| undefined } \| { kind: 'grab' } \| { kind: 'pause' } \| { kind: 'restart' } \| { kind: 'none' }` | the output of `resolveTouchPoint(layout, x, y)` |

**Sizing invariants (FR-009, tuning values the maintainer may retune at
review, like the camera dead zone and door-flash interval from earlier
features):**

- Each pad zone and the grab button present a hit target of at least
  **64 CSS px** in both dimensions.
- Pause and restart present at least **44 CSS px** in both dimensions.
- Every entry of `reservedRects` and `caveRect` are computed together and
  never overlap (SC-011a) — in portrait, `reservedRects` holds one band
  along the bottom edge of `insetBox` and `caveRect` is everything above
  it; in landscape, `reservedRects` holds two margins (pad on the left,
  grab/pause/restart on the right) and `caveRect` is the vertical strip
  between them — both per-orientation shapes exist from the first version
  of this function, per FR-031's "defined per orientation from the start."
- Every rect (each `reservedRects` entry and `caveRect`) is fully inside
  `insetBox` in both orientations (SC-011); `computeTouchControlLayout`
  never produces a rect that extends beyond `insetBox`'s bounds, because
  every rect is derived from `insetBox`'s own `x`/`y`/`width`/`height`,
  never from the raw viewport (FR-031a).

**`resolveTouchPoint(layout, x, y)` resolution order:**

1. Point inside `grabButton` → `{ kind: 'grab' }`.
2. Point inside `pauseButton` → `{ kind: 'pause' }`.
3. Point inside `restartButton` → `{ kind: 'restart' }`.
4. Point within `pad.outerRadius` of `pad.center`:
   - within `pad.deadRadius` → `{ kind: 'pad', direction: undefined }`
     (FR-010's dead area).
   - otherwise → `{ kind: 'pad', direction: resolveDominantAxis(x -
     center.x, y - center.y) }` (FR-010's zone re-targeting, via the
     shared primitive from `touch/axis.ts`).
5. Otherwise → `{ kind: 'none' }` (FR-010's "outside the pad" and the
   "extra touch points" edge case both resolve here).

Buttons are checked before the pad so a button placed near the pad's
outer radius (if ever tuned that close) cannot be shadowed by the pad's
larger hit area.

## Touch Input State (`src/lib/input/touch/TouchInput.ts`)

| Field | Type | Notes |
|---|---|---|
| `assignments` | `Map<number, ControlHit>` keyed by `Touch.identifier` | fixed at `touchstart` for `'grab'`/`'pause'`/`'restart'`/`'none'`; re-resolved every `touchmove` only for entries whose `kind === 'pad'` (research.md) |
| `grabTouchId` | `number \| undefined` | the identifier currently assigned `'grab'`, if any — `consumeGrab()` returns `grabTouchId !== undefined` |
| `restartPending` / `pausePending` / `startPending` | `boolean` | set on the `touchstart` that resolves to that control (or, for `startPending`, on any `touchstart` at all — see below); one-shot, cleared on the matching `consume*()` call, mirroring `KeyboardInput` |
| `layout` | `TouchControlLayout \| undefined` | set by `App.svelte` whenever controls are shown (FR-008/FR-027a), `undefined` otherwise; `resolveTouchPoint` is only ever called against a real layout — a `touchstart` while `layout` is `undefined` always sets `startPending` (FR-014) and nothing else, since there is no control to hit-test against |

**Event handling summary:**

- `touchstart`: for each new `Touch`, if `layout` is set, call
  `resolveTouchPoint`; record the result in `assignments`, updating
  `grabTouchId`/`restartPending`/`pausePending` as appropriate. If
  `layout` is `undefined`, set `startPending = true` unconditionally
  (FR-014) and record nothing in `assignments` (there is nothing to
  release later).
- `touchmove`: for each changed `Touch` whose `assignments.get(id)?.kind
  === 'pad'`, re-run `resolveTouchPoint` and overwrite that entry — this
  is the only place a touch's assignment can change after `touchstart`.
- `touchend`/`touchcancel`: for each ended `Touch`, if its assignment was
  `'grab'` and its identifier equals `grabTouchId`, clear `grabTouchId`;
  delete the identifier from `assignments` unconditionally. A released
  pad touch simply stops contributing a direction (its entry is gone, so
  `consumeDirection()` no longer sees it).
- `consumeDirection()`: returns the `direction` of any assignment with
  `kind === 'pad'` and a defined `direction` (at most one is expected
  under normal single-pad-touch use; if more than one somehow exists, the
  first found wins — a palm-on-glass scenario already funnels extra
  points to `'none'` well before this point via `resolveTouchPoint`'s own
  outer-radius/button checks, so this ambiguity is not reachable through
  the pad's own geometry).
- Every `preventDefault()` call needed for FR-012 (no scroll/zoom/bounce/
  select/callout) happens in these same handlers plus a `gesturestart`/
  `contextmenu` listener at the document level — described fully in
  [contracts/touch-api.md](./contracts/touch-api.md), not repeated here
  since it is event-suppression plumbing, not a data shape.

## Gamepad Binding Table (`src/lib/input/gamepad/bindings.ts`)

| Constant | Value | FR |
|---|---|---|
| `DPAD_BUTTON_INDEX` | `{ up: 12, down: 13, left: 14, right: 15 }` | FR-018 |
| `FACE_BUTTON_GRAB_CONFIRM_INDEX` | `0` | FR-018 |
| `PAUSE_BUTTON_INDEX` | `9` (Start) | FR-018 |
| `RESTART_BUTTON_INDEX` | `8` (Back/Select) | FR-018 |
| `CYCLE_THEME_BUTTON_INDEX` | `5` (right shoulder/bumper) | FR-018, flagged in research.md |
| `STICK_X_AXIS_INDEX` / `STICK_Y_AXIS_INDEX` | `0` / `1` (left stick) | FR-018 |
| `STICK_ENGAGE_THRESHOLD` | `0.5` | FR-019 |
| `STICK_RELEASE_THRESHOLD` | `0.35` | FR-019 |

All are plain exported `const`s — reassigning one is a one-line edit, no
call-site change (FR-018's "changing a binding is an edit to that table"
requirement).

## Gamepad Mapping (`src/lib/input/gamepad/mapping.ts`, pure)

| Function | Signature | Rule |
|---|---|---|
| `resolveDpadDirection` | `(buttons: readonly GamepadButton[]) => Direction \| undefined` | first of up/down/left/right whose `DPAD_BUTTON_INDEX` entry is `.pressed`; `undefined` if none (never throws on a short `buttons` array — FR-018's best-effort clause, treated as "not pressed") |
| `resolveStickDirection` | `(x: number, y: number, previous: Direction \| undefined) => Direction \| undefined` | magnitude `= Math.hypot(x, y)`; below `STICK_RELEASE_THRESHOLD` → `undefined`; at/above `STICK_ENGAGE_THRESHOLD` → engages via `resolveDominantAxis(x, y, previous)`; **between** the two thresholds → holds `previous` (the hysteresis band, FR-019) |
| `resolveDirection` | `(dpad: Direction \| undefined, stick: Direction \| undefined) => Direction \| undefined` | `dpad ?? stick` (FR-021 — d-pad wins) |
| `mapOneShotButtons` | `(buttons: readonly GamepadButton[], previousPressed: ReadonlySet<number>) => { pressedNow: ReadonlySet<number>; edges: ReadonlySet<number> }` | for each tracked index, `edges` contains it iff `.pressed` now and not in `previousPressed` (FR-023's edge-trigger, applied identically to restart/pause/cycle-theme/confirm indices) |

`resolveStickDirection`'s hysteresis band is the reason `GamepadInput`
must carry the *previous* resolved stick direction forward per pad,
per tick — it is genuinely stateful, unlike every other mapping function
here, which is why it takes `previous` as an explicit argument rather
than reaching for module-level state (keeping it a pure function callable
in a test with three literal numbers and no class).

## Gamepad Input State (`src/lib/input/gamepad/GamepadInput.ts`)

| Field | Type | Notes |
|---|---|---|
| `padStates` | `Map<number, GamepadPadState>` keyed by `Gamepad.index` | reused across ticks (FR-037); entries created lazily on first sight of an index in `navigator.getGamepads()`, deleted on `'gamepaddisconnected'` (FR-025) |
| `GamepadPadState` | `{ previousStickDirection: Direction \| undefined; previousPressed: ReadonlySet<number> }` | exactly the two pieces of memory `mapping.ts` needs per pad |

**`poll()`** (called once per tick from `App.svelte`'s `stepTick()`, only
when `gamepadSupported`):

1. Read `navigator.getGamepads()`. Entries can be `null` (a browser-
   reserved slot with nothing connected) — skipped.
2. For each non-null `Gamepad`, look up or create its `GamepadPadState`,
   compute `resolveDpadDirection`/`resolveStickDirection`/`resolveDirection`
   and `mapOneShotButtons` for the tracked indices, and update
   `previousStickDirection`/`previousPressed` in place (no new object
   allocated for the `Map` entry itself — its fields are reassigned).
3. Merge **across pads** (FR-024): direction is the first non-`undefined`
   direction found across all connected pads in index order; every
   boolean/edge action is OR'd across pads the same way `merge.ts` OR's
   across sources — "any one of them can drive the game, and none
   cancels another's held input."
4. `consumeDirection()`/`consumeGrab()`/`consumeConfirm()`/
   `consumeRestart()`/`consumePause()`/`consumeCycleTheme()` all read from
   this tick's already-computed merged result — `poll()` runs once,
   before any `consume*()` call, exactly once per tick (FR-017).

**On `'gamepaddisconnected'`:** delete that `Gamepad.index`'s entry from
`padStates` immediately (not waiting for the next `poll()`), so a
disconnect's held direction/grab are gone from the very next tick's
`poll()` result — `navigator.getGamepads()` itself stops listing the
disconnected pad, so simply not finding its index in the next poll
already produces "no direction, no grab" for it; deleting the `Map` entry
additionally prevents its stale `previousStickDirection`/`previousPressed`
from ever being read again if the same index is reused by a later
reconnect (US4 AC4 — "no stale held input carried across the gap").

**Session-state isolation (FR-025, SC-009):** `GamepadInput` never reads
or writes `SessionState`, `score`, `lives`, `caveIndex`, the timer, or
pause state — it is a pure device-facing source exactly like
`KeyboardInput`, so a connect/disconnect event physically cannot mutate
any of them; the guarantee is structural (no reference exists) rather
than a discipline `GamepadInput`'s own code has to maintain correctly.
