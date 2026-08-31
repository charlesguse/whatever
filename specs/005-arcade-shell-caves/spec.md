# Feature Specification: Arcade Shell — Eight Caves, Timer, Score, Lives, and Game Over

**Feature Branch**: `spec-draft/005-arcade-shell-caves`

**Created**: 2026-08-31

**Status**: Draft

**Input**: GitHub issue #5 — "Arcade shell: eight caves, timer, score, lives, and
game over": everything built so far is one cave with no stakes; this turns it
into a game you can win and lose. A title screen, a HUD carrying stars-of-quota,
the classroom clock, the score, and the lives left. Eight original caves ordered
as a difficulty curve. Time-to-bonus at the door, three lives, death and instant
retry, game over back to the title, a win screen after cave eight, pause, and a
high score that survives a reload.

Features 001–004 built a cave that behaves correctly and cannot be lost in any
way that matters: die and press R, forever, with nothing counted. This feature
adds the two things that make those physics a *game* — a clock that runs out and
a life you can spend — and the eight rooms that teach the rules one at a time
until the eighth asks for all of them at once.

Nothing here changes how a boulder falls. The simulation gains exactly one new
rule (a cave has a clock, and running it out kills the kid); everything else is
the shell learning to keep score, count lives, and move from one cave to the
next.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A run, from the title screen to game over (Priority: P1)

A player opens the page and sees a title screen with the game's name and their
best score. They press a key, cave one names itself, and they are digging. The
HUD across the top says how many gold stars they have of the quota, how many
seconds are left on the classroom clock, what they have scored, and how many
lives they have left. A boulder lands on them; they lose a life and the same
cave starts again, unchanged. It happens twice more and the game is over,
showing their final score, and then they are back at the title screen ready to
try again.

**Why this priority**: This is the loop the whole feature exists to create. With
it, the physics from 001–004 become a game with stakes; without it, everything
else here is decoration on a sandbox.

**Independent Test**: Drive the session through a scripted sequence with no
browser — start a game, kill the kid three times in a tiny fixture cave, and
confirm lives go 3 → 2 → 1 → 0, that each death reloads the same cave in its
starting state, and that the third produces game over and a return to the title
with the score preserved for the high-score comparison.

**Acceptance Scenarios**:

1. **Given** the title screen, **When** the player presses the start key,
   **Then** a new game begins at cave one with a score of zero and three lives.
2. **Given** a cave in play, **When** the kid is killed by any hazard, **Then**
   exactly one life is lost, and the same cave reloads from its starting state.
3. **Given** a cave in play with one life left, **When** the kid is killed,
   **Then** the game-over screen appears showing the final score, and the game
   returns to the title screen.
4. **Given** a cave in play, **When** any tick runs, **Then** the HUD's star
   count, quota, remaining time, score, and lives all reflect the current state
   of that tick.
5. **Given** a game over, **When** the player starts again, **Then** the score
   is zero, lives are three, and play begins at cave one.

---

### User Story 2 - The clock runs out (Priority: P1)

The player is three stars short of the quota with fifteen seconds left. The
number on the HUD ticks down, one per second, and there is no way to get those
stars in time. It reaches zero, the kid dies, and a life is gone — the same as
being crushed, and just as final.

**Why this priority**: The clock is the other half of the stakes. Lives punish
mistakes; the clock punishes dithering, and it is what makes a cave a puzzle
with an answer rather than a room to wander.

**Independent Test**: Load a fixture cave with a short time limit, run ticks
with no input, and confirm the remaining time falls by one per second of ticks,
that the kid dies on the tick the clock reaches zero, and that the cave never
reports negative time.

**Acceptance Scenarios**:

1. **Given** a cave with a time limit, **When** ticks run while the cave is in
   play, **Then** the remaining time falls at exactly one second per second of
   ticks.
2. **Given** a cave whose remaining time reaches zero, **When** that tick
   resolves, **Then** the kid dies and the cave enters the same death path any
   other lethal event produces.
3. **Given** a cave that has already ended — the kid dead, or the door entered —
   **When** further ticks run, **Then** the clock does not advance.
4. **Given** a paused game, **When** real time passes, **Then** the remaining
   time is unchanged when play resumes.
5. **Given** the same cave, seed, and inputs, **When** the run is repeated,
   **Then** the clock reaches zero on exactly the same tick both times.

---

### User Story 3 - Stars, the quota, and the bonus at the door (Priority: P1)

Every gold star is worth points, and the ones past the quota are worth more —
so a player who has met the quota has a reason to keep collecting instead of
running for the door. Reaching the door with time left is worth more still: the
remaining seconds tick away into the score before the next cave loads, which is
the reward for solving a cave quickly rather than merely solving it.

**Why this priority**: Score is what makes the eight caves a single run rather
than eight unrelated puzzles, and the bonus is what makes speed matter. The
issue names scoring arithmetic and bonus conversion as things tests must cover.

**Independent Test**: With no browser, feed a session a sequence of collected
counts and confirm the score matches the documented arithmetic at every step,
including the switch to the higher value once the quota is met; complete a
fixture cave with a known number of seconds left and confirm exactly that many
bonus points are added, once.

