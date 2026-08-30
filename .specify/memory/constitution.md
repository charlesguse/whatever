# Recess Rocks Constitution

Recess Rocks is a faithful browser clone of **Boulder Dash** (First Star
Software, 1984) — specifically the mechanics of the *Super Boulder Dash*
compilation two brothers played on a school computer. It is a real arcade
game with real failure states, wrapped in a retheme that can be swapped at
runtime. Every decision optimizes for **mechanical fidelity first, theme
second** — the physics are the product; the pixels are a costume.

## Core Principles

### I. One Self-Contained Page (NON-NEGOTIABLE)

The shipped artifact is a **single self-contained `index.html`** (inline
CSS/JS, no external network requests at runtime). It MUST work when opened
directly from disk via `file://` — no web server, no CDN, no build step at
play time. `npm run build` produces `dist/index.html` as that single file,
and that same file is what GitHub Pages serves. Anything that breaks
`file://` playback (cross-file module scripts, `fetch` calls, external
images, web fonts, audio files) is a defect. This also means the game has no
base-path problem: it runs from any URL, or none.

### II. The Cave Simulation Is Deterministic And Tick-Based (NON-NEGOTIABLE)

Boulder Dash is not a physics toy; it is a **turn-based cellular grid**, and
its feel comes from exactly that. The sim advances in discrete ticks over a
2D grid of element cells, scanned in a fixed order (top-to-bottom,
left-to-right) with a per-cell "already moved this tick" flag so nothing is
processed twice in one scan. Scan order is load-bearing behavior, not an
implementation detail — a boulder falling into a cell that was already
scanned this tick continues next tick, and that is what makes chains resolve
the way players remember.

The sim is a **pure function of (grid, input, tick)**. All randomness runs
through a single seeded PRNG owned by the sim, so a cave plus a recorded
input sequence always replays identically. No `Math.random` in sim code, no
wall-clock time in sim code, no DOM access in sim code. This is what makes
Principle VII possible.

The canonical rules this project implements, and MUST NOT "improve":

- Boulders and diamonds fall when the cell below is empty, and keep falling
  while it stays empty.
- A boulder or diamond resting on another boulder, diamond, or brick wall
  **rolls** to the left or right when that side and the cell diagonally
  below it are both empty. It does not roll off steel walls or dirt.
- A **falling** boulder or diamond that lands on Rockford, a firefly, a
  butterfly, or the amoeba detonates. A resting one never does.
- Rockford walks into dirt (clearing it) and into diamonds (collecting
  them), and **pushes** a boulder horizontally only when the cell beyond it
  is empty. He cannot push up or down.
- Fireflies and butterflies patrol along surfaces with a fixed turning
  preference and explode on contact with Rockford. Fireflies explode into
  empty space; **butterflies explode into diamonds** — the most important
  scoring trick in the game.
- The amoeba grows into adjacent empty cells and dirt at a random rate; if
  it is ever fully enclosed it turns to diamonds; if it grows past its size
  limit it turns to boulders.
- The magic wall lies dormant until the first boulder falls into it, then
  runs for a fixed time, converting falling boulders to diamonds and falling
  diamonds to boulders, and then dies permanently for that cave.
- The exit is a wall until the cave's diamond quota is met, then flashes
  open; entering it ends the cave and converts remaining time to points.

Where a rule detail is genuinely ambiguous, the spec picks one behavior,
states it, and covers it with a test — it does not leave it to chance.

### III. Themes Are Data, Not Code (NON-NEGOTIABLE)

Element **identity** (what a cell is and how it behaves) is fixed and lives
in the sim. Element **appearance** (colors, glyphs, labels, sounds,
background) lives in a theme: a plain data object keyed by element id.
Adding a theme MUST touch zero simulation files and zero rendering logic —
only a new entry in the theme registry. If a theme cannot express something
without a sim change, that is a defect in the theme contract, not a reason
to special-case the theme.

The game ships at least two themes and an **in-game theme selector** that
switches live, mid-cave, without restarting or perturbing the sim. The
default theme is **Classroom** (elementary school supplies); a **Classic**
theme approximating the original's look is always available. The chosen
theme persists locally across sessions.

### IV. Simple, Dependency-Light Svelte

