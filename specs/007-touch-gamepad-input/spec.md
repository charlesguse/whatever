# Feature Specification: Touch Controls And Gamepad Support

**Feature Branch**: `spec-draft/007-touch-gamepad-input`

**Created**: 2026-08-31

**Status**: Draft

**Input**: GitHub issue #7 — "Touch controls and gamepad support": keyboard is
and stays the reference control scheme; this adds the other two, each
feature-detected and hidden where the platform cannot do it. On a touch device,
an on-screen d-pad and buttons appear, sized for a real thumb rather than a
mouse pointer: a four-way pad, a grab button held with the other thumb, and
pause and restart. The layout must work in portrait and landscape, respect
safe-area insets on notched devices, and never let a stray touch scroll or zoom
the page mid-cave. On a desktop with no touch support the controls are simply
absent — not greyed out, not present-but-dead. When a controller is connected,
the Gamepad API drives the game: d-pad and left stick to move (with a sensible
deadzone and the same one-cell-per-step feel as the keyboard), a face button for
grab, and buttons for pause and restart. Connecting or disconnecting a
controller mid-game is handled without breaking the run. Where the Gamepad API
is unavailable, nothing appears and nothing breaks. The rule that governs both:
no input mode may be the only way to reach any feature — someone with only a
keyboard can start, play, pause, restart, switch themes, and finish all eight
caves; touch and gamepad are additions to that, never replacements for part of
it. Done when the game is fully playable with a thumb on a tablet and with a
controller on a desktop, the keyboard path is unchanged, both extra modes are
invisible where unsupported, and tests cover the input-mapping and deadzone
logic as pure functions — the actual devices are the maintainer's to eyeball,
and the spec says what to check.

This is the second half of Constitution Principle V, which has required touch
and gamepad since ratification and which features 001–006 have deliberately
deferred. Feature 006 built toward it on purpose: it made the theme cycle a
**named input action** (006 FR-033) precisely so this feature binds it rather
than reopening that code. The named-action set this feature extends already
exists — move, grab, pause, restart, start/confirm, cycle-theme — and the
keyboard is one implementation of it. Touch and gamepad become two more.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A whole cave with two thumbs (Priority: P1)

A player opens the game on a tablet. There is no keyboard and there never will
be. On-screen controls appear: a four-way pad under the left thumb, a grab
button under the right, and pause and restart within reach. They start the game
by tapping, walk the kid through dirt, push a boulder, hold grab to scoop a
diamond out from under one, pause to look at the board, restart the cave after
a bad death, and clear all eight caves to the end of the game. Their thumbs
never leave the glass. At no point does a stray touch scroll the page, zoom the
board, select text, or bounce the whole game up and down.

**Why this priority**: This is the half of the issue that unlocks a whole class
of device. A tablet player today cannot start the game at all, let alone finish
it. It also stands alone: shipping only touch is a complete, useful increment.

**Independent Test**: With no browser, drive the touch mapping as pure
functions — a pad geometry plus a touch coordinate resolves to exactly one
direction or none; a coordinate in the pad's center dead area resolves to none;
a coordinate outside the pad resolves to none; concurrent touch points on the
pad and the grab button both register; and the resulting per-tick action set is
identical to what the equivalent keyboard presses produce. Whether a real thumb
can reach the buttons is the maintainer's to eyeball (see Maintainer Review
Notes).

**Acceptance Scenarios**:

1. **Given** a touch device with a cave in play, **When** the player presses and
   holds the pad's left zone, **Then** the kid moves left one cell per tick, at
   the same cadence a held arrow key produces, until the touch is released.
2. **Given** a cave in play, **When** the player holds the grab button with one
   thumb and presses a pad direction with the other, **Then** both register on
   the same tick and the grab-move happens exactly as the keyboard's
   grab-modifier plus direction does.
3. **Given** a cave in play, **When** the player slides a thumb from the pad's
   left zone into its up zone without lifting, **Then** the reported direction
   changes to up with no gap and no spurious diagonal.
4. **Given** a cave in play, **When** the player slides a thumb off the pad
   entirely without lifting, **Then** no direction is reported and the kid
   stands still.
