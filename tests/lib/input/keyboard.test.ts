import { describe, expect, it } from 'vitest';
import {
  CYCLE_THEME_KEYS,
  GRAB_KEYS,
  KEY_TO_DIRECTION,
  KeyboardInput,
  MUTE_KEYS,
  PAUSE_KEYS,
  RESTART_KEYS,
  START_KEYS,
} from '../../../src/lib/input/keyboard';

// A minimal stub target — KeyboardInput.attach(target) takes any object
// with addEventListener/removeEventListener, satisfied by a plain stub
// with no DOM (there is no DOM in this project's node-environment vitest
// run, per CLAUDE.md).
function fakeTarget(): {
  target: Window;
  dispatch(event: Partial<KeyboardEvent> & { type: 'keydown' | 'keyup'; target?: unknown }): void;
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
      listeners.set(type, list.filter((h) => h !== handler));
    },
  } as unknown as Window;

  return {
    target,
    dispatch(event) {
      const full = { repeat: false, preventDefault: () => {}, ...event };
      for (const handler of listeners.get(event.type) ?? []) {
        handler(full);
      }
    },
  };
}

// A minimal stand-in for a DOM element inside (or outside) a given class —
// only `closest()` is exercised by keyboard.ts, so that is all this stub
// implements (no real DOM in this project's test run). Mimics real
// `closest()` semantics for a comma-separated selector list.
function elementStub(insideClass: string | false): { closest(selector: string): unknown } {
  return {
    closest: (selector: string) =>
      insideClass !== false && selector.split(',').some((part) => part.trim() === insideClass) ? {} : null,
  };
}

describe('KeyboardInput.consumeCycleTheme (FR-033)', () => {
  it('reports true exactly once per keydown, false otherwise', () => {
    const { target, dispatch } = fakeTarget();
    const keyboard = new KeyboardInput();
    keyboard.attach(target);

    expect(keyboard.consumeCycleTheme()).toBe(false);

    dispatch({ type: 'keydown', key: 't' });
    expect(keyboard.consumeCycleTheme()).toBe(true);
    expect(keyboard.consumeCycleTheme()).toBe(false);

    dispatch({ type: 'keydown', key: 'T' });
    expect(keyboard.consumeCycleTheme()).toBe(true);
  });

  it('ignores event.repeat, the same way consumeRestart()/consumePause() do', () => {
    const { target, dispatch } = fakeTarget();
    const keyboard = new KeyboardInput();
    keyboard.attach(target);

    dispatch({ type: 'keydown', key: 't', repeat: true });
    expect(keyboard.consumeCycleTheme()).toBe(false);
  });

  it("a held direction key's report is unaffected by an interleaved cycleTheme keydown/keyup", () => {
    const { target, dispatch } = fakeTarget();
    const keyboard = new KeyboardInput();
    keyboard.attach(target);

    dispatch({ type: 'keydown', key: 'ArrowUp' });
    dispatch({ type: 'keydown', key: 't' });
    dispatch({ type: 'keyup', key: 't' });

    expect(keyboard.consumeDirection()).toBe('up');
    expect(keyboard.consumeCycleTheme()).toBe(true);
  });
});

describe('Start-key presses targeting the theme picker (FR-017, US1/AC6)', () => {
  it('does not set startPending when event.target is inside the theme picker', () => {
    const { target, dispatch } = fakeTarget();
    const keyboard = new KeyboardInput();
    keyboard.attach(target);

    dispatch({ type: 'keydown', key: 'Enter', target: elementStub('.theme-picker') });
    expect(keyboard.consumeStart()).toBe(false);

    dispatch({ type: 'keydown', key: ' ', target: elementStub('.theme-picker') });
    expect(keyboard.consumeStart()).toBe(false);
  });

  it('still sets startPending exactly as before when there is no such target', () => {
    const { target, dispatch } = fakeTarget();
    const keyboard = new KeyboardInput();
    keyboard.attach(target);

    dispatch({ type: 'keydown', key: 'Enter', target: elementStub(false) });
    expect(keyboard.consumeStart()).toBe(true);

    dispatch({ type: 'keydown', key: ' ' });
    expect(keyboard.consumeStart()).toBe(true);
  });
});

describe('Start-key presses targeting the mute button (008, FR-025)', () => {
  it('does not set startPending when event.target is inside the mute button', () => {
    const { target, dispatch } = fakeTarget();
    const keyboard = new KeyboardInput();
    keyboard.attach(target);

    dispatch({ type: 'keydown', key: 'Enter', target: elementStub('.mute-button') });
    expect(keyboard.consumeStart()).toBe(false);

    dispatch({ type: 'keydown', key: ' ', target: elementStub('.mute-button') });
    expect(keyboard.consumeStart()).toBe(false);
  });
});