**Acceptance Scenarios**:

1. **Given** a cave whose quota is not yet met, **When** the kid collects a gold
   star, **Then** the score rises by the documented pre-quota value.
2. **Given** a cave whose quota is already met, **When** the kid collects
   another gold star, **Then** the score rises by the documented higher
   past-quota value.
3. **Given** a cave completed with N seconds showing on the clock, **When** the
   tally finishes, **Then** the score has risen by exactly N bonus points.
4. **Given** a tally in progress, **When** the player presses a key to skip it,
   **Then** the score lands on exactly the same total it would have reached had
   the tally run to the end.
5. **Given** a completed cave, **When** the next cave loads, **Then** the score
   carries forward and the star count and clock restart for the new cave.

---

### User Story 4 - Eight caves that teach, and a win (Priority: P1)

Cave one is dirt and stars: dig, collect, leave. Cave two drops rocks. Cave
three makes them roll and asks the player to push one. Cave four introduces a
firefly, five a butterfly and the trick of dropping a rock on it, six the
sticker machine, seven the spilled glue. Cave eight asks for all of it. Finish
cave eight and the game is won — a win screen, a final score, and back to the
title.

**Why this priority**: Eight caves is the content half of the issue, and the
ordering is the design: each cave teaches or tests one mechanic before anything
combines them. Without them the shell has nothing to be a shell for.

**Independent Test**: Run every shipped cave through the parser and the static
cave checks with no browser — each parses, has exactly one kid, is fully
enclosed, cannot kill the kid on tick zero, and carries a quota the layout can
actually supply. Then drive cave one to completion from a recorded input
sequence and confirm the door opens, the cave completes, and the session moves
to cave two.

**Acceptance Scenarios**:

1. **Given** the shipped game, **When** the caves are counted, **Then** there
   are exactly eight, in the documented order.
2. **Given** any shipped cave, **When** it is parsed, **Then** it parses without
   error and reports its own quota, time limit, and tuning.
3. **Given** a completed cave that is not the eighth, **When** the tally
   finishes, **Then** the next cave in order begins with the score and lives
   carried forward.
4. **Given** the eighth cave completed, **When** the tally finishes, **Then**
   the win screen appears with the final score, and the game returns to the
   title.
5. **Given** any shipped cave at tick zero, **When** the first tick runs,
   **Then** the kid is alive.

---

### User Story 5 - Pause, and a restart that is always one key away (Priority: P2)

Someone knocks at the door. The player hits pause, the game visibly stops — the
clock included — and nothing moves until they come back. And at any point, a
single key restarts the cave they are on, because a player who has boxed
themselves in behind a bookshelf should never have to wait out a clock to try
again. Giving up on an attempt is one key, and it costs what giving up costs: a
life, the same as being crushed.

**Why this priority**: Both are quality-of-life rules the constitution requires
outright, and both are small. Neither is needed for the loop in stories 1–4 to
work, so they can land after it.

**Independent Test**: Toggle pause in a headless session and confirm no ticks
advance while paused and that the tick count, clock, and grid are identical
before and after; press restart from play, from pause, while the cave is dying,
and from the death screen, and confirm each yields a fresh copy of the current
cave, that the first three each spend exactly one life, that the fourth spends
none, and that a restart on the last life ends the game.

**Acceptance Scenarios**:

1. **Given** a cave in play, **When** the player presses pause, **Then** the
   simulation stops advancing and a paused state is visibly shown.
2. **Given** a paused game, **When** the player presses pause again, **Then**
   play resumes from exactly the state it stopped in.
3. **Given** a cave in play, at any point, **When** the player presses restart,
   **Then** exactly one life is spent and the current cave reloads from its
   declared data and seed immediately.
4. **Given** a paused game, **When** the player presses restart, **Then** one
   life is spent, the cave reloads, and the game is no longer paused.
5. **Given** a cave whose kid has just been killed and whose explosion is still
   resolving, **When** the player presses restart, **Then** the attempt ends by
   the same path the death would have taken — exactly one life spent in total,
   not two — and the cave reloads at once.
6. **Given** a cave in play with one life left, **When** the player presses
   restart, **Then** the game is over, exactly as if the kid had been killed.
7. **Given** the life-lost screen or the cave intro, **When** the player presses
   restart, **Then** the cave reloads and no further life is spent.

---

### User Story 6 - Coming back to a high score (Priority: P3)

The player closes the tab and opens it again next recess. The title screen still
knows their best score and how far they got.

**Why this priority**: It is the smallest piece of the issue and nothing depends
on it, but it is what makes a score worth chasing across sessions.

**Independent Test**: Record a score and a cave reached, simulate a reload, and
confirm both come back; then simulate storage being unavailable and confirm the
game starts and plays normally with the values simply absent.

**Acceptance Scenarios**:

1. **Given** a finished game with a score higher than the stored best, **When**
   the title screen is shown again after a reload, **Then** it shows the new
   best score.
2. **Given** a finished game with a score lower than the stored best, **When**
   the title screen is shown, **Then** the stored best is unchanged.
3. **Given** a player who reached cave five, **When** the page is reloaded,
   **Then** the title screen reports cave five as the furthest reached.
