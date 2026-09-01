# Phase 0 Research: Touch Controls And Gamepad Support

The spec (`spec.md`) contains no literal `[NEEDS CLARIFICATION]` markers —
the three open questions raised on issue #7 (adaptive visibility on
hybrids, keep-running-on-disconnect, a reserved area vs. an overlay) are
already resolved in the spec's own Assumptions section as ratified
decisions, not clarification requests. This document records the
implementation-pattern decisions needed to turn those resolved rules, plus
the rest of the spec's requirements, into code over the existing
feature-001–006 keyboard/session/render/theme modules — and one place
where this plan makes a concrete choice the spec deliberately leaves open.
That one is flagged below and repeated in the plan-stage issue comment as
a decision made without further clarification.

## Decisions

### Decision: Touch and gamepad are two more classes shaped exactly like `KeyboardInput` — same `consume*()` method names, same one-call-per-tick contract — combined by a new, separate merge layer rather than folding merge logic into any one source

- **Rationale**: FR-002 requires that touch and gamepad "feed the existing
  per-tick consumption path" and reach the sim/session/renderer by no
  route the keyboard doesn't already use. The cheapest way to guarantee
  that structurally is to give `TouchInput` and `GamepadInput` the same
  public surface `KeyboardInput` already has
  (`consumeDirection()`/`consumeGrab()`/`consumeRestart()`/
  `consumeStart()`/`consumePause()`/`consumeCycleTheme()`, plus gamepad's
  extra `consumeConfirm()` — see below), so `App.svelte`'s
  `stepTickInner()` calls all three sources' matching methods and passes
  the results through one small new pure module (`src/lib/input/merge.ts`)
  before building `TickInput` or checking a screen's start condition.
  Nothing about the sim, `TickInput`, or `tickSession()` changes shape.
- **Alternatives considered**: A shared `InputSource` TypeScript interface
  the three classes implement (considered, and adopted informally in
  `data-model.md`/`contracts/` as documentation, but not enforced with an
  actual `implements` clause) — the interface is useful for readers and
  for keeping the three classes' surfaces honest, but making it load-bearing
  TypeScript would force `KeyboardInput` (unchanged, FR-034) to be edited
  to declare it, which this plan avoids purely to keep the "zero change to
  keyboard.ts" guarantee textually obvious in the diff, not just
  behaviorally true. A single `InputManager` class owning all three
  sources internally (rejected — it would hide the merge rule's inputs and
  outputs behind more state than a plain function needs, and FR-003
  specifically wants the mapping "separate from the event-listener and
  polling plumbing that feeds them," which a single fat manager class
  blurs).

### Decision: `merge.ts` exposes two pure functions — `resolveDirection(keyboard, touch, gamepad)` for FR-005's precedence, and `orAll(...values: boolean[])` for FR-006's OR — and every call site computes all three sources' values *before* calling either, never inside a short-circuiting expression

- **Rationale**: Each source's one-shot `consume*()` method clears its own
  pending flag as a side effect of being called (this is `KeyboardInput`'s
  existing `consumeRestart()`/`consumePause()`/`consumeCycleTheme()` shape,
  unchanged). If a caller wrote `keyboard.consumeRestart() ||
  touch.consumeRestart() || gamepad.consumeRestart()`, JavaScript's `||`
  short-circuits: touch's and gamepad's pending flags would never be
  cleared once keyboard's fires, leaking a stale restart into a later
  tick. The fix is call-site discipline, not a smarter merge function:
  `orAll(keyboard.consumeRestart(), touch.consumeRestart(),
  gamepad.consumeRestart())` evaluates every argument (array/argument-list
  construction is not short-circuiting) before `orAll` ever looks at the
  three booleans. This is the one sharp edge in an otherwise simple merge
  and is called out explicitly here, in `contracts/input-merge-api.md`,
  and as a comment at every call site in `App.svelte`, so it cannot be
  "simplified" back into a short-circuiting form later without noticing
  why it was written this way.
