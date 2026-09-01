# Feature Specification: Synthesized Sound, Per Theme, Always Mutable

**Feature Branch**: `spec-draft/008-synthesized-sound`

**Created**: 2026-09-01

**Status**: Draft

**Input**: GitHub issue #8 — "Synthesized sound, per theme, always mutable":
the game is silent, and Boulder Dash was not — the falling-rock thud and the
diamond chime are half of what people remember. This adds synthesized sounds
for the things that matter: a step through dirt, a boulder starting to fall and
landing, a diamond collected, the exit opening, an explosion, the clock running
low, and the cave-complete bonus countdown; plus a mute control that is always
one press away and remembered across sessions. Every sound is synthesized in
code (oscillators and noise, no audio files) because the whole game ships as one
self-contained HTML file that runs from `file://`. The audio device is created
inside a user gesture, with the older vendor-prefixed fallback, so it works on
iOS Safari. Sound is per-theme data like every other appearance concern: the
Classroom theme's diamond chime and the Classic theme's need not be the same
sound, and adding a theme must still touch no logic. Sound is never
load-bearing: the game is completely playable muted and stays playable where
audio is unavailable or blocked — failures are silent, never an error surface —
and nothing may allocate or block in the tick loop to make a sound. Done when
every event above has a distinct sound, mute works and persists, the game is
unchanged with audio unavailable, and tests cover the mute state machine and the
per-theme sound table completeness; the actual sounds are the maintainer's job
to listen to, and this spec says what to listen for.

This closes the last unbuilt line of the constitution's Product Constraints —
"**Sound** is synthesized in code only (WebAudio oscillators — no audio files,
per Principle I), always mutable, per-theme, and never load-bearing" — which
features 001–007 deliberately deferred. It builds on three things those
features already shipped: the sim's read-only accessors (feature 002's falling
flag, 005's collected/quota/door/status/remaining-time readouts), the theme
registry's "appearance is data keyed by element id" contract (006), and the
named-input-action set bound across keyboard, touch, and gamepad (007). Sound
becomes one more field family on a theme, and mute becomes one more named
action.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The cave has a voice (Priority: P1)

A player starts a cave and hears it. Their kid scuffs through dirt one cell at
a time. A boulder they undermine gives a short scrape as it lets go, then a
flat thud when it lands — and a five-boulder collapse sounds like a collapse,
not like one rock. Each diamond they scoop rings. When the quota is met the
exit announces itself so they know to run for it without watching the counter.
A firefly they misjudge goes off with a bang. With ten seconds left the clock
starts pressing them. When they make it out, the leftover time counts into
their score with a rising tally they can hear finish.

**Why this priority**: This is the feature. Everything else in this spec exists
to keep it safe, themeable, and switch-off-able. It also stands alone: shipping
only the event sounds, hard-wired to the default theme and always on, would
already be the thing the issue asks for.

**Independent Test**: With no browser and no audio device, drive the event
derivation as a pure function of two consecutive cave states (plus the session
screen) to an ordered set of event ids. ASCII-cave fixtures pin each event:
a boulder over a hole yields `fallStart` on the tick it lets go and `fallLand`
on the tick it comes to rest; a kid walking into dirt yields `dirtStep`; a kid
walking into a diamond yields `diamondCollected`; a quota-meeting collection
yields `doorOpen` exactly once; a firefly contact yields `explosion`. The
sounds themselves are the maintainer's to listen to — see "What the maintainer
listens for".

**Acceptance Scenarios**:

1. **Given** a cave in play, **When** the kid moves into a dirt cell, **Then**
   exactly one `dirtStep` event is produced for that tick.
2. **Given** a cave in play, **When** the kid moves into an already-empty cell,
   **Then** no `dirtStep` event is produced — walking on cleared ground is
   silent.
