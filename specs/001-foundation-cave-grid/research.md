# Phase 0 Research: Foundation — Cave Grid, Deterministic Tick, Themed Renderer, Digging Player

The spec (`spec.md`) contains no `[NEEDS CLARIFICATION]` markers — its
Assumptions section already resolved every open question a spec author would
normally leave to research (tick rate ballpark, dead-zone tuning ownership,
scope of input modes, absence of persistence). This document instead records
the technology and pattern decisions needed to turn that spec into a project
skeleton, since this is the first feature and no code exists yet.

## Decisions

### Decision: Project scaffold — Vite + `@sveltejs/vite-plugin-svelte` + `vite-plugin-singlefile`

- **Rationale**: Constitution Principle I requires a single self-contained
  `dist/index.html` that runs via `file://`; Principle IV fixes the stack as
  Svelte 5 + Vite. `vite-plugin-singlefile` inlines the built JS/CSS into the
  HTML output and is the standard, minimal-dependency way to satisfy
  Principle I without hand-rolling an inliner.
- **Alternatives considered**: A hand-written bundler step (rejected — more
  code to maintain than a battle-tested plugin, no constitutional upside);
  webpack with `html-webpack-inline-source-plugin` (rejected — the
  constitution already names Vite, and Vite's dev server is faster for the
  iterate-then-build loop this pipeline uses).

### Decision: Sim state as a typed-array grid, not an array of objects

- **Rationale**: Constitution Principle VI requires an allocation-free hot
  loop; FR-004 requires a per-cell moved-this-tick flag. A `Uint8Array` (or
  similar) of element ids plus a parallel bit-per-cell flag array avoids
  per-cell object allocation entirely and makes the "already moved" check an
  O(1) array read. Grid dimensions are read from cave data (FR-036), so the
  typed arrays are sized at cave-load time, not compile time.
- **Alternatives considered**: `Array<Cell>` of plain objects (rejected —
  allocates per cell, and per FR-036 must not hardcode a size, but object
  arrays don't gain anything from that flexibility that typed arrays lack);
  a `Map` keyed by coordinate (rejected — far slower for a full-grid scan,
  and scan order, which is load-bearing per the constitution, is easiest to
  guarantee by iterating a flat typed array in index order).

### Decision: PRNG — small seeded generator implemented in the sim, no library

- **Rationale**: FR-008/FR-009 require the sim to own a seeded PRNG seeded
  from cave data, with no `Math.random`. A small, well-known deterministic
  algorithm (e.g., mulberry32 or an xorshift variant) implemented as ~10
  lines of TypeScript keeps Principle IV's "no runtime dependency without
  justification" intact — this feature has no consumer of randomness yet
  (Assumptions: "declared and seeded here; nothing in this feature consumes
  it yet"), so the bar for pulling in a package is not met.
- **Alternatives considered**: An npm PRNG package (rejected — unjustified
  dependency for code this small, and pulls in a dependency before any
  feature actually consumes randomness); `Math.random` seeded indirectly
  (rejected outright — explicitly forbidden by Principle II and FR-008).

### Decision: ASCII cave format is a shared module (`src/sim/ascii.ts` + `src/sim/elements.ts`), consumed by both cave data and tests

- **Rationale**: FR-032 requires exactly one character-to-element mapping
  shared by shipped cave data and by tests. Putting the character map and the
  ASCII<->grid conversion functions in `src/sim/` (not in `tests/`) means the
  starter cave (`src/caves/starter.ts`) and the test helper
  (`tests/sim/helpers/ascii-cave.ts`) both import the same module — there is
  structurally only one mapping to drift.
- **Alternatives considered**: Duplicating a character map in test helpers
  for convenience (rejected — directly violates FR-032 and User Story 3's
  premise that a cave drawing means the same thing in both places).

### Decision: Camera is a plain-TypeScript module under `src/lib/render/`, computed per frame from sim reads

- **Rationale**: FR-029 requires the camera to live entirely in the
  rendering layer and never be a tick input. Implementing it as a pure
  function `(playerPos, caveDims, viewportSize, prevCameraPos) -> nextCameraPos`
  that the render loop calls, reading only the sim's read-only accessors
  (FR-005), keeps it structurally incapable of feeding back into the sim —
  there is no channel for it to do so.
- **Alternatives considered**: Storing camera position as Svelte component
  state updated reactively on every sim tick event (rejected — works, but
  blurs the boundary CLAUDE.md draws; a plain function is easier to unit-test
  in isolation and impossible to accidentally wire into the tick).

### Decision: Keyboard input tracked as held-key state in the shell, reduced to one direction per tick

- **Rationale**: FR-019–FR-021 require the shell (not the sim) to track
  key-down/key-up state and resolve "most recently pressed still-held
  direction wins" (FR-020), reporting a single direction-or-nothing per tick.
  This is a small `Set`/ordered-list of currently-held directions with
  timestamps of press order (order, not wall-clock duration, is what
  matters), updated by keydown/keyup listeners with `preventDefault` on the
  four directions plus WASD (FR-022, to stop page scroll).
- **Alternatives considered**: Letting the sim see raw key events (rejected
  — forbidden by Principle II, no DOM access in sim code); relying on OS key
  repeat for cadence (explicitly forbidden by FR-021, since repeat rate
  varies per machine).

### Decision: Render loop and tick loop are two independent fixed-timestep loops, both driven by `requestAnimationFrame` with accumulators

- **Rationale**: FR-023 requires drawing to run on its own loop, decoupled
  from the tick loop. The standard fixed-timestep-with-accumulator pattern
  (accumulate elapsed time, step the sim in fixed-size increments, render
  once per animation frame reading whatever the latest sim state is) satisfies
  this and also satisfies the backgrounded-tab edge case: clamping the
  accumulator's maximum carried-over time prevents a burst of catch-up ticks
  after the tab is restored (spec Edge Cases).
- **Alternatives considered**: `setInterval` for the tick loop (rejected —
  drifts and keeps running work in background tabs at an uncontrolled rate,
  making the clamp-on-resume requirement harder rather than easier);
  coupling tick rate to render frame rate (explicitly the thing FR-023
  forbids, and would make walking speed vary with display refresh rate).

## Outstanding Unknowns

None. All Technical Context fields in `plan.md` are resolved by the
constitution, the spec's own Assumptions section, or the decisions above.
