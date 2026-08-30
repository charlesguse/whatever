<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { getCollected, getQuota, getStatus, parseCave, type CaveState } from './sim/cave';
  import { tick as simTick } from './sim/tick';
  import { starterCave } from './caves/starter';
  import { KeyboardInput } from './lib/input/keyboard';
  import { createRenderLoop, type RenderLoop } from './lib/render/canvas';
  import { registerTheme, getTheme } from './lib/themes/registry';
  import { classroomTheme } from './lib/themes/classroom';

  registerTheme(classroomTheme);
  const THEME_ID = 'classroom';

  // Tick rate in the neighborhood of 8/s (spec Assumptions) — a tuning
  // value left open for maintainer review.
  const TICK_RATE_HZ = 8;
  const TICK_INTERVAL_MS = 1000 / TICK_RATE_HZ;
  // Clamp the accumulator so a backgrounded tab does not fire a burst of
  // catch-up ticks on return (spec Edge Cases).
  const MAX_ACCUMULATED_MS = TICK_INTERVAL_MS * 5;

  let canvas: HTMLCanvasElement | undefined = $state();
  let caveState: CaveState = parseCave(starterCave);

  const keyboard = new KeyboardInput();
  let renderLoop: RenderLoop | undefined;
  let tickHandle: number | undefined;
  let lastTime: number | undefined;
  let accumulator = 0;

  function stepTick(): void {
    const direction = keyboard.consumeDirection();
    const grab = keyboard.consumeGrab();
    caveState = simTick(caveState, { direction, grab });
  }

  function tickLoop(time: number): void {
    if (lastTime === undefined) {
      lastTime = time;
    }
    const elapsed = time - lastTime;
    lastTime = time;

    if (keyboard.consumeRestart()) {
      caveState = parseCave(starterCave);
      accumulator = 0;
    }

    accumulator = Math.min(accumulator + elapsed, MAX_ACCUMULATED_MS);
    while (accumulator >= TICK_INTERVAL_MS) {
      stepTick();
      accumulator -= TICK_INTERVAL_MS;
    }
    tickHandle = requestAnimationFrame(tickLoop);
  }

  // FR-041: reads the sim through read-only accessors every frame — no
  // local tracking of the count. FR-038: wording comes from theme data.
  let statusMessage = $derived.by(() => {
    const status = getStatus(caveState);
    const theme = getTheme(THEME_ID);
    if (status === 'dead') return theme.messages.dead;
    if (status === 'completed') return theme.messages.completed;
    return undefined;
  });

  let readoutText = $derived.by(() => {
    const theme = getTheme(THEME_ID);
    return theme.readout.template
      .replace('{count}', String(getCollected(caveState)))
      .replace('{quota}', String(getQuota(caveState)));
  });

  onMount(() => {
    keyboard.attach();
    if (canvas) {
      renderLoop = createRenderLoop({
        canvas,
        getState: () => caveState,
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
<div class="readout">{readoutText}</div>
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
