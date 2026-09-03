import { afterEach, describe, expect, it, vi } from 'vitest';
import { GamepadInput } from '../../../../src/lib/input/gamepad/GamepadInput';
import { DPAD_BUTTON_INDEX, FACE_BUTTON_GRAB_CONFIRM_INDEX, MUTE_BUTTON_INDEX, PAUSE_BUTTON_INDEX } from '../../../../src/lib/input/gamepad/bindings';

function button(pressed: boolean): GamepadButton {
  return { pressed, touched: pressed, value: pressed ? 1 : 0 } as GamepadButton;
}

function makePad(
  index: number,
  options: { pressedIndices?: number[]; axes?: number[] } = {}
): Gamepad {
  const pressedIndices = options.pressedIndices ?? [];
  const max = Math.max(0, ...pressedIndices, 15);
  const buttons: GamepadButton[] = [];
  for (let i = 0; i <= max; i++) buttons.push(button(pressedIndices.includes(i)));
  return {
    index,
    connected: true,
    id: 'synthetic',
    mapping: 'standard',
    buttons,
    axes: options.axes ?? [0, 0],
    timestamp: 0,
    vibrationActuator: null,
  } as unknown as Gamepad;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('GamepadInput.poll() — unsupported platforms (FR-028)', () => {
  it('never calls navigator.getGamepads and never throws when unsupported', () => {
    vi.stubGlobal('navigator', {});
    const getGamepads = vi.fn();
    const gamepad = new GamepadInput();
    expect(() => gamepad.poll()).not.toThrow();
    expect(getGamepads).not.toHaveBeenCalled();
    expect(gamepad.consumeDirection()).toBeUndefined();
    expect(gamepad.consumeGrab()).toBe(false);
  });
});

describe('GamepadInput.poll() — cross-pad merge (FR-024)', () => {
  it('either pad\'s held direction/grab drives the result, neither cancels the other', () => {
    const padA = makePad(0, { pressedIndices: [FACE_BUTTON_GRAB_CONFIRM_INDEX] });
    const padB = makePad(1, { pressedIndices: [DPAD_BUTTON_INDEX.up] });
    vi.stubGlobal('navigator', { getGamepads: () => [padA, padB] });

    const gamepad = new GamepadInput();
    gamepad.poll();

    expect(gamepad.consumeGrab()).toBe(true); // from padA
    expect(gamepad.consumeDirection()).toBe('up'); // from padB
  });

  it('scans pads in index order — the first non-undefined direction wins', () => {
    const padA = makePad(0, { pressedIndices: [DPAD_BUTTON_INDEX.left] });
    const padB = makePad(1, { pressedIndices: [DPAD_BUTTON_INDEX.up] });
    vi.stubGlobal('navigator', { getGamepads: () => [padA, padB] });

    const gamepad = new GamepadInput();
    gamepad.poll();

    expect(gamepad.consumeDirection()).toBe('left');
  });
});

describe('GamepadInput — consumeGrab (level) vs. consumeConfirm (edge) on the same button index', () => {
  it('holding the button keeps consumeGrab() true across many polls while consumeConfirm() fires once', () => {
    const gamepad = new GamepadInput();
    const pressed = () => makePad(0, { pressedIndices: [FACE_BUTTON_GRAB_CONFIRM_INDEX] });
    vi.stubGlobal('navigator', { getGamepads: () => [pressed()] });

    gamepad.poll();
    expect(gamepad.consumeGrab()).toBe(true);
    expect(gamepad.consumeConfirm()).toBe(true);

    gamepad.poll();
    expect(gamepad.consumeGrab()).toBe(true);
    expect(gamepad.consumeConfirm()).toBe(false);

    gamepad.poll();
    expect(gamepad.consumeGrab()).toBe(true);
    expect(gamepad.consumeConfirm()).toBe(false);
  });
});

describe('GamepadInput — one direction per held tick, one-tick repeat delay (FR-020)', () => {
  it('a held d-pad direction reports the same cadence as keyboard: report, suppress, report every tick after', () => {
    const gamepad = new GamepadInput();
    vi.stubGlobal('navigator', {
      getGamepads: () => [makePad(0, { pressedIndices: [DPAD_BUTTON_INDEX.right] })],
    });

    gamepad.poll();
    expect(gamepad.consumeDirection()).toBe('right'); // tick 1: reports
    gamepad.poll();
    expect(gamepad.consumeDirection()).toBeUndefined(); // tick 2: the one-tick delay
    for (let tick = 0; tick < 5; tick++) {
      gamepad.poll();
      expect(gamepad.consumeDirection()).toBe('right'); // tick 3+: reports every tick
    }
  });
});

describe('GamepadInput.consumeDirection — one tap, one cell (FR-001, FR-006, FR-007)', () => {
  it('a tap held for exactly one poll reports exactly once', () => {
    const gamepad = new GamepadInput();
    let pads: Gamepad[] = [makePad(0, { pressedIndices: [DPAD_BUTTON_INDEX.up] })];
    vi.stubGlobal('navigator', { getGamepads: () => pads });

    gamepad.poll();
    expect(gamepad.consumeDirection()).toBe('up');

    pads = [makePad(0, {})];
    gamepad.poll();
    expect(gamepad.consumeDirection()).toBeUndefined();
    gamepad.poll();
    expect(gamepad.consumeDirection()).toBeUndefined();
  });

  it('a tap held for exactly two polls reports exactly once', () => {
    const gamepad = new GamepadInput();
    let pads: Gamepad[] = [makePad(0, { pressedIndices: [DPAD_BUTTON_INDEX.up] })];
    vi.stubGlobal('navigator', { getGamepads: () => pads });

    gamepad.poll();
    expect(gamepad.consumeDirection()).toBe('up');
    gamepad.poll();
    expect(gamepad.consumeDirection()).toBeUndefined();

    pads = [makePad(0, {})];
    gamepad.poll();
    expect(gamepad.consumeDirection()).toBeUndefined();
  });

  it('release then an immediate re-press is treated as fresh — reports on its own first tick (FR-006)', () => {
    const gamepad = new GamepadInput();
    let pads: Gamepad[] = [makePad(0, { pressedIndices: [DPAD_BUTTON_INDEX.up] })];
    vi.stubGlobal('navigator', { getGamepads: () => pads });

    gamepad.poll();
    expect(gamepad.consumeDirection()).toBe('up');
    gamepad.poll();
    expect(gamepad.consumeDirection()).toBeUndefined();

    pads = [makePad(0, {})];
    gamepad.poll();
    expect(gamepad.consumeDirection()).toBeUndefined();

    pads = [makePad(0, { pressedIndices: [DPAD_BUTTON_INDEX.up] })];
    gamepad.poll();
    expect(gamepad.consumeDirection()).toBe('up');
  });

  it('a d-pad-to-stick direction change while held reports the new direction on the very next tick (FR-007)', () => {
    const gamepad = new GamepadInput();
    let pads: Gamepad[] = [makePad(0, { pressedIndices: [DPAD_BUTTON_INDEX.up] })];
    vi.stubGlobal('navigator', { getGamepads: () => pads });

    gamepad.poll();
    expect(gamepad.consumeDirection()).toBe('up'); // tick 1: reports
    gamepad.poll();
    expect(gamepad.consumeDirection()).toBeUndefined(); // tick 2: suppressed

    pads = [makePad(0, { axes: [0.6, 0] })]; // stick right
    gamepad.poll();
    expect(gamepad.consumeDirection()).toBe('right'); // fresh press, reports immediately
  });
});

describe('GamepadInput — one-shot edge-trigger across a held span (SC-006)', () => {
  it('pause fires once on the poll it becomes pressed, not again while held', () => {
    const gamepad = new GamepadInput();
    vi.stubGlobal('navigator', {
      getGamepads: () => [makePad(0, { pressedIndices: [PAUSE_BUTTON_INDEX] })],
    });

    gamepad.poll();
    expect(gamepad.consumePause()).toBe(true);
    gamepad.poll();
    expect(gamepad.consumePause()).toBe(false);
    gamepad.poll();
    expect(gamepad.consumePause()).toBe(false);
  });

  it('mute fires once on the poll it becomes pressed, not again while held (FR-026)', () => {
    const gamepad = new GamepadInput();
    vi.stubGlobal('navigator', {
      getGamepads: () => [makePad(0, { pressedIndices: [MUTE_BUTTON_INDEX] })],
    });

    gamepad.poll();
    expect(gamepad.consumeMute()).toBe(true);
    gamepad.poll();
    expect(gamepad.consumeMute()).toBe(false);
  });
});

// A minimal stub target for attach()/detach() — mirrors
// tests/lib/input/keyboard.test.ts's fakeTarget() style, with a dispatch()
// that constructs a synthetic GamepadEvent-shaped object.
function fakeWindowTarget(): {
  target: Window;
  dispatch(type: 'gamepadconnected' | 'gamepaddisconnected', gamepad: Gamepad): void;
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
  } as unknown as Window;

  return {
    target,
    dispatch(type, gamepad) {
      for (const handler of listeners.get(type) ?? []) {
        handler({ gamepad });
      }
    },
  };
}

