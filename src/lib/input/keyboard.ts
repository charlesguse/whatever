import type { Direction } from '../../sim/tick';

const KEY_TO_DIRECTION: Readonly<Record<string, Direction>> = {
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
const GRAB_KEYS = new Set(['Shift']);

// A one-shot key for restart — works from a terminal state or mid-play
// (FR-031).
const RESTART_KEYS = new Set(['r', 'R']);

// A one-shot start/confirm key (FR-048) — distinct from movement, grab, and
// restart. Starts the game from the title screen and advances/skips every
// non-playing screen this feature adds.
const START_KEYS = new Set([' ', 'Enter']);

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
      event.preventDefault();
      if (!event.repeat) this.startPending = true;
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
}
