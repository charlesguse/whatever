# Feature Specification: Classic Theme And An In-Game Theme Switcher

**Feature Branch**: `spec-draft/006-classic-theme-switcher`

**Created**: 2026-08-31

**Status**: Draft

**Input**: GitHub issue #6 — "Classic theme and an in-game theme switcher": the
theme table has existed since issue #1 and only ever had one entry in it. This
feature proves the contract by adding a second theme and letting the player
switch. A theme control in the UI; switching flips the entire cave to a
different look **live, mid-cave**, without restarting, pausing, or perturbing
the simulation by a single tick — the erasers keep falling, they just look like
boulders now. The choice is remembered next time the game opens. A **Classic**
theme approximating the original (earth-brown dirt, grey boulders, glittering
white diamonds, brick and steel walls, and Rockford himself). The registry
becomes a real registry: a list the UI enumerates, not a hardcoded pair. Theme
choice persists to local storage and is restored on load, falling back to
Classroom if the stored value names a theme that no longer exists. The
acceptance test that matters: adding either theme must have touched **zero
files under `src/sim/`**, and if Classic needed a rendering change to look
right, the theme contract was missing a field — add the field and route both
themes through it, rather than branching on theme name.

Folded in from the maintainer's comment on the issue: cave names are currently
game content, not theme data, and that needs a deliberate decision here rather
than a discovery mid-implementation; and theme choice should join the existing
`recess-rocks:save` record from feature 005 rather than opening a second
storage key, following that module's existing silent-degradation pattern.

Constitution Principle III has required this since ratification — "the game
ships at least two themes and an in-game theme selector that switches live,
mid-cave, without restarting or perturbing the sim." Features 001–005 built the
contract and left it with one implementation, which means it has never actually
been tested. A contract with one implementation is a guess. This feature is the
test.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Playing in a second look (Priority: P1)

A player opens the game and sees a theme control listing the looks available to
them. They pick **Classic**. The whole game changes costume: the dirt goes
earth-brown, the erasers become grey boulders, the gold stars become glittering
white diamonds, the lockers become steel walls, the kid becomes Rockford, and
every word on screen — the title, the HUD labels, the "you died" line, the
cave-complete banner — changes with it. They play a cave through to the door.
Nothing about how anything *behaves* has changed: the same boulders fall the
same way at the same times.

**Why this priority**: This is the whole feature's payload and the only slice
that delivers value alone. Without a second complete theme there is nothing to
switch to, and the contract stays untested.

**Independent Test**: With no browser, assert that the registry enumerates two
themes; that the Classic theme supplies an entry for all fourteen element ids
plus the open-door and running-magic-wall appearances; that it supplies every
player-facing string the contract declares; and that selecting it changes what
the renderer is asked to draw for each element id while the simulation's tick
output for a fixture cave is byte-identical either way.

**Acceptance Scenarios**:

1. **Given** the game is open in the default Classroom theme, **When** the
   player selects Classic from the theme control, **Then** every element on
   screen, the background, and every player-facing string is drawn from the
   Classic theme.
2. **Given** the Classic theme is active, **When** the player selects Classroom,
   **Then** the game returns to the Classroom appearance in full, with no
   Classic string or color left anywhere on screen.
3. **Given** any theme is active, **When** the cave's diamond quota has not been
   met, **Then** the exit is drawn identically to that theme's steel wall, as it
   is in Classroom today.
4. **Given** any theme is active, **When** the magic wall is running or the door
   is open, **Then** those transient appearances come from that theme's own
   running-wall and open-door entries, visibly distinct from their inert
   counterparts.
5. **Given** the theme control, **When** the player views it, **Then** it lists
   every registered theme by a readable display name, in a stable order, with
   the active one indicated.

---

### User Story 2 - Switching mid-cave, live and lossless (Priority: P2)

A player is halfway through a cave with a boulder falling toward them and a
timer running down. They switch themes. The falling boulder keeps falling — it
just looks different now. No tick is skipped, repeated, or replayed. The clock
does not pause or jump. The score, diamond count, and lives are untouched. The
cave does not reload. If they were holding a movement key through the switch,
the kid keeps moving without a stutter.

**Why this priority**: This is what proves the separation of sim from
appearance is real rather than aspirational. A switch that needed a pause or a
reload would mean appearance and state are entangled, which is precisely the
defect the theme contract exists to prevent. It is P2 only because US1 must
exist before there is anything to switch between.

**Independent Test**: Drive a fixture cave for a fixed number of ticks in a
headless run, switching the active theme at a chosen tick, and assert the
resulting grid, tick count, timer value, score, diamond count, and lives are
identical to the same run with no switch at all.