5. **Given** a cave in play, **When** the player taps pause, **Then** the game
   pauses exactly as the pause key does; **When** they tap it again, **Then**
   it resumes with no tick lost or repeated.
6. **Given** a cave in play, **When** the player taps restart, **Then** the
   cave restarts exactly as the restart key does.
7. **Given** the title, cave-intro, life-lost, cave-complete, game-over, or win
   screen on a touch device, **When** the player taps the playfield, **Then**
   the screen advances exactly as the start/confirm key does.
8. **Given** any screen on a touch device, **When** the player taps a theme in
   the theme control, **Then** the theme switches, so theme choice is reachable
   with a thumb alone.
9. **Given** a cave in play, **When** the player drags, flicks, double-taps,
   pinches, or long-presses anywhere on the page, **Then** the page does not
   scroll, zoom, bounce, select text, or show a callout menu, and the run is
   unaffected.
10. **Given** a notched or rounded-corner device in portrait **and** in
    landscape, **When** the controls are shown, **Then** every control is fully
    within the safe area and fully reachable, and the theme control and the HUD
    readout remain visible and tappable.

---

### User Story 2 - A whole cave with a controller (Priority: P2)

A player on a desktop plugs in a controller and plays with it: the d-pad or the
left stick moves the kid one cell per step, exactly the way a held key does — no
faster, no accelerating, no drifting when the stick is nudged. A face button is
grab. Start pauses; another button restarts the cave. Nothing on screen changes
when the controller is connected — no on-screen buttons appear on a desktop —
the controller simply works.

**Why this priority**: The second half of the issue, and independently
shippable, but it serves a player who already has a working input (the
keyboard), where US1 serves a player who has none.

**Independent Test**: With no browser, drive the gamepad mapping as pure
functions over synthetic gamepad snapshots — axis pairs resolve through the
deadzone to exactly one direction or none; a button index table resolves to
named actions; held buttons produce exactly one one-shot fire per press; a held
direction produces exactly one direction per tick. A real controller is the
maintainer's to eyeball.

**Acceptance Scenarios**:

1. **Given** a connected controller and a cave in play, **When** the player
   holds the d-pad left, **Then** the kid moves left one cell per tick, at the
   same cadence a held arrow key produces.
2. **Given** a connected controller, **When** the player pushes the left stick
   fully left, **Then** the kid moves left at that same one-cell-per-tick
   cadence, indistinguishable from the d-pad.
3. **Given** a connected controller, **When** the stick is at rest or nudged
   only slightly, **Then** no direction is reported and the kid does not drift.
4. **Given** a connected controller, **When** the player pushes the stick
   diagonally, **Then** exactly one direction is reported — the dominant axis —
   never two, matching the keyboard's one-direction-or-nothing contract.
5. **Given** a connected controller, **When** the player holds the grab face
   button and a direction, **Then** the grab-move happens exactly as the
   keyboard's grab modifier plus direction does.
6. **Given** a connected controller, **When** the player presses and holds the
   pause button, **Then** the game pauses once and does not toggle repeatedly
   while the button stays down.
7. **Given** a connected controller, **When** the player presses the restart
   button, **Then** the cave restarts exactly as the restart key does.
8. **Given** a connected controller on a non-playing screen, **When** the player
   presses the confirm button, **Then** the screen advances exactly as the
   start/confirm key does.
9. **Given** a connected controller, **When** the player presses the
   cycle-theme button, **Then** the theme cycles exactly as the cycle-theme key
   does, wrapping through every registered theme.
10. **Given** two controllers connected, **When** either one is used, **Then**
    it drives the game, and neither cancels or overrides the other's held
    inputs.

---

### User Story 3 - Absent where unsupported, unchanged where it already worked (Priority: P3)

A player on a plain desktop — no touchscreen, no controller, an older browser
with no Gamepad API — opens the game and sees exactly what they saw before this
feature: no d-pad, no grab button, no greyed-out affordances, no console errors.
Their keyboard does everything it did yesterday, with the same keys. A player
with only a keyboard can still start the game, play, pause, restart, switch
themes, and finish all eight caves.

