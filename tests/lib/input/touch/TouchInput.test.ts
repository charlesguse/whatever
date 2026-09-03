import { describe, expect, it, vi } from 'vitest';
import { TouchInput } from '../../../../src/lib/input/touch/TouchInput';
import type { TouchControlLayout } from '../../../../src/lib/input/touch/layout';

// A minimal stub target — TouchInput.attach(target) takes any object with
// addEventListener/removeEventListener, satisfied by a plain stub with no
// DOM (there is no DOM in this project's node-environment vitest run),
// mirroring tests/lib/input/keyboard.test.ts's fakeTarget() style.
interface FakeTouch {
  identifier: number;
  clientX: number;
  clientY: number;
  target?: { closest(selector: string): unknown };
}

// Mimics real closest() semantics for a comma-separated selector list.
function elementStub(insideClass: string | false): { closest(selector: string): unknown } {
  return {
    closest: (selector: string) =>
      insideClass !== false && selector.split(',').some((part) => part.trim() === insideClass) ? {} : null,
  };
}

function fakeTarget(): {
  target: Document;
  dispatch(event: { type: string; changedTouches?: FakeTouch[] }): { preventDefault: ReturnType<typeof vi.fn> };
} {
  const listeners = new Map<string, Array<(event: unknown) => void>>();
  const target = {
    addEventListener: (type: string, handler: (event: unknown) => void) => {
      const list = listeners.get(type) ?? [];
      list.push(handler);
      listeners.set(type, list);
    },
    removeEventListener: (type: string, handler: (event: unknown) => void) => {
      const list = listeners.get(type) ?? [];
      listeners.set(
        type,
        list.filter((h) => h !== handler)
      );
    },
  } as unknown as Document;

  return {
    target,
    dispatch(event) {
      const preventDefault = vi.fn();
      const full = { changedTouches: [], ...event, preventDefault };
      for (const handler of listeners.get(event.type) ?? []) {
        handler(full);
      }
      return { preventDefault };
    },
  };
}

// A simple hand-built layout, independent of touch/layout.ts's exact
// tuning, so this suite is only exercising TouchInput's own bookkeeping.
function makeLayout(): TouchControlLayout {
  return {
    reservedRects: [{ x: 0, y: 0, width: 500, height: 300 }],
    caveRect: { x: 0, y: -300, width: 500, height: 300 },
    pad: { center: { x: 100, y: 150 }, deadRadius: 20, outerRadius: 80, zones: [] },
    grabButton: { x: 400, y: 0, width: 80, height: 80 },
    pauseButton: { x: 400, y: 100, width: 60, height: 60 },
    restartButton: { x: 400, y: 180, width: 60, height: 60 },
  };
}

describe('touchstart never calls preventDefault() (FR-012 — the theme picker\'s own tap must still synthesize a click)', () => {
  it('does not suppress the browser\'s click synthesis on a control touch or a tap-to-confirm touch', () => {
    const { target, dispatch } = fakeTarget();
    const touch = new TouchInput();
    touch.setLayout(makeLayout());
    touch.attach(target);

    const { preventDefault: onLayout } = dispatch({
      type: 'touchstart',
      changedTouches: [{ identifier: 1, clientX: 100, clientY: 100 }],
    });
    expect(onLayout).not.toHaveBeenCalled();

    touch.setLayout(undefined);
    const { preventDefault: onNoLayout } = dispatch({
      type: 'touchstart',
      changedTouches: [{ identifier: 2, clientX: 10, clientY: 10 }],
    });
    expect(onNoLayout).not.toHaveBeenCalled();
  });
});

