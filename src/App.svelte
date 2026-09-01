<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { getCollected, getQuota, getRemainingSeconds, getStatus, TICK_RATE_HZ } from './sim/cave';
  import { advanceScreen, pauseToggle, restartAttempt, startGame, tickSession } from './lib/session/session';
  import { bonusFor } from './lib/session/scoring';
  import { CAVES } from './caves';
  import type { Screen, SessionState } from './lib/session/types';
  import { readSave, writeSave } from './lib/storage/save';
  import { resolveStoredMute, toggleMute } from './lib/audio/mute';
  import { deriveSoundEvents } from './lib/audio/events';
  import { applyVoiceCap, DEFAULT_VOICE_CAP } from './lib/audio/priority';
  import { createAudioEngine } from './lib/audio/engine';
  import { KeyboardInput } from './lib/input/keyboard';
  import { TouchInput } from './lib/input/touch/TouchInput';
  import { GamepadInput } from './lib/input/gamepad/GamepadInput';
  import { computeOrientation, computeTouchControlLayout, type InsetBox } from './lib/input/touch/layout';
  import { nextLastInputSource, shouldShowTouchControls, type LastInputSource } from './lib/input/visibility';
  import { orAll, resolveDirection } from './lib/input/merge';
  import { createRenderLoop, type RenderLoop } from './lib/render/canvas';
  import './lib/themes';
  import { getTheme, listThemes } from './lib/themes/registry';
  import { cycleThemeId, resolveStoredThemeId } from './lib/themes/selection';

  // FR-025: restores the stored theme id, falling back to Classroom for
  // anything unregistered, non-string, or absent.
  let activeThemeId: string = $state(
    resolveStoredThemeId(readSave().themeId, listThemes().map((t) => t.id), 'classroom')
  );

  // FR-018: a no-op — no state change, no storage write — when reselecting
  // the active id. FR-028: persisted at the moment of change.
  function selectTheme(id: string): void {
    if (id === activeThemeId) return;
    activeThemeId = id;
    writeSave({ themeId: id });
  }

  // FR-030: a plain boolean, never a SessionState field — toggling it can
  // never perturb the cave, score, clock, or tick count.
  let muted: boolean = $state(resolveStoredMute(readSave().muted));

  function toggleMuted(): void {
    muted = toggleMute(muted);
    writeSave({ muted });
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
  const touch = new TouchInput();
  const gamepad = new GamepadInput();
  const audioEngine = createAudioEngine();
  let renderLoop: RenderLoop | undefined;
  let tickHandle: number | undefined;
  let lastTime: number | undefined;
  let accumulator = 0;

  // FR-029: a capability read only — no UA/device/screen-size sniff — read
  // once, since it cannot change for the life of the page.
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  // FR-028: gates whether gamepad.poll() is ever called — no listener side
  // effect, no error, when the API is absent.
  const gamepadSupported = typeof navigator.getGamepads === 'function';

  // FR-027a: advanced only by window-level keydown/click/touchstart
  // listeners below — no fourth listener, so pointer movement structurally
  // cannot change it.
  let lastInputSource: LastInputSource = $state('none');

  // The safe-area-inset box, read from a hidden probe element's computed
  // style at mount and again on resize/orientationchange (research.md).
  let probeEl: HTMLDivElement | undefined = $state();
  let insetBox: InsetBox | undefined = $state(undefined);

  function measureInsetBox(): InsetBox {
    if (!probeEl) return { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight };
    const style = getComputedStyle(probeEl);
    const top = parseFloat(style.paddingTop) || 0;
    const right = parseFloat(style.paddingRight) || 0;
    const bottom = parseFloat(style.paddingBottom) || 0;
    const left = parseFloat(style.paddingLeft) || 0;
    return { x: left, y: top, width: window.innerWidth - left - right, height: window.innerHeight - top - bottom };
  }

  function refreshInsetBox(): void {
    insetBox = measureInsetBox();
  }

  // FR-016, FR-043: device creation happens only inside these existing
  // key/click/touch gesture listeners — never at module/page load, never
  // from gamepad polling.
  const onAnyKeyDown = (): void => {
    lastInputSource = nextLastInputSource(lastInputSource, 'keydown');
    audioEngine.unlock();
  };
  const onAnyClick = (): void => {
    lastInputSource = nextLastInputSource(lastInputSource, 'click');
    audioEngine.unlock();
  };
  const onAnyTouchStart = (): void => {
    lastInputSource = nextLastInputSource(lastInputSource, 'touchstart');
    audioEngine.unlock();
  };

  // FR-008, FR-027, FR-027a: three independent, separately testable gates —
  // capability, last input source, and the current screen.
  let controlsVisible = $derived(
    hasTouch &&
      shouldShowTouchControls({ hasTouch }, lastInputSource) &&
      (session.screen === 'playing' || session.screen === 'paused')
  );

  // FR-031, FR-031a: recomputed only when visibility, the screen, or the
  // measured inset box changes — not per tick or per frame.
  let touchLayout = $derived.by(() => {
    if (!controlsVisible || !insetBox) return undefined;
    return computeTouchControlLayout(insetBox, computeOrientation(insetBox));
  });

  $effect(() => {
    touch.setLayout(touchLayout);
  });

  // The canvas/cave container is CSS-sized from layout.caveRect whenever a
  // layout is active, so canvas.ts's computeViewportCells() needs no
  // change — the drawable area is smaller by construction, not by a new
  // parameter.
  let canvasStyle = $derived(
    touchLayout
      ? `left:${touchLayout.caveRect.x}px;top:${touchLayout.caveRect.y}px;width:${touchLayout.caveRect.width}px;height:${touchLayout.caveRect.height}px;`
      : ''
  );

  // FR-015: keeps the theme picker inside caveRect's right edge instead of
  // the viewport's, so it never sits under a landscape reserved margin.
  let themePickerRightPx = $derived.by(() => {
    if (!touchLayout || !insetBox) return undefined;
    return insetBox.x + insetBox.width - (touchLayout.caveRect.x + touchLayout.caveRect.width) + 8;
  });

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
    // FR-017: polled once per tick, before any consume*() call.
    if (gamepadSupported) gamepad.poll();
    const previousScreen = session.screen;
    const previousSession = session;
    stepTickInner();
    saveOnTransition(previousScreen, session.screen);
    // FR-019, FR-020: derive -> cap -> play, every tick, entirely outside
    // the sim's own tick() call above.
    audioEngine.play(applyVoiceCap(deriveSoundEvents(previousSession, session), DEFAULT_VOICE_CAP), theme.sounds, muted);
  }

  function stepTickInner(): void {
    // FR-020, FR-021, FR-035: consumed unconditionally, before any
    // session.screen branch — including the 'title' branch's start/
    // direction/grab checks below — so a cycleTheme press reaches every
    // screen and is never also evaluated as a start/direction/grab press
    // (CYCLE_THEME_KEYS is disjoint from those actions' keys). Every
    // source's consume*() is computed before orAll/resolveDirection run,
    // never inside a short-circuiting `||` (contracts/input-merge-api.md).
    if (orAll(keyboard.consumeCycleTheme(), touch.consumeCycleTheme(), gamepad.consumeCycleTheme())) {
      selectTheme(cycleThemeId(activeThemeId, listThemes().map((t) => t.id)));
    }

    // FR-024, FR-025: reachable from every screen, same as cycle-theme
    // above — never touches session (FR-030).
    if (orAll(keyboard.consumeMute(), touch.consumeMute(), gamepad.consumeMute())) {
      toggleMuted();
    }

    // FR-027: restart works from playing, paused, caveIntro, and lifeLost,
    // at any point in a frame — a no-op (via restartAttempt's own screen
    // gate) everywhere else, so it is always safe to check first.
    if (orAll(keyboard.consumeRestart(), touch.consumeRestart(), gamepad.consumeRestart())) {
      session = restartAttempt(session);
    }

    if (session.screen === 'title') {
      // Any of the start key, a movement key, or grab starts the game
      // (spec Edge Cases) — that same keypress is not also delivered to
      // the kid on the first tick, since startGame() lands on 'caveIntro',
      // not 'playing', and tickSession is gated on 'playing'. Gamepad has
      // no consumeStart() — its confirm route is the edge-triggered
      // consumeConfirm() instead (research.md's dual-read decision).
      const direction = resolveDirection(keyboard.consumeDirection(), touch.consumeDirection(), gamepad.consumeDirection());
      const grab = orAll(keyboard.consumeGrab(), touch.consumeGrab(), gamepad.consumeGrab());
      const start = orAll(keyboard.consumeStart(), touch.consumeStart(), gamepad.consumeConfirm());
      if (start || direction !== undefined || grab) {
        session = startGame();
      }
      return;
    }

    if (session.screen === 'playing' || session.screen === 'paused') {
      if (orAll(keyboard.consumePause(), touch.consumePause(), gamepad.consumePause())) {
        session = pauseToggle(session);
        return; // the toggle itself is not also a play/freeze tick
      }
    }

    if (session.screen === 'playing') {
      const direction = resolveDirection(keyboard.consumeDirection(), touch.consumeDirection(), gamepad.consumeDirection());
      const grab = orAll(keyboard.consumeGrab(), touch.consumeGrab(), gamepad.consumeGrab());
      session = tickSession(session, { direction, grab });
      return;
    }

    if (session.screen === 'paused') {
      // FR-028, FR-030: frozen — no auto-advance, no tick, until the pause
      // key is pressed again (handled above).
      return;
    }

    // Every other screen (caveIntro, lifeLost, caveComplete, gameOver,
    // won): a tap/keypress/confirm or the documented delay advances it,
    // whichever comes first.
    const advanced = { ...session, screenTicks: session.screenTicks + 1 };
    const advance = orAll(keyboard.consumeStart(), touch.consumeStart(), gamepad.consumeConfirm());
    if (advance || advanced.screenTicks >= SCREEN_AUTO_ADVANCE_TICKS) {
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
    touch.attach();
    gamepad.attach();
    window.addEventListener('keydown', onAnyKeyDown);
    window.addEventListener('click', onAnyClick);
    window.addEventListener('touchstart', onAnyTouchStart);
    refreshInsetBox();
    window.addEventListener('resize', refreshInsetBox);
    window.addEventListener('orientationchange', refreshInsetBox);
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
    touch.detach();
    gamepad.detach();
    window.removeEventListener('keydown', onAnyKeyDown);
    window.removeEventListener('click', onAnyClick);
    window.removeEventListener('touchstart', onAnyTouchStart);
    window.removeEventListener('resize', refreshInsetBox);
    window.removeEventListener('orientationchange', refreshInsetBox);
    renderLoop?.stop();
    if (tickHandle !== undefined) {
      cancelAnimationFrame(tickHandle);
    }
  });
