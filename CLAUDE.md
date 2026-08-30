# Recess Rocks

A Boulder Dash clone (elementary-school retheme) built as a single
self-contained `dist/index.html` (Svelte 5 + Vite + vite-plugin-singlefile)
that must run via `file://`. The rules that govern every spec live in
`.specify/memory/constitution.md` — read it before changing anything.

- `npm test` — the merge gate: builds, then runs the vitest suite. Run it before
  any PR. It builds first on purpose — part of the suite asserts that `dist/`
  holds exactly one self-contained `index.html`, and that check is worthless
  against a stale or missing build.
- `npm run test:unit` — the suite alone, for fast iteration on sim rules
- `npm run build` — single-file build into `dist/`

## The two halves, and the line between them

| | Lives in | Rule |
| --- | --- | --- |
| **Sim** | `src/sim/**` | Plain TypeScript. No Svelte, no DOM, no `Math.random`, no `Date.now`. Pure function of (grid, input, tick) over a typed-array grid, with all randomness from the sim's own seeded PRNG. |
| **Shell** | `src/lib/**`, `src/*.svelte` | Svelte UI, canvas rendering, input handling, audio, storage. Reads the sim; never reimplements it. |

Crossing that line is how this project breaks. A rendering concern that needs
sim state gets a read-only accessor, not a Svelte import inside `src/sim/`.

## Three things that are easy to get wrong

**Scan order is behavior.** The tick scans top-to-bottom, left-to-right with a
per-cell "moved this tick" flag. A boulder that falls into an already-scanned
cell resumes next tick. This looks like a bug and is not — it is what makes
Boulder Dash chains resolve the way players expect. Do not "fix" it into a
simultaneous update.

**Falling vs. resting matters.** A boulder crushes only while it is falling. The
falling flag is part of cell state, not derived at read time.

**Themes are data.** `src/lib/themes/` maps element ids to colors, glyphs,
labels, and sounds. Adding a theme must touch no file under `src/sim/` and no
rendering logic. If you find yourself writing `if (theme === 'classroom')`
anywhere, the theme contract is missing a field — add the field.

## Testing physics

Sim tests are written as small ASCII caves: a starting grid, a tick count, and
the expected grid. That format is the point — a rule you cannot express that way
is a rule you probably do not understand yet. Every spec that adds or changes a
physics rule ships a test that pins it, and no spec may regress an earlier
rule's test.

CI has no browser. Anything that needs a real canvas, real audio, or a real
gamepad is verified by the maintainer at review time, and the spec says what to
look at.