**Why this priority**: This is the governing rule of the issue and of Principle
V, and the thing most likely to be quietly broken by the other two stories. It
is P3 only because it delivers no new capability — it protects an existing one.

**Independent Test**: With no browser, assert that the visibility decision is a
pure function of the reported platform capabilities: no touch capability yields
no touch controls in the rendered output, and an absent Gamepad API yields no
polling and no error. Separately, assert that the full keyboard binding table is
unchanged from feature 006 and that every named action is reachable from the
keyboard.

**Acceptance Scenarios**:

1. **Given** a platform reporting no touch capability, **When** the game loads,
   **Then** no on-screen control exists in the page at all — not hidden, not
   disabled, not present-but-dead.
2. **Given** a platform with no Gamepad API, **When** the game loads and is
   played to completion, **Then** nothing is polled, nothing is shown, and no
   error surfaces anywhere.
3. **Given** a keyboard-only player, **When** they play, **Then** every named
   action — move, grab, pause, restart, start/confirm, cycle theme — is
   reachable with the same keys as before this feature.
4. **Given** a keyboard-only player, **When** they play through, **Then** they
   can start the game, clear all eight caves, and reach the win screen without
   ever needing a touch or gamepad affordance.
5. **Given** any platform, **When** touch or gamepad input arrives, **Then** it
   produces the same session and simulation effects as the equivalent keyboard
   input, with no action reachable from one mode alone.

---

### User Story 4 - The controller that arrives or vanishes mid-cave (Priority: P3)

A player is mid-cave on the keyboard and plugs in a controller; it starts
working immediately, with no reload and no lost tick. Later the battery dies
mid-fall. The run does not crash, the cave does not reload, the score and lives
are intact, and the kid does not keep walking into a wall forever because a
direction was held at the moment the controller vanished.

**Why this priority**: The issue calls it out explicitly, and it is the most
common way a naive gamepad integration breaks. Smaller than US2 and dependent
on it.

**Independent Test**: With no browser, feed a synthetic connect and disconnect
into the gamepad source between ticks and assert: after connect, the next tick
reads the new pad; after disconnect while a direction and grab were held, the
next tick reports no direction and no grab; and the session state (score,
lives, cave index, timer, tick count) is untouched by either event.

**Acceptance Scenarios**:

1. **Given** a cave in play with no controller, **When** one is connected,
   **Then** it drives the game from the next tick onward with no reload, no
   pause, and no lost or repeated tick.
2. **Given** a cave in play with a controller holding a direction and grab,
   **When** the controller disconnects, **Then** the held direction and grab are
   released immediately, the kid stops rather than continuing to move, and the
   run continues.
3. **Given** a cave in play, **When** a controller connects or disconnects,
   **Then** the score, lives, cave index, countdown timer, and simulation state
   are exactly what they would have been without the event.
4. **Given** a controller that disconnects and reconnects, **When** it comes
   back, **Then** it works again with no stale held input carried across the
   gap.

---

### Edge Cases

- **A touch-capable laptop or desktop** (touchscreen plus keyboard and mouse) —
  the visibility rule must resolve it one way and say so; see FR-027.
- **A stray touch during play** — drag, flick, pinch, double-tap, long-press,
  edge swipe, or two-finger scroll anywhere on the page: none of them scroll,
  zoom, bounce, select, or open a callout, and none of them reach the sim as a
  direction.
- **Rotating the device mid-cave** — the controls relay out for the new
  orientation, no tick is lost, held touches either continue against the new
  layout or are released cleanly (never stuck down), and the run continues.
- **The on-screen keyboard or a system gesture bar appearing** — controls stay
  inside the safe area and remain reachable; nothing is stranded under a system
  affordance.
- **A touch that begins on the pad and ends on the grab button** (or vice
  versa) — each touch point is tracked by its own identifier, so one thumb
  never steals or cancels the other's control.
- **More touch points than controls** (a palm on the glass) — extra points are
  ignored; they never produce a direction and never cancel an active one.
