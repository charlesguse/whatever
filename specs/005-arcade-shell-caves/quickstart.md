# Quickstart: Arcade Shell — Eight Caves, Timer, Score, Lives, and Game Over

How to validate this feature end-to-end once implemented. See
[data-model.md](./data-model.md) for entity shapes,
[contracts/sim-api.md](./contracts/sim-api.md) for the sim's extended
surface, and [contracts/session-api.md](./contracts/session-api.md) for the
new shell-owned session module. This extends features 001–004's
quickstarts — their checks (single-file build, movement/dig/wall behavior,
falling/rolling/pushing/crushing/the door, enemy patrol, detonation,
explosions/chains, amoeba, magic wall, expanding wall) still apply
unchanged.

## Prerequisites

- `npm install` at the repo root (unchanged from features 001–004)

## Validate the sim and session in isolation (no browser)

```bash
npm test
```

**Expected outcome**: builds first, then the full `vitest` suite passes with
no browser, canvas, storage device, or audio device present, covering — per
FR-055 — every case in the checklist below:

**The cave clock (sim, ASCII-cave tests):**

- the clock falling by exactly one second per `TICK_RATE_HZ` ticks, and the
  kid dying — no explosion — on the exact tick it reaches zero;
- the clock not advancing while the cave is dying, dead, or completed;
- a cave with no declared time limit never timing out over a long run;
- parsing rejecting a zero, negative, fractional, or non-numeric time limit,
  naming the cave and the offending value;
- completion beating expiry on the same tick (FR-014) — a cave whose door
  opens and whose clock would reach zero on the same tick ends
  `'completed'`, not `'dead'`;
- the same cave, seed, and inputs timing out on exactly the same tick twice
  (determinism, FR-051);
- `getRemainingSeconds` returning the full limit on tick zero, never a
  negative value, and `undefined` for a cave with no limit.

**Score and the bonus (plain unit tests over plain data):**

- star scoring: the pre-quota value (10), the past-quota value (15), and the
  boundary star that first meets the quota (10, per this plan's flagged
  reading of FR-017);
- bonus conversion: N seconds remaining producing exactly N points, once,
  and zero seconds producing zero;
- the total after a skipped or interrupted tally equalling the total after
  one that ran to completion;
- a star collected during an attempt that ends in death or in a voluntary
  restart staying scored (FR-017a), for both causes.

**Lives, death, retry, pause (plain unit tests over `SessionState`):**

- life loss on each attempt-ending cause — crushed, enemy, timeout,
  voluntary restart — each costing exactly one life, including two lethal
  events on the same tick costing one life, not two;
- restart from `playing`, from `paused`, and while the cave is dying, each
  costing exactly one life; restart from `lifeLost` and from `caveIntro`,
  each costing none; a restart that lands on the same tick a death is also
  detected costing one life in total (`endAttempt`'s idempotency guarantee);
- a restart on the last life producing `gameOver`, exactly as a death does;
- the 3 → 2 → 1 → 0 sequence ending in `gameOver`, and `gameOver` returning
  to `title` with a fresh session (score 0, lives 3) for the next game;
- a retried cave being byte-for-byte identical to the cave as first loaded
  — rebuilt from `CAVES[caveIndex]` and its declared seed, never from a
  snapshot (FR-027b) — over at least 100 ticks of no-input play, amoeba
  growth included;
- pause running zero ticks and leaving the tick count, clock, and grid
  untouched over many toggle cycles, and resume continuing from exactly
  that state;
- the title screen never offering a starting cave other than cave one,
  whatever furthest-cave value is stored (FR-002).

**The eight caves and progression:**

- the shipped cave count being exactly 8, in the documented order;
- every shipped cave parsing, satisfying the FR-034 structural checks
  (one kid, enclosed border, no tick-zero kill, exactly one door), and
  passing the FR-035 reachability check;
- cave one completed from its recorded input sequence (FR-036), ending with
  the cave marked `'completed'` and the session on cave two;
- completing a non-final cave carrying score and lives forward to the next
  cave, with its own star count and clock restarting;
- completing the eighth cave producing `'won'`, not a ninth cave.

**Persistence:**

- high score written only when the final score is higher than the stored
  value, and furthest cave written only when the new cave number is
  greater — both surviving a simulated reload;
- storage that throws on every read and every write leaving the game fully
  playable, with no crash and no visible warning;
- a stored value that is missing, negative, non-numeric, or (for furthest
  cave) out of range being treated as absent.

Every feature 001–004 test not explicitly touched above (elements, grid,
movement, falling, rolling, pushing, crushing, grab, enemies, detonation,
explosions, amoeba, magic wall, expanding wall, quota-and-door,
stack-resolution, terminal-and-restart, determinism, the Classroom theme's
existing entries) MUST still pass unchanged (FR-052).

## Validate the build is still a single, dependency-free file

```bash
npm run build
```

**Expected outcome**: unchanged — `dist/index.html` is the only file play
depends on, still with the full session shell (screens, HUD, eight caves)
running (FR-053).

## Validate `file://` playback (maintainer, in a browser — see spec's "Verified by the maintainer at review time")

1. Run `npm run build`, then open `dist/index.html` directly from disk.
2. From the title screen, confirm the game's name, a high score (blank on
   first-ever run), and a furthest-cave badge are shown, and that pressing
   the start key begins a new game at cave one with score 0 and 3 lives,
   regardless of any furthest-cave value shown.