- **Alternatives considered**: A merge function that takes the three
  source *objects* and calls their consume methods itself internally
  (rejected — it would need to know each source's exact method name per
  action, turning one generic three-argument OR into five different
  hardcoded call sequences, and would make `merge.ts` depend on the
  concrete `KeyboardInput`/`TouchInput`/`GamepadInput` classes instead of
  staying a function over plain booleans, which is what keeps it testable
  with three literal `true`/`false` values and no fakes at all).

### Decision: `resolveDominantAxis(dx, dy, tieBreakDirection?)` is one shared pure primitive, used both by the gamepad stick (FR-020's tie-break) and the touch pad's zone geometry (FR-010's no-diagonal-zone shape)

- **Rationale**: Both problems are the same shape once stated abstractly:
  given a 2D offset from a center point, pick exactly one of up/down/left/
  right, breaking an exact tie deterministically. FR-020 states the
  gamepad rule precisely — "the direction already being reported wins if
  it is one of the tied pair, otherwise the horizontal one" — and FR-010's
  pad-zone requirement ("sliding between zones re-targets with no gap and
  no diagonal") is satisfiable by the same axis-dominance rule with no
  previous-direction hysteresis needed (a touch pad has no "currently
  reported direction" concept independent of where the finger physically
  is, so the pad simply always passes `undefined` for the tie-break
  argument, which the function defines as "falls through to horizontal").
  One function, one test suite (`tests/lib/input/touch/axis.test.ts`)
  covering the tie-break rule once, used by two call sites
  (`gamepad/mapping.ts`'s `resolveStickDirection` and `touch/layout.ts`'s
  `resolveTouchPoint`) instead of two independently-written and
  independently-tested implementations of the same rule that could drift.
- **Alternatives considered**: Two separate implementations, one per
  consumer (rejected — the tie-break rule is genuinely identical math; two
  copies is the kind of duplication the project's "three similar lines is
  better than a premature abstraction" guidance does *not* protect,
  because this isn't three similar lines, it's the same rule with real
  edge-case subtlety that a future change to one copy could silently
  desync from the other); folding the tie-break into `gamepad/bindings.ts`
  only and having `touch/layout.ts` import from the gamepad folder
  (rejected — touch has no gamepad dependency conceptually, and a shared
  primitive belongs in a folder neither source owns, hence
  `touch/axis.ts` housing it with `gamepad/mapping.ts` importing it,
  documented here so the cross-folder import doesn't look accidental).

### Decision: The touch pad is a dead-center circle plus four angular zones (via `resolveDominantAxis`), with a separate outer radius beyond which a touch reports no direction; `TouchInput` fixes each touch identifier's assigned control at `touchstart` and only re-resolves direction for identifiers already assigned to the pad

- **Rationale**: FR-010 lists four behaviors: re-targeting on slide (dead
  zone, geometry above), a central dead area, "outside the pad reports no
  direction while it stays outside... re-acquires if it returns," and
  "releasing reports no direction from that tick onward." All four are
  satisfiable from one piece of per-touch state (which identifier is
  assigned to the pad) plus one pure recomputation per `touchmove`
  (`resolveTouchPoint` run again against the *current* coordinate, not a
  remembered zone) — a touch that leaves the outer radius simply resolves
  to "no direction" every time it's asked, and resolves to a real zone
  again the instant it re-enters, with no special-cased "was outside"
  flag needed. Buttons (grab/pause/restart), by contrast, are fixed at
  `touchstart` and never re-resolved on move — FR-011's edge case ("a
  touch that begins on the pad and ends on the grab button... each touch
  point is tracked by its own identifier, so one thumb never steals or
  cancels the other's control") reads as: once a physical finger has
  claimed a control, sliding it elsewhere does not hand that control to a
  different one — buttons are taps/holds, not drag targets, and only the
  pad (by its own explicit re-targeting requirement, FR-010) is a drag
  target. A touch assigned to "none" at `touchstart` (missed every
  control) stays "none" for its lifetime and is never reconsidered,
  which is exactly the "a palm on the glass" edge case's requirement that
  extra points "never produce a direction and never cancel an active one."
- **Alternatives considered**: Re-resolving *every* touch's assigned
  control on every `touchmove`, not just the pad's (rejected — this would
  let a slide from the pad onto the grab button silently reassign that
  finger to grab mid-drag, which is not asked for anywhere in the spec and
  would make a resting-thumb graze of the grab button's edge steal control
  from an active pad drag, the opposite of FR-011's "never steals"
  guarantee); giving the pad a remembered "last zone" that only updates
  when the new zone differs (rejected as unnecessary state — resolving
  fresh from the current coordinate on every move is already idempotent
  and correct, and remembering the previous zone would only be needed if
  the dead-area or tie-break logic needed hysteresis, which FR-010 does
  not ask for on the touch pad the way FR-019 asks for it on the gamepad
  stick).

### Decision: A single document-level `touchstart` listener drives FR-014's playfield tap-to-confirm, and it is only ever *consumed* by `App.svelte` on the non-playing screens where the touch control layout is not laid out — so no explicit "did this tap hit a control" check is needed in the listener itself

- **Rationale**: FR-008 already scopes the on-screen pad/grab/pause/
  restart controls to "while a cave is playing or paused." That means the
  moments `App.svelte` computes and hands `TouchInput` a real
  `TouchControlLayout` are exactly the 'playing'/'paused' screens, and
  every other screen (title, caveIntro, lifeLost, caveComplete, gameOver,
  won) has no layout at all. `TouchInput`'s tap-to-confirm bookkeeping
  (`consumeStart()`) sets its pending flag on *any* `touchstart`
  regardless of layout state, but `App.svelte` only ever calls
  `touchInput.consumeStart()` from the branches that already handle every
  other source's start/confirm (the `'title'` branch and the generic
  "every other screen" auto-advance branch) — the same two places
  `keyboard.consumeStart()` is read today. Because those are precisely
  the screens with no layout, there is no scenario where a tap that
  actually hit the pad or a button during play is later misread as a
  confirm tap: during play, `consumeStart()`'s pending flag is simply
  never read, and it does not accumulate across ticks in a way that could
  leak into a later screen, because `TouchInput` clears it unconditionally
  every tick regardless of whether `App.svelte` reads it (mirroring
  `KeyboardInput`'s existing pattern where an unread one-shot flag from a
  screen that never checked it is simply discarded, not carried forward —
  see `consumeRestart()`'s call in `stepTickInner()` running before every
  screen branch already, so nothing is ever "unread" for more than one
  tick in the existing code either). This keeps `TouchInput` from needing
  to know about `session.screen` at all, preserving FR-003's "sources
  know about devices; nothing downstream of them does," and keeping
  `session.screen` knowledge concentrated in `App.svelte` alone, matching
  the existing keyboard-consumption precedent exactly.