- **A touch held across a screen transition** (death, cave complete) — the held
  direction does not leak into the next cave's first tick.
- **A stick held exactly on the deadzone boundary** — hysteresis (FR-019)
  prevents flicker; the reported direction does not oscillate tick to tick.
- **A stick pushed exactly diagonally, both axes equal** — the tie is broken
  deterministically (FR-020), never randomly and never into two directions.
- **The d-pad and the stick pushed in opposite directions at once** — the d-pad
  wins (FR-021), stated rather than left to whichever is read first.
- **A button held across a pause, a death, or a cave transition** — a one-shot
  action fires once per physical press and does not re-fire on the new screen.
- **A controller reporting a non-standard button layout** — best-effort against
  the same indices (FR-018); it never throws, and its behavior is the
  maintainer's to eyeball.
- **A controller connected before the page loads** — detected on the first tick
  without requiring the player to press a button first, where the platform
  reports it.
- **Keyboard and gamepad both reporting a direction on the same tick** — a
  fixed precedence resolves it (FR-005); the sim still receives exactly one
  direction.
- **The Gamepad API present but returning an empty list forever** — no polling
  cost that matters, no UI, no error.
- **Touch controls and the theme control competing for the same corner** —
  neither may cover the other; both stay tappable (FR-015).

## Requirements *(mandatory)*

### The shared input model

- **FR-001**: The named action set is unchanged and remains the whole
  vocabulary: **move** (one direction or none), **grab** (held), **pause**,
  **restart**, **start/confirm**, and **cycle theme**. This feature adds no new
  action and removes none.
- **FR-002**: Touch and gamepad MUST be additional **sources** of those same
  named actions, feeding the existing per-tick consumption path. Neither may
  reach the simulation, the session, or the renderer by any route the keyboard
  does not already use.
- **FR-003**: Each source MUST be usable and testable without a browser: the
  mapping from raw device state (touch coordinates, gamepad axes and buttons)
  to named actions MUST be pure functions over plain values, separate from the
  event-listener and polling plumbing that feeds them.
- **FR-004**: Every source MUST honor the existing per-tick contract: at most
  **one direction or none** per tick, grab as a held boolean read per tick, and
  one-shot actions reported exactly once per physical press regardless of how
  long the press lasts or how many frames it spans.
- **FR-005**: When more than one source reports a **direction** on the same
  tick, a fixed, documented precedence resolves it — **keyboard, then touch,
  then gamepad** — with a lower-precedence source used whenever the ones above
  it report nothing. The sim never receives two directions.
- **FR-006**: **Grab** and every one-shot action MUST be the logical OR across
  sources: grab is held if any source holds it, and a one-shot fires this tick
  if any source fired it. A one-shot fired by two sources on the same tick fires
  once.
- **FR-007**: Held input from any source MUST advance the kid at the sim's tick
  cadence and no other — never the device's polling rate, event rate, or OS
  repeat rate. One held direction is one cell per tick, identical across all
  three sources.

### Touch

- **FR-008**: On a touch platform, the game MUST show an on-screen **four-way
  d-pad**, a **grab** button, a **pause** button, and a **restart** button while
  a cave is playing or paused.
- **FR-009**: Controls MUST be sized and placed for a thumb, not a pointer: each
  d-pad direction zone and the grab button present a touch target of at least
  **64 CSS pixels** in both dimensions, and pause and restart at least **44**.
  The pad sits under one thumb and grab under the other, both within reach of a
  hand holding the device, in **portrait and in landscape**.
- **FR-010**: Touch behavior within the pad MUST be:
  - the reported direction is the zone the touch point is **currently** over, so
    sliding between zones re-targets with no gap and no diagonal;
  - a central **dead area** reports no direction, so a thumb resting mid-pad
    does not pick one at random;
  - a touch that moves outside the pad reports no direction while it stays
    outside, and re-acquires if it returns;
  - releasing the touch reports no direction from that tick onward.
- **FR-011**: Multiple touch points MUST be tracked independently by identity: a
  pad touch and a grab touch coexist, either can be released without disturbing
  the other, and touch points that land on no control are ignored entirely —
  they never produce or cancel an action.