describe('touchstart — assigns each new identifier to its resolveTouchPoint result', () => {
  it('assigns pad, grab, pause, restart, and none correctly', () => {
    const { target, dispatch } = fakeTarget();
    const touch = new TouchInput();
    touch.setLayout(makeLayout());
    touch.attach(target);

    dispatch({
      type: 'touchstart',
      changedTouches: [
        { identifier: 1, clientX: 100, clientY: 100 }, // pad, 'up' zone
        { identifier: 2, clientX: 440, clientY: 40 }, // grab
        { identifier: 3, clientX: 430, clientY: 130 }, // pause
        { identifier: 4, clientX: 430, clientY: 210 }, // restart
        { identifier: 5, clientX: 900, clientY: 900 }, // none
      ],
    });

    expect(touch.consumeDirection()).toBe('up');
    expect(touch.consumeGrab()).toBe(true);
    expect(touch.consumeRestart()).toBe(true);
    expect(touch.consumePause()).toBe(true);
  });
});

describe('touchmove — re-targets a pad-assigned identifier with no gap and no diagonal', () => {
  it('re-resolves the pad zone as the finger slides between zones', () => {
    const { target, dispatch } = fakeTarget();
    const touch = new TouchInput();
    touch.setLayout(makeLayout());
    touch.attach(target);

    dispatch({ type: 'touchstart', changedTouches: [{ identifier: 1, clientX: 100, clientY: 100 }] }); // up
    expect(touch.consumeDirection()).toBe('up');

    dispatch({ type: 'touchmove', changedTouches: [{ identifier: 1, clientX: 170, clientY: 150 }] }); // right
    expect(touch.consumeDirection()).toBe('right');

    dispatch({ type: 'touchmove', changedTouches: [{ identifier: 1, clientX: 100, clientY: 200 }] }); // down
    expect(touch.consumeDirection()).toBe('down');
  });

  it('reports no direction while outside the outer radius, and re-acquires on return', () => {
    const { target, dispatch } = fakeTarget();
    const touch = new TouchInput();
    touch.setLayout(makeLayout());
    touch.attach(target);

    dispatch({ type: 'touchstart', changedTouches: [{ identifier: 1, clientX: 100, clientY: 100 }] }); // up
    expect(touch.consumeDirection()).toBe('up');

    dispatch({ type: 'touchmove', changedTouches: [{ identifier: 1, clientX: 100, clientY: -500 }] }); // outside
    expect(touch.consumeDirection()).toBeUndefined();

    dispatch({ type: 'touchmove', changedTouches: [{ identifier: 1, clientX: 100, clientY: 200 }] }); // back inside, down
    expect(touch.consumeDirection()).toBe('down');
  });

  it('does not re-target a touch assigned to a button on move (buttons are taps/holds, not drag targets)', () => {
    const { target, dispatch } = fakeTarget();
    const touch = new TouchInput();
    touch.setLayout(makeLayout());
    touch.attach(target);

    dispatch({ type: 'touchstart', changedTouches: [{ identifier: 1, clientX: 440, clientY: 40 }] }); // grab
    expect(touch.consumeGrab()).toBe(true);

    // Slide onto the pad's center — grab must not be stolen by the pad.
    dispatch({ type: 'touchmove', changedTouches: [{ identifier: 1, clientX: 100, clientY: 150 }] });
    expect(touch.consumeGrab()).toBe(true);
    expect(touch.consumeDirection()).toBeUndefined();
  });
});

describe('touchend/touchcancel — clears exactly the ended identifier (FR-011)', () => {
  it('a released pad+grab pair release independently, leaving the other undisturbed', () => {
    const { target, dispatch } = fakeTarget();
    const touch = new TouchInput();
    touch.setLayout(makeLayout());
    touch.attach(target);

    dispatch({
      type: 'touchstart',
      changedTouches: [
        { identifier: 1, clientX: 100, clientY: 100 }, // pad, up
        { identifier: 2, clientX: 440, clientY: 40 }, // grab
      ],
    });
    expect(touch.consumeDirection()).toBe('up');
    expect(touch.consumeGrab()).toBe(true);

    dispatch({ type: 'touchend', changedTouches: [{ identifier: 1, clientX: 100, clientY: 100 }] });
    expect(touch.consumeDirection()).toBeUndefined();
    expect(touch.consumeGrab()).toBe(true); // grab's identifier is untouched

    dispatch({ type: 'touchcancel', changedTouches: [{ identifier: 2, clientX: 440, clientY: 40 }] });
    expect(touch.consumeGrab()).toBe(false);
  });
});

