# Quickstart: Foundation — Cave Grid, Deterministic Tick, Themed Renderer, Digging Player

How to validate this feature end-to-end once implemented. See
[data-model.md](./data-model.md) for entity shapes and
[contracts/sim-api.md](./contracts/sim-api.md) for the sim's exact surface.

## Prerequisites

- Node.js (version the project's `package.json#engines` declares once
  created — no other tooling needed)
- `npm install` at the repo root

## Validate the sim in isolation (no browser)

```bash
npm test
```

**Expected outcome**: The full `vitest` suite passes with no browser, canvas,
or audio device present (FR-042, FR-045), and covers — per FR-041 — grid
construction, every cave-parsing rejection case, movement into empty/dirt/
brick wall/steel wall/the grid boundary, a no-input tick, a sustained same-
direction run standing in for a held key, a cave with different dimensions
than the starter cave, and a multi-tick determinism replay (SC-005: at least
100 ticks, identical grid on every run).

## Validate the build is a single, dependency-free file

```bash
npm run build
```

**Expected outcome**: `dist/index.html` is produced, and it is the only file
play depends on — no sibling `.js`, `.css`, image, font, or audio file is
fetched at play time (FR-043, SC-008). Confirm by inspecting `dist/` — it may
contain a `public/`-sourced sibling if one is ever added, but nothing under
`src/` should produce a second play-time file.

## Validate `file://` playback (maintainer, in a browser — see spec's
## "Verified by the maintainer at review time")

1. Run `npm run build`.
2. Disconnect the network (or use the browser's offline mode).
3. Open `dist/index.html` directly by double-clicking it (no `npm run dev`,
   no local server).
4. **Expected outcome** (SC-001): the starter cave is visible and the kid is
   controllable within 10 seconds, no click-to-start step, zero console
   network errors.
5. Press each arrow key and each of W/A/S/D in turn:
   - Into an empty cell: the kid steps there (FR-013 / Acceptance Scenario 1).
   - Into dirt: the dirt clears permanently and the kid steps there (FR-014 /
     Scenario 2).
   - Into a brick wall or steel wall: the kid does not move (FR-015 /
     Scenarios 3–4).
   - Toward the cave edge: the kid does not leave the grid (FR-016 /
     Scenario 5).
6. Hold a direction key for several seconds: confirm the kid advances one
   cell per tick at a steady, consistent cadence — this is the "movement
   feel" item the spec asks the maintainer to eyeball, not just that it
   moves but that it moves like Boulder Dash (Scenario 6, spec's "Verified
   by the maintainer" section).
7. Walk toward a far corner: confirm the viewport scrolls to follow, using a
   dead zone (no lurch on ordinary steps) and stops scrolling exactly at the
   cave boundary without ever showing space outside the cave (Scenario 7,
   FR-029, SC-011).
8. Resize the window smaller/larger than the 40x22 cave: confirm cells stay
   square and the camera adapts without changing how the sim behaves.
9. Background the tab for several seconds and restore it: confirm the kid
   has not teleported from a burst of catch-up ticks.

## Validate the theme contract (maintainer, at review — User Story 4)

- Grep the rendering code for literal color/glyph/label values — there
  should be none; every visual attribute must resolve through the theme
  table keyed by element id (FR-024).
- Confirm the Classroom theme (`src/lib/themes/classroom.ts`) has an entry
  for all 14 declared element ids, including the 9 with no sim behavior yet
  (FR-026).
- Confirm dirt reads as notebook paper, brick wall as cinder brick, steel
  wall as a locker door, and the player as a kid with a backpack, at the
  shipped cell size.
