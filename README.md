# ✏️ Recess Rocks

A browser clone of **Boulder Dash** — the 1984 First Star cave-digging game,
the *Super Boulder Dash* mechanics two brothers played on a school computer —
rethemed as an elementary school. Dig through notebook paper, dodge falling
erasers, collect gold stars, and get out the classroom door before the bell.

**Play it:** https://charlesguse.github.io/whatever/ — or download that single
page and double-click it; it runs straight from disk, no server needed.

## The game

You are a kid with a backpack, tunnelling through a cave. Collect the cave's
quota of gold stars and the exit opens; run out of time, get crushed by a
falling eraser, or get caught by something that patrols the tunnels, and you
lose a life. Eight caves, each one built to teach a mechanic and then make you
use it under pressure.

The physics are the point, and they are the original's:

- Erasers (boulders) and gold stars (diamonds) fall when nothing holds them up,
  and **roll sideways** off other round things.
- A falling one crushes whatever it lands on. A resting one is furniture.
- You can **push** an eraser sideways into an empty space — never up or down.
- **Paper airplanes** (butterflies) explode into a shower of gold stars. That is
  the scoring trick the whole game is built around.
- The **paste blob** (amoeba) grows, and turns into stars if you seal it in or
  into erasers if you let it get too big.
- The **pencil-sharpener wall** (magic wall) turns falling erasers into stars
  while it runs, and it only runs once.

## Themes

Element behavior and element appearance are separate by design. A theme is a
plain data table keyed by element id — colors, glyphs, labels, sounds — so a new
theme touches no game logic at all. Two ship in the box:

- **Classroom** (default): notebook paper, pink erasers, gold star stickers,
  lockers, a paste blob, and a door with an EXIT sign.
- **Classic**: the original's dirt, boulders, and diamonds.

Switch between them from inside the game, mid-cave, without losing your run.

## Controls

Keyboard is the reference scheme; everything else is a bonus that is hidden
where the platform cannot do it.

| | |
| --- | --- |
| **Keyboard** | Arrows or WASD to move, hold the grab key to dig without stepping in, `P` to pause, `R` to restart the cave |
| **Touch** | On-screen d-pad and buttons, thumb-sized, shown only on touch devices |
| **Gamepad** | D-pad/stick and face buttons via the Gamepad API, when a controller is connected |

## How it is built

This repository is an experiment: the whole game is built through the
[Wing Commander](https://github.com/charlesguse/wing-commander) spec-driven
pipeline. Each feature starts as a GitHub issue; the `spec-request` label sends
it through spec → plan → tasks → implement → PR. See the issues and `specs/` for
the full paper trail.

- Stack: Svelte 5 + Vite, built to a **single self-contained `index.html`** via
  `vite-plugin-singlefile`.
- The simulation is plain TypeScript over a typed-array grid, deterministic and
  tick-based, with no DOM and no `Math.random` — which is why every physics rule
  is pinned by a `vitest` test written as a small ASCII cave.
- Ground rules: [`.specify/memory/constitution.md`](.specify/memory/constitution.md)

## Local development

```bash
npm install
npm run dev     # dev server
npm run build   # emits dist/index.html — the whole game in one file
npm test        # vitest unit tests on the cave simulation
```

## Credits

Boulder Dash was created by Peter Liepa and Chris Gray and published by First
Star Software in 1984. This is an independent reimplementation of its mechanics
with original cave designs and original artwork — no assets or level data from
the commercial game are used here.