4. **Given** local storage that is unavailable or holds unreadable values,
   **When** the game starts, **Then** it plays normally, showing no best score
   and no furthest cave, and never fails or warns.

---

### Edge Cases

**The clock**

- **The clock reaches zero on the same tick the kid enters the door**: the door
  wins. A kid who is in the door on that tick has finished the cave, and the
  bonus is whatever the clock shows, which may be zero.
- **The clock reaches zero while the cave is already dying** (the kid is dead
  but blasts are still resolving): nothing further happens. Only one life is
  ever lost per attempt.
- **The clock reaches zero while a life-lost or tally screen is showing**: it
  cannot, because the clock only runs while the cave is in play.
- **A cave with no declared time limit**: it has no clock, the HUD shows no
  time, and no cave can time out. Every existing test cave is in this state,
  which is why they are unaffected.
- **A player pauses to stop the clock**: legal, and not a cheat worth
  engineering against — the clock is a sim-tick count, and pausing stops the
  ticks. A player who pauses is not playing.

**Score and bonus**

- **A star collected during the attempt that ends in death**: the points stay
  scored (FR-017a). The score never decreases, and there is no per-attempt total
  to roll back.
- **A player farms a doomed attempt for points and then restarts**: legal, and
  priced. Every farmed run costs a life (FR-027), so the player is trading the
  budget the whole mode runs on for those points.
- **A butterfly's blast pays out nine stars past the quota**: each of them
  scores the higher past-quota value when collected. The blast pays stars, not
  points; the points come from picking them up.
- **The tally is interrupted by the player pressing restart or pause**: the
  score still lands on the full documented total. The tally is presentation; the
  arithmetic is not.
- **A cave completed with zero seconds left**: zero bonus, and the cave still
  completes normally.
- **The score exceeds what the HUD field was sized for**: the HUD grows or
  scrolls the digits; it never truncates a score it is showing the player.

**Lives, death, and retry**

- **The kid dies to two hazards on the same tick**: one death, one life.
- **The player presses restart on the tick the kid is killed, or during the
  dying phase**: one attempt ended, one life. The restart and the death converge
  on the same attempt-over transition; whichever arrives first is the one that
  ends the attempt, and the other finds it already ended.
- **The player presses restart with no lives to spare**: game over. A voluntary
  restart is an attempt ending, and the last attempt ending ends the game.
- **The kid dies with the quota already met**: still a death, still a life. The
  quota is not a checkpoint.
- **A retried cave is not the same as the one just lost**: it must be. The cave
  reloads from its declared data with its declared seed, so the amoeba grows the
  same way it did last time and a player can learn the room.
- **The last life is lost on the eighth cave**: game over, not a win. The win is
  entering the door on cave eight, nothing else.

**Progression**

- **The player completes cave eight with lives left**: the lives are not
  rewarded or converted. The win screen shows the score.
- **A cave's door is entered while the tally of the previous cave is still
  running**: impossible; the tally happens between caves, with no cave in play.

**Screens and input**

- **A key is held down across a screen transition**: transitions consume a
  key *press*, never a held key, so one long press never skips two screens.
- **A movement key is pressed on the title screen**: it starts the game like any
  other key, and is not also delivered to the kid on the first tick.
- **The window loses focus mid-cave**: the game keeps running; the tick loop
  already clamps catch-up so a backgrounded tab cannot fire a burst of ticks.
  Whether losing focus should auto-pause is a maintainer call, noted below.

**Storage**

- **Storage is full, disabled, or throws on write**: every read and write is
  best-effort. A failure is silent and never reaches the player.
- **A stored value is present but nonsense** (negative, non-numeric, a cave
  number past eight): treated as absent, and overwritten by the next honest
  write.

## Requirements *(mandatory)*

### The session and its screens

- **FR-001**: The game MUST have exactly one active session state at any moment,
  drawn from: **title**, **cave intro**, **playing**, **paused**, **life lost**,
  **cave complete** (the bonus tally), **game over**, and **won**. Every
  transition between them MUST be driven by a player action or by a documented
  state change in the cave, never by anything else.
- **FR-002**: The **title** state MUST show the game's name, the stored high
  score, and the furthest cave reached, and MUST start a new game on a documented
  start key — score zero, three lives, cave one. The furthest cave reached is a
  **badge only**: it MUST NOT unlock, offer, or gate a choice of starting cave,
  and every game MUST begin at cave one so that every score on the board is a
  score over the same eight caves.
- **FR-003**: The **cave intro** state MUST name the cave and state its quota
  and time limit before play begins. The cave's clock MUST NOT run during the
  intro, and the intro MUST end on a keypress or after a short documented delay,
  whichever comes first.
- **FR-004**: The **playing** state MUST advance the simulation at the project's
  fixed tick rate and MUST deliver player input to it exactly as it does today.
- **FR-005**: The **life lost** state MUST be entered when an attempt ends
  because the cave reports the kid dead, and MUST end — into the next attempt, or
  into game over — on a keypress or after a short documented delay, whichever
  comes first. An attempt ended by a voluntary restart (FR-027) takes the same
  attempt-over transition but MUST NOT stop on this screen: it reloads at once,
  or enters game over if no lives remain.