3. **Given** a boulder at rest with an empty cell beneath it, **When** the tick
   that starts its fall runs, **Then** exactly one `fallStart` event is
   produced, and no further `fallStart` is produced on subsequent ticks while
   it keeps falling.
4. **Given** a falling boulder, **When** the tick that brings it to rest runs,
   **Then** exactly one `fallLand` event is produced.
5. **Given** a falling diamond, **When** it starts falling and later lands,
   **Then** it produces the same `fallStart`/`fallLand` events a boulder does —
   the sound table may voice them differently, but the event set does not grow.
6. **Given** a tick in which five separate boulders land, **When** events are
   produced, **Then** exactly one `fallLand` event is produced for that tick —
   simultaneous occurrences of one event id coalesce into one sound, never
   five stacked copies.
7. **Given** a cave in play, **When** the collected count rises, **Then**
   exactly one `diamondCollected` event is produced for that tick.
8. **Given** a cave whose quota is not yet met, **When** a collection meets the
   quota and the exit opens, **Then** exactly one `doorOpen` event is produced,
   and no further `doorOpen` event is produced for the remainder of that
   attempt.
9. **Given** a cave in play, **When** one or more explosion cells appear on a
   tick, **Then** exactly one `explosion` event is produced for that tick,
   whatever the size of the blast.
10. **Given** a cave with a time limit, **When** the remaining time is at or
    below the low-time threshold, **Then** exactly one `timeLow` event is
    produced for each whole second that elapses, and none above the threshold.
11. **Given** a completed cave, **When** the bonus tally animates the remaining
    time into the score, **Then** `bonusTally` events are produced in step with
    the tally and stop when the tally reaches its final value or the player
    advances past the screen, whichever comes first.
12. **Given** any non-playing screen (title, cave intro, paused, life lost,
    game over, won), **When** ticks elapse, **Then** no gameplay events are
    produced — the only event any non-playing screen produces is `bonusTally`
    on the cave-complete screen.
13. **Given** a cave and a recorded input sequence, **When** it is replayed,
    **Then** the produced event sequence is identical every time — sound
    derivation adds no randomness and reads no wall clock.

---

### User Story 2 - Mute that stays muted (Priority: P2)

A player in a quiet room presses one key and the game goes silent
immediately — mid-thud, mid-chime, no fade-out tail, no "one more sound" that
was already scheduled. The control that did it is visible on screen and says
which state it is in, so a player who never reads a key list can find it with a
mouse or a thumb. They close the tab, come back tomorrow, and the game is still
muted. They unmute; the next boulder lands audibly. At no point does muting or
unmuting change anything about the game itself — same score, same clock, same
grid, same tick.

**Why this priority**: The issue makes mute a requirement of shipping sound at
all, and the constitution calls sound "always mutable". A sound feature without
it is not shippable. It is P2 only because it is meaningless before US1 exists.

**Independent Test**: With no browser and no audio device, drive the mute state
machine as a pure function — toggle from unmuted yields muted and vice versa,
N toggles land on the parity of N, and the resolved startup state is a function
of the stored value (present true, present false, absent, and malformed all
covered). Separately, assert the save record round-trips the mute flag and that
a throwing or absent store degrades to "unmuted this session, nothing
persisted".

**Acceptance Scenarios**:

1. **Given** the game with sound playing, **When** the player presses the mute
   key, **Then** all sound stops within one tick, including any voice already
   sounding, and the on-screen control shows the muted state.
2. **Given** a muted game, **When** any sound event occurs, **Then** nothing is
   audible and no audio work is queued for later release — unmuting plays only
   events that happen after it, never a backlog.
3. **Given** a muted game, **When** the player presses the mute key again,
   **Then** sound resumes for subsequent events.
4. **Given** a muted game, **When** the player closes and reopens the page,
   **Then** the game is still muted, with the on-screen control showing it
   before the first sound could have played.
5. **Given** a never-before-played browser profile, **When** the game loads,
   **Then** sound is on — unmuted is the default.
