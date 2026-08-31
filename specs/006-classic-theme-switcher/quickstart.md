# Quickstart: Classic Theme And An In-Game Theme Switcher

How to validate this feature end-to-end once implemented. See
[data-model.md](./data-model.md) for entity shapes and
[contracts/theme-registry-api.md](./contracts/theme-registry-api.md),
[contracts/keyboard-api.md](./contracts/keyboard-api.md), and
[contracts/save-api.md](./contracts/save-api.md) for the extended module
surfaces. This extends features 001–005's quickstarts — their checks
(single-file build, movement/dig/wall behavior, falling/rolling/pushing/
crushing/the door, enemy patrol, detonation, explosions/chains, amoeba,
magic wall, expanding wall, the arcade shell's screens/score/lives/
persistence) still apply unchanged.

## Prerequisites

- `npm install` at the repo root (unchanged from features 001–005)

## Validate the theme contract and switcher in isolation (no browser)

```bash
npm test
```

**Expected outcome**: builds first, then the full `vitest` suite passes
with no browser, canvas, storage device, or audio device present,
covering — per the spec's Independent Tests — every case in the checklist
below:

**The registry (User Story 1):**

- `listThemes()` enumerates exactly two themes, in a stable order, with
  `classroom` first (the default);
- `hasTheme()` returns `true`/`false` without throwing for a registered
  and an unregistered id;
- registering a second theme under an already-registered id throws,
  naming the duplicate id;
- the Classic theme has an entry for all fourteen element ids plus the
  open-door and running-magic-wall appearances, and every player-facing
  string field the contract declares (`displayName` included);
- Classic's `exit` entry is byte-identical to its `steelWall` entry;
  Classic's `doorOpenEntry`/`magicWallActiveEntry` are each visibly
  distinct from their inert counterparts and from every other entry;
- Classic's `title`/`displayName` contain no trademarked original title.

**Switching is lossless (User Story 2):**

- driving a fixture cave for a fixed tick count, switching the active
  theme id at a chosen tick, produces a grid/tick-count/timer/score/
  diamond-count/lives identical to the same run with no switch, at every
  tick before, at, and after the switch point;
- the same check holds for a switch while paused, and for a switch on
  every non-`'playing'` screen (title, cave-intro, life-lost, game-over,
  win) — the screen's own state (e.g. `screenTicks`) is unaffected;
- a held direction survives a switch — `consumeDirection()` before and
  after a mid-hold switch reports the same direction with no gap;
- selecting the already-active theme is a no-op: no state change
  detectable by reference/value equality, no `writeSave` call;
- pressing `cycleTheme` on the title screen changes the active theme id
  and leaves `session.screen === 'title'` (no `startGame()` call); any of
  the existing start/direction/grab keys still starts the game from title,
  unaffected by this feature;
- pressing `cycleTheme` while a direction key is held does not interrupt
  `consumeDirection()`'s report for that tick — the two consume calls are
  independent (`CYCLE_THEME_KEYS` disjoint from every gameplay action's
  keys, checkable directly by comparing the declared sets, SC-011).

**The game remembers your look (User Story 3):**

- a stubbed `StorageLike` written with a registered theme id round-trips
  through `readSave()`/`resolveStoredThemeId()` to that same id;
- the same for an unregistered id, a non-string value (number, object,
  `null`), and no stored data at all — every case resolves to Classroom's
  id, with `highScore`/`furthestCave` unaffected;
- a throwing `StorageLike` (read or write) degrades silently: the switch
  still applies for the session (the in-memory `$state` changes), nothing
  reaches the player, and a subsequent `readSave()` call still returns the
  all-defaults-safe record rather than throwing;
- `writeSave({ themeId })` followed by `writeSave({ highScore })` (no
  `themeId` in the second call) leaves the stored `themeId` from the first
  call untouched — the per-field merge, not a full-record overwrite;
