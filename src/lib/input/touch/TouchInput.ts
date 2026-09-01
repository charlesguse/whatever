import type { Direction } from '../../../sim/tick';
import { resolveTouchPoint, type ControlHit, type TouchControlLayout } from './layout';

// A touch's control kind is fixed the instant it lands (touchstart) and
// never changes for that touch's lifetime — only a pad-kind touch's
// direction is re-targeted on move. Without pinning kind, a finger that
// slides outside the pad's outer radius would resolve to 'none' and never
// be re-examined again, breaking FR-010's re-acquire-on-return requirement.
interface TouchAssignment {
  readonly kind: ControlHit['kind'];
  readonly direction: Direction | undefined;
}

// Mirrors KeyboardInput's shape (consumeDirection/consumeGrab/etc.). Tracks
// per-identifier assignment so one finger never steals or cancels another's
// control (FR-011).
export class TouchInput {
  private assignments = new Map<number, TouchAssignment>();
  private grabTouchId: number | undefined;
  private restartPending = false;
  private pausePending = false;
  private startPending = false;
  private layout: TouchControlLayout | undefined;

  setLayout(layout: TouchControlLayout | undefined): void {
    this.layout = layout;
  }

  private readonly onTouchStart = (event: TouchEvent): void => {
    // No preventDefault() here (unlike touchmove/gesturestart/contextmenu/
    // dblclick below) — calling it on touchstart would suppress the
    // browser's synthesized click that follows on touchend, breaking the
    // theme picker's own tap (FR-012's "theme control's own taps MUST
    // continue to work"). touch-action: none on the relevant elements
    // already suppresses scroll/zoom without it (contracts/touch-api.md).
    for (const touch of Array.from(event.changedTouches)) {
      if (this.layout === undefined) {
        // FR-014: no control to hit-test against — a tap-to-confirm
        // candidate, only ever consumed by App.svelte on screens with no
        // layout at all. FR-017/FR-020 (006, mirrored from keyboard.ts's
        // START_KEYS handling): a tap targeting the theme picker or the
        // mute button (008, FR-025) is that button's own activation, not a
        // start/confirm request — leave it alone so the button still gets
        // the tap.
        const target = touch.target as { closest?: (selector: string) => unknown } | null | undefined;
        if (target?.closest?.('.theme-picker, .mute-button')) continue;
        this.startPending = true;
        continue;
      }

      const hit = resolveTouchPoint(this.layout, touch.clientX, touch.clientY);
      this.assignments.set(touch.identifier, { kind: hit.kind, direction: hit.kind === 'pad' ? hit.direction : undefined });
      if (hit.kind === 'grab') this.grabTouchId = touch.identifier;
      if (hit.kind === 'restart') this.restartPending = true;
      if (hit.kind === 'pause') this.pausePending = true;
    }
  };

  private readonly onTouchMove = (event: TouchEvent): void => {
    if (this.layout === undefined) return;
    for (const touch of Array.from(event.changedTouches)) {
      const current = this.assignments.get(touch.identifier);
      if (current === undefined || current.kind !== 'pad') continue;
      const hit = resolveTouchPoint(this.layout, touch.clientX, touch.clientY);
      this.assignments.set(touch.identifier, { kind: 'pad', direction: hit.kind === 'pad' ? hit.direction : undefined });
    }
  };

  private readonly onTouchEnd = (event: TouchEvent): void => {
    for (const touch of Array.from(event.changedTouches)) {
      const assignment = this.assignments.get(touch.identifier);
      if (assignment?.kind === 'grab' && touch.identifier === this.grabTouchId) {
        this.grabTouchId = undefined;
      }
      this.assignments.delete(touch.identifier);
    }
  };

  private readonly onDocumentTouchMove = (event: TouchEvent): void => {
    event.preventDefault();
  };

  private readonly onGestureStart = (event: Event): void => {
    event.preventDefault();
  };

  private readonly onContextMenu = (event: Event): void => {
    event.preventDefault();
  };

  private readonly onDblClick = (event: Event): void => {
    event.preventDefault();
  };

  attach(target: Document = document): void {
    target.addEventListener('touchstart', this.onTouchStart as EventListener);
    target.addEventListener('touchmove', this.onTouchMove as EventListener);
    target.addEventListener('touchend', this.onTouchEnd as EventListener);
    target.addEventListener('touchcancel', this.onTouchEnd as EventListener);
    // FR-012: no scroll/zoom/bounce/select/callout anywhere on the page.
    target.addEventListener('touchmove', this.onDocumentTouchMove as EventListener, { passive: false });
    target.addEventListener('gesturestart', this.onGestureStart);
    target.addEventListener('contextmenu', this.onContextMenu);
    target.addEventListener('dblclick', this.onDblClick);
  }

  detach(target: Document = document): void {
    target.removeEventListener('touchstart', this.onTouchStart as EventListener);
    target.removeEventListener('touchmove', this.onTouchMove as EventListener);
    target.removeEventListener('touchend', this.onTouchEnd as EventListener);
    target.removeEventListener('touchcancel', this.onTouchEnd as EventListener);
    target.removeEventListener('touchmove', this.onDocumentTouchMove as EventListener);
    target.removeEventListener('gesturestart', this.onGestureStart);
    target.removeEventListener('contextmenu', this.onContextMenu);
    target.removeEventListener('dblclick', this.onDblClick);
  }

  // At most one pad-assigned identifier is expected under normal
  // single-pad-touch use; if more than one somehow exists, the first found
  // wins (see data-model.md — palm-on-glass is already funneled to 'none'
  // well before this point).
  consumeDirection(): Direction | undefined {
    for (const hit of this.assignments.values()) {
      if (hit.kind === 'pad' && hit.direction !== undefined) return hit.direction;
    }
    return undefined;
  }

  consumeGrab(): boolean {
    return this.grabTouchId !== undefined;
  }

  consumeRestart(): boolean {
    if (!this.restartPending) return false;
    this.restartPending = false;
    return true;
  }

  consumeStart(): boolean {
    if (!this.startPending) return false;
    this.startPending = false;
    return true;
  }

  consumePause(): boolean {
    if (!this.pausePending) return false;
    this.pausePending = false;
    return true;
  }

  // No on-screen theme control this feature adds — the theme picker's own
  // tap already works as a native click (data-model.md).
  consumeCycleTheme(): boolean {
    return false;
  }

  // Always false — mirrors consumeCycleTheme()'s existing stub. The real
  // touch/pointer mute route is App.svelte's always-rendered on-screen
  // button, a native element, not this class's hit-test system
  // (mute-api.md).
  consumeMute(): boolean {
    return false;
  }
}