- **Alternatives considered**: Having the tap listener check the tap
  coordinate against the current control rects and only set the pending
  flag when it misses all of them (rejected as redundant machinery — it
  would require `TouchInput` to hold the current layout even on screens
  where none exists, and to reason about "is a layout currently active"
  in two places (the listener and `App.svelte`'s consumption site)
  instead of one; the layout's mere *absence* on non-playing screens
  already makes the miss-check trivially true, so encoding it twice buys
  nothing); gating the confirm listener on `session.screen` directly
  inside `TouchInput` (rejected outright by FR-003 — it would make a
  device-facing input source aware of session/screen state, which is
  exactly the layering violation the spec's Key Entities section warns
  against: "sources know about devices; nothing downstream of them does").

### Decision: The gamepad's bottom face button is read two ways from the same button index — `consumeGrab()` (a held boolean, exactly like `Shift`) and `consumeConfirm()` (an edge-triggered one-shot) — because FR-018 assigns it two different action semantics depending on which screen is active, and `GamepadInput` cannot know the screen

- **Rationale**: FR-018's shipped default is explicit: "the bottom face
  button is grab while playing and confirm elsewhere." `App.svelte`
  already resolves this exact kind of screen-dependent reinterpretation
  for keyboard today — on the `'title'` screen, a held grab key is one of
  three things that starts the game (`start || direction !== undefined ||
  grab`), while during `'playing'` the same `consumeGrab()` read feeds
  `TickInput.grab` instead. Reusing `consumeGrab()` (merged via `orAll`
  across all three sources) for the title-screen start-trigger and for
  in-play grab needs no new plumbing — it is already screen-conditional
  purely by which branch of `stepTickInner()` reads it. What keyboard's
  existing shape does *not* give is a one-shot "confirm" reachable from
  the non-title non-playing screens (caveIntro, lifeLost, caveComplete,
  gameOver, won), which today only check `keyboard.consumeStart()` (a
  distinct key, `Space`/`Enter`). Because FR-018 maps confirm-elsewhere to
  the *same physical button* as grab, not to a distinct button, that
  button's raw pressed-bit needs two independent readers: `consumeGrab()`
  returns the current pressed state (no bookkeeping needed, exactly like
  `KeyboardInput.consumeGrab()`), while `consumeConfirm()` runs the same
  edge-detection bookkeeping `consumeRestart()`/`consumePause()`/
  `consumeCycleTheme()` already need, against the same button index. Both
  reads coexist safely because one is a level read and the other is an
  edge read of the same underlying signal — reading a level never
  interferes with detecting its edges. This is reported below as a
  decision made without further clarification, since the spec states the
  *mapping* (FR-018) but leaves the "how does a stateless-per-screen
  source implement a screen-dependent action" question to this plan.
- **Alternatives considered**: Giving `GamepadInput` a `setScreen(screen)`
  method so it can decide internally whether the button means grab or
  confirm (rejected outright by the same FR-003 layering rule the tap-
  listener decision above cites — a source must not know about session/
  screen state); adding a distinct "confirm" binding to a different
  button index instead of dual-reading the face button (rejected — it
  contradicts FR-018's stated default mapping, which names one button for
  both roles, presumably because a real controller's face button is the
  natural "confirm" affordance and inventing a second dedicated button the
  spec does not ask for would be an unjustified binding-table addition).

### Decision (flagged — the one place this plan makes a call the spec leaves to review): the default shoulder button for `cycleTheme` is the right shoulder/bumper, standard-layout button index 5 (Xbox RB / PlayStation R1); the default restart is Back/Select (index 8); pause is Start (index 9); confirm/grab is the bottom face button (index 0); d-pad is indices 12–15; the left stick is axes 0/1

- **Rationale**: FR-018 requires the binding to be a data table keyed by
  "standard-layout index" and names the *roles* (d-pad + left stick move,
  bottom face button grab/confirm, Start pause, Back/Select restart, a
  shoulder button cycles theme) but explicitly leaves "the exact face
  button or shoulder button... a taste call best made with a controller
  in hand" to the maintainer at review (spec Assumptions section, mirrored
  from 006's identical treatment of the keyboard's `T` cycle-theme key).
  These indices are the W3C Gamepad API "standard" mapping's own published
  layout — button 0 is the bottom face button (A/Cross) on every standard-
  mapped pad regardless of brand, buttons 12–15 are the d-pad, 8/9 are
  Select/Start, and 4/5 are the shoulder bumpers (6/7 are the analog
  triggers, deliberately not used as digital buttons here) — so choosing
  them is choosing the *standard's own names* rather than inventing an
  arbitrary index, and because FR-018 makes this a data table
  (`gamepad/bindings.ts`), reassigning any one of them at review is a
  one-line edit with no call-site change, exactly like 006's `T` key.
