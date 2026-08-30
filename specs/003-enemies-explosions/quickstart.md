# Quickstart: Fireflies, Butterflies, and Explosions

How to validate this feature end-to-end once implemented. See
[data-model.md](./data-model.md) for entity shapes and
[contracts/sim-api.md](./contracts/sim-api.md) for the sim's exact surface.
This extends features 001/002's quickstarts — their checks (single-file
build, movement/dig/wall behavior, falling/rolling/pushing/crushing/the
door) still apply, with feature 002's crush check now expecting the amended
bloom-and-empty-space grid (FR-013) rather than a silent death.

## Prerequisites

- `npm install` at the repo root (unchanged from features 001/002)

## Validate the sim in isolation (no browser)

```bash
npm test
```

**Expected outcome**: builds first, then the full `vitest` suite passes with
no browser, canvas, or audio device present, covering — per FR-036 — every
case in the checklist below, each expressed as a small ASCII cave, a tick
count and optional per-tick inputs, and the expected grid:

- a firefly patrolling a simple loop for several ticks, cell by cell, and a
  butterfly patrolling the same loop mirrored;
- each enemy type turning correctly at a corner, in each of the three step
  outcomes (preferred side, straight ahead, turn-in-place);
- the cadence: one step per two ticks, checked at ticks 1, 2, and 3;
- an enemy blocked on every side turning in place without moving, forever;
- an enemy refusing to enter dirt, a body, a wall, the door, and another
  enemy;
- a falling eraser detonating each enemy type, and a falling gold star doing
  the same; a resting eraser above each enemy type detonating nothing over
  many ticks;
- a butterfly's blast leaving exactly a 3x3 of gold stars, counted; a
  firefly's blast leaving exactly a 3x3 of empty space;
- a blast sparing a steel wall and the classroom door inside its 3x3, and
  destroying paper, brick, an eraser, and a gold star elsewhere in it;
- a blast clipped at an edge and at a corner of the grid, with no wrap and
  no error;
- the explosion lifetime: a 3x3 stays explosion for exactly the specified
  ticks and converts on the expected tick, all cells at once;
- a gold star created by a blast not moving on the tick it appears, then
  falling normally afterward;
- a chain reaction through several enemies — including a mixed chain of
  both types leaving both gold stars and empty space — pinned tick by tick,
  showing exactly one link detonating per tick;
- the kid dying on contact with each enemy type from each of the four
  orthogonal directions, and *not* dying from a diagonal;
- the kid caught in a blast started by something else, and a falling eraser
  crushing the kid, leaving a 3x3 bloom that resolves to empty space with
  the eraser consumed (the amended feature-002 rule);
- the kid dying to the first link of a chain, with the rest of the cascade
  still resolving afterward and a final grid showing the whole chain
  completed;
- restart pressed during the dying state, taking effect exactly as it does
  after death;
- the cave becoming dead and freezing on the first tick with no explosion
  cell left, with the resolved grid unchanged from then on;
- gold stars produced by a blast counting toward quota and opening the
  door;
- a cave whose quota exceeds its drawn gold stars but is within the
  butterfly allowance loading successfully, and one that exceeds even that
  allowance being rejected at parse time;
- a full replay: the same cave and inputs producing an identical grid,
  collected count, and status after a run that includes patrols, a chain,
  and a death.

Every feature-001/002 test not listed as amended above MUST still pass
unchanged (FR-038).

## Validate the build is still a single, dependency-free file

```bash
npm run build
```

**Expected outcome**: unchanged — `dist/index.html` is the only file play
depends on (SC-012).

## Validate `file://` playback (maintainer, in a browser — see spec's
## "Verified by the maintainer at review time")

1. Run `npm run build`, then open `dist/index.html` directly from disk.
2. Watch a pencil sharpener patrol its loop for a full circuit and confirm
   its path and timing are learnable — not a blur — and that it visibly
   moves at half the kid's speed (SC-001, SC-002, feel item).
3. Watch a paper airplane patrol the mirror direction.
4. Walk the kid into reach of each enemy type from an orthogonal direction
   and confirm a clear, visible bloom, and that the moment reads as "an
   enemy got me" rather than a crash (SC-003, feel item).
5. Confirm approaching an enemy diagonally does not kill the kid, and that
   squeezing past diagonally feels like a real, learnable technique rather
   than a bug (SC-003, feel item).
6. Dig an eraser loose above a pencil sharpener and confirm it blows a 3x3
   hole in the cave; dig one loose above a paper airplane and confirm it
   leaves a 3x3 of gold stars, collectible toward quota (SC-005, SC-009).
7. Set up a row of several enemies and detonate one end; confirm the chain
   visibly tears down the row one enemy per tick, and that the pace reads
   as exciting rather than confusing (SC-008, feel item).
8. Confirm the bloom's two-tick lifetime is long enough to see and short
   enough not to stall play (feel item).
9. Confirm a blast never opens a hole through the outer steel-wall border or
   through the classroom door, even when a chain reaches right up against
   either.
10. Die to the first link of a chain and confirm the whole cascade finishes
    on screen — bloom, cascade, stop — before the game freezes and shows the
    death message; confirm it never looks like the game kept playing
    without you (FR-015, SC-016, feel item).
11. Press restart during that still-resolving moment and confirm it takes
    effect immediately, exactly as it does once the cave is fully dead.
12. Confirm the pencil sharpener and paper airplane are distinguishable from
    each other, from erasers, and from gold stars at the shipped cell size,
    and that the paper airplane visually reads as "the thing that's about to
    pay out" (SC-014, feel item).
13. Load a cave with several enemies patrolling and a chain of at least six
    blasts and confirm the frame rate holds (SC-013, feel item — no browser
    profiler required, but note anything janky).
14. Play the reworked starter cave without prior knowledge of the
    eraser-on-airplane trick and confirm the quota is reachable without it,
    but that discovering the trick (by accident or on purpose) makes the
    cave faster to finish (FR-026, FR-027, feel item).

## Validate the theme contract (maintainer, at review)

- Read the Classroom theme's `firefly` and `butterfly` entries and confirm
  the labels are exactly "Pencil Sharpener" and "Paper Airplane" (FR-029).
- Confirm by inspecting the diff that this renaming touched only
  `src/lib/themes/classroom.ts` (and, if needed for distinguishability, its
  glyph/color values) — zero files under `src/sim/`, zero rendering-logic
  changes (SC-014, FR-030).
- Confirm explosions render via the theme's existing `explosion` entry with
  no drawing-site branching added (FR-031).