describe('a touch assigned "none" at touchstart never produces or cancels a direction (palm-on-glass)', () => {
  it('several such touches active at once never interfere with a real pad touch', () => {
    const { target, dispatch } = fakeTarget();
    const touch = new TouchInput();
    touch.setLayout(makeLayout());
    touch.attach(target);

    dispatch({
      type: 'touchstart',
      changedTouches: [
        { identifier: 1, clientX: 100, clientY: 100 }, // pad, up
        { identifier: 2, clientX: 900, clientY: 900 }, // none
        { identifier: 3, clientX: 950, clientY: 950 }, // none
      ],
    });
    expect(touch.consumeDirection()).toBe('up');

    dispatch({ type: 'touchmove', changedTouches: [{ identifier: 2, clientX: 920, clientY: 920 }] });
    expect(touch.consumeGrab()).toBe(false);

    dispatch({ type: 'touchend', changedTouches: [{ identifier: 2, clientX: 900, clientY: 900 }] });
    dispatch({
      type: 'touchstart',
      changedTouches: [{ identifier: 1, clientX: 100, clientY: 200 }],
    });
  });
});

describe('consumeStart() — set only by a touchstart while no layout is active (FR-014)', () => {
  it('is set when layout is undefined', () => {
    const { target, dispatch } = fakeTarget();
    const touch = new TouchInput();
    touch.attach(target);

    expect(touch.consumeStart()).toBe(false);
    dispatch({ type: 'touchstart', changedTouches: [{ identifier: 1, clientX: 10, clientY: 10 }] });
    expect(touch.consumeStart()).toBe(true);
    expect(touch.consumeStart()).toBe(false);
  });

  it('is never set by a touchstart while a real layout is active', () => {
    const { target, dispatch } = fakeTarget();
    const touch = new TouchInput();
    touch.setLayout(makeLayout());
    touch.attach(target);

    dispatch({ type: 'touchstart', changedTouches: [{ identifier: 1, clientX: 100, clientY: 100 }] });
    expect(touch.consumeStart()).toBe(false);
  });

  it('is not set by a touchstart targeting the theme picker (FR-017/FR-020, mirroring keyboard.ts)', () => {
    const { target, dispatch } = fakeTarget();
    const touch = new TouchInput();
    touch.attach(target);

    dispatch({
      type: 'touchstart',
      changedTouches: [{ identifier: 1, clientX: 10, clientY: 10, target: elementStub('.theme-picker') }],
    });
    expect(touch.consumeStart()).toBe(false);
  });

  it('is not set by a touchstart targeting the mute button (008, FR-025)', () => {
    const { target, dispatch } = fakeTarget();
    const touch = new TouchInput();
    touch.attach(target);

    dispatch({
      type: 'touchstart',
      changedTouches: [{ identifier: 1, clientX: 10, clientY: 10, target: elementStub('.mute-button') }],
    });
    expect(touch.consumeStart()).toBe(false);
  });

  it('is still set by a touchstart with no such target, or one outside the theme picker', () => {
    const { target, dispatch } = fakeTarget();
    const touch = new TouchInput();
    touch.attach(target);

    dispatch({
      type: 'touchstart',
      changedTouches: [{ identifier: 1, clientX: 10, clientY: 10, target: elementStub(false) }],
    });
    expect(touch.consumeStart()).toBe(true);
  });
});