- **FR-006**: The **cave complete** state MUST be entered when the cave reports
  itself completed, MUST run the bonus tally (FR-019), and MUST then start the
  next cave, or enter **won** after the eighth.
- **FR-007**: The **game over** and **won** states MUST each show the final score
  and MUST return to the title on a keypress or after a short documented delay.
- **FR-008**: Every state above MUST be visibly distinguishable to the player
  from every other, with wording that comes from theme data (FR-046).

### The cave clock

- **FR-009**: A cave definition MUST gain an optional **time limit**, expressed
  in whole seconds. A cave that declares none has no clock and MUST behave
  exactly as caves do today; all eight shipped caves MUST declare one.
- **FR-010**: The clock MUST be part of cave state and MUST count the
  simulation's own ticks — never wall-clock time, a timestamp, or a frame count.
  Seconds and ticks MUST be related by the project's single documented tick-rate
  constant, the same one the shell's loop uses, so the number on the HUD and the
  seconds a player experiences agree.
- **FR-011**: The clock MUST advance only while the cave's status is in play. It
  MUST NOT advance while the cave is dying, dead, or completed, and — because
  pausing stops ticks — MUST NOT advance while paused.
- **FR-012**: The remaining time MUST be reported to the shell as whole seconds
  by a read-only accessor, computed as the remaining ticks divided by the tick
  rate and **rounded up**, so the clock shows the cave's full limit on tick zero
  and shows zero only when the time is genuinely gone. It MUST never report a
  negative value.
- **FR-013**: On the tick the remaining time reaches zero in a cave that is in
  play, the kid MUST die, entering exactly the same death path any lethal event
  produces today. The death MUST NOT produce an explosion, MUST NOT destroy
  anything else in the cave, and MUST cost exactly one life like any other death.
- **FR-014**: If the kid enters the door on the same tick the clock would reach
  zero, the cave MUST complete. Completion beats expiry.
- **FR-015**: Cave parsing MUST reject a time limit that is not a positive whole
  number of seconds, naming the cave and the offending value and producing no
  partial grid — the same failure discipline parsing already uses.

### Score

- **FR-016**: The score MUST be a non-negative whole number, MUST start at zero
  when a new game begins, and MUST never decrease.
- **FR-017**: A gold star collected while the cave's quota is **not yet met**
  MUST be worth **10 points**; one collected once the quota **is met** MUST be
  worth **15 points**. The value depends only on whether the quota was met at
  the moment of collection, so a cave's star score is a pure function of its
  collected count and its quota.
- **FR-017a**: Points scored during an attempt MUST stay scored when that attempt
  ends badly. Losing a life — by any death, or by a voluntary restart (FR-027) —
  MUST NOT roll the score back to what it was when the attempt began. The session
  carries one running total across attempts; there is no per-attempt snapshot to
  revert to. This rule is safe only because an attempt costs a life (FR-027): see
  Assumptions.
- **FR-018**: No other event in this feature MUST score. Detonating an enemy,
  surviving, or finishing with lives in hand MUST be worth nothing by itself;
  the butterfly trick pays in stars, which pay in points only when collected.
- **FR-019**: On completing a cave, the score MUST rise by **1 point per whole
  second remaining**, using exactly the number the HUD was showing at the moment
  of completion (FR-012), added exactly once.
- **FR-020**: The bonus MUST be *presented* as the clock ticking down into the
  score, and that presentation MUST be skippable. The total MUST be identical
  whether the tally runs to the end, is skipped, or is interrupted — the
  arithmetic MUST NOT be a side effect of the animation.
- **FR-021**: The score MUST carry forward from cave to cave within a game and
  MUST be shown on the HUD during play and on the game-over and win screens.

### Lives, death, and retry

- **FR-022**: A new game MUST begin with **three lives**, and the current count
  MUST be on the HUD throughout play.
- **FR-023**: Every attempt-ending event — crushed by a falling body, caught by
  an enemy, out of time, or a voluntary restart (FR-027) — MUST cost exactly
  **one** life, once per attempt, no matter how many lethal things happen on the
  same tick, or during the cave's dying phase, or whether the player presses
  restart while the cave is already dying.
- **FR-024**: If lives remain after an attempt ends, the same cave MUST reload
  from its declared data with its declared seed (FR-027b), so the retry is
  byte-for-byte the cave the player just lost. Score carries forward per FR-017a;
  lives do not regenerate.
- **FR-025**: If no lives remain after an attempt ends — by death or by a
  voluntary restart — the game MUST end: game-over screen, then the title. The
  player MUST NOT be able to continue a finished game.
- **FR-026**: The retry MUST be reachable immediately by a keypress and MUST NOT
  require the player to wait out any animation (FR-005).

### Restart and pause

- **FR-027**: A single documented **restart** key MUST reload the current cave
  from its starting state, and MUST work while playing, while paused, while the
  cave is **dying**, during the cave intro, and during the life-lost screen. A
  voluntary restart pressed while an attempt is still live — playing, paused, or
  dying — **MUST cost exactly one life**, taking the same **attempt-over**
  transition a death takes: one place where an attempt ends, one place lives
  decrement, one place the cave resets. If that was the last life, restart MUST
  produce game over exactly as a death would.