6. **Given** any screen — title, cave intro, playing, paused, life lost, cave
   complete, game over, won — **When** the player presses the mute key,
   **Then** mute toggles, and the press does not also start a game, advance a
   screen, move the kid, pause, restart, or switch themes.
7. **Given** a player using only a pointer or only a thumb, **When** they
   activate the on-screen mute control, **Then** mute toggles exactly as the
   key does, and the control reports its pressed state to assistive
   technology.
8. **Given** a connected controller, **When** the player presses the mute
   button binding, **Then** mute toggles exactly once per press, and holding it
   down does not toggle repeatedly.
9. **Given** a cave in play, **When** the player toggles mute any number of
   times, **Then** the cave state, score, remaining time, and tick count are
   byte-identical to a run where mute was never touched.
10. **Given** a browser with storage disabled or full, **When** the player
    toggles mute, **Then** it works for the session, nothing is persisted, and
    no warning or error reaches the player.

---

### User Story 3 - A theme you can hear (Priority: P3)

A player switches from Classroom to Classic mid-cave. The board changes, and so
does the game's voice: the chime becomes a brighter arcade blip, the dirt scuff
becomes a coarser step, the explosion becomes a harsher burst. Nothing pauses,
nothing restarts, and the next event is heard in the new theme. A contributor
adding a third theme writes one more data entry — a color table and a sound
table — and touches no simulation file, no rendering code, and no audio code.

**Why this priority**: Principle III with the word "sounds" already in it. It
is P3 because US1 is playable with one theme's table, but the feature is not
constitution-compliant until every theme carries its own.

**Independent Test**: With no browser, assert completeness over the registry:
for every registered theme and every event id in the closed event set, a voice
specification exists and is plain data (no functions, no theme-id branches) with
every field inside its declared range. Assert Classroom and Classic differ on
every event id — a theme that copies another wholesale defeats the point.
Assert that no file under `src/sim/` and no rendering or audio module mentions
a theme id.

**Acceptance Scenarios**:

1. **Given** the theme registry, **When** completeness is checked, **Then**
   every registered theme defines a voice for every event id, with no gaps and
   no shared fallback table.
2. **Given** a cave in play, **When** the player switches theme, **Then**
   subsequent events sound in the new theme without pausing, restarting, or
   perturbing the sim.
3. **Given** a voice already sounding, **When** the theme changes on that same
   tick, **Then** the in-flight voice finishes or is cut, but never glitches,
   errors, or leaks — the next event uses the new theme.
4. **Given** Classroom and Classic, **When** their tables are compared, **Then**
   each event id has an audibly different voice between them.
5. **Given** a hypothetical new theme added to the registry, **When** the build
   and suite run, **Then** the only changed files are the new theme's data and
   the registry entry — no sim file, no rendering file, no audio file.
6. **Given** every theme's table, **When** peak levels are compared, **Then**
   each voice's level falls within one declared range, so switching theme is
   not a volume jump.

---

### User Story 4 - Silence is never a failure (Priority: P4)

A player opens the game from a USB stick by double-clicking the file, on an
old browser with no audio support at all. The game plays exactly as it does
with sound: same caves, same speed, same screens, no console errors, no "audio
failed" banner, no dead-looking control. Another player on an iPhone opens it
in Safari; the first tap that starts the game is also what brings the audio to
life, and everything from that tap on is audible. A third player leaves the tab
in the background mid-cave and comes back to no backlog of queued noise.

**Why this priority**: "Never load-bearing" is a constitutional constraint, and
the failure modes here are invisible until they are not. It is last because it
is a property of the other three stories rather than a capability of its own.

**Independent Test**: With no browser, drive the audio-availability state
machine as a pure function over injected outcomes — no audio constructor at
all, a constructor that throws, a device that stays suspended, a resume that
rejects, and a healthy device. Every non-healthy outcome yields "silent, no
error surfaced, game unaffected", and the state machine never retries in a way
that could block a frame.