The stack is **Svelte 5 + Vite** with `vite-plugin-singlefile` to satisfy
Principle I. No other runtime dependencies without a spec that explicitly
justifies them. The sim core is plain TypeScript over typed arrays with no
Svelte imports; Svelte owns the UI shell (menus, HUD, controls, theme
picker), never the per-tick hot path. Rendering goes to a `<canvas>`.
Graphics are drawn in code — shapes, gradients, and text glyphs — never
image files, per Principle I.

### V. Input Is Keyboard-First, Everything Else Is Progressive

Keyboard is the reference control scheme and the one every cave is tuned
for: arrows/WASD to move, a hold-to-grab modifier, pause, restart-cave.
**Touch** (an on-screen d-pad sized for a real thumb) and **Gamepad API**
support are required, but both are feature-detected and their UI is hidden
where the platform lacks them — never broken, never a dead control. No input
mode may be the only way to reach any feature; a player with only a keyboard
can play and finish the entire game.

### VI. Performance Is A Feature

The game MUST hold a steady frame rate (target 60fps, acceptable >= 30fps) on
a mid-range laptop and a mid-range tablet at full cave size. The tick loop
runs on a fixed timestep decoupled from rendering. Keep the hot loop
allocation-free — no per-cell objects, no per-tick array building. If a
feature cannot stay smooth, simplify the feature; never ship jank.

### VII. Verifiable Without A Browser Harness

CI has no browser. Every feature keeps `npm run build` green (emitting a
single `dist/index.html`) and covers its sim rules with plain `vitest` unit
tests on the grid — no DOM, no canvas, no headless browser. Principle II
makes this easy and therefore mandatory: **every physics rule a spec adds or
changes ships with a test that pins it**, expressed as a small ASCII cave, a
number of ticks, and the expected grid. Regressions in earlier rules are
caught here, not by a human replaying caves. Feel, timing, and visuals are
the maintainer's job at review time; specs state what to eyeball. Do not add
browser-automation test infrastructure.

## Product Constraints

- **Elements** (the complete set; new ones require a spec): empty, dirt,
  boulder, diamond, brick wall (things roll off it), steel wall (nothing
  rolls off it, nothing destroys it), Rockford, firefly, butterfly, amoeba,
  magic wall, expanding wall, exit, and explosion.
- **Caves**: **eight** hand-designed caves, ordered so each one teaches or
  tests one mechanic before combining them, each with its own diamond quota,
  time limit, and cave-scoped tuning (amoeba growth rate, magic wall
  duration). Cave layouts are **original designs by this project** — inspired
  by the mechanics, never ripped level data from the commercial game.
- **Cave format**: caves are declarative data (a compact ASCII grid plus
  parameters), not code, and live in one place. Adding or editing a cave
  MUST NOT touch the sim.
- **Arcade shell**: score, diamond counter with quota, countdown timer,
  three lives, cave-by-cave progression, death-and-retry on the current
  cave, and a game-over that returns to the title. A cave restart is always
  one key away — failure is the game, so recovering from it must be instant.
- **Sound** is synthesized in code only (WebAudio oscillators — no audio
  files, per Principle I), always mutable, per-theme, and never
  load-bearing: the game is fully playable silent and stays playable where
  audio is unavailable.
- **Persistence**: theme choice, high score, and furthest cave reached save
  to `localStorage` and only there. Nothing leaves the device, ever. Storage
  failures are silent and non-fatal.
- **Deployment**: GitHub Pages serves the latest `main` build; the page
  itself is the downloadable artifact.

## Development Workflow

- Features flow through the Wing Commander pipeline: issue → spec → plan →
  tasks → implement ⟲ converge → final PR. Humans merge everything.
- Keep specs small enough to implement in a few bounded agent iterations;
  split rather than sprawl.
- `npm run build` and `npm test` MUST pass before a final PR is mergeable; a
  broken `main` blocks all other work.
- Later specs MUST NOT regress earlier ones. When touching the sim core,
  preserve every existing element behavior unless the spec explicitly says
  otherwise — and say so in the spec, not in the diff.

## Governance

This constitution supersedes other practices for this repository. Amendments
arrive as PRs that state what changed and why, and bump the version below
(semver: breaking governance change / new principle / clarification).
Compliance is checked at spec review and final-PR review — the two human
gates. When a spec conflicts with a principle, the spec loses.

**Version**: 1.0.0 | **Ratified**: 2026-08-30 | **Last Amended**: 2026-08-30