describe('CYCLE_THEME_KEYS is disjoint from every gameplay key set (SC-011)', () => {
  it('shares no member with direction/grab/restart/start/pause keys', () => {
    const otherKeySets = [
      Object.keys(KEY_TO_DIRECTION),
      [...GRAB_KEYS],
      [...RESTART_KEYS],
      [...START_KEYS],
      [...PAUSE_KEYS],
    ];
    for (const keys of otherKeySets) {
      for (const key of keys) {
        expect(CYCLE_THEME_KEYS.has(key)).toBe(false);
      }
    }
  });
});

describe('KeyboardInput.consumeMute (FR-024, FR-025)', () => {
  it('reports true exactly once per keydown, false otherwise', () => {
    const { target, dispatch } = fakeTarget();
    const keyboard = new KeyboardInput();
    keyboard.attach(target);

    expect(keyboard.consumeMute()).toBe(false);

    dispatch({ type: 'keydown', key: 'm' });
    expect(keyboard.consumeMute()).toBe(true);
    expect(keyboard.consumeMute()).toBe(false);

    dispatch({ type: 'keydown', key: 'M' });
    expect(keyboard.consumeMute()).toBe(true);
  });

  it('ignores event.repeat', () => {
    const { target, dispatch } = fakeTarget();
    const keyboard = new KeyboardInput();
    keyboard.attach(target);

    dispatch({ type: 'keydown', key: 'm', repeat: true });
    expect(keyboard.consumeMute()).toBe(false);
  });
});

// A tick-driven step: 'down'/'up' dispatch a key event between ticks; 'tick'
// calls consumeDirection() once, as App.svelte's stepTickInner() does.
type Step = 'down' | 'up' | 'tick';

function runSteps(steps: Step[], key = 'ArrowUp'): Array<import('../../../src/sim/tick').Direction | undefined> {
  const { target, dispatch } = fakeTarget();
  const keyboard = new KeyboardInput();
  keyboard.attach(target);
  const reported: Array<import('../../../src/sim/tick').Direction | undefined> = [];
  for (const step of steps) {
    if (step === 'down') dispatch({ type: 'keydown', key });
    else if (step === 'up') dispatch({ type: 'keyup', key });
    else reported.push(keyboard.consumeDirection());
  }
  return reported;
}

describe('KeyboardInput.consumeDirection — one tap, one cell (FR-001, FR-005, SC-001, SC-002)', () => {
  // A tap that spans 0, 1, or 2 consecutive consumeDirection() calls
  // observing it down, at every leading tick-boundary offset, must report
  // exactly one direction overall — never zero, never two.
  const tapShapes: Record<string, Step[]> = {
    'zero observed ticks (sub-tick tap, pendingTap path)': ['down', 'up', 'tick'],
    'one observed tick': ['down', 'tick', 'up', 'tick'],
    'two observed ticks': ['down', 'tick', 'tick', 'up', 'tick'],
  };

  for (const [shape, tap] of Object.entries(tapShapes)) {
    for (let offset = 0; offset <= 3; offset += 1) {
      it(`reports exactly once for a tap spanning ${shape}, at offset ${offset}`, () => {
        const leading: Step[] = Array(offset).fill('tick');
        const trailing: Step[] = ['tick', 'tick'];
        const reported = runSteps([...leading, ...tap, ...trailing]);
        const moves = reported.filter((direction) => direction !== undefined);
        expect(moves).toEqual(['up']);
      });
    }
  }

  it('the sub-tick pendingTap guarantee still reports exactly one move for a press and release no tick observes down (FR-009)', () => {
    const reported = runSteps(['tick', 'down', 'up', 'tick', 'tick']);
    expect(reported.filter((d) => d !== undefined)).toEqual(['up']);
  });

  it('three consecutive taps in the same direction produce three reported moves (US1 AC5)', () => {
    const reported = runSteps([
      'down', 'up', 'tick', // tap 1: sub-tick
      'down', 'tick', 'up', 'tick', // tap 2: one observed tick
      'down', 'tick', 'tick', 'up', 'tick', // tap 3: two observed ticks
    ]);
    expect(reported.filter((d) => d !== undefined)).toEqual(['up', 'up', 'up']);
  });
});

