<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { getCollected, getQuota, getRemainingSeconds, getStatus, TICK_RATE_HZ } from './sim/cave';
  import { advanceScreen, pauseToggle, restartAttempt, startGame, tickSession } from './lib/session/session';
  import { bonusFor } from './lib/session/scoring';
  import { CAVES } from './caves';
  import type { Screen, SessionState } from './lib/session/types';
  import { readSave, writeSave } from './lib/storage/save';
  import { KeyboardInput } from './lib/input/keyboard';
  import { createRenderLoop, type RenderLoop } from './lib/render/canvas';
  import './lib/themes';
  import { getTheme, listThemes } from './lib/themes/registry';

  // US3/T021 extends this initializer to resolve a stored id instead of
  // the literal 'classroom'.
  let activeThemeId: string = $state('classroom');

  // FR-018: a no-op — no state change — when reselecting the active id.
  function selectTheme(id: string): void {
    if (id === activeThemeId) return;
    activeThemeId = id;
  }

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

  // FR-039: writeSave only ever grows a stored value, so passing the other
  // field's minimum here is a safe no-op on that field. Called only on the
  // screen transitions the spec names: whenever a game ends (gameOver/won)
  // and whenever a cave begins (caveIntro).
  function saveOnTransition(previousScreen: Screen, nextScreen: Screen): void {
    if (nextScreen === previousScreen) return;
    if (nextScreen === 'gameOver' || nextScreen === 'won') {
      writeSave({ highScore: session.score, furthestCave: 1 });
    }
    if (nextScreen === 'caveIntro') {
      writeSave({ highScore: 0, furthestCave: session.caveIndex + 1 });
    }
  }

  // One tick's worth of session advancement: consumes this tick's input
  // exactly once, and always drives through the session module — the sim
  // never runs except via tickSession while screen === 'playing' (FR-011,
  // FR-028).
  function stepTick(): void {
    const previousScreen = session.screen;
    stepTickInner();
    saveOnTransition(previousScreen, session.screen);
  }

  function stepTickInner(): void {
    // FR-027: restart works from playing, paused, caveIntro, and lifeLost,
    // at any point in a frame — a no-op (via restartAttempt's own screen
    // gate) everywhere else, so it is always safe to check first.
    if (keyboard.consumeRestart()) {
      session = restartAttempt(session);
    }

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

    if (session.screen === 'playing' || session.screen === 'paused') {
      if (keyboard.consumePause()) {
        session = pauseToggle(session);
        return; // the toggle itself is not also a play/freeze tick
      }
    }

    if (session.screen === 'playing') {
      const direction = keyboard.consumeDirection();
      const grab = keyboard.consumeGrab();
      session = tickSession(session, { direction, grab });
      return;
    }

    if (session.screen === 'paused') {
      // FR-028, FR-030: frozen — no auto-advance, no tick, until the pause
      // key is pressed again (handled above).
      return;
    }

    // Every other screen (caveIntro, lifeLost, caveComplete, gameOver,
    // won): a keypress or the documented delay advances it, whichever
    // comes first.
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
  let theme = $derived(getTheme(activeThemeId));

  // FR-002, FR-040: read fresh whenever the title screen is showing — never
  // held stale from a previous game.
  let titleSave = $derived(session.screen === 'title' ? readSave() : undefined);

  let hudText = $derived.by(() => {
    // FR-002, FR-038, FR-040: the title screen's persisted badges, blank
    // (omitted) when absent.
    if (session.screen === 'title') {
      if (titleSave === undefined) return undefined;
      const parts: string[] = [];
      if (titleSave.highScore > 0) {
        parts.push(theme.hud.highScore.replace('{score}', String(titleSave.highScore)));
      }
      parts.push(theme.hud.furthestCave.replace('{cave}', String(titleSave.furthestCave)));
      return parts.join(' — ');
    }
    // FR-021: the score is visible during play and on the terminal screens
    // (game-over/won), not only mid-play.
    if (session.screen === 'gameOver' || session.screen === 'won') {
      return theme.hud.score.replace('{score}', String(session.score));
    }
    if (session.screen !== 'playing' && session.screen !== 'paused') return undefined;
    const stars = theme.readout.template
      .replace('{count}', String(getCollected(session.caveState)))
      .replace('{quota}', String(getQuota(session.caveState)));
    const lives = theme.hud.lives.replace('{lives}', String(session.lives));
    // FR-043, FR-044: read fresh via the accessor every frame, shown only
    // when the cave declares a time limit.
    const remaining = getRemainingSeconds(session.caveState);
    const time = remaining === undefined ? undefined : theme.hud.time.replace('{seconds}', String(remaining));
    const score = theme.hud.score.replace('{score}', String(session.score));
    return [stars, time, score, lives].filter((part) => part !== undefined).join(' — ');
  });

  // FR-020: the bonus is already final the instant 'caveComplete' is
  // entered (session.ts adds it atomically) — this only animates the
  // *display* toward it, counting up from the pre-bonus score as
  // screenTicks advances. The arithmetic above is never touched, so a
  // skip or an interruption always lands on the same total.
  let caveCompleteDisplayScore = $derived.by(() => {
    if (session.screen !== 'caveComplete') return session.score;
    const bonus = bonusFor(getRemainingSeconds(session.caveState) ?? 0);
    const preBonusScore = session.score - bonus;
    const progress = Math.min(session.screenTicks / SCREEN_AUTO_ADVANCE_TICKS, 1);
    return preBonusScore + Math.round(bonus * progress);
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
      case 'won':
        return theme.won.label;
      case 'caveComplete':
        return theme.caveComplete.label.replace('{score}', String(caveCompleteDisplayScore));
      case 'paused':
        return theme.paused.label;
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
        getThemeId: () => activeThemeId,
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
{#if listThemes().length > 1}
  <div class="theme-picker">
    {#each listThemes() as themeOption (themeOption.id)}
      <button
        type="button"
        class="theme-option"
        class:active={themeOption.id === activeThemeId}
        aria-pressed={themeOption.id === activeThemeId}
        onclick={() => selectTheme(themeOption.id)}
      >
        {themeOption.displayName}
      </button>
    {/each}
  </div>
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

  .theme-picker {
    position: fixed;
    top: 0.5rem;
    right: 0.5rem;
    display: flex;
    gap: 0.35rem;
  }

  .theme-option {
    padding: 0.25rem 0.6rem;
    background: rgba(0, 0, 0, 0.55);
    color: #fff;
    font: 0.9rem sans-serif;
    border: 1px solid rgba(255, 255, 255, 0.4);
    border-radius: 0.3rem;
    cursor: pointer;
  }

  .theme-option.active {
    background: rgba(255, 255, 255, 0.85);
    color: #111;
    border-color: #fff;
  }
</style>