describe('GamepadInput — hotplug (US4)', () => {
  it('a controller connected mid-run drives the game from the very next poll(), with no dependency on a gamepadconnected event ever firing', () => {
    const gamepad = new GamepadInput();
    let pads: Gamepad[] = [];
    vi.stubGlobal('navigator', { getGamepads: () => pads });

    gamepad.poll();
    expect(gamepad.consumeDirection()).toBeUndefined();

    pads = [makePad(0, { pressedIndices: [DPAD_BUTTON_INDEX.up] })];
    gamepad.poll();
    expect(gamepad.consumeDirection()).toBe('up');
  });

  it('disconnecting mid-run while a direction and grab are held releases both on the very next poll()', () => {
    const gamepad = new GamepadInput();
    const { target, dispatch } = fakeWindowTarget();
    gamepad.attach(target);

    let pads: Gamepad[] = [
      makePad(0, { pressedIndices: [DPAD_BUTTON_INDEX.up, FACE_BUTTON_GRAB_CONFIRM_INDEX] }),
    ];
    vi.stubGlobal('navigator', { getGamepads: () => pads });

    gamepad.poll();
    expect(gamepad.consumeDirection()).toBe('up');
    expect(gamepad.consumeGrab()).toBe(true);

    dispatch('gamepaddisconnected', pads[0]);
    pads = [];
    gamepad.poll();
    expect(gamepad.consumeDirection()).toBeUndefined();
    expect(gamepad.consumeGrab()).toBe(false);
  });

  it('a reconnect under the same index after a disconnect carries no stale hysteresis or edge state (US4 AC4)', () => {
    const gamepad = new GamepadInput();
    const { target, dispatch } = fakeWindowTarget();
    gamepad.attach(target);

    // Engage 'up' on the stick so a previousStickDirection is recorded.
    let pads: Gamepad[] = [makePad(0, { axes: [0, -0.6] })];
    vi.stubGlobal('navigator', { getGamepads: () => pads });
    gamepad.poll();
    expect(gamepad.consumeDirection()).toBe('up');

    dispatch('gamepaddisconnected', pads[0]);
    pads = [];
    gamepad.poll();

    // Reconnect at the same index with an exact-diagonal stick push — with
    // no stale previous direction, this must fall through to horizontal
    // (resolveDominantAxis's no-previous tie-break), not hold 'up'.
    const diag = Math.SQRT1_2 * 0.6;
    pads = [makePad(0, { axes: [diag, -diag] })];
    gamepad.poll();
    expect(gamepad.consumeDirection()).toBe('right');
  });

  it('contains no reference to session state (US4 AC3, FR-025 — structural check)', () => {
    const source = GamepadInput.toString();
    expect(source).not.toMatch(/SessionState|session\.score|session\.lives|caveIndex|screenTicks/);
  });
});