describe('KeyboardInput.consumeDirection — held still means "keep going" (FR-002, FR-003, US2)', () => {
  it('settles into report/suppress/report×N with exactly one suppressed tick and no further gaps (SC-003, SC-004)', () => {
    const { target, dispatch } = fakeTarget();
    const keyboard = new KeyboardInput();
    keyboard.attach(target);

    dispatch({ type: 'keydown', key: 'ArrowUp' });

    const reported: Array<import('../../../src/sim/tick').Direction | undefined> = [];
    for (let tick = 0; tick < 120; tick += 1) {
      reported.push(keyboard.consumeDirection());
    }

    expect(reported[0]).toBe('up'); // tick 1: reports
    expect(reported[1]).toBeUndefined(); // tick 2: the one-tick delay
    for (let tick = 2; tick < reported.length; tick += 1) {
      expect(reported[tick]).toBe('up');
    }
  });

  it('release stops all further moves (US2 AC2)', () => {
    const { target, dispatch } = fakeTarget();
    const keyboard = new KeyboardInput();
    keyboard.attach(target);

    dispatch({ type: 'keydown', key: 'ArrowUp' });
    keyboard.consumeDirection();
    keyboard.consumeDirection();
    keyboard.consumeDirection();
    dispatch({ type: 'keyup', key: 'ArrowUp' });

    expect(keyboard.consumeDirection()).toBeUndefined();
    expect(keyboard.consumeDirection()).toBeUndefined();
  });

  it('a release then an immediate re-press is treated as fresh — reports on its own first tick (FR-006, US2 AC5)', () => {
    const { target, dispatch } = fakeTarget();
    const keyboard = new KeyboardInput();
    keyboard.attach(target);

    dispatch({ type: 'keydown', key: 'ArrowUp' });
    expect(keyboard.consumeDirection()).toBe('up'); // tick 1
    expect(keyboard.consumeDirection()).toBeUndefined(); // tick 2, suppressed
    dispatch({ type: 'keyup', key: 'ArrowUp' });
    dispatch({ type: 'keydown', key: 'ArrowUp' });
    expect(keyboard.consumeDirection()).toBe('up'); // fresh press, reports immediately
  });

  it('pressing a second direction while the first is still held reports the new direction on the very next tick, and the first resumes without re-paying the hitch on release of the second (FR-007, US2 AC3/AC4, research.md D2)', () => {
    const { target, dispatch } = fakeTarget();
    const keyboard = new KeyboardInput();
    keyboard.attach(target);

    dispatch({ type: 'keydown', key: 'ArrowUp' });
    expect(keyboard.consumeDirection()).toBe('up'); // tick 1: up reports
    expect(keyboard.consumeDirection()).toBeUndefined(); // tick 2: up suppressed

    dispatch({ type: 'keydown', key: 'ArrowRight' });
    expect(keyboard.consumeDirection()).toBe('right'); // right is fresh, reports immediately

    dispatch({ type: 'keyup', key: 'ArrowRight' });
    // up's ticksSincePress kept advancing while preempted (research.md D2),
    // so it resumes reporting without paying the one-tick hitch again.
    expect(keyboard.consumeDirection()).toBe('up');
  });

  it('holding a direction while the grab modifier is also held leaves the grab modifier unaffected (US2 AC6, FR-013)', () => {
    const { target, dispatch } = fakeTarget();
    const keyboard = new KeyboardInput();
    keyboard.attach(target);

    dispatch({ type: 'keydown', key: 'Shift' });
    dispatch({ type: 'keydown', key: 'ArrowUp' });

    expect(keyboard.consumeDirection()).toBe('up');
    expect(keyboard.consumeGrab()).toBe(true);
    expect(keyboard.consumeDirection()).toBeUndefined();
    expect(keyboard.consumeGrab()).toBe(true);
    expect(keyboard.consumeDirection()).toBe('up');
    expect(keyboard.consumeGrab()).toBe(true);
  });
});

describe('MUTE_KEYS is disjoint from every other key set (FR-025)', () => {
  it('shares no member with direction/grab/restart/start/pause/cycle-theme keys', () => {
    const otherKeySets = [
      Object.keys(KEY_TO_DIRECTION),
      [...GRAB_KEYS],
      [...RESTART_KEYS],
      [...START_KEYS],
      [...PAUSE_KEYS],
      [...CYCLE_THEME_KEYS],
    ];
    for (const keys of otherKeySets) {
      for (const key of keys) {
        expect(MUTE_KEYS.has(key)).toBe(false);
      }
    }
  });
});