- **FR-012**: While the game is running, the page MUST NOT scroll, zoom
  (pinch or double-tap), rubber-band, select text, or open a long-press callout
  in response to any touch — on the controls, on the playfield, or anywhere
  else on the page. The theme control's own taps MUST continue to work.
- **FR-013**: The layout MUST respect device **safe-area insets** on all four
  edges in both orientations, so no control is under a notch, a rounded corner,
  or a home indicator, and none is clipped off-screen.
- **FR-014**: On a non-playing screen (title, cave intro, life lost, cave
  complete, game over, win), a tap on the playfield MUST act as
  **start/confirm**, so a player with no keyboard can start a game and advance
  every screen.
- **FR-015**: The touch controls MUST NOT cover, overlap, or intercept taps
  destined for the theme control or the HUD readout, in either orientation.
- **FR-016**: A touch platform MUST be able to reach every feature the keyboard
  reaches: start, move, grab, pause, restart, switch themes, and play all eight
  caves to the win screen.

### Gamepad

- **FR-017**: When the platform exposes the Gamepad API and a controller is
  connected, that controller MUST drive the named actions. The game polls the
  controller's current state once per tick, so its cadence is the sim's.
- **FR-018**: The button-to-action binding MUST be **data** — a table keyed by
  standard-layout index — not comparisons scattered through the input code, so
  changing a binding is an edit to that table. The shipped defaults: **d-pad**
  buttons and the **left stick** move; the **bottom face button** is grab while
  playing and confirm elsewhere; **Start** is pause; **Back/Select** is restart;
  a **shoulder button** cycles the theme. A controller reporting a non-standard
  mapping is driven best-effort through the same table and MUST NOT throw.
- **FR-019**: Stick handling MUST apply a **deadzone with hysteresis**: a
  direction engages only once the stick's magnitude passes an engage threshold
  and releases only once it falls below a lower release threshold, so a stick
  resting on the boundary does not oscillate. Defaults: engage at **0.5**,
  release at **0.35**, of full deflection.
- **FR-020**: A deflected stick MUST resolve to **exactly one** direction — the
  axis with the larger magnitude. An exact tie resolves deterministically: the
  direction already being reported wins if it is one of the tied pair, otherwise
  the horizontal one. Never two directions, never none while deflected past the
  threshold.
- **FR-021**: When the d-pad and the stick disagree on the same tick, the
  **d-pad wins**.
- **FR-022**: A held gamepad direction MUST produce exactly one direction per
  tick — the same one-cell-per-step feel as a held key, with no acceleration,
  no analog speed, and no dependence on polling frequency.
- **FR-023**: A one-shot gamepad action MUST be **edge-triggered**: one fire per
  press, no repeat while held, and no fire carried across a screen transition or
  a disconnect.
- **FR-024**: All connected controllers MUST be merged: any one of them can
  drive the game, and none cancels another's held input.
- **FR-025**: Connect and disconnect MUST be handled mid-run without breaking
  it: a controller connected at any moment (including before load) works from
  the next tick with no reload and no lost tick; a controller that disconnects
  has all of its held inputs released immediately, so nothing stays stuck down.
  Neither event alters the score, lives, cave index, timer, pause state, or
  simulation state. [NEEDS CLARIFICATION: on disconnect mid-cave, should the
  game also auto-pause so a dead battery does not cost the run, or keep running
  with inputs released (the provisional pick, since the keyboard is always
  available to take over)?]
- **FR-026**: The gamepad adds **no UI**. No on-screen affordance appears when a
  controller is connected, and nothing appears when one is not.

### Feature detection and absence

- **FR-027**: Touch controls MUST be **absent** — not present-and-hidden, not
  disabled, not greyed out — on a platform that reports no touch capability.
  [NEEDS CLARIFICATION: on a device that reports **both** touch and a keyboard/
  mouse (a touchscreen laptop, a tablet with a keyboard case), should the
  controls always show whenever touch capability is reported (the provisional
  pick — simple, purely capability-driven, at the cost of on-screen buttons a
  laptop player does not want), or appear on the first touch and disappear on
  the next key or mouse input (adaptive, better on hybrids, but a second
  visibility state to specify and test)?]
