import { describe, expect, it, vi } from 'vitest';
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
import { TouchInput } from '../../../src/lib/input/touch/TouchInput';
import type { TouchControlLayout } from '../../../src/lib/input/touch/layout';
import { GamepadInput } from '../../../src/lib/input/gamepad/GamepadInput';
import { DPAD_BUTTON_INDEX } from '../../../src/lib/input/gamepad/bindings';
import { resolveDirection } from '../../../src/lib/input/merge';

const NAMED_ACTIONS = [
  'consumeDirection',
  'consumeGrab',
  'consumeRestart',
  'consumeStart',
  'consumePause',
  'consumeCycleTheme',
  'consumeMute',
] as const;

describe('KeyboardInput declares all seven named actions, each backed by a non-empty key table (SC-012)', () => {
  it('every named action method exists', () => {
    const keyboard = new KeyboardInput();
    for (const action of NAMED_ACTIONS) {
      expect(typeof (keyboard as unknown as Record<string, unknown>)[action]).toBe('function');
    }
  });

  it('every key table backing those actions is non-empty', () => {
    expect(Object.keys(KEY_TO_DIRECTION).length).toBeGreaterThan(0);
    expect(GRAB_KEYS.size).toBeGreaterThan(0);
    expect(RESTART_KEYS.size).toBeGreaterThan(0);
    expect(START_KEYS.size).toBeGreaterThan(0);
    expect(PAUSE_KEYS.size).toBeGreaterThan(0);
    expect(CYCLE_THEME_KEYS.size).toBeGreaterThan(0);
    expect(MUTE_KEYS.size).toBeGreaterThan(0);
  });
});

describe("touch's cycle-theme route is the existing theme-picker tap, not a new control", () => {
  it('TouchInput.consumeCycleTheme() always returns false', () => {
    const touch = new TouchInput();
    expect(touch.consumeCycleTheme()).toBe(false);
    expect(touch.consumeCycleTheme()).toBe(false);
  });

  it('TouchInput has no consumeConfirm()', () => {
    const touch = new TouchInput();
    expect((touch as unknown as Record<string, unknown>).consumeConfirm).toBeUndefined();
  });
});

describe("gamepad's confirm route is the edge-triggered consumeConfirm(), not consumeStart()", () => {
  it('GamepadInput has no consumeStart()', () => {
    const gamepad = new GamepadInput();
    expect((gamepad as unknown as Record<string, unknown>).consumeStart).toBeUndefined();
  });
});

describe('nothing declared by touch or gamepad reaches an action keyboard does not also cover (FR-035)', () => {
  // gamepad's consumeConfirm() fills the same role as keyboard/touch's
  // consumeStart() (research.md's dual-read decision) — a different method
  // name for the identical named action, not an extra one.
  const roleAliases: Record<string, string> = { consumeConfirm: 'consumeStart' };

  function assertEveryConsumeMethodIsCoveredByKeyboard(instance: object, keyboard: KeyboardInput): void {
    const proto = Object.getPrototypeOf(instance);
    const methodNames = Object.getOwnPropertyNames(proto).filter((name) => name.startsWith('consume'));
    expect(methodNames.length).toBeGreaterThan(0);
    for (const name of methodNames) {
      const keyboardName = roleAliases[name] ?? name;
      expect(typeof (keyboard as unknown as Record<string, unknown>)[keyboardName]).toBe('function');
    }
  }

  it('every TouchInput consume*() method has a keyboard counterpart', () => {
    assertEveryConsumeMethodIsCoveredByKeyboard(new TouchInput(), new KeyboardInput());
  });

  it('every GamepadInput consume*() method has a keyboard counterpart', () => {
    assertEveryConsumeMethodIsCoveredByKeyboard(new GamepadInput(), new KeyboardInput());
  });
});

function fakeKeyboardTarget(): { target: Window; dispatch(type: 'keydown' | 'keyup', key: string): void } {
  const listeners = new Map<string, Array<(event: unknown) => void>>();
  const target = {
    addEventListener: (type: string, handler: (event: unknown) => void) => {
      listeners.set(type, [...(listeners.get(type) ?? []), handler]);
    },
    removeEventListener: () => {},
  } as unknown as Window;
  return {
    target,
    dispatch(type, key) {
      const event = { type, key, repeat: false, preventDefault: () => {} };
      for (const handler of listeners.get(type) ?? []) handler(event);
    },
  };
}

function fakeTouchTarget(): {
  target: Document;
  dispatch(type: 'touchstart' | 'touchend', identifier: number, x: number, y: number): void;
} {
  const listeners = new Map<string, Array<(event: unknown) => void>>();
  const target = {
    addEventListener: (type: string, handler: (event: unknown) => void) => {
      listeners.set(type, [...(listeners.get(type) ?? []), handler]);
    },
    removeEventListener: () => {},
  } as unknown as Document;
  return {
    target,
    dispatch(type, identifier, clientX, clientY) {
      const event = { type, changedTouches: [{ identifier, clientX, clientY }], preventDefault: () => {} };
      for (const handler of listeners.get(type) ?? []) handler(event);
    },
  };
}