**Acceptance Scenarios**:

1. **Given** a cave in play with boulders in motion, **When** the player
   switches themes, **Then** the simulation state after the switch is identical
   in every field to what it would have been without the switch.
2. **Given** a cave in play, **When** the player switches themes, **Then** the
   cave is not reloaded and the countdown timer, score, diamond count, and
   lives are unchanged.
3. **Given** the player is holding a movement key, **When** they switch themes,
   **Then** the held-input state survives and the kid continues moving in that
   direction.
4. **Given** the game is paused, on the title screen, on the cave-intro screen,
   on the life-lost screen, on the game-over screen, or on the win screen,
   **When** the player switches themes, **Then** the switch applies to that
   screen immediately and the screen's own state is unchanged.
5. **Given** the active theme, **When** the player selects that same theme
   again, **Then** nothing changes and no visible flicker or reload occurs.

---

### User Story 3 - The game remembers your look (Priority: P3)

A player picks Classic, closes the page, and comes back tomorrow. The game
opens in Classic, with their high score and furthest cave still recorded
alongside it. A player whose stored choice names a theme that is no longer
registered — because it was renamed or removed in a later version — opens the
game in Classroom, with no error, no warning, and their high score intact.

**Why this priority**: Persistence is what makes the choice feel like a
setting rather than a toy. It is the smallest slice and depends on US1
existing, so it is last, but the constitution names theme choice as persisted
and feature 005 already built the record it belongs in.

**Independent Test**: With a stubbed storage surface, write a record naming
each of: a registered theme, an unregistered theme, a non-string value, and
nothing at all; confirm the restored theme is the stored one in the first case
and Classroom in the other three, and that the high score and furthest cave
survive every case unchanged.

**Acceptance Scenarios**:

1. **Given** the player has selected Classic, **When** they reload the page,
   **Then** the game opens in Classic.
2. **Given** stored data naming a theme that is not registered, **When** the
   game loads, **Then** it opens in Classroom with no visible error, and the
   stored high score and furthest cave are still applied.
3. **Given** no stored data at all, **When** the game loads, **Then** it opens
   in Classroom.
4. **Given** storage that throws on read or write, or is unavailable entirely,
   **When** the player loads the game and switches themes, **Then** the game
   opens in Classroom, the switch still applies for this session, and nothing
   about the failure reaches the player.
5. **Given** a stored high score and furthest cave, **When** the player switches
   themes, **Then** the stored high score and furthest cave are preserved
   exactly, neither reset nor lowered.

---

### User Story 4 - A future theme cannot ship with holes (Priority: P3)

A contributor adds a third theme, or adds a new element to the game. If any
registered theme is missing an appearance for any element, or missing any
player-facing string the contract declares, the build fails with a message
naming the theme and the missing piece. They never discover it as a blank
square in the middle of a cave.

**Why this priority**: The issue asks for it explicitly, and it is what makes
"themes are data" survive contact with the third theme. It is P3 because it
protects future work rather than delivering play value now.

**Independent Test**: A check that iterates every registered theme against the
full list of element ids and required appearance entries and fails on any gap;
verified by asserting it fails for a deliberately incomplete fixture theme and
passes for both shipped themes.

**Acceptance Scenarios**:

1. **Given** the shipped themes, **When** the completeness check runs, **Then**
   it passes for every registered theme.
2. **Given** a theme missing an entry for one element id, **When** the check
   runs, **Then** it fails and names both the theme and the missing element id.
3. **Given** a new element id added to the game, **When** the check runs before
   any theme has been updated, **Then** it fails for every registered theme.

---

### Edge Cases

- **Stored theme id names a theme that no longer exists** — treated as absent:
  Classroom is used, and the record's other values are preserved rather than
  discarded (FR-025).
- **Stored theme value is not a string** (a number, an object, `null`) — same
  handling as unregistered: Classroom, silently.
- **Storage is absent, disabled, full, or throws** on read or write — the game
  opens in Classroom, switches still apply for the session, and no warning is
  ever shown (FR-026), matching feature 005's existing behavior.
- **Switching during a transient appearance** — mid-explosion, while the magic
  wall is running, while the door is flashing open — the new theme's own
  transient entries take over immediately; no transient is frozen in the old
  theme's colors.
- **Switching to the already-active theme** — a no-op, with no re-render
  artifact and no redundant write (FR-018).
- **Fewer than two themes registered** — the control is hidden rather than
  shown as a one-option dead control (FR-019, Principle V).
