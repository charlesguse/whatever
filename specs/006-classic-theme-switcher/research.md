# Phase 0 Research: Classic Theme And An In-Game Theme Switcher

The spec (`spec.md`) contains no literal `[NEEDS CLARIFICATION]` markers —
both clarifications raised on the issue (cave names, and where theme choice
persists) are already resolved in the spec's own body and Assumptions
section. This document records the implementation-pattern decisions needed
to turn those resolved rules into code over the existing feature-001–005
theme contract, registry, renderer, input, and storage modules, plus one
place where a concrete choice has to be made that the spec deliberately
leaves to implementation/review. It is flagged below and repeated in the
plan-stage issue comment as a decision made without further clarification.

## Decisions

### Decision: The registry stays a `Map<string, Theme>` internally; it gains `listThemes()` (enumeration) and `hasTheme()` (non-throwing check), and `registerTheme()` gains a duplicate-id guard

- **Rationale**: `Map` already preserves insertion order on iteration, so
  `listThemes(): readonly Theme[]` returning `[...themes.values()]` gives
  FR-005's "registration order MUST be stable" for free — no separate
  order-tracking array is needed. FR-004 asks for "a non-throwing way to
  ask whether a given id is registered" alongside the existing throwing
  `getTheme()`, which stays unchanged for callers that already know the id
  is valid (e.g. the renderer, once a stored/cycled id has already been
  resolved against the registry). FR-006 requires registering a duplicate
  id to be an error, not the `Map.set()` silent-overwrite the code does
  today — `registerTheme()` becomes `if (themes.has(theme.id)) throw ...`
  before the `set`, which also protects `src/lib/themes/index.ts` (the new
  registration entry point, see below) from a future copy-paste theme
  file that reuses an id by accident.
- **Alternatives considered**: Switching internal storage to an array of
  `{id, theme}` pairs (rejected — `Map` already gives O(1) `has`/`get` and
  order-preserving iteration; an array would need its own duplicate scan on
  every registration for no benefit); exposing the raw `Map` instead of an
  enumeration function (rejected — leaks a mutable reference and forces
  every caller, including the UI, to know `Map` iteration semantics, where
  a plain `readonly Theme[]` is what a rendered list actually wants).

### Decision: Theme registration moves out of `App.svelte`'s component script into a new `src/lib/themes/index.ts` module-load side effect; `App.svelte` imports it for that side effect instead of calling `registerTheme` itself

