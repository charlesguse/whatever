import { describe, expect, it } from 'vitest';
import {
  CYCLE_THEME_KEYS,
  GRAB_KEYS,
  KEY_TO_DIRECTION,
  KeyboardInput,
  PAUSE_KEYS,
  RESTART_KEYS,
  START_KEYS,
} from '../../../src/lib/input/keyboard';

// A minimal stub target — KeyboardInput.attach(target) takes any object
// with addEventListener/removeEventListener, satisfied by a plain stub
// with no DOM (there is no DOM in this project's node-environment vitest
// run, per CLAUDE.md).
function fakeTarget(): { target: Window; dispatch(event: Partial<KeyboardEvent> & { type: 'keydown' | 'keyup' }): void } {
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