function touchPadLayout(): TouchControlLayout {
  return {
    reservedRects: [{ x: 0, y: 0, width: 500, height: 300 }],
    caveRect: { x: 0, y: -300, width: 500, height: 300 },
    pad: { center: { x: 100, y: 150 }, deadRadius: 20, outerRadius: 80, zones: [] },
    grabButton: { x: 400, y: 0, width: 80, height: 80 },
    pauseButton: { x: 400, y: 100, width: 60, height: 60 },
    restartButton: { x: 400, y: 180, width: 60, height: 60 },
  };
}

function gamepadButton(pressed: boolean): GamepadButton {
  return { pressed, touched: pressed, value: pressed ? 1 : 0 } as GamepadButton;
}

function makeUpPad(pressed: boolean): Gamepad {
  const buttons: GamepadButton[] = [];
  for (let i = 0; i <= 15; i += 1) buttons.push(gamepadButton(pressed && i === DPAD_BUTTON_INDEX.up));
  return { index: 0, connected: true, id: 'synthetic', mapping: 'standard', buttons, axes: [0, 0], timestamp: 0, vibrationActuator: null } as unknown as Gamepad;
}

describe('all three input sources resolve repeats through the one shared advanceRepeat (FR-018, FR-019, US3 AC3)', () => {
  it("KeyboardInput's, TouchInput's, and GamepadInput's own source each calls the shared advanceRepeat, not an independently-shaped per-source implementation", () => {
    expect(KeyboardInput.toString()).toMatch(/advanceRepeat/);
    expect(TouchInput.toString()).toMatch(/advanceRepeat/);
    expect(GamepadInput.toString()).toMatch(/advanceRepeat/);
  });

  it('keyboard, touch, and gamepad report the identical cadence for the identical press/hold/release sequence (US3 Independent Test)', () => {
    const keyboard = new KeyboardInput();
    const { target: kbTarget, dispatch: kbDispatch } = fakeKeyboardTarget();
    keyboard.attach(kbTarget);

    const touch = new TouchInput();
    touch.setLayout(touchPadLayout());
    const { target: touchTarget, dispatch: touchDispatch } = fakeTouchTarget();
    touch.attach(touchTarget);

    const gamepad = new GamepadInput();
    let pads: Gamepad[] = [];
    vi.stubGlobal('navigator', { getGamepads: () => pads });

    // press
    kbDispatch('keydown', 'ArrowUp');
    touchDispatch('touchstart', 1, 100, 100);
    pads = [makeUpPad(true)];
    gamepad.poll();

    const readAll = (): Array<string | undefined> => [
      keyboard.consumeDirection(),
      touch.consumeDirection(),
      gamepad.consumeDirection(),
    ];

    const tick1 = readAll();
    expect(new Set(tick1)).toEqual(new Set(['up']));

    gamepad.poll();
    const tick2 = readAll();
    expect(new Set(tick2)).toEqual(new Set([undefined]));

    gamepad.poll();
    const tick3 = readAll();
    expect(new Set(tick3)).toEqual(new Set(['up']));

    // release
    kbDispatch('keyup', 'ArrowUp');
    touchDispatch('touchend', 1, 100, 100);
    pads = [makeUpPad(false)];
    gamepad.poll();
    const tick4 = readAll();
    expect(new Set(tick4)).toEqual(new Set([undefined]));

    vi.unstubAllGlobals();
  });
});

describe('cross-source direction precedence is unaffected by per-source repeat state (FR-014, US3 AC4/AC5)', () => {
  it('two sources holding different directions on the same tick each track their own repeat state independently, and resolveDirection\'s precedence (already asserted in merge.test.ts) is unchanged', () => {
    const keyboard = new KeyboardInput();
    const { target: kbTarget, dispatch: kbDispatch } = fakeKeyboardTarget();
    keyboard.attach(kbTarget);

    const touch = new TouchInput();
    touch.setLayout(touchPadLayout());
    const { target: touchTarget, dispatch: touchDispatch } = fakeTouchTarget();
    touch.attach(touchTarget);

    kbDispatch('keydown', 'ArrowUp');
    touchDispatch('touchstart', 1, 170, 150); // right

    // Both report on their own first tick, independently.
    expect(keyboard.consumeDirection()).toBe('up');
    expect(touch.consumeDirection()).toBe('right');
    // resolveDirection still prefers keyboard, unrelated to either source's
    // internal repeat bookkeeping (merge.test.ts pins this precedence).
    expect(resolveDirection('up', 'right', undefined)).toBe('up');

    // Both suppress on their own second tick, independently — neither
    // source's delay leaked into or was affected by the other's state.
    expect(keyboard.consumeDirection()).toBeUndefined();
    expect(touch.consumeDirection()).toBeUndefined();
  });
});