- **FR-027a**: Restart MUST NOT cost a second life for an attempt that has already
  ended or has not yet begun. Pressed during the **life-lost** screen it MUST
  reload the cave without a further decrement (the life is already spent);
  pressed during the **cave intro** — before any tick of the attempt has run and
  before the clock has started — it MUST reload the cave and cost nothing. The
  invariant of FR-023 holds: exactly one life per attempt, however that attempt
  ends.
- **FR-027b**: Every reload this feature performs — after a death, after a
  voluntary restart, or at the start of a cave — MUST rebuild the cave from its
  declared definition and declared seed, **never from a snapshot** captured at
  cave start. A restarted cave MUST therefore replay identically to the first
  attempt, tick for tick, given the same inputs.
- **FR-028**: A single documented **pause** key MUST toggle the paused state
  from play. While paused, no tick MUST run, the clock MUST NOT advance, the
  grid MUST NOT change, and a paused indicator MUST be visible.
- **FR-029**: Resuming MUST continue from exactly the state play stopped in — no
  ticks skipped, none run in a burst to catch up, and no input queued while
  paused delivered on resume.
- **FR-030**: Pausing and resuming MUST NOT change any simulation state. A cave
  paused for an hour and resumed MUST be identical to the same cave never
  paused, tick for tick.

### The eight caves

- **FR-031**: The game MUST ship **exactly eight** caves in a fixed order, each
  with its own name, diamond quota, time limit, and cave-scoped tuning (amoeba
  growth rate and size limit, magic wall duration) set explicitly rather than
  inherited from defaults where the cave uses that element.
- **FR-032**: The order MUST be a difficulty curve in which each cave teaches or
  tests one mechanic before anything combines them:
  1. dig and collect — dirt, stars, the door, no hazards;
  2. falling — boulders that drop when the dirt beneath them goes;
  3. rolling and pushing — stacks that roll, and at least one push the player
     must make to progress;
  4. fireflies — a patrol to time a run past;
  5. butterflies — including the boulder-drop trick that turns one into stars;
  6. the magic wall — a stretch worth feeding, and a wall that dies once spent;
  7. the amoeba — a blob that must be sealed or outrun;
  8. a finale that uses everything above.
- **FR-033**: All eight layouts MUST be **original designs by this project**,
  inspired by the mechanics and never transcribed from the commercial game's
  level data.
- **FR-034**: Every shipped cave MUST: contain exactly one kid; be enclosed by
  an indestructible border on all four sides; place nothing that can kill the
  kid on tick zero or the ticks immediately after it before the player has
  acted; contain exactly one door; and be winnable within its time limit by a
  player using only the keyboard.
- **FR-035**: Every shipped cave's quota MUST be **attainable from its layout**,
  checked automatically by a documented, deliberately conservative measure: the
  quota MUST NOT exceed the gold stars available in the region reachable from
  the kid's spawn by a traversal through cells the kid can enter — empty space,
  dirt, gold stars, and the door — counting stars lying in that region plus nine
  per butterfly in it. The check is a necessary condition, not a proof of
  solvability; FR-036 and maintainer play cover the rest.
- **FR-036**: The suite MUST include a **recorded winning input sequence for at
  least cave one**, replayed against the sim with no browser, proving that the
  cave is completable and that quota-met → door-open → cave-complete works end
  to end. Winnability of the remaining caves is verified by the maintainer at
  review time.
- **FR-037**: Caves MUST remain declarative data living in one place. Adding,
  reordering, retuning, or removing a cave MUST NOT touch any simulation file
  and MUST NOT touch rendering logic.

### Persistence

- **FR-038**: The game MUST persist, to the local device only, the **high
  score** and the **furthest cave reached**, the latter stored as a plain **cave
  number** rather than as a badge string or a flag, so that a later cave-select
  feature can read the same value with no migration. Nothing MUST leave the
  device, and no other data MUST be persisted by this feature.
- **FR-039**: The high score MUST be updated whenever a game ends — by game over
  or by winning — with the greater of the stored value and the final score. The
  furthest cave reached MUST be updated whenever a cave begins, with the greater
  of the stored value and that cave's number.
- **FR-040**: Both values MUST be read at the title screen and shown there.
- **FR-041**: Every read and write MUST be best-effort. If storage is
  unavailable, full, or throws, the game MUST continue normally with the values
  treated as absent, and MUST NOT warn, log visibly, or degrade play.
- **FR-042**: A stored value that is missing, unreadable, or out of range MUST
  be treated as absent — a high score of zero and a furthest cave of one — and
  MUST be replaced by the next successful write.

### HUD, themes, and input

- **FR-043**: During play the HUD MUST show, at once and continuously: gold
  stars collected out of the quota, the seconds remaining, the score, and the
  lives left.
- **FR-044**: Every value on the HUD that the simulation owns — the star count,
  the quota, the remaining time — MUST be read from the simulation through
  read-only accessors on each frame. The shell MUST NOT keep its own copy of any
  of them.
- **FR-045**: The values the shell owns — score, lives, current cave — MUST live
  in one session record, MUST be plain data, and MUST be readable and testable
  without a browser, canvas, or storage.
