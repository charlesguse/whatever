import type { Direction } from '../../../sim/tick';
import {
  mapOneShotButtons,
  resolveDirection,
  resolveDpadDirection,
  resolveStickDirection,
} from './mapping';
import {
  CYCLE_THEME_BUTTON_INDEX,
  FACE_BUTTON_GRAB_CONFIRM_INDEX,
  PAUSE_BUTTON_INDEX,
  RESTART_BUTTON_INDEX,
  STICK_X_AXIS_INDEX,
  STICK_Y_AXIS_INDEX,
} from './bindings';

interface GamepadPadState {
  previousStickDirection: Direction | undefined;
  previousPressed: ReadonlySet<number>;
}

// Mirrors KeyboardInput's shape. Session-state isolation (FR-025, SC-009):
// this class never reads or writes SessionState, score, lives, caveIndex,
// the timer, or pause state — no reference to src/lib/session/ exists
// anywhere below, so a connect/disconnect event physically cannot mutate
// any of them.
export class GamepadInput {
  private padStates = new Map<number, GamepadPadState>();
  private mergedDirection: Direction | undefined;
  private mergedGrab = false;
  private mergedConfirm = false;
  private mergedRestart = false;
  private mergedPause = false;
  private mergedCycleTheme = false;

  // FR-028: no-op — no navigator.getGamepads() call, no throw — when the
  // Gamepad API is unavailable.
  poll(): void {
    if (typeof navigator === 'undefined' || typeof navigator.getGamepads !== 'function') return;

    let direction: Direction | undefined;
    let grab = false;
    let confirm = false;
    let restart = false;
    let pause = false;
    let cycleTheme = false;

    // FR-024: merged across pads — the first non-undefined direction found
    // scanning connected pads in index order; every boolean/edge is OR'd
    // across pads, so no pad's held input is ever cancelled by another's.
    for (const pad of navigator.getGamepads()) {
      if (pad === null) continue;

      let state = this.padStates.get(pad.index);
      if (state === undefined) {
        state = { previousStickDirection: undefined, previousPressed: new Set() };
        this.padStates.set(pad.index, state);
      }

      const dpad = resolveDpadDirection(pad.buttons);
      const stickX = pad.axes[STICK_X_AXIS_INDEX] ?? 0;
      const stickY = pad.axes[STICK_Y_AXIS_INDEX] ?? 0;
      const stick = resolveStickDirection(stickX, stickY, state.previousStickDirection);
      const padDirection = resolveDirection(dpad, stick);
      if (direction === undefined) direction = padDirection;

      const { pressedNow, edges } = mapOneShotButtons(pad.buttons, state.previousPressed);

      grab = grab || pad.buttons[FACE_BUTTON_GRAB_CONFIRM_INDEX]?.pressed === true;
      confirm = confirm || edges.has(FACE_BUTTON_GRAB_CONFIRM_INDEX);
      restart = restart || edges.has(RESTART_BUTTON_INDEX);
      pause = pause || edges.has(PAUSE_BUTTON_INDEX);
      cycleTheme = cycleTheme || edges.has(CYCLE_THEME_BUTTON_INDEX);

      state.previousStickDirection = stick;
      state.previousPressed = pressedNow;
    }

    this.mergedDirection = direction;
    this.mergedGrab = grab;
    this.mergedConfirm = confirm;
    this.mergedRestart = restart;
    this.mergedPause = pause;
    this.mergedCycleTheme = cycleTheme;
  }

  consumeDirection(): Direction | undefined {
    return this.mergedDirection;
  }

  consumeGrab(): boolean {
    return this.mergedGrab;
  }

  consumeConfirm(): boolean {
    return this.mergedConfirm;
  }

  consumeRestart(): boolean {
    return this.mergedRestart;
  }

  consumePause(): boolean {
    return this.mergedPause;
  }

  consumeCycleTheme(): boolean {
    return this.mergedCycleTheme;
  }
}
