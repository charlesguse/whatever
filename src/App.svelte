<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { parseCave, type CaveState } from './sim/cave';
  import { tick as simTick } from './sim/tick';
  import { starterCave } from './caves/starter';
  import { KeyboardInput } from './lib/input/keyboard';
  import { createRenderLoop, type RenderLoop } from './lib/render/canvas';
  import { registerTheme } from './lib/themes/registry';
  import { classroomTheme } from './lib/themes/classroom';

  registerTheme(classroomTheme);

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
    caveState = simTick(caveState, { direction });
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

  onMount(() => {
    keyboard.attach();
    if (canvas) {
      renderLoop = createRenderLoop({
        canvas,
        getState: () => caveState,
        getThemeId: () => 'classroom',
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

<style>
  canvas {
    display: block;
    width: 100vw;
    height: 100vh;
  }
</style>