describe('a held pad direction produces the identical per-tick action a held keyboard key produces (SC-003)', () => {
  it('reports the same one-tick-delay cadence as keyboard: report, suppress, report every tick after (FR-020)', () => {
    const { target, dispatch } = fakeTarget();
    const touch = new TouchInput();
    touch.setLayout(makeLayout());
    touch.attach(target);

    dispatch({ type: 'touchstart', changedTouches: [{ identifier: 1, clientX: 100, clientY: 100 }] }); // up
    expect(touch.consumeDirection()).toBe('up'); // tick 1: reports
    expect(touch.consumeDirection()).toBeUndefined(); // tick 2: the one-tick delay
    for (let tick = 0; tick < 5; tick++) {
      expect(touch.consumeDirection()).toBe('up'); // tick 3+: reports every tick
    }
  });
});

describe('TouchInput.consumeDirection — one tap, one cell (FR-001, FR-006, FR-009 equivalent, SC-001)', () => {
  const tapShapes: Record<string, ['start' | 'end' | 'tick', ...Array<'start' | 'end' | 'tick'>]> = {
    'one observed tick': ['start', 'tick', 'end', 'tick'],
    'two observed ticks': ['start', 'tick', 'tick', 'end', 'tick'],
  };

  for (const [shape, steps] of Object.entries(tapShapes)) {
    for (let offset = 0; offset <= 2; offset += 1) {
      it(`reports exactly once for a tap spanning ${shape}, at offset ${offset}`, () => {
        const { target, dispatch } = fakeTarget();
        const touch = new TouchInput();
        touch.setLayout(makeLayout());
        touch.attach(target);

        const reported: Array<string | undefined> = [];
        for (let i = 0; i < offset; i += 1) reported.push(touch.consumeDirection());
        for (const step of steps) {
          if (step === 'start') {
            dispatch({ type: 'touchstart', changedTouches: [{ identifier: 1, clientX: 100, clientY: 100 }] });
          } else if (step === 'end') {
            dispatch({ type: 'touchend', changedTouches: [{ identifier: 1, clientX: 100, clientY: 100 }] });
          } else {
            reported.push(touch.consumeDirection());
          }
        }
        reported.push(touch.consumeDirection());
        reported.push(touch.consumeDirection());

        expect(reported.filter((d) => d !== undefined)).toEqual(['up']);
      });
    }
  }

  it('release then no more moves, then an immediate re-press reports again on its own first tick (FR-006)', () => {
    const { target, dispatch } = fakeTarget();
    const touch = new TouchInput();
    touch.setLayout(makeLayout());
    touch.attach(target);

    dispatch({ type: 'touchstart', changedTouches: [{ identifier: 1, clientX: 100, clientY: 100 }] }); // up
    expect(touch.consumeDirection()).toBe('up');
    dispatch({ type: 'touchend', changedTouches: [{ identifier: 1, clientX: 100, clientY: 100 }] });
    expect(touch.consumeDirection()).toBeUndefined();
    expect(touch.consumeDirection()).toBeUndefined();

    dispatch({ type: 'touchstart', changedTouches: [{ identifier: 1, clientX: 100, clientY: 100 }] }); // up again
    expect(touch.consumeDirection()).toBe('up');
  });

  it('a slide between pad zones (direction change while held) reports the new direction on the very next tick (FR-007)', () => {
    const { target, dispatch } = fakeTarget();
    const touch = new TouchInput();
    touch.setLayout(makeLayout());
    touch.attach(target);

    dispatch({ type: 'touchstart', changedTouches: [{ identifier: 1, clientX: 100, clientY: 100 }] }); // up
    expect(touch.consumeDirection()).toBe('up'); // tick 1: reports
    expect(touch.consumeDirection()).toBeUndefined(); // tick 2: suppressed

    dispatch({ type: 'touchmove', changedTouches: [{ identifier: 1, clientX: 170, clientY: 150 }] }); // right
    expect(touch.consumeDirection()).toBe('right'); // fresh press, reports immediately
  });
});

describe("mute's touch route is the on-screen button, not this class (mute-api.md)", () => {
  it('TouchInput.consumeMute() always returns false', () => {
    const touch = new TouchInput();
    expect(touch.consumeMute()).toBe(false);
    expect(touch.consumeMute()).toBe(false);
  });
});