- **FR-028**: Where the Gamepad API is unavailable, the game MUST NOT poll,
  MUST NOT log, and MUST NOT error. Feature detection is a capability check, not
  a caught exception.
- **FR-029**: Feature detection MUST NOT sniff user agents, device names, or
  screen sizes. Only reported capabilities decide.
- **FR-030**: The visibility decision MUST be expressible as a pure function of
  reported capabilities, so it is testable without a browser.

### Layout

- **FR-031**: The on-screen controls MUST work in portrait and landscape without
  a reload, relaying out on rotation with no tick lost and no touch stuck down.
  [NEEDS CLARIFICATION: may the controls sit as translucent overlays on top of
  the playfield (the provisional pick — simplest, keeps the cave view as large
  as possible, at the cost of a thumb occluding a corner of the cave), or must
  they occupy a reserved band that shrinks the drawn cave so nothing is ever
  covered?]
- **FR-032**: The playfield MUST remain legible with the controls shown in both
  orientations: the kid, the HUD readout, and the theme control are never
  obscured to the point of being unusable.

### Preserved behavior

- **FR-033**: This feature changes **no simulation rule** and MUST touch **zero
  files under `src/sim/`**. Every physics test from features 001–006 passes
  unchanged.
- **FR-034**: The keyboard binding table and every keyboard behavior MUST be
  unchanged: the same keys, the same held-versus-tap semantics, the same
  one-shot consumption, the same disjointness between the theme-cycle key and
  every gameplay key (006 SC-011).
- **FR-035**: **No feature may be reachable only by touch or only by gamepad.**
  Keyboard-only remains a complete path through the entire game, start to win
  screen.
- **FR-036**: The theme control stays operable by keyboard and pointer as
  feature 006 built it (006 FR-017, FR-034); this feature adds touch (tap) and
  gamepad (the cycle action) as further routes to the same choice, replacing
  neither.
- **FR-037**: Adding these sources MUST NOT drop the frame rate below the
  project's 30fps floor or allocate per tick in the hot path (Principle VI):
  polling and touch bookkeeping reuse their state rather than building arrays or
  objects each tick.
- **FR-038**: The shipped artifact remains a **single self-contained
  `index.html`** that runs from `file://` with no network request — including
  any viewport or gesture configuration this feature needs.

### Key Entities

- **Named action**: One of move, grab, pause, restart, start/confirm, cycle
  theme. The whole vocabulary between input and game. Unchanged by this feature.
- **Input source**: Something that reports named actions for the tick about to
  run — keyboard (exists), touch (new), gamepad (new). Sources know about
  devices; nothing downstream of them does.
- **Merged input**: The single per-tick action set the session consumes,
  combining all sources by FR-005's direction precedence and FR-006's OR.
- **Touch control layout**: Pure geometry — where the pad, its four zones, its
  dead area, and the buttons are, given a viewport size, orientation, and safe-
  area insets. Maps a touch coordinate to a control, or to nothing.
- **Gamepad binding table**: Plain data mapping standard-layout button indices
  and stick axes to named actions, plus the deadzone thresholds. Editable
  without touching input logic.
- **Platform capabilities**: What the environment reports — touch capability,
  Gamepad API availability. The sole input to the visibility decision (FR-029).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A player with only a touchscreen can start the game, clear all
  eight caves, switch themes, pause, and restart, reaching the win screen
  without a keyboard, mouse, or controller at any point.
- **SC-002**: A player with only a controller (plus a keyboard they never touch)
  can do the same, reaching the win screen without a keystroke.
- **SC-003**: A held direction moves the kid exactly one cell per tick from all
  three sources: for the same cave and the same number of ticks, keyboard,
  touch, and gamepad runs holding the same direction produce identical grids.
- **SC-004**: A stick at rest, or nudged below the engage threshold, produces no
  movement in 100% of samples; a stick held on the deadzone boundary produces no
  oscillation across any number of ticks.