- `writeSave({ themeId: 'a-lexically-earlier-id' })` after
  `writeSave({ themeId: 'z-lexically-later-id' })` still results in the
  earlier id being stored — last-write-wins, not `Math.max`-shaped.

**A future theme cannot ship with holes (User Story 4):**

- the registry-wide completeness check passes for both shipped themes;
- a deliberately incomplete fixture theme (missing one element id, or one
  required string field) fails the check, and the failure message names
  both the fixture theme's id and the specific missing piece;
- adding a new id to `ELEMENT_IDS` without a matching theme update (a
  targeted test using a fixture element-id list) fails the check for
  every registered theme, not just one.

**No sim regression (FR-031):**

- every existing sim test from features 001–005 (elements, grid, movement,
  falling, rolling, pushing, crushing, grab, enemies, detonation,
  explosions, amoeba, magic wall, expanding wall, the cave clock,
  quota-and-door, stack-resolution, terminal-and-restart, determinism)
  passes unchanged;
- `git diff` (or the PR's file list, FR-016) touches no file under
  `src/sim/`.

## Validate the build is still a single, dependency-free file

```bash
npm run build
```

**Expected outcome**: unchanged — `dist/index.html` is the only file play
depends on, now with two selectable themes and the theme control present.

## Validate `file://` playback (maintainer, in a browser — see spec's Maintainer Review Notes)

1. Run `npm run build`, then open `dist/index.html` directly from disk.
2. On the title screen, confirm the theme control lists **Classroom** and
   **Classic** by display name, with the active one indicated, and that it
   is reachable and fully operable using **only the keyboard** (Tab/arrow
   keys or whatever focus model the control uses — no click required to
   reach or select an entry).
3. Select Classic. Confirm every element on screen, the background, and
   every player-facing string (title, HUD labels, messages) switches to
   the Classic look and wording immediately, with no reload and no visible
   flicker.
4. Confirm Classic's closed exit is genuinely indistinguishable from its
   steel wall, exactly as Classroom's is today.
5. Start a cave under Classic; confirm play behaves identically to
   Classroom — the same boulders fall the same way at the same times.
6. **Mid-cave, with a boulder in flight**, switch back to Classroom.
   Confirm the boulder does not stutter, teleport, restart its fall, or
   skip/repeat a tick — it simply looks like an eraser again on the very
   next drawn frame.
7. **While holding a movement key**, switch themes. Confirm the kid keeps
   moving through the switch with no stutter or dropped input.
8. Press the theme-cycle key (default `T` — confirm the actual bound key
   at review, research.md flags this as the maintainer's pick) several
   times in a row from the title screen. Confirm it cycles between the two
   themes and does **not** start the game; confirm every other key (space,
   Enter, an arrow key, Shift) still starts the game as it does today.
9. Press the theme-cycle key mid-cave while holding a movement key.
   Confirm the kid keeps moving on that key through the cycle — the cycle
   key never suppresses, delays, or consumes the movement key.
10. Switch themes while paused, on the cave-intro screen, on the
    life-lost screen, on the game-over screen, and on the win screen;
    confirm each screen's own state (countdown/tally/etc.) is unaffected
    and the control is visible and usable on every one of them.
11. Select the already-active theme again; confirm no flicker, no
    re-render artifact, nothing visibly happens.
12. Reload the page after selecting Classic; confirm the game opens in
    Classic, with high score and furthest cave intact.
13. If your browser supports disabling `localStorage` for the page,
    confirm the game still opens (in Classroom), theme switches still
    apply for that session, and no error or warning is ever shown.
14. Confirm the same theme list also responds to a click/tap per entry,
    in addition to (never instead of) keyboard operation.
15. Confirm the frame rate holds through a theme switch — no visible dip
    or stutter, per the project's 30fps floor.
16. Read the diff (or the PR description, FR-016) and confirm: zero files
    under `src/sim/` changed; zero comparisons against a theme id anywhere
    in rendering or shell logic; adding Classic touched only theme data
    and the registration entry point, not the theme control or the
    renderer.
