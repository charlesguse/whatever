# Quickstart: Rock Physics — Falling, Rolling, Pushing, Crushing, and the Exit

How to validate this feature end-to-end once implemented. See
[data-model.md](./data-model.md) for entity shapes and
[contracts/sim-api.md](./contracts/sim-api.md) for the sim's exact surface.
This extends feature 001's quickstart — its checks (single-file build,
feature-001 movement/dig/wall behavior) still apply unchanged (FR-048) and
are not repeated here.

## Prerequisites

- `npm install` at the repo root (unchanged from feature 001)

## Validate the sim in isolation (no browser)

```bash
npm test
```

**Expected outcome**: builds first, then the full `vitest` suite passes with
no browser, canvas, or audio device present, covering — per FR-046 — every
case in the checklist below, each expressed as a small ASCII cave, a tick
count, and the expected grid:

- a body falling one cell, and continuing over several ticks;
- a body stopping on dirt, on a wall, and on another body;
- a body rolling off another body and off a brick wall; **not** rolling off
  a steel wall or dirt; **not** rolling when the diagonal-below is occupied
  even though the side is empty; the left-first preference where both sides
  qualify;
- a falling body killing the kid; a resting body directly above the kid
  *not* killing them over many ticks; a falling diamond killing the kid too;
- a successful push under a seed/input sequence chosen to succeed; a push
  blocked by each kind of obstruction; a rejected vertical push; a rejected
  push of a falling boulder;
- an eligible push held for many ticks under a fixed seed producing an
  identical sequence of successes/failures on every run;
- a blocked push (beyond-cell occupied, beyond-cell off-grid, boulder
  falling) consuming **no** randomness — verified by checking a later
  eligible push lands on the same tick whether or not the blocked push was
  attempted first;
- a pushed boulder that then falls because nothing is under its new cell;
- collecting a diamond by walking into it, and by grabbing it; grabbing dirt
  without moving; grab doing nothing against a boulder, a wall, the door,
  and the cave boundary;
- the door solid below quota and enterable at quota; entering it completing
  the cave;
- a cave whose quota exceeds its diamond count rejected at parse time;
- both terminal states freezing the cave across further ticks;
- a restart mid-play and a restart from each terminal state, each followed
  by the same input sequence, producing the same grid, count, status, and
  push outcomes as the original run;
- a stack of bodies resolving across several ticks because of scan order.

Every feature-001 test (`movement.test.ts`, `cave-parsing.test.ts`,
`determinism.test.ts`, `grid.test.ts`, `elements.test.ts`) MUST still pass
unchanged (FR-048).

## Validate the build is still a single, dependency-free file

```bash
npm run build
```

**Expected outcome**: unchanged from feature 001 — `dist/index.html` is the
only file play depends on (SC-012).

## Validate `file://` playback (maintainer, in a browser — see spec's
## "Verified by the maintainer at review time")

1. Run `npm run build`, then open `dist/index.html` directly from disk.
2. Dig the notebook paper out from under an eraser and confirm it falls, at
   a cadence that reads as weight rather than teleporting (SC-001, feel item).
3. Stand in a dug column under a falling eraser and confirm it kills you
   with a clear, visible death message that identifies what happened, and
   that the page keeps responding to input afterward (SC-002, FR-030).
4. Stand under a resting eraser for a while and confirm nothing happens.
5. Drop an eraser onto a stack of erasers and watch it roll off and keep
   falling.
6. Lean into an eraser sideways with open space beyond it and hold the
   direction: confirm it eventually gives way (within roughly 40 ticks) and
   moves one cell, with the kid following into its old cell; confirm the
   chance feels like weight, not an unresponsive control (SC-005, feel item).
7. Lean into an eraser with a wall immediately beyond it and confirm it
   never budges, no matter how long you hold the key.
8. Walk into gold stars and confirm the collected/quota readout increases by
   one each time, is legible at the shipped cell size, and doesn't crowd the
   cave (SC-006, SC-015, feel item).
9. Hold the grab key and press into notebook paper, a gold star, an eraser,
   a wall, and the door — confirm the kid never moves, while paper clears
   and stars are still collected (SC-008).
10. Collect the last gold star to reach quota and confirm the classroom
    door — previously indistinguishable from a locker — begins flashing
    (confirm the closed door genuinely looked like a locker beforehand, and
    that the flash is eye-catching without being painful, feel items) and
    becomes enterable; walk in and confirm the cave reports completion
    (SC-007).
11. Press the restart key from mid-play, from the death state, and from the
    completed state; confirm each time the cave returns to its exact
    starting layout and the collected count resets to zero (SC-010).
12. Load a cave with many bodies falling/rolling at once and confirm the
    frame rate holds (SC-013, feel item — no browser profiler required, but
    note anything janky).
13. Confirm the reworked starter cave teaches falling, rolling, pushing, and
    the door in a sensible order and is winnable by someone who has never
    played it, without being trivial (feel item).

## Validate the theme contract (maintainer, at review)

- Grep the rendering code for literal color/glyph/label/message/readout
  values — there should be none; every visual and text attribute resolves
  through the theme table (FR-037, FR-038).
- Confirm the Classroom theme's closed-door entry (`elements.exit`) is
  visually identical to its `elements.steelWall` entry, and that
  `doorOpenEntry`, `messages.dead`, `messages.completed`, and
  `readout.template` are all present (FR-038, FR-040).
- Confirm door flashing lives in `src/lib/render/canvas.ts` only, computed
  from the render loop's own frame timing, with no phase field anywhere in
  `CaveState` (FR-039).
