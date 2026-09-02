import type { Direction } from '../../sim/tick';

export const KEY_TO_DIRECTION: Readonly<Record<string, Direction>> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'up',
  W: 'up',
  s: 'down',
  S: 'down',
  a: 'left',
  A: 'left',
  d: 'right',
  D: 'right',
};

// A held key (never a tap) for grab — reported the same way direction state
// is (FR-019, FR-021).
export const GRAB_KEYS = new Set(['Shift']);

// A one-shot key for restart — works from a terminal state or mid-play
// (FR-031).
export const RESTART_KEYS = new Set(['r', 'R']);

// A one-shot start/confirm key (FR-048) — distinct from movement, grab, and
// restart. Starts the game from the title screen and advances/skips every
// non-playing screen this feature adds.
export const START_KEYS = new Set([' ', 'Enter']);

// A one-shot pause key (FR-048), distinct from every key above.
export const PAUSE_KEYS = new Set(['p', 'P']);

// A one-shot cycle-theme key (FR-033) — disjoint from every key above
// (SC-011), the default per research.md, maintainer-reassignable here.
export const CYCLE_THEME_KEYS = new Set(['t', 'T']);

// A one-shot mute key (FR-024, FR-025) — disjoint from every key above,
// the default per research.md, maintainer-reassignable here.
export const MUTE_KEYS = new Set(['m', 'M']);

// Tracks key-down/key-up state and reduces it to one direction-or-nothing
// per tick (FR-018-FR-022). Held-key cadence is driven by the sim's tick
// rate, never the OS key-repeat rate: repeat keydown events are ignored
// (event.repeat), and holding a direction simply keeps it in `held` across
// consumeDirection() calls until keyup.
export class KeyboardInput {
  private held: Direction[] = [];
  private pendingTap: Direction | undefined;
  private grabHeld = false;
  private restartPending = false;
  private startPending = false;
  private pausePending = false;
  private cycleThemePending = false;
  private mutePending = false;

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (GRAB_KEYS.has(event.key)) {
      event.preventDefault();
      this.grabHeld = true;
      return;
    }

    if (RESTART_KEYS.has(event.key)) {
      event.preventDefault();
      if (!event.repeat) this.restartPending = true;
      return;
    }

    if (START_KEYS.has(event.key)) {
      // FR-017/FR-020: a Start-key press targeting the theme picker or the
      // mute button (008, FR-025) is that button's own native Enter/Space
      // activation, not a game-start request — leave it alone so the
      // button still activates and no cave starts underneath it.
      const target = event.target as { closest?: (selector: string) => unknown } | null | undefined;
      if (target?.closest?.('.theme-picker, .mute-button')) return;
      event.preventDefault();
      if (!event.repeat) this.startPending = true;
      return;
    }

    if (PAUSE_KEYS.has(event.key)) {
      event.preventDefault();
      if (!event.repeat) this.pausePending = true;
      return;
    }

    if (CYCLE_THEME_KEYS.has(event.key)) {
      event.preventDefault();
      if (!event.repeat) this.cycleThemePending = true;
      return;
    }

    if (MUTE_KEYS.has(event.key)) {
      event.preventDefault();
      if (!event.repeat) this.mutePending = true;
      return;
    }

    const direction = KEY_TO_DIRECTION[event.key];
    if (direction === undefined) return;
    event.preventDefault();
    if (event.repeat) return; // never rely on OS key-repeat cadence (FR-021)

    if (!this.held.includes(direction)) {
      this.held.push(direction);
    }
    this.pendingTap = direction;
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    if (GRAB_KEYS.has(event.key)) {
      event.preventDefault();
      this.grabHeld = false;
      return;
    }

    const direction = KEY_TO_DIRECTION[event.key];
    if (direction === undefined) return;
    event.preventDefault();
    this.held = this.held.filter((d) => d !== direction);
  };

  attach(target: Window = window): void {
    target.addEventListener('keydown', this.onKeyDown);
    target.addEventListener('keyup', this.onKeyUp);
  }

  detach(target: Window = window): void {
    target.removeEventListener('keydown', this.onKeyDown);
    target.removeEventListener('keyup', this.onKeyUp);
  }

  // Reports one direction-or-nothing for the tick about to run. A held
  // direction wins (most recently pressed still-held direction, FR-020); a
  // tap released before this was called is still reported once (FR-019).
  consumeDirection(): Direction | undefined {
    if (this.held.length > 0) {
      return this.held[this.held.length - 1];
    }
    if (this.pendingTap !== undefined) {
      const direction = this.pendingTap;
      this.pendingTap = undefined;
      return direction;
    }
    return undefined;
  }

  // Whether the grab modifier is currently held, for the tick about to run
  // (FR-019, FR-021).
  consumeGrab(): boolean {
    return this.grabHeld;
  }

  // Reports and clears a one-shot restart request — works both mid-play and
  // from a terminal state (FR-031).
  consumeRestart(): boolean {
    if (!this.restartPending) return false;
    this.restartPending = false;
    return true;
  }

  // Reports and clears a one-shot start/confirm request (FR-048) — a held
  // key is reported only once until released, matching restart/grab (FR-049).
  consumeStart(): boolean {
    if (!this.startPending) return false;
    this.startPending = false;
    return true;
  }

  // Reports and clears a one-shot pause request (FR-048, FR-049).
  consumePause(): boolean {
    if (!this.pausePending) return false;
    this.pausePending = false;
    return true;
  }

  // Reports and clears a one-shot cycle-theme request (FR-033), the same
  // shape as consumeRestart()/consumePause().
  consumeCycleTheme(): boolean {
    if (!this.cycleThemePending) return false;
    this.cycleThemePending = false;
    return true;
  }

  // Reports and clears a one-shot mute request (FR-024, FR-025), the same
  // shape as consumeCycleTheme().
  consumeMute(): boolean {
    if (!this.mutePending) return false;
    this.mutePending = false;
    return true;
  }
}