- **Rationale**: Today `registerTheme(classroomTheme)` runs inside
  `App.svelte`'s `<script>` block (`App.svelte:14`), which means the
  registry is only ever populated by loading the Svelte component — so
  FR-029's completeness check ("every registered theme," not just an
  individually-imported constant) cannot be written as a plain `vitest`
  test without a DOM, contradicting Principle VII. Moving both
  `registerTheme(classroomTheme)` and `registerTheme(classicTheme)` into
  one new file that a plain test can `import` (triggering the same module
  side effect Node's ESM loader runs for any import) makes
  `tests/lib/themes/registry-completeness.test.ts` a normal headless unit
  test: `import './themes'` (or the equivalent relative path), then call
  `listThemes()` and assert completeness — no Svelte, no DOM, no canvas.
  `App.svelte` keeps exactly one line of registration-related code (an
  import for its side effect) instead of two `registerTheme` calls, which
  also makes adding a third theme in the future a change to
  `themes/index.ts` only, matching SC-002's "adding a theme MUST touch
  zero files under `src/sim/`, zero changes to the theme control, zero
  changes to rendering logic" — now provably zero changes to `App.svelte`
  either.
- **Alternatives considered**: Keeping registration in `App.svelte` and
  giving the completeness test a way to import "just the theme objects" and
  run the check against a hand-built list instead of the real registry
  (rejected — this is precisely what FR-029 says not to do: "every
  **registered** theme," so the check must exercise the actual registry a
  new theme would be added to, not a parallel list a contributor could
  update inconsistently); registering themes as a side effect of importing
  `registry.ts` itself (rejected — couples the registry module, which
  should stay theme-agnostic machinery, to the specific set of shipped
  themes, and makes a registry unit test that constructs its own fixture
  themes impossible without first clearing real production state).

### Decision: Active theme selection lives in `App.svelte` as plain `$state`, not inside `SessionState` — a new pure module, `src/lib/themes/selection.ts`, holds the two behaviors that need to be testable without Svelte

- **Rationale**: The spec's Key Entities section is explicit: "Active theme
  selection... Lives in the shell, never in the simulation. Changing it is
  a pure re-render." `SessionState` (`src/lib/session/types.ts`) is the
  sim-adjacent record `tickSession` advances every playing tick; folding
  theme id into it would wire an unrelated concern through every session
  transition function for no benefit, when the renderer already reads the
  theme id through its own independent callback
  (`RenderLoopOptions.getThemeId`) once per frame, not once per tick. A
  bare `$state<string>` in `App.svelte`, read by that callback, is the
  most direct way to make "changing it is a pure re-render" literally true
  — no session transition, no `tick()` call, nothing for `tickSession` to
  even know about. What *does* need to be plain-TypeScript-testable per
  Principle VII, because both have real edge-case logic worth pinning with
  a unit test, are: (1) cycling to the next theme id in registration order,
  wrapping at the end (spec Edge Cases — "cycle input pressed past the
  last theme... wraps to the first"), and (2) resolving a stored theme id
  against the registry on load, falling back to Classroom for every
  invalid case (FR-025). Both are pure, total functions with no Svelte/DOM
  dependency, so they live in `src/lib/themes/selection.ts` and
  `App.svelte` calls them, exactly the way it already calls into
  `src/lib/session/session.ts` for session transitions.
- **Alternatives considered**: Adding `themeId` as a field on
  `SessionState` (rejected — the spec's own Key Entities section rules
  this out by name, and it would make every one of `tickSession`'s screen
  transitions a place that could theoretically touch theme state, when the
  guarantee this feature needs is the opposite: that nothing about a
  switch can touch session state at all); a Svelte store
  (`writable<string>`) instead of `$state` (rejected — no cross-component
  sharing need exists, since `App.svelte` is the only component in the
  project, per feature 005's plan; a store would add indirection with no
  behavioral benefit over a local rune).

### Decision: `writeSave`'s merge becomes per-field instead of one `Math.max`-shaped object literal; `themeId` is last-write-wins, `highScore`/`furthestCave` keep their existing grow-only behavior unchanged

- **Rationale**: FR-027 is explicit that theme choice "MUST be
  last-write-wins, unlike the high score and furthest cave, which only
  ever grow," and that "selecting a theme with a lower or earlier name
  must not be rejected by the record's merge behavior" — `Math.max` has no
  meaningful definition for a string id, so the existing
  `writeSave(record)` body (`const next = { highScore: Math.max(...),
  furthestCave: Math.max(...) }`) cannot be widened by adding a third
  `Math.max` call. The merge becomes: read `current` (as today), then for
  each field apply that field's own rule — `highScore`/`furthestCave` keep
  `Math.max(current.x, record.x)` verbatim (zero behavior change, so every
  existing `save.test.ts` case keeps passing unmodified per FR-031's
  no-regression bar applied by analogy to shell-owned persistence tests),
  and `themeId` becomes `record.themeId ?? current.themeId` — i.e. a call
  site that does not pass a `themeId` leaves the stored one untouched
  (needed because `saveOnTransition` in `App.svelte` already calls
  `writeSave` on score/cave-progress transitions that have nothing to do
  with a theme switch, and those calls must not accidentally clear or
  reset the stored theme), while a call site that does pass one (the
  theme-switch handler) always wins over whatever was stored, satisfying
  "last write wins" including the "lower or earlier name" case in the same
  sentence.
- **Alternatives considered**: A generic deep-merge helper parameterized by
  a per-field strategy (`'grow' | 'replace'`) (rejected — two grow-only
  numeric fields and one replace-only string field is not enough
  repetition to justify a small merge-strategy DSL; three explicit lines
  read at least as clearly and match this project's stated preference for
  avoiding premature abstraction); a second `localStorage` key just for
  `themeId` (rejected outright by FR-025 and the spec's own framing of the
  maintainer's directive to reuse the existing record).

### Decision: `cycleTheme` is a new one-shot `KeyboardInput` action, structurally identical to `restart`/`pause`, consumed in `App.svelte`'s `stepTickInner()` before any screen-specific branch — including before the `'title'` screen's start-game check

- **Rationale**: FR-033 requires the cycle to be "a named input action,
  declared and consumed the same way the existing restart and pause
  actions are, rather than a raw key comparison at the call site" — so
  `keyboard.ts` gains a `CYCLE_THEME_KEYS` set, a `cycleThemePending`
  boolean, handling in `onKeyDown` alongside `RESTART_KEYS`/`PAUSE_KEYS`,
  and a `consumeCycleTheme(): boolean`, exactly mirroring
  `consumeRestart()`. Placement matters for FR-035 and FR-021: today,
  `stepTickInner()` checks `keyboard.consumeRestart()` *before* branching
  on `session.screen`, with a comment noting restart's own screen gate
  makes an early, unconditional check always safe. `cycleTheme` follows
  the same shape — checked once, unconditionally, at the very top of
  `stepTickInner()`, before the `session.screen === 'title'` block that
  currently treats "the start key, a movement key, or grab" as
  game-starting input. Consuming `cycleTheme` first means a press of that
  key is *never seen* by the title-screen branch at all — it cannot be
  mistaken for a start/direction/grab key because it is a distinct key
  bound to none of those actions (SC-011's disjoint-bindings requirement),
  and consuming it unconditionally, on every screen, is exactly what makes
  it reachable from all eight screens FR-021 lists without adding a
  per-screen special case anywhere.
- **Alternatives considered**: Checking `cycleTheme` only inside the
  `'title'` branch and separately inside the `'playing'`/other branches
  (rejected — this is the "careful handling instead of a structural
  guarantee" shape FR-020 explicitly warns against; one unconditional
  check at the top, like restart's, is both simpler and the pattern this
  codebase already established); gating the key so it is swallowed while a
  gameplay key is also held (rejected outright by FR-020's last two
  sentences and Acceptance Scenario 7 — the cycle input must never
  suppress, delay, or consume a gameplay key, so it can only ever be
  "also handled," never "handled instead of").

### Decision (flagged — the one place the spec leaves a concrete choice to implementation/review): the default `cycleTheme` key binding is `T`/`t`

- **Rationale**: The spec's Assumptions section states outright: "The
  exact key is the maintainer's pick at review; the requirement is only
  that no gameplay action uses it." The existing bindings occupy arrow
  keys/WASD (direction), `Shift` (grab), `r`/`R` (restart), `' '`/`Enter`
  (start/confirm), and `p`/`P` (pause) — `T` (for "Theme") is unused,
  mnemonic, and sits nowhere near the movement cluster, reducing the
  chance of a mis-press during play. Because FR-033 makes this a named
  action consumed through one `consumeCycleTheme()` call, this binding is
  a one-line change in `keyboard.ts` regardless of what the maintainer
  ultimately prefers at review — no call site needs to change if it moves.
  **This is a decision made without further clarification**, made
  explicit here so it is not silently baked in as an assumption.
- **Alternatives considered**: `Tab` (rejected — browsers treat `Tab` as a
  focus-movement key by default, and the always-visible list is also
  pointer-focusable per FR-034, so binding the cycle action to the same
  key browsers use for DOM focus traversal risks fighting the browser's
  own default `keydown` handling for that key); a function key such as
  `F2` (rejected — not reliably available or comfortable on the touch/
  laptop-trackpad-adjacent keyboards the constitution's Performance
  target names, and a plain letter key is more discoverable in an
  in-game hint than a function key).

### Decision: The existing `Theme`/`ThemeEntry` contract (from feature 005) is sufficient for Classic; no new appearance field is added

- **Rationale**: FR-014 only requires a new field if Classic "cannot be
  made to look right" within `ThemeEntry`'s `fillColor`/`glyph`/`label`
  triple plus the existing `background`, `doorOpenEntry`,
  `magicWallActiveEntry`, and player-facing string fields. Every element
  the spec names for Classic — earth-brown dirt, grey boulders, white
  diamonds, a brick wall, a steel wall, Rockford, firefly, butterfly,
  amoeba, magic wall, expanding wall, exit, explosion, empty space — is
  expressible as a fill color, a drawn glyph, and a label, exactly like
  Classroom's fourteen entries already are; the open door and running
  magic wall likewise already have dedicated fields from feature 005, so
  Classic supplies values for them like every other field rather than
  needing new ones. The only genuinely new field the spec calls for is
  FR-003's display name — the picker label, distinct from `title` (the
  in-game name shown on the title screen) — which both `classic.ts` and
  `classroom.ts` must supply. Per the Assumptions section, "Pixel-level
  faithfulness to the commercial original is neither required nor wanted,"
  which is what keeps this within the existing code-drawn-shapes/glyphs/
  text vocabulary the renderer already has.
- **Alternatives considered**: A per-theme "border/outline" appearance
  field, in case a coin/gem-style diamond glyph needs an outline the
  existing single-fill-color model cannot express (considered, then
  rejected for this feature specifically — the existing glyph vocabulary
  already draws multi-part shapes like the boulder and Rockford in code
  from a single fill color plus glyph logic in the renderer, not from
  theme-declared sub-shapes, so a genuinely new field is not needed to hit
  "glittering white diamonds"; if the maintainer's review of the actual
  drawn result at implementation time disagrees, FR-014 is the documented
  escape hatch, applied to both themes, not a Classic-only special case).

## Outstanding Unknowns

None. Every Technical Context field in `plan.md` is resolved by the
constitution, the spec's own Assumptions section, or the decisions above.
The one flagged decision — the default `T`/`t` cycle-key binding — is
reported as a decision made without further clarification in the
plan-stage issue comment; the maintainer may reassign the key at review
with a one-line change per the contract in
[contracts/keyboard-api.md](./contracts/keyboard-api.md).