**Acceptance Scenarios**:

1. **Given** a browser with no audio support, **When** the game is played from
   the title screen to the end of cave eight, **Then** it behaves identically
   to a run with sound, and nothing is logged, thrown, or shown to the player.
2. **Given** a browser whose audio device fails to start or is blocked by
   policy, **When** events occur, **Then** each one is silently dropped and the
   frame rate is unaffected.
3. **Given** a page loaded but not yet interacted with, **When** no gesture has
   happened, **Then** no audio device has been created; **When** the first key
   press, click, or tap arrives, **Then** the device is created inside that
   gesture and later events are audible.
4. **Given** a browser that only offers the older vendor-prefixed audio
   constructor, **When** the first gesture arrives, **Then** it is used and the
   game is audible.
5. **Given** a cave in play with a large chain reaction, **When** many events
   occur across consecutive ticks, **Then** the frame rate stays within the
   constitution's bounds and no per-tick allocation is introduced by sound.
6. **Given** the tab is hidden mid-cave and later restored, **When** the player
   returns, **Then** no accumulated sounds fire at once and no error surfaces.
7. **Given** a build of the game, **When** `dist/index.html` is inspected,
   **Then** it remains a single self-contained file with no audio file, no
   external request, and no added runtime dependency.

---

### Edge Cases

- **A death and a chime on the same tick**: a diamond collected on the tick the
  kid is crushed produces both `diamondCollected` and `explosion`; both are
  heard, and neither suppresses the other.
- **Quota met by a butterfly blast**: when an explosion creates the diamonds
  and the collection that meets quota happens later, `doorOpen` still fires
  exactly once, on the tick the door opens — not on the tick the diamonds
  appear.
- **Restarting after the door opened**: a cave restart re-arms `doorOpen`, so
  the next attempt announces the exit again.
- **The last second**: a cave that runs out of time while `timeLow` is beeping
  produces no beep after the death; the explosion and the life-lost screen take
  over.
- **Pausing inside the low-time window**: no `timeLow` events accrue while
  paused, and none fire in a burst on resume.
- **Skipping the tally**: pressing to advance past the cave-complete screen
  stops `bonusTally` immediately rather than finishing the sequence.
- **A boulder that lands and immediately falls again** (its support is removed
  the next tick): `fallLand` then `fallStart` on consecutive ticks, both heard.
- **A boulder rolling off another boulder**: rolling is a fall for sound
  purposes — the tick it leaves rest produces `fallStart`.
- **Mute mashed rapidly**: N presses land on the parity of N with no crash, and
  the persisted value matches the final state.
- **Muted when audio never becomes available**: the stored mute state is still
  honored and still persists, so a player who mutes on one device is not
  surprised later.
- **Theme switched while muted**: no sound, no error; unmuting later uses the
  current theme.
- **A cave larger than the viewport**: see the open question below on events
  that happen off-camera.

## Requirements *(mandatory)*

### Functional Requirements

**The event set and how it is derived**

- **FR-001**: The system MUST define one closed set of sound event ids:
  `dirtStep`, `fallStart`, `fallLand`, `diamondCollected`, `doorOpen`,
  `explosion`, `timeLow`, and `bonusTally`. Adding an event id is a spec
  change, not an implementation detail.
- **FR-002**: The system MUST derive sound events by observing simulation state
  that is already exposed read-only across consecutive ticks. Deriving them
  MUST NOT change any existing physics rule, any existing cell state, or any
  existing test's expected grid.
- **FR-003**: Sound derivation MUST NOT introduce a Svelte, DOM, or audio
  import into any file under `src/sim/`.
- **FR-004**: `dirtStep` MUST be produced on a tick in which the player's move
  clears a dirt cell, and MUST NOT be produced for a move into an already-empty
  cell, a blocked move, or a push.
