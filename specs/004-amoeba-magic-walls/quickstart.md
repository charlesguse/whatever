# Quickstart: Amoeba, Magic Wall, and Expanding Wall

How to validate this feature end-to-end once implemented. See
[data-model.md](./data-model.md) for entity shapes and
[contracts/sim-api.md](./contracts/sim-api.md) for the sim's exact surface.
This extends features 001–003's quickstarts — their checks (single-file
build, movement/dig/wall behavior, falling/rolling/pushing/crushing/the door,
enemy patrol, detonation, explosions/chains) still apply unchanged.

## Prerequisites

- `npm install` at the repo root (unchanged from features 001–003)

## Validate the sim in isolation (no browser)

```bash
npm test
```

**Expected outcome**: builds first, then the full `vitest` suite passes with
no browser, canvas, or audio device present, covering — per FR-039 — every
case in the checklist below, each expressed as a small ASCII cave, a tick
count and optional per-tick inputs, and the expected grid:

- amoeba growing into dirt, and into empty space, over a fixed tick count;
- amoeba refusing to grow into a body, a wall, the door, the kid, an enemy,
  an explosion, and off the grid edge;
- an enclosed amoeba turning entirely to diamonds on the expected tick;
- an amoeba grown past its size limit turning entirely to boulders on the
  expected tick;
- the precedence of FR-009: an amoeba that is over its limit and sealed on
  the same tick becomes boulders;
- a diamond or boulder created by an amoeba conversion not moving on the
  tick it appears, then falling normally afterwards;
- amoeba growth being identical across two runs of the same cave and seed,
  and differing between two different seeds, over enough ticks for a drift
  of one draw to show;
- a fully enclosed blob still taking its one growth draw per cell (FR-005a),
  pinned by a cave in which a push later in the same run resolves
  identically whether the blob had anywhere to grow or not;
- a larger blob growing faster than a smaller one at the same rate
  (FR-005), pinning that the probability is per cell and not per blob;
- two disconnected blobs converting together as one collective;
- a falling eraser detonating amoeba, and a resting one detonating nothing
  over many ticks;
- amoeba destroyed by a blast without chaining;
- a magic wall converting a falling boulder to a diamond, and a falling
  diamond to a boulder, each emerging below the wall and continuing to
  fall;
- a magic wall activating on the first body to fall in, with that same body
  converted;
- a magic wall expiring on the documented tick, and the next body falling
  in stopping on top of it unchanged;
- a magic wall that is never activated behaving as solid wall for a long
  run;
- the blocked-destination case (FR-018a): a body falling into an active
  wall whose destination cell is occupied, and one falling into a wall on
  the bottom row, each destroyed with nothing emerging and the countdown
  running on;
- a magic wall two or more cells thick, with the body emerging below the
  run;
- two bodies converting on the same tick in different columns;
- the kid being blocked by a magic wall in each of its three phases;
- an expanding wall filling a gap one cell per tick in each direction and
  stopping at an obstruction;
- an expanding wall refusing to grow into dirt and refusing to grow
  vertically;
- a cell created by expanding wall growth not growing again until the next
  tick;
- a full replay: the same cave, seed, and ordered inputs producing an
  identical grid, collected count, and status after a run that includes
  amoeba growth, a magic wall conversion, and expanding wall growth.

Every feature 001–003 test not amended by this feature's Non-regression
section (FR-041) MUST still pass unchanged.

## Validate the build is still a single, dependency-free file

```bash
npm run build
```

**Expected outcome**: unchanged — `dist/index.html` is the only file play
depends on (SC-011).

## Validate `file://` playback (maintainer, in a browser — see spec's
## "Verified by the maintainer at review time")

1. Run `npm run build`, then open `dist/index.html` directly from disk.
2. Watch a blob of spilled glue for a while and confirm its growth *feels*
   like a creeping threat at the shipped tick rate and default growth rate —
   visibly moving, not a slideshow, not a flood (SC-001, feel item).
3. Leave a blob alone until it reaches its size limit and confirm it turns
   to erasers within a cave's natural span, not after minutes of standing
   still (feel item).
4. Wall a blob in with erasers and dirt and confirm the moment of sealing
   reads as an intentional, inviting decision, not a hidden trap (feel
   item).
5. Drop an eraser into the magic wall and confirm a gold star falls out
   below it; drop a gold star in and confirm an eraser falls out.
6. Confirm the active magic wall is obviously *running* — the visual says
   "a clock is ticking," not "this wall is a different color" — and that
   its duration reads as a few seconds, not an instant or an eternity
   (FR-033, feel item).
7. Let the wall run out, then drop something into it and confirm it simply
   stops on top, unconverted.
8. Restart the cave and confirm the wall is dormant again, indistinguishable
   in appearance from how it looked once dead in the previous life —
   confirm this with the whole shell running, not just the canvas: no
   label, tooltip, accessibility text, or debug overlay gives the phase
   away (FR-034, FR-034a, feel item).
9. Watch a bookshelf grow into an open corridor at one cell per tick in
   each direction and confirm it reads as menacing rather than either
   imperceptible or unfair (feel item).
10. Play the shipped starter cave without prior knowledge of these three
    elements and confirm: the glue is met before it's a problem, the magic
    wall is discovered by dropping something into it, and the bookshelf
    closes exactly one route the player did not need — and confirm the
    cave is still winnable without using any of the three (FR-031, feel
    item).
11. Confirm the amoeba, magic wall (inert and active), and expanding wall
    are each visually distinguishable from each other and from every other
    element at the shipped cell size (SC-013).
12. Load a cave with an amoeba of at least 100 cells, an active magic wall,
    and a growing expanding wall together and confirm the frame rate holds
    (SC-012, feel item — no browser profiler required, but note anything
    janky).

## Validate the theme contract (maintainer, at review)

- Read the Classroom theme's `amoeba`, `magicWall`, and `expandingWall`
  entries and confirm the labels are exactly "Spilled Glue," "Sticker
  Machine," and "Bookshelf" (FR-032), and that "Pencil Sharpener" (firefly,
  feature 003) is untouched.
- Confirm `Theme` carries exactly one new field, `magicWallActiveEntry`, and
  that `elements.magicWall` and `magicWallActiveEntry` are visually distinct
  from each other and from every other entry (FR-033, FR-034).
- Confirm by inspecting the diff that all three elements' behavior lives
  entirely in `src/sim/`, with zero drawing-logic branches on theme identity
  or on `magicWallPhase` beyond the single dormant/dead-vs-active choice
  (SC-013, FR-035).
- Confirm by inspecting the diff and the running shell that nothing
  shipped — glyph, label, tooltip, accessibility text, or debug overlay —
  reveals whether an inert-looking magic wall is dormant or dead (FR-034a,
  SC-013).