- **FR-046**: Every player-visible string this feature adds — the HUD's labels,
  the title screen, the cave intro, the paused indicator, the life-lost, game
  over, and win wording — MUST come from **theme data**, following the existing
  readout-template pattern. No shell logic MUST branch on which theme is active,
  and no user-visible wording MUST be a literal in rendering or session code.
- **FR-047**: Adding a further theme MUST still require only a new entry in the
  theme registry, all strings this feature adds included, with no simulation and
  no rendering-logic change.
- **FR-048**: The **start/confirm**, **pause**, and **restart** keys MUST each be
  documented and MUST NOT collide with each other or with movement and grab.
  Every part of this feature — starting, pausing, retrying, skipping a screen,
  finishing the game — MUST be reachable with a keyboard alone.
- **FR-049**: A screen transition MUST consume a key *press*, never a held key,
  so a single long press cannot skip two screens.

### Determinism, purity, and non-regression

- **FR-050**: The simulation MUST still contain no wall-clock time, no page or
  browser access, and no randomness but its own seeded generator. The clock is a
  tick count; the tick-rate constant is a conversion, not a clock.
- **FR-051**: The clock MUST consume no randomness. The same cave, seed, and
  ordered inputs MUST produce an identical grid, collected count, status, and
  remaining time after any number of ticks.
- **FR-052**: Every rule and test from features 001, 002, 003, and 004 MUST
  still hold. The only simulation change this feature makes is the cave clock
  (FR-009–FR-015); caves that declare no time limit MUST behave exactly as they
  do today, so every existing test cave is unaffected.
- **FR-053**: The build MUST still emit exactly one self-contained page that
  makes no network requests and runs from `file://`, and the game MUST still
  hold the project's frame-rate target with the HUD and session shell running.

### Tests

- **FR-054**: Every rule above that changes the grid MUST be pinned by an ASCII
  cave test in the existing format — a starting grid, a tick count and optional
  per-tick inputs, and the expected grid. Session, score, and persistence rules
  MUST be pinned by plain unit tests over plain data, with no browser, canvas,
  audio device, storage, or browser-automation tooling.
- **FR-055**: The suite MUST cover, at minimum, each of the following as its own
  case:
  - the clock falling by exactly one second per tick-rate ticks, and the kid
    dying on the tick it reaches zero;
  - the clock not advancing while the cave is dying, dead, or completed;
  - a cave with no declared time limit never timing out over a long run;
  - parsing rejecting a zero, negative, fractional, or non-numeric time limit;
  - completion beating expiry on the same tick (FR-014);
  - the same cave, seed, and inputs timing out on exactly the same tick twice;
  - star scoring: pre-quota value, past-quota value, and the boundary star that
    meets the quota exactly;
  - bonus conversion: N seconds remaining producing exactly N points, once, and
    zero seconds producing zero;
  - the total after a skipped tally equalling the total after a completed one;
  - quota-met logic driving cave completion, and a completed cave advancing to
    the next in order;
  - life loss on each attempt-ending cause — crushed, enemy, timeout, and
    voluntary restart — each costing exactly one life;
  - two lethal events on one tick costing one life, not two;
  - the score after a failed attempt still including the stars collected during
    it, for a death and for a voluntary restart (FR-017a);
  - the 3 → 2 → 1 → 0 sequence ending in game over, and game over returning to
    the title with score and lives reset for the next game;
  - completing the eighth cave producing the win state, not a ninth cave;
  - a retried cave being identical to the cave as first loaded, rebuilt from its
    definition and seed rather than from a snapshot (FR-027b);
  - restart from play, from pause, and from the dying phase, each costing exactly
    one life; restart from the life-lost screen and from the cave intro, each
    costing none;
  - restart while dying costing one life in total, not two, when the death would
    also have ended the attempt;
  - a restart on the last life producing game over, exactly as a death does;
  - the title screen never offering a starting cave other than cave one, whatever
    furthest-cave value is stored (FR-002);
  - pause running no ticks and leaving the tick count, clock, and grid
    untouched, and resume continuing from exactly that state;
  - high score written only when higher, furthest cave written only when
    further, both surviving a simulated reload;
  - storage that throws on read and on write leaving the game fully playable;
  - a stored value that is missing, negative, or unparseable being treated as
    absent;
  - every shipped cave parsing, satisfying the FR-034 structural checks, and
    passing the FR-035 quota-attainability check;
  - the shipped cave count being exactly eight, in the documented order;
  - cave one completed from its recorded input sequence (FR-036).
- **FR-056**: The suite MUST continue to run with no browser, and the existing
  build test MUST continue to assert exactly one self-contained page.

### Key Entities

- **Game session**: One attempt at the whole game — score, lives remaining,
  which cave is current, and which screen is showing. Created at the title,
  destroyed at game over or the win.
- **Cave clock**: A cave's remaining time, counted in the simulation's own ticks
  and reported in whole seconds. The one new simulation rule in this feature.
- **Cave sequence**: The eight caves in their fixed order, each with a quota, a
  time limit, and its own tuning. The game's content.