- **FR-005**: `fallStart` MUST be produced on a tick in which at least one
  boulder or diamond transitions from resting to falling, and `fallLand` on a
  tick in which at least one boulder or diamond transitions from falling to
  resting.
- **FR-006**: `diamondCollected` MUST be produced on a tick in which the
  collected count increases.
- **FR-007**: `doorOpen` MUST be produced on the tick the exit transitions from
  closed to open, at most once per cave attempt, and MUST be re-armed by a cave
  restart or a new cave.
- **FR-008**: `explosion` MUST be produced on a tick in which one or more
  explosion cells appear, regardless of blast size or cause.
- **FR-009**: `timeLow` MUST be produced once per whole second of remaining
  time at or below the low-time threshold while the cave is in play, and never
  in a cave without a time limit.
- **FR-010**: `bonusTally` MUST be produced in step with the cave-complete
  tally animation and MUST stop when the tally reaches its final value or the
  screen is advanced, whichever comes first.
- **FR-011**: At most one event of a given id MUST be produced per tick;
  simultaneous occurrences coalesce.
- **FR-012**: Events MUST be produced only while the cave is in play, except
  `bonusTally`, which is produced only on the cave-complete screen. No events
  are produced on the title, cave-intro, paused, life-lost, game-over, or won
  screens.
- **FR-013**: Event derivation MUST be deterministic: the same cave and input
  sequence MUST yield the same event sequence on every replay, with no
  randomness and no wall-clock reads.
- **FR-014**: Event derivation MUST be verifiable as a pure function in the
  existing node-only test environment, with no canvas, no audio device, and no
  DOM.

**Playback**

- **FR-015**: Every sound MUST be synthesized at runtime from oscillators and
  generated noise. The build MUST contain no audio file, and playback MUST make
  no network request, so `dist/index.html` stays a single self-contained file
  playable from `file://`.
- **FR-016**: The audio device MUST be created lazily, inside a user gesture
  (key press, click, or tap), never at module load or page load.
- **FR-017**: Device creation MUST fall back to the older vendor-prefixed
  constructor where the standard one is absent, so first-generation iOS Safari
  behavior is covered.
- **FR-018**: Every audio failure — no constructor, a throwing constructor, a
  device stuck suspended, a rejected resume, a scheduling error — MUST be
  swallowed. Nothing is shown to the player, nothing is thrown to callers, and
  the game continues unchanged.
- **FR-019**: Playback MUST NOT allocate or block inside the tick loop. Voices
  are scheduled outside the simulation step, and per-tick event derivation MUST
  NOT allocate per cell or build a new array per tick.
- **FR-020**: The system MUST cap the number of voices sounding at once and
  drop the excess rather than queue it, so a chain reaction cannot degrade the
  frame rate or clip into distortion.
- **FR-021**: Every voice MUST be short enough to be over before it can mask
  the next event of the same id at the game's tick rate.
- **FR-022**: Sound MUST NOT be the only signal for any game state. Everything
  a sound announces — the exit opening, low time, a death, a collection — stays
  visible on screen exactly as it is today.

**Mute**

- **FR-023**: The system MUST provide a single global mute state — on or off,
  no volume slider, no per-category mutes.
- **FR-024**: Mute MUST be reachable as a named input action from the keyboard,
  from the on-screen control (pointer and touch), and from a gamepad binding,
  matching how the theme cycle is reachable today. No input mode may be the
  only way to reach it.
- **FR-025**: The mute key MUST NOT collide with any existing binding — move,
  grab, pause, restart, start/confirm, or cycle-theme — and pressing it MUST
  NOT also trigger any of those actions.
- **FR-026**: A gamepad mute press MUST fire exactly once per press; holding
  the button MUST NOT toggle repeatedly.
- **FR-027**: The on-screen mute control MUST show its current state visually
  and report it to assistive technology, in the same manner as the existing
  theme picker's active state.