- **Rapid repeated switching within a single tick** — no tick is dropped,
  doubled, or re-run; the last selection wins.
- **A theme registered twice under the same id** — the registry rejects the
  duplicate rather than silently replacing the first, so a copy-paste mistake
  in a new theme is visible at build time.
- **A cave whose name is long** under any theme — the cave-intro line must
  remain readable; names are not truncated silently.

## Requirements *(mandatory)*

### The theme registry

- **FR-001**: The registry MUST expose its registered themes as an ordered,
  enumerable collection, so the UI can render one option per theme without
  knowing which themes exist. A hardcoded pair of options is a defect.
- **FR-002**: The shipped game MUST register exactly two themes: **Classroom**
  (the default) and **Classic**.
- **FR-003**: Each theme MUST carry a human-readable **display name** for the
  theme control, separate from its id and separate from the in-game title
  string. The control MUST show the display name, never the raw id.
- **FR-004**: The registry MUST offer a non-throwing way to ask whether a given
  id is registered, so a stored id can be validated without an error path.
  The existing throwing lookup remains for ids known to be valid.
- **FR-005**: Registration order MUST be stable and MUST determine the order
  the control lists themes in, so the option order does not shift between loads.
- **FR-006**: Registering two themes under the same id MUST be an error rather
  than a silent overwrite.

### The Classic theme

- **FR-007**: Classic MUST supply an appearance entry for every one of the
  fourteen element ids, approximating the original: earth-brown dirt, grey
  boulders, glittering white diamonds, a brick wall, a steel wall, and Rockford,
  plus firefly, butterfly, amoeba, magic wall, expanding wall, exit, explosion,
  and empty space.
- **FR-008**: Classic's **closed exit** MUST be visually identical to its steel
  wall — same fill, same glyph, same label — preserving the rule that the door
  is indistinguishable from a wall until the quota is met.
- **FR-009**: Classic MUST supply an open-door appearance and a running-magic-
  wall appearance, each visibly distinct from its inert counterpart and from
  every other entry in the theme.
- **FR-010**: Classic MUST supply every player-facing string the contract
  declares — game title, death and completion messages, the collected/quota
  readout, the cave intro, lives/time/score/high-score/furthest-cave HUD
  labels, paused, life-lost, game-over, win, and cave-complete — in wording
  appropriate to the classic setting, using the same placeholder tokens as
  Classroom so the shell substitutes them identically.
- **FR-011**: No theme's title string may use the commercial original's
  trademarked name. Classic is an homage in look and wording, not an
  appropriation of its title.

### The contract, and the acceptance test

- **FR-012**: Adding a theme MUST touch **zero files under `src/sim/`**.
- **FR-013**: No rendering or shell logic may branch on a theme id or compare
  against a theme name. Where such a comparison would be needed, the contract
  gains a field instead.
- **FR-014**: If Classic cannot be made to look right within the existing
  contract, the contract gains a new appearance field, **both** themes supply
  it, and the renderer consumes it generically for every theme. A field only
  one theme meaningfully uses is still a shared field with a value in both.
- **FR-015**: Every color, glyph, label, background, and player-facing string
  drawn or displayed MUST come from the active theme. No literal appearance
  value may remain in rendering or shell logic.
- **FR-016**: The pull request MUST state which files changed and why, so
  FR-012 through FR-015 are checkable at review rather than asserted.

### The theme control

- **FR-017**: A theme control MUST be present in the UI, listing every
  registered theme by display name with the active one indicated, and MUST be
  fully operable using the keyboard alone — no feature may be reachable only by
  pointer, touch, or gamepad.
- **FR-018**: Selecting the already-active theme MUST be a no-op: no re-render
  artifact, no storage write, no state change.
- **FR-019**: If fewer than two themes are registered, the control MUST be
  hidden rather than shown with a single option or shown disabled.
- **FR-020**: The theme control MUST be reachable while a cave is in play, and
  operating it MUST NOT swallow, delay, or drop any gameplay input. Provisional
  behavior for planning: the control is always visible in the shell chrome;
  during play it is operated by a dedicated key that no gameplay action uses,
  and it never takes keyboard focus away from the game while a cave is running.
  [NEEDS CLARIFICATION: how should the in-play theme control be operated so that
  it enumerates the registry without competing with gameplay keys — an
  always-visible enumerated list plus a dedicated cycle key during play (the
  provisional pick), a focusable list that suppresses gameplay keys only while
  focused and closes on Escape, or an enumerated list only on non-play screens
  with a cycle key during play?]
- **FR-021**: The control MUST be available on the title, cave-intro, in-play,
  paused, life-lost, game-over, and win screens.