- **Score**: A running total across the caves of one session, made only of
  collected stars and time bonuses.
- **Time bonus**: The seconds left on the clock at the door, converted to points
  once, presented as a tally that cannot change the total.
- **Life**: One attempt at the current cave. Three per session, spent by any
  death and by a voluntary restart, never regained.
- **Attempt-over transition**: The single point at which an attempt ends — by
  death or by restart. One life decrements here, and the cave resets here;
  nothing else in the feature spends a life.
- **Saved record**: The high score and the furthest cave reached as a cave
  number, on the local device only, best-effort in both directions.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A player can go from the title screen through all eight caves and
  a win screen, and back to the title, using only the keyboard, with no dead
  ends and no state the game cannot leave.
- **SC-002**: The clock falls by exactly one second per second of play in 100%
  of runs, and the kid dies on the exact tick it reaches zero in 100% of runs.
- **SC-003**: Star scoring matches the documented values — 10 before the quota,
  15 after — on 100% of collections, verified across at least one cave's full
  star count.
- **SC-004**: The bonus added at the door equals the seconds the HUD was showing
  in 100% of completions, and is identical whether the tally is watched, skipped,
  or interrupted.
- **SC-005**: Exactly one life is lost per attempt ended, in 100% of cases,
  across all four causes — crushed, enemy, timeout, voluntary restart — including
  ticks on which two lethal things happen at once and restarts pressed while the
  cave is already dying.
- **SC-006**: Three ended attempts end the game in 100% of runs, whether they
  ended by death or by restart, and a fourth attempt is never offered.
- **SC-007**: A retried cave is identical to that cave as first loaded, grid for
  grid and tick for tick, in 100% of retries over at least 100 ticks of
  no-input play — amoeba growth included.
- **SC-008**: Pausing advances zero ticks and changes zero cells, verified over
  at least 100 frames of paused wall-clock time, and resuming continues from
  exactly the paused tick.
- **SC-009**: Restart returns a fresh cave within one tick of the keypress, from
  play, pause, the dying phase, cave intro, and the life-lost screen — 100% of
  the time — and spends exactly one life from the first three and none from the
  last two.
- **SC-010**: All eight shipped caves parse, pass every FR-034 structural check,
  and pass the FR-035 quota-attainability check — 8 of 8, with zero exceptions.
- **SC-011**: Cave one is completed by its recorded input sequence in 100% of
  runs, ending with the cave marked completed and the session on cave two.
- **SC-012**: High score and furthest cave survive a simulated reload in 100% of
  cases, and the game starts and plays normally in 100% of cases where storage
  throws on every operation.
- **SC-013**: Every player-visible string this feature adds comes from theme
  data: zero rendering or session branches on theme identity, and zero
  user-visible literals in shell logic, verified by inspecting the change.
- **SC-014**: Every feature-001 through -004 test still passes unchanged, and
  the build still emits exactly one self-contained page that makes zero network
  requests.
- **SC-015**: The automated suite passes with no browser present and covers
  every case listed in FR-055.

### Verified by the maintainer at review time

The following cannot be checked without a browser and are called out here so
review knows what to look at:

- **The curve.** Each cave should be beatable on a few attempts by someone who
  has beaten the one before it, and cave eight should feel like a test rather
  than a wall. Caves 1–3 in particular should be winnable first try.
- **The time limits.** Each cave's limit should leave a competent player real
  bonus seconds and an exploring player none. This is the single most likely
  thing to need retuning after play, and it is one number per cave.
- **The quotas.** Meeting a quota should require most of a cave, not a corner of
  it, and there should be visible stars past the quota worth going back for.
- **The HUD.** Readable at a glance without taking the eye off the kid, and the
  clock legible enough that the last ten seconds feel like the last ten seconds.
- **The tally.** The bonus countdown should read as a reward — fast enough not
  to bore, slow enough to see — and skipping it should feel like a choice rather
  than a way to lose points.
- **The retry.** Death to retry should feel instant. If a player notices the
  wait, the delay is too long.
- **The paused state.** Unmistakable, and unmistakably not a crash.
- **Whether losing window focus should auto-pause.** A judgment call left out of
  the requirements deliberately: it protects a player who alt-tabs and annoys one
  who clicks away for a second. Worth a decision at review, not a spec rule.
- **The title and win screens** should say what game this is and that the player
  won, in Classroom voice, without a manual.

## Assumptions

- **The clock lives in the simulation, not the shell** (FR-010). Running out of
  time kills the kid, which is a change to cave state, and the constitution
  requires cave state to be a pure function of (grid, input, tick) that CI can
  test without a browser. A shell-owned wall-clock timer would make "did this
  cave time out?" untestable and unreplayable, which is exactly the property
  features 001–004 were built to keep.
- **Time is declared in seconds and counted in ticks** (FR-009, FR-012), related
  by the one tick-rate constant the shell already uses (8 ticks per second).
  Caves are authored in the units a player experiences; the sim counts the units
  it has.
- **Remaining time is rounded up for display** (FR-012), so a cave shows its
  full limit on tick zero and shows zero only when the time is actually gone,
  and the bonus pays exactly the number the player was looking at.