- **FR-028**: Muting MUST silence audio immediately, including any voice
  already sounding, within one tick.
- **FR-029**: While muted, events MUST be dropped, not buffered. Unmuting MUST
  play only events occurring after it.
- **FR-030**: Toggling mute MUST NOT alter the simulation, the session, the
  score, the clock, the tick count, or the active screen.
- **FR-031**: The mute state MUST persist to local storage in the existing save
  record and MUST be restored at startup before any sound could play.
- **FR-032**: A missing, unreadable, or malformed stored mute value MUST resolve
  to unmuted, the default for a first-time player.
- **FR-033**: Storage failures MUST be silent and non-fatal: mute still works
  for the session and nothing reaches the player.

**Themes**

- **FR-034**: Each theme MUST carry a sound table keyed by every event id in
  FR-001. Every registered theme MUST define every id — no gaps, no shared
  fallback table.
- **FR-035**: A sound table entry MUST be plain data (waveform kind, pitch or
  pitch sweep, duration, envelope, level, noise content), with no function
  values and no code, consistent with themes-are-data.
- **FR-036**: No file under `src/sim/`, no rendering module, and no audio module
  may branch on a theme id. A behavior a theme cannot express is a missing
  field in the sound contract, to be added as a field.
- **FR-037**: Adding a theme MUST touch only that theme's data and its registry
  entry — no simulation file, no rendering logic, no audio logic.
- **FR-038**: Switching theme mid-cave MUST change subsequent sounds
  immediately, without pausing, restarting, or perturbing the sim, and without
  glitching a voice already in flight.
- **FR-039**: Classroom and Classic MUST voice every event id differently from
  each other, while every voice's peak level stays within one declared range so
  switching theme is not a volume jump.
- **FR-040**: Sound table completeness and the level range MUST be covered by
  tests that run over every registered theme, so a future theme cannot ship
  half-voiced.

**Availability of the mute control**