### Switching is lossless

- **FR-022**: Switching themes MUST NOT advance, rewind, reset, repeat, or skip
  any simulation tick. After a switch, the simulation state MUST equal what it
  would have been at that same moment with no switch.
- **FR-023**: Switching MUST NOT reload the cave, and MUST NOT alter the
  countdown timer, score, diamond count, lives, current cave number, pause
  state, or the seeded generator's position.
- **FR-024**: Switching MUST NOT clear or discard held-input state; a key held
  across the switch continues to act on the kid without interruption.

### Persistence

- **FR-025**: Theme choice MUST persist into the existing single saved record
  alongside the high score and furthest cave — not a second storage key. On
  load, a stored id that is registered is restored; a stored value that is
  missing, unreadable, not a string, or not registered is treated as absent and
  Classroom is used. In every such case the record's other values MUST be
  preserved and applied, not discarded.
- **FR-026**: Every storage read and write MUST degrade silently, following the
  existing pattern: an absent, disabled, full, or throwing store never produces
  a crash, a warning, or any visible sign, and never prevents a switch from
  applying for the current session.
- **FR-027**: The theme choice MUST be **last-write-wins**, unlike the high
  score and furthest cave, which only ever grow. Selecting a theme with a lower
  or earlier name must not be rejected by the record's merge behavior.
- **FR-028**: The theme choice MUST be persisted at the moment the player
  changes it, not only at the end of a run, so a player who closes the page
  mid-cave still keeps their choice.

### Completeness

- **FR-029**: An automated check MUST assert that **every registered theme** —
  not only the default — has an appearance entry for every element id, plus the
  open-door and running-magic-wall entries and every declared player-facing
  string. It MUST fail, naming the theme and the missing piece, when a theme is
  incomplete or when a new element id is added without theme entries.

### Cave names

- **FR-030**: Cave names remain **game content shared by all themes**: each cave
  keeps its own mechanic-descriptive name, and every theme's cave-intro template
  interpolates that same name. A name describes what the cave teaches, which is
  true under any costume, so it is not appearance and does not belong in the
  theme contract. Consequently, no theme supplies a per-cave name list and no
  theme is coupled to the number of caves.
  [NEEDS CLARIFICATION: should cave names instead become themed, with each theme
  supplying a per-cave name list so Classic can use the original's cave lettering
  ("Cave A", "Cave B", …) and the cave definition keeps only an identifier? That
  is more faithful and makes the contract genuinely complete, at the cost of
  coupling theme data to the cave count — a new constraint on this feature and on
  any later one that adds caves.]

### Preserved behavior

- **FR-031**: This feature changes **no simulation rule**. Every physics test
  from features 001–005 MUST continue to pass unchanged, and no file under
  `src/sim/` may be modified.
- **FR-032**: Every player-facing string the shell shows today MUST still come
  from theme data, with the Classroom theme's current wording unchanged except
  where a contract field is added and Classroom must supply a value for it.

### Key Entities

- **Theme**: A complete costume. An id, a display name, one appearance entry
  (fill color, glyph, label) per element id, a background, the transient
  open-door and running-magic-wall appearances, and every player-facing string.
  Pure data — no behavior, no functions, no knowledge of which theme is active.
- **Theme registry**: The enumerable, ordered collection of registered themes.
  Answers "what themes exist", "which one has this id", and "is this id
  registered". The UI's only source of the option list.
- **Active theme selection**: Which theme id the player is currently seeing.
  Lives in the shell, never in the simulation. Changing it is a pure re-render.
- **Saved record**: The single existing local record holding high score and
  furthest cave, which gains the chosen theme id. High score and furthest cave
  keep their grow-only merge; theme id is last-write-wins.
- **Cave**: Unchanged. Keeps its own name, quota, time limit, and tuning as
  game content, independent of any theme (FR-030).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Two complete themes are selectable in game, and every one of the
  fourteen elements plus the open door and running magic wall looks different
  between them.
- **SC-002**: Adding a third theme requires changes to theme data only — zero
  files under `src/sim/`, zero changes to the theme control, and zero changes
  to rendering logic. Verified by a review of the diff that adds Classic: it
  touches no simulation file and contains no comparison against a theme id.
- **SC-003**: Switching themes mid-cave changes nothing about the run: for an
  identical scripted cave and input sequence, the simulation state after N
  ticks is identical whether or not a theme switch occurred at any tick, in
  100% of trials.
- **SC-004**: The visual change is immediate on the next drawn frame — a player
  cannot switch themes and still see the old costume on the following frame,
  and the frame rate does not drop below the project's 30fps floor across the
  switch.