- **SC-005**: A deflected stick resolves to exactly one direction in 100% of
  sampled axis pairs, including exact diagonals, with the tie broken the same
  way every time.
- **SC-006**: A held one-shot button (pause, restart, confirm, cycle theme)
  fires exactly once per press, verified across a press spanning many ticks.
- **SC-007**: On a platform reporting no touch capability, the rendered page
  contains no on-screen control element at all; on a platform with no Gamepad
  API, no polling occurs and no error is produced.
- **SC-008**: The keyboard path is unchanged: every keyboard test from features
  001–006 passes without modification, and the keyboard binding table is
  byte-identical apart from additions this feature does not make.
- **SC-009**: Connecting or disconnecting a controller mid-cave leaves the
  simulation state, score, lives, cave index, and timer identical to the same
  run without the event, in 100% of trials, and leaves no input stuck down.
- **SC-010**: No touch gesture — drag, flick, pinch, double-tap, long-press,
  edge swipe — scrolls, zooms, bounces, or selects anything on the page during
  play, in 100% of the gestures the maintainer tries.
- **SC-011**: Every control is fully inside the safe area and reachable in both
  portrait and landscape on a notched device, and rotation mid-cave loses no
  tick and leaves no touch stuck down.
- **SC-012**: Every named action is reachable from the keyboard alone, and no
  named action is reachable from touch or gamepad alone — checkable by comparing
  the three sources' declared action coverage, with the keyboard's required to
  be the full set.
- **SC-013**: The frame rate stays at or above 30fps with touch controls shown
  and a controller polled every tick, and the shipped artifact remains a single
  self-contained page that runs from `file://`.
- **SC-014**: Touch mapping, gamepad mapping, deadzone, tie-breaking,
  edge-triggering, source merging, and the visibility decision are all covered
  by browserless unit tests as pure functions.

## Assumptions

- **The named-action set from feature 006 is the integration point, and it does
  not grow.** Feature 006 made the theme cycle a named action explicitly so this
  feature would bind it rather than reopen that code (006 FR-033). Every action
  touch and gamepad drive already exists; this feature adds sources, not verbs.
  If a source cannot express an action, that is a defect in the source, not a
  reason for a new action.
- **Keyboard remains the reference and the tuning target.** Caves are tuned for
  it (Principle V), so touch and gamepad are specified as producing *identical*
  per-tick action sets rather than a comparable feel. That is what makes SC-003
  testable at all — a "feels the same" requirement is not testable without a
  browser and a human.
- **Direction precedence is keyboard > touch > gamepad** (FR-005). Any fixed
  order works; what matters is that it is fixed, documented, and testable rather
  than dependent on which listener happened to run first. Keyboard leads because
  it is the reference scheme; simultaneous conflicting input from two sources is
  pathological anyway and only needs a defined answer, not a clever one.
- **Grab and one-shots OR across sources** (FR-006) rather than following the
  direction precedence, because there is no conflict to resolve: a held grab
  from any thumb or any button means grab, and a press is a press.
- **The provisional picks behind the three open questions are implementable as
  written.** If none are answered, the spec still specifies a buildable feature:
  capability-driven visibility (FR-027), keep-running-with-inputs-released on
  disconnect (FR-025), and translucent overlay controls (FR-031). The questions
  are raised because each alternative is defensible and changes real work, not
  because the spec is blocked.
- **The default bindings are the maintainer's to retune at review.** FR-018 fixes
  that bindings are data and names sensible defaults; the exact face button or
  shoulder button is a taste call best made with a controller in hand, and
  changing it must not be a code change.
- **Deadzone thresholds (0.5 engage / 0.35 release) are starting values**, chosen
  to be conservative for a grid game where a spurious step is a death. They are
  tuning constants like the camera dead zone and the door-flash interval from
  earlier features, and the maintainer may adjust them at review; the
  *hysteresis* (engage above release) is the requirement, not the numbers.
- **A four-zone d-pad, not an analog thumbstick.** The sim takes one of four
  directions per tick, so an analog on-screen stick would add a magnitude the
  game cannot use. Zones also make FR-010's slide-to-re-target behavior trivially
  testable as geometry.