- **Scoring values are 10 and 15 points per star, and 1 point per second of
  bonus** (FR-017, FR-019). The issue asks for documented values with a higher
  one past the quota and does not name them; these are the arcade-standard
  shape, they make a cave's stars worth roughly as much as its clock, and they
  are three numbers a maintainer can retune without touching a rule.
- **Nothing else scores** (FR-018). No points for detonating an enemy, no extra
  life at a score threshold. The original awards bonus lives; the issue does not
  ask for them, and adding one would change the difficulty curve the eight caves
  are tuned against. It is a good candidate for a later feature.
- **A retry is the same cave, from the same seed** (FR-024, FR-027b), rebuilt
  from the cave's declared definition rather than from a snapshot taken at cave
  start. The constitution's determinism principle makes this the only defensible
  reading: a player who loses to the amoeba must be able to learn the room. A
  reseeded retry would make caves unlearnable and the tests unwritable, and a
  snapshot would quietly become a second source of truth for what a cave is.
- **Points-stay and restart-costs-a-life are one decision, not two** (FR-017a,
  FR-027). Points survive a failed attempt *because* an attempt costs a life:
  the life is the price that bounds farming, so grinding a doomed run for points
  is a trade with a cost rather than an exploit. **Changing either rule requires
  revisiting the other.** In particular, if a later feature softens FR-027 into a
  free restart for friendliness, FR-017a turns the score into an unbounded
  fountain — a player could collect a cave's stars, restart, and collect them
  again forever. Whoever makes that change must pair it with a rollback rule, a
  per-cave scoring cap, or some other bound.
- **A voluntary restart ends the attempt; it does not end it twice** (FR-023,
  FR-027a). Restart and death share one attempt-over transition, so a life is
  spent exactly once per attempt. That is why restart during the *life-lost*
  screen costs nothing more — the life is already spent — and why restart during
  the *cave intro*, before the attempt's first tick, costs nothing at all.
  Restart during the **dying** phase is explicitly in scope: feature 003 gave
  death an animation window, and the moment a player most wants to press restart
  is the moment they can see the explosion starting, so the key must be reliable
  exactly there.
- **Timeout kills without an explosion** (FR-013). The kid simply runs out of
  time; a blast would destroy nearby cells and could pay out stars, which would
  make timing out occasionally *profitable*. Death is death.
- **One death costs one life, however it happens** (FR-023), including a tick
  with two lethal events and the dying phase that follows. Lives are attempts,
  not hit points.
- **Screens auto-advance on a short delay and skip on a keypress** (FR-003,
  FR-005, FR-007). The issue asks for a cave intro and instant retry; making
  every screen both skippable and self-clearing satisfies "restart is one key
  away" without stranding a player who is not pressing anything.
- **The bonus tally is presentation only** (FR-020). Computing the total up
  front and animating toward it is the only way the score can be correct when
  the animation is skipped, and it is what makes the arithmetic testable without
  a frame loop.
- **The eight caves replace the single shipped starter cave** as the game's
  content. Room 101 from features 001–004 may be reworked into one of the eight
  or retired outright; either way the shipped game is the eight-cave sequence,
  and nothing depends on the starter cave surviving under that name.
- **Quota attainability is checked conservatively** (FR-035). A real solvability
  proof would need a solver; a reachable-stars upper bound catches the mistake
  that actually happens — a quota typo, or stars walled off behind steel — and
  costs nothing to run on every build. Cave one additionally ships a winning
  input tape (FR-036) because it is short enough to record by hand and it proves
  the whole loop, not just the layout.
- **Persistence covers the high score and the furthest cave only** (FR-038).
  Theme choice is named in the constitution as persisted, but the theme picker
  is explicitly out of scope for this issue, so its storage arrives with it.
- **The furthest cave reached is a record, not a shortcut** (FR-002). The game
  always starts at cave one. This is a deferral rather than a rejection — the
  arcade original did gate a start-of-group cave select on progress — and two
  things decide it for now. **High-score comparability**: every run scores the
  same eight caves, so one number means one thing; a cave select needs either an
  exclusion rule or a second scoreboard, which is a scoring redesign hiding
  inside a convenience feature. **Input timing**: cave select is a title-screen
  UI with its own navigation, and the touch/gamepad feature is still ahead of
  this one, so building it now means building it twice. The door is kept open at
  no cost by persisting the value as a plain cave number (FR-038), which the
  badge needs anyway and which a later cave select can read with no migration.
- **Touch and gamepad remain unimplemented here**, as the issue says, so the
  constitution's requirement for them stands unmet until the input feature. This
  feature must not make that harder: nothing in the session shell may assume a
  keyboard is the only source of a start, pause, or restart signal.
- **Sound is out of scope**, so the game is silent; the constitution already
  requires it to be fully playable that way.

## Out of Scope

Named explicitly in the originating request: the second theme and the theme
picker, touch and gamepad input, and sound. Also out of scope here: bonus lives
at score thresholds, a scoreboard of more than one high score, initials entry,
any cave beyond the eight, difficulty levels or a second lap through the caves,
cave select (deferred deliberately — see FR-002 and Assumptions), replays or
ghosts, and any
persistence beyond the high score and furthest cave reached.