- **SC-005**: A held movement key survives a switch: the kid's movement over
  the ticks spanning a switch is identical to the same run without one.
- **SC-006**: The chosen theme survives a page reload 100% of the time when
  storage is writable, and the high score and furthest cave survive the switch
  100% of the time.
- **SC-007**: An absent, corrupt, non-string, or unregistered stored theme
  yields Classroom with no visible error in 100% of cases, and never costs the
  player their recorded high score or furthest cave.
- **SC-008**: A theme missing any element appearance or any required string
  fails the build with a message naming the theme and the missing piece —
  demonstrated by an incomplete fixture theme that must fail the check.
- **SC-009**: The theme control is fully usable with the keyboard alone, start
  to finish, with no pointer, touch, or gamepad required.
- **SC-010**: The shipped artifact remains a single self-contained page that
  runs from `file://`, and the suite from features 001–005 passes unchanged.

## Assumptions

- **The two themes are Classroom and Classic, and Classroom stays the default.**
  The constitution names both by name and names Classroom as the default; this
  feature does not revisit either choice, and adds no third theme.
- **"Approximating the original" means color, glyph, label, and wording — not
  sprite fidelity.** Classic reads as the classic look through the existing
  drawn-in-code vocabulary. FR-014 permits the contract to gain a generic
  appearance field if that vocabulary genuinely cannot carry it, but the
  expectation is that Classic ships within the existing fields plus the display
  name FR-003 adds. Pixel-level faithfulness to the commercial original is
  neither required nor wanted — the constitution asks for original work
  inspired by the mechanics.
- **The contract gains exactly one certain new field: a display name (FR-003).**
  The control has to call each theme something, and the existing `title` field
  is the game's in-game name under that theme, not a picker label. This is the
  contract being completed, not special-casing.
- **Classic's title string is an original name, not the trademarked original**
  (FR-011). The maintainer picks the exact wording at review; the spec's
  requirement is only that it is not the commercial title.
- **Theme choice joins the existing saved record** rather than a second key, as
  the maintainer's comment directs, and follows that module's established
  best-effort behavior for the unknown-theme fallback. That module's grow-only
  merge is specific to numeric records and must not be applied to the theme id
  (FR-027) — this is the one place the existing pattern needs extending rather
  than copying.
- **Cave names stay theme-neutral** (FR-030), which is the cheaper of the two
  options the maintainer raised and the one that keeps theme data independent
  of the cave count. Marked for confirmation because the maintainer asked for
  the decision to be explicit, and because reversing it later means moving data
  between two files rather than editing one.
- **Sound is still out of scope.** The constitution describes themes as
  carrying sounds, but no audio exists yet in the project, so the contract
  gains no sound field here; it arrives with the audio feature.
- **Touch and gamepad remain unimplemented**, as of feature 005. FR-017 and
  FR-020 therefore specify keyboard operation as the reference and require that
  nothing about the control assumes the keyboard is the *only* possible input,
  so the later input feature can add pointer, touch, and gamepad affordances
  without redesigning it.
- **The completeness check runs in the existing browserless suite.** Nothing
  here needs a canvas, and the visual judgment of whether Classic "looks right"
  is the maintainer's at review time, per Principle VII.

## Out of Scope

- Any third theme, user-authored themes, theme import/export, or per-element
  customization.
- Per-theme sound, music, or any audio at all.
- Any change to simulation behavior, cave layouts, quotas, time limits, scoring,
  or the arcade shell's flow.
- Themed cave names, unless the FR-030 clarification is answered the other way.
- Accessibility options beyond what the theme contract already carries — high
  contrast modes, colorblind palettes, or font scaling are a separate feature,
  though a future theme is the natural place for the first of them.
- Animated or per-frame theme transitions; the switch is instant, not a fade.
- Touch, pointer, and gamepad affordances for the control beyond not precluding
  them.

## Maintainer Review Notes

CI has no browser, so these are the things to look at by hand at review time,
per Principle VII:

- Switch themes mid-cave with a boulder in flight and confirm the boulder does
  not stutter, teleport, or restart its fall.
- Hold a movement key across a switch and confirm the kid does not stop.
- Confirm Classic reads as the classic look and that its closed exit is
  genuinely indistinguishable from its steel wall.
- Confirm the control is reachable and operable with the keyboard alone, mid-
  cave, without the game eating the keystrokes or the control eating the
  gameplay keys.
- Read the diff and confirm it touches no file under `src/sim/` and contains no
  comparison against a theme id (FR-016).