- **Touch controls are shown only while playing or paused** (FR-008), with tap-
  to-confirm covering the other screens (FR-014). Showing a d-pad on the title
  screen would imply it does something there.
- **Sound remains out of scope**, as in features 005 and 006 — no audio exists
  yet, so nothing here needs a per-source sound.
- **CI has no browser** (Principle VII), so every requirement here is written to
  be either a pure-function assertion or an explicit maintainer-eyeball item.
  Nothing in this spec asks CI to touch a real touchscreen, a real controller, a
  real canvas, or a real orientation change.
- **This feature adds no physics rule**, so it ships no new ASCII cave test. Its
  corresponding obligation is the inverse: proving the simulation is unaffected
  by which source produced an action (SC-003, SC-009).

## Out of Scope

- **Input remapping UI** — a screen where a player rebinds keys or buttons.
  FR-018 makes the binding table data, which is what makes such a UI cheap
  later; building it now is machinery for a want nobody has expressed.
- **Haptics, rumble, gyro, touchpad, or motion controls** of any kind.
- **An analog on-screen thumbstick**, swipe-to-move gestures, or tap-the-cell-
  to-walk-there pathfinding — the game takes one direction per tick, and
  anything else is a different control scheme, not this one.
- **A left-handed or player-configurable touch layout.** FR-009 fixes one
  reachable layout; mirroring it is a natural follow-up, not this feature.
- **Mouse or trackpad gameplay control.** The theme control is pointer-operable
  from feature 006; the kid is not, and this feature does not make it so.
- **Gamepad navigation of the theme list** beyond the cycle action (FR-018) —
  no focus ring, no stick-driven menu cursor.
- **Multi-player, or two controllers driving two kids.** FR-024 merges all pads
  into one player deliberately.
- **Any change to simulation behavior, cave layouts, quotas, time limits,
  scoring, the arcade shell's flow, or theme data.**
- **Fullscreen, screen-orientation locking, install prompts, or any
  progressive-web-app affordance.** They are adjacent and tempting; none is
  asked for, and each adds a platform surface that CI cannot check.
- **Browser-automation test infrastructure**, forbidden by Principle VII.

## Maintainer Review Notes

CI has no browser, no touchscreen, and no controller, so these are the things to
check by hand at review time, per Principle VII:

**On a real tablet or phone, in both orientations:**

- Play a full cave with two thumbs. Confirm the pad is where a thumb naturally
  falls and that grab is reachable with the other thumb without shifting grip.
- Slide a thumb between pad zones mid-cave and confirm the kid changes direction
  cleanly, with no stutter and no diagonal.
- Try hard to break the page: drag, flick, pinch, double-tap, long-press, swipe
  from the screen edge, two-finger scroll. Nothing should scroll, zoom, bounce,
  select text, or open a callout.
- Rotate the device mid-cave with a thumb down. Confirm no control is stranded
  under a notch or a home indicator, no touch is stuck down, and the run
  continues.
- Tap a theme in the theme control mid-cave and confirm it switches and that the
  touch controls neither cover it nor eat the tap.
- Confirm the whole game is finishable — title to win screen — without ever
  touching a keyboard.

**On a desktop with a controller:**

- Play a cave with the d-pad, then with the stick. Confirm both feel like the
  keyboard: one cell per step, no drift at rest, no acceleration.
- Push the stick to a shallow diagonal and confirm the kid takes exactly one
  direction and does not jitter between two.
- Hold pause; confirm it toggles once, not repeatedly.
- Unplug the controller mid-fall with a direction held. Confirm the kid stops,
  the run continues, and the keyboard immediately takes over. (Whether it should
  instead auto-pause is open question 2.)
- Plug in a second controller and confirm either one drives the game.
- Confirm no on-screen control ever appears on the desktop.

**On a plain desktop with neither:**

- Confirm the page looks exactly as it did before this feature, with no console
  error, and that the keyboard does everything it did in feature 006.
- Read the diff and confirm it touches no file under `src/sim/` (FR-033) and
  changes no keyboard binding (FR-034).
