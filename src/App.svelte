<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { getCollected, getQuota, getStatus, TICK_RATE_HZ } from './sim/cave';
  import { advanceScreen, startGame, tickSession } from './lib/session/session';
  import { CAVES } from './caves';
  import type { SessionState } from './lib/session/types';
  import { KeyboardInput } from './lib/input/keyboard';
  import { createRenderLoop, type RenderLoop } from './lib/render/canvas';
  import { registerTheme, getTheme } from './lib/themes/registry';
  import { classroomTheme } from './lib/themes/classroom';

  registerTheme(classroomTheme);
  const THEME_ID = 'classroom';

  const TICK_INTERVAL_MS = 1000 / TICK_RATE_HZ;
  // Clamp the accumulator so a backgrounded tab does not fire a burst of
  // catch-up ticks on return (spec Edge Cases).
  const MAX_ACCUMULATED_MS = TICK_INTERVAL_MS * 5;

  // FR-003, FR-005, FR-007: each non-playing screen ends on a keypress or
  // after this short documented delay, whichever comes first — a tuning
  // value left open for maintainer review, like the camera dead zone and
  // the door-flash interval.
  const SCREEN_AUTO_ADVANCE_TICKS = TICK_RATE_HZ * 3;

  // FR-001/FR-002: before the first startGame(), there is no session yet —
  // this stands in for the title screen (score/lives are placeholders,
  // never shown while screen === 'title'), rendering cave one's static
  // layout behind the title text.
  function titleSession(): SessionState {
    return { ...startGame(), screen: 'title', attemptEnded: true };
  }

  let canvas: HTMLCanvasElement | undefined = $state();
  let session: SessionState = $state(titleSession());

  const keyboard = new KeyboardInput();
  let renderLoop: RenderLoop | undefined;
  let tickHandle: number | undefined;
  let lastTime: number | undefined;
  let accumulator = 0;

  // One tick's worth of session advancement: consumes this tick's input
  // exactly once, and always drives through the session module — the sim
  // never runs except via tickSession while screen === 'playing' (FR-011,
  // FR-028).
  function stepTick(): void {
    if (session.screen === 'title') {
      // Any of the start key, a movement key, or grab starts the game
      // (spec Edge Cases) — that same keypress is not also delivered to
      // the kid on the first tick, since startGame() lands on 'caveIntro',
      // not 'playing', and tickSession is gated on 'playing'.
      const direction = keyboard.consumeDirection();
      const grab = keyboard.consumeGrab();
      const start = keyboard.consumeStart();
      if (start || direction !== undefined || grab) {
        session = startGame();
      }
      return;
    }

    if (session.screen === 'playing') {
      const direction = keyboard.consumeDirection();
      const grab = keyboard.consumeGrab();
      session = tickSession(session, { direction, grab });
      return;
    }

    // Every other screen (caveIntro, lifeLost, gameOver, and — once User
    // Stories 4/5 land — caveComplete/won/paused): a keypress or the
    // documented delay advances it, whichever comes first.
    const advanced = { ...session, screenTicks: session.screenTicks + 1 };
    if (keyboard.consumeStart() || advanced.screenTicks >= SCREEN_AUTO_ADVANCE_TICKS) {
      session = advanceScreen(advanced);
    } else {
      session = advanced;
    }
  }

  function tickLoop(time: number): void {
    if (lastTime === undefined) {
      lastTime = time;
    }
    const elapsed = time - lastTime;
    lastTime = time;

    accumulator = Math.min(accumulator + elapsed, MAX_ACCUMULATED_MS);
    while (accumulator >= TICK_INTERVAL_MS) {
      stepTick();
      accumulator -= TICK_INTERVAL_MS;
    }
    tickHandle = requestAnimationFrame(tickLoop);
  }

  // FR-044: reads the sim/session through accessors every frame — no local
  // tracking of any value. FR-046: every string comes from theme data.
  let theme = $derived(getTheme(THEME_ID));

  let hudText = $derived.by(() => {
    if (session.screen !== 'playing') return undefined;
    const stars = theme.readout.template
      .replace('{count}', String(getCollected(session.caveState)))
      .replace('{quota}', String(getQuota(session.caveState)));
    const lives = theme.hud.lives.replace('{lives}', String(session.lives));
    return `${stars} — ${lives}`;
  });

  let overlayText = $derived.by(() => {
    switch (session.screen) {
      case 'title':
        return theme.title;
      case 'caveIntro':
        return theme.caveIntro.template
          .replace('{name}', CAVES[session.caveIndex].name)
          .replace('{quota}', String(getQuota(session.caveState)));
      case 'lifeLost':
        return theme.lifeLost.label;
      case 'gameOver':
        return theme.gameOver.label;
      default:
        return undefined;
    }
  });

  // The existing in-play banners (crash/completion), unchanged from
  // features 001–004, shown only while actually playing.
  let statusMessage = $derived.by(() => {
    if (session.screen !== 'playing') return undefined;
    const status = getStatus(session.caveState);
    if (status === 'dead') return theme.messages.dead;
    if (status === 'completed') return theme.messages.completed;
    return undefined;
  });

  onMount(() => {
    keyboard.attach();
    if (canvas) {
      renderLoop = createRenderLoop({
        canvas,
        getState: () => session.caveState,
        getThemeId: () => THEME_ID,
      });
      renderLoop.start();
    }
    tickHandle = requestAnimationFrame(tickLoop);
  });

  onDestroy(() => {
    keyboard.detach();
    renderLoop?.stop();
    if (tickHandle !== undefined) {
      cancelAnimationFrame(tickHandle);
    }
  });
</script>

<canvas bind:this={canvas}></canvas>
{#if hudText}
  <div class="readout">{hudText}</div>
{/if}
{#if overlayText}
  <div class="status-banner">{overlayText}</div>
{/if}
{#if statusMessage}
  <div class="status-banner">{statusMessage}</div>
{/if}

<style>
  canvas {
    display: block;
    width: 100vw;
    height: 100vh;
  }

  .readout {
    position: fixed;
    top: 0.5rem;
    left: 0.5rem;
    padding: 0.25rem 0.6rem;
    background: rgba(0, 0, 0, 0.55);
    color: #fff;
    font: 1rem sans-serif;
    border-radius: 0.3rem;
    pointer-events: none;
  }

  .status-banner {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    padding: 1rem 1.5rem;
    background: rgba(0, 0, 0, 0.75);
    color: #fff;
    font: 1.25rem sans-serif;
    border-radius: 0.5rem;
    pointer-events: none;
    text-align: center;
  }
</style>