3. Play through cave one; confirm the HUD shows stars-of-quota, the
   countdown, score, and lives at once and continuously, and that the cave
   intro names the cave and states its quota and time limit before the
   clock starts.
4. Let a hazard kill the kid; confirm exactly one life is lost, the
   life-lost screen appears briefly (or is skipped with a keypress), and
   the same cave reloads in its starting state — confirm this "feels
   instant" (spec: "if a player notices the wait, the delay is too long").
5. Run a cave's clock down to zero with no input; confirm the kid dies with
   no explosion, and that a life is lost the same as any other death.
6. Complete a cave with time remaining; confirm the bonus tally reads as a
   reward (fast enough not to bore, slow enough to see), that skipping it
   with a keypress lands on the same total, and that the next cave's intro
   follows.
7. Lose all three lives; confirm the game-over screen shows the final
   score, then returns to the title, and that the title's high score
   updates only if that run beat it.
8. Complete cave eight; confirm the win screen appears (not a ninth cave),
   shows the final score, and returns to the title.
9. Press pause mid-cave; confirm the game visibly stops (clock included),
   nothing moves, and a second press resumes exactly where it left off.
10. Press restart at several points — mid-play, while paused, right as an
    explosion starts, on the life-lost screen, and during the cave intro —
    and confirm each behaves per FR-027/FR-027a: the first three each cost
    one life and reload at once; the last two cost nothing.
11. Reload the page (fresh tab) after a run with a new high score and a
    cave reached past one; confirm both survive. If your browser supports
    disabling `localStorage` for the page, confirm the game still starts
    and plays normally with no best score and no furthest cave shown, and
    no visible error.
12. Confirm every string this feature shows — title, cave intro, paused,
    life-lost, game over, win, HUD labels — reads in Classroom voice, and
    that holding a key across a screen transition never skips two screens
    in one press (FR-049).
13. Confirm the frame rate holds through all eight caves, including cave
    eight's combined mechanics, at the shipped cell size and window size.

## Validate the theme contract (maintainer, at review)

- Read the Classroom theme's new fields (`title`, `hud.*`,
  `caveIntro.template`, `paused.label`, `lifeLost.label`, `gameOver.label`,
  `won.label`) and confirm every one is present, and that the existing
  `messages.dead`/`messages.completed` in-play banners are untouched and
  distinct from the new full-screen wording.
- Confirm by inspecting the diff that zero rendering or session code
  branches on theme identity, and that adding a further theme would need
  only a new registry entry (FR-047, SC-013).
- Confirm by inspecting the diff that the sim gained exactly one rule (the
  cave clock) and no notion of "points" or "lives" anywhere in `src/sim/`
  (FR-045, FR-050).