- **Alternatives considered**: The left shoulder (index 4) for cycle-theme
  instead of the right (index 5) (rejected only as a coin-flip — nothing
  in the spec favors one shoulder over the other; right was picked for no
  reason stronger than "reachable by the index finger that is not
  typically resting on a trigger used elsewhere in this game," which is
  itself unused, so the choice carries no functional weight and is
  explicitly the maintainer's to revisit); binding cycle-theme to a face
  button instead of a shoulder (rejected — FR-018's default explicitly
  says "a shoulder button," reserving every face button for grab/confirm
  and leaving the other three face buttons unbound rather than
  overloading one of them with a second role the way the bottom face
  button already carries two).

### Decision: The reserved control area's rectangle and the cave's leftover rectangle come from one pure function of an inset box and an orientation (`computeTouchControlLayout`); `App.svelte` reads `env(safe-area-inset-*)` once at mount and again on `resize`/`orientationchange` via a hidden probe element's computed style, and feeds the result in as plain numbers — no CSS environment variable is read from inside the pure module

- **Rationale**: FR-031a requires the reserved band and the drawn cave to
  both originate from "the safe-area-inset box, not the raw viewport."
  `env()` is a CSS-only construct with no JavaScript equivalent, so the
  shell needs *some* DOM read to turn it into numbers — exactly the same
  shape the project already uses for `canvas.clientWidth`/`clientHeight`
  in `src/lib/render/canvas.ts` (a per-frame or per-resize DOM read
  feeding an otherwise-pure computation, `computeViewportCells`/
  `updateCamera`). The established pattern here is: one small,
  four-sided-padding probe `<div>` styled with `padding:
  env(safe-area-inset-top) env(safe-area-inset-right)
  env(safe-area-inset-bottom) env(safe-area-inset-left)`, read via
  `getComputedStyle` once at mount and again on `resize`/
  `orientationchange` (both of which already fire naturally on rotation,
  per the Edge Cases section's "no tick lost" requirement), producing a
  plain `{ x, y, width, height }` `InsetBox` that `computeOrientation`
  and `computeTouchControlLayout` consume with zero knowledge of CSS,
  `env()`, or the DOM — keeping every layout rule in `touch/layout.ts`
  testable with four hand-written numbers, no browser, no `matchMedia`,
  no real notch.
- **Alternatives considered**: Reading `env()` values inside the render
  loop every frame instead of on resize/orientation events only
  (rejected — safe-area insets change only on rotation or (rarely) a
  browser-chrome change, never within a still frame, so polling them
  every frame would be per-frame DOM work with no behavioral benefit,
  contradicting Principle VI's allocation/DOM-work discipline for hot
  paths); computing the layout inside `canvas.ts`'s existing
  `drawFrame()` instead of in `App.svelte` (rejected — `canvas.ts` draws
  the cave and only the cave; it has no reason to know where buttons are,
  and giving it that reason would blur the exact `src/sim`/shell-adjacent
  boundary the render loop currently respects by reading only
  `CaveState` accessors and theme data).

## Outstanding Unknowns

None. Every Technical Context field in `plan.md` is resolved by the
constitution, the spec's own Assumptions section, or the decisions above.
Two decisions are flagged as made without further clarification and
repeated in the plan-stage issue comment:

1. The gamepad's confirm/grab dual-read of the bottom face button
   (mapping rule stated by FR-018; the stateless-per-screen
   implementation split into a level read and an edge read is this
   plan's call).
2. The exact default shoulder/face/Start/Select button indices
   (FR-018 names the roles and requires a data table; the specific
   standard-layout indices are this plan's pick, one-line reassignable
   at review per [contracts/gamepad-api.md](./contracts/gamepad-api.md)).