</script>

<!-- FR-031a: a hidden four-sided-padding probe read via getComputedStyle,
     never a CSS env() read from inside the pure layout module. -->
<div bind:this={probeEl} class="safe-area-probe" aria-hidden="true"></div>
<canvas bind:this={canvas} style={canvasStyle}></canvas>
{#if hudText}
  <div class="readout">{hudText}</div>
{/if}
{#if overlayText}
  <div class="status-banner">{overlayText}</div>
{/if}
{#if statusMessage}
  <div class="status-banner">{statusMessage}</div>
{/if}

<button
  type="button"
  class="mute-button"
  aria-pressed={muted}
  onclick={toggleMuted}
>
  {muted ? '🔇' : '🔊'}
</button>
{#if listThemes().length > 1}
  <div class="theme-picker" style={themePickerRightPx !== undefined ? `right:${themePickerRightPx}px` : undefined}>
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
{#if touchLayout}
  <!-- FR-008, FR-009, FR-031: the reserved control region — a fixed pad
       plus grab/pause/restart, sized and placed by touch/layout.ts. Actual
       hit-testing happens through TouchInput's document-level listeners,
       not per-element handlers, so these are purely visual affordances. -->
  <div class="touch-controls" aria-hidden="true">
    <div
      class="touch-pad"
      style="left:{touchLayout.pad.center.x - touchLayout.pad.outerRadius}px; top:{touchLayout.pad.center.y -
        touchLayout.pad.outerRadius}px; width:{touchLayout.pad.outerRadius * 2}px; height:{touchLayout.pad
        .outerRadius * 2}px;"
    ></div>
    <div
      class="touch-button touch-grab"
      style="left:{touchLayout.grabButton.x}px; top:{touchLayout.grabButton.y}px; width:{touchLayout.grabButton
        .width}px; height:{touchLayout.grabButton.height}px;"
    >
      ✋
    </div>
    <div
      class="touch-button touch-pause"
      style="left:{touchLayout.pauseButton.x}px; top:{touchLayout.pauseButton.y}px; width:{touchLayout.pauseButton
        .width}px; height:{touchLayout.pauseButton.height}px;"
    >
      ⏸
    </div>
    <div
      class="touch-button touch-restart"
      style="left:{touchLayout.restartButton.x}px; top:{touchLayout.restartButton.y}px; width:{touchLayout
        .restartButton.width}px; height:{touchLayout.restartButton.height}px;"
    >
      ⟲
    </div>
  </div>
{/if}

<style>
  /* FR-012: no scroll/zoom/bounce/select/callout anywhere on the page —
     the event-level suppression in TouchInput.attach() is backed up here. */
  :global(html),
  :global(body) {
    touch-action: none;
    -webkit-user-select: none;
    user-select: none;
  }

  .safe-area-probe {
    position: fixed;
    inset: 0;
    padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom)
      env(safe-area-inset-left);
    pointer-events: none;
    visibility: hidden;
  }

  canvas {
    display: block;
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    touch-action: none;
    user-select: none;
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

  .mute-button {
    position: fixed;
    bottom: 0.5rem;
    left: 0.5rem;
    padding: 0.25rem 0.6rem;
    background: rgba(0, 0, 0, 0.55);
    color: #fff;
    font-size: 1.1rem;
    border: 1px solid rgba(255, 255, 255, 0.4);
    border-radius: 0.3rem;
    cursor: pointer;
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

  .touch-controls {
    position: fixed;
    inset: 0;
    touch-action: none;
    user-select: none;
  }

  .touch-pad {
    position: fixed;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.15);
    border: 2px solid rgba(255, 255, 255, 0.4);
    touch-action: none;
  }

  .touch-button {
    position: fixed;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 0.5rem;
    background: rgba(255, 255, 255, 0.2);
    border: 2px solid rgba(255, 255, 255, 0.4);
    color: #fff;
    font-size: 1.5rem;
    line-height: 1;
    touch-action: none;
    user-select: none;
  }
</style>