- **FR-041**: The on-screen mute control's presence when audio is unavailable
  or blocked MUST follow one rule, stated here and tested:
  [NEEDS CLARIFICATION: is the mute control always present and functional —
  because whether audio will ever start is not knowable until a gesture and the
  stored preference matters anyway — or hidden entirely when the platform
  offers no audio at all, in the spirit of Principle V's "never a dead
  control"?]

**Scope of what is audible**

- **FR-042**: In a cave larger than the viewport, which events reach the player
  MUST follow one rule, stated here and tested:
  [NEEDS CLARIFICATION: are all events audible regardless of where they happen
  in the cave, or only events inside (or near) the visible viewport?]

### Key Entities

- **Sound Event**: one of the eight named occurrences in FR-001, derived per
  tick from observed simulation state. It has no payload beyond its id — no
  position, no magnitude, no count.
- **Voice Specification**: the plain-data description of how one event sounds
  in one theme — waveform kind, pitch or pitch sweep, duration, envelope,
  level, noise content. Ranges are declared so completeness and level tests can
  assert them.
- **Theme Sound Table**: a theme's complete map from every event id to a voice
  specification, sitting alongside the existing element appearance table.
- **Mute State**: one boolean, global, persisted in the existing save record
  next to the theme choice, resolved at startup, toggled by a named input
  action.
- **Audio Availability**: an internal state — not yet created, available,
  unavailable — that is never surfaced to the player and never gates gameplay.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All eight events in FR-001 are audible and distinguishable from
  one another in both shipped themes, confirmed by the maintainer against the
  listening checklist below.
- **SC-002**: 100% of registered themes define a voice for 100% of the event
  ids, enforced by a test that fails when a theme or an event id is added
  without the other.
- **SC-003**: With audio unavailable or blocked, a player can complete all
  eight caves with behavior indistinguishable from a run with sound, and zero
  errors, warnings, or banners reach them.
- **SC-004**: Mute is reachable in one press or one tap from every screen, takes
  effect within one tick, and survives a full page reload 100% of the time when
  storage is available.
- **SC-005**: Frame rate during a large chain reaction with sound on stays
  within the constitution's bounds (target 60fps, floor 30fps) on the
  maintainer's mid-range laptop, indistinguishable from the same run muted.
- **SC-006**: Every test that passed before this feature still passes
  unchanged, and `dist/` still holds exactly one self-contained `index.html`
  with no audio assets.
- **SC-007**: A contributor can add a fully voiced third theme by changing only
  that theme's data file and the registry entry — demonstrated by review of the
  file list, not by shipping a third theme.

## What the maintainer listens for

CI has no audio device, so the sounds themselves are verified by ear at review
time. In each shipped theme, with the game running from `dist/index.html`
opened via `file://`:

1. **Dirt step** — walk the kid through a run of dirt: one short scuff per
   cell, no ringing tail, not fatiguing over a long walk.
2. **Fall start / land** — undermine a single boulder: a distinct "let go"
   before the "thud", not one blurred sound. Then undermine a stack: the
   collapse reads as several rocks, not one, and does not turn into a buzz.
3. **Diamond collected** — the chime is the most pleasant sound in the game and
   is clearly audible over a simultaneous thud.
4. **Exit opening** — recognizable from across the room without looking at the
   counter, and heard exactly once.
5. **Explosion** — startling, brief, and not clipped or distorted; a butterfly
   chain does not stack into noise.
6. **Low time** — one press per second, rising tension, and it stops the instant
   the cave ends or is paused.
7. **Bonus tally** — steps in time with the on-screen number and lands on a
   resolved final note; skipping the screen cuts it cleanly.
8. **Mute** — press mid-thud: silence is instant, with no tail and no click.
   Reload the page: still muted. Unmute: the very next event is audible.
9. **Theme switch mid-cave** — the game's voice changes with its look, with no
   gap, no glitch, and no volume jump.
10. **iOS Safari** — the first tap that starts the game is also what makes it
    audible; nothing is silent-forever after that tap.
11. **Backgrounded tab** — switch away mid-cave for a while and return: no
    burst of stored-up sound.

## Assumptions

- **Low-time threshold**: the last 10 seconds of a cave's clock, one `timeLow`
  per whole second. Chosen as a familiar arcade default; a tuning value the
  maintainer may change after listening.
- **Mute key**: a key not currently bound (the letter `m`), following the
  single-letter convention of pause, restart, and cycle-theme.
- **Default state**: unmuted on a first-ever load, because the issue's premise
  is that the game is too silent.
- **Walking on cleared ground is silent**: only dirt-clearing steps sound, per
  the issue's "a step through dirt". Adding a footstep for every move would
  make continuous movement a drone.
- **Event set is exactly the issue's list**: enemy movement, amoeba growth,
  magic wall activity, pushing a boulder, theme switching, menu navigation, and
  screen transitions are deliberately silent in this feature. Each would be a
  later spec that adds an event id.
- **No music**: this feature ships event sounds only; there is no soundtrack,
  so a single mute covers everything.
- **Diamonds and boulders share the fall events**: they are voiced by the same
  two event ids, differing only if a theme's table makes them differ, which it
  cannot today — a deliberate simplification the maintainer can revisit.
- **Existing read-only accessors suffice**: the falling flag, collected count,
  door state, explosion cells, status, and remaining seconds are all already
  exposed, so no new simulation surface is expected — and none may be added
  that changes behavior.
- **The save record grows by one optional field**: the mute flag joins theme
  choice, high score, and furthest cave under the existing single storage key,
  and an older record without it reads as unmuted.
- **Gamepad mute binding**: mute takes a currently unbound button in the
  existing binding table; if no button is free, the keyboard and on-screen
  control still satisfy "no input mode is the only way", and the spec's
  requirement narrows to those two.
- **Nothing leaves the device**: this feature adds no network use of any kind.
