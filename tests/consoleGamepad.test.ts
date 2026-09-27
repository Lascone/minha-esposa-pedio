import { describe, expect, it } from "vitest";
import {
  autoBindings,
  DEFAULT_PROFILE,
  detectController,
  newInput,
  PadSnapshot,
  pressedButtons,
  profileKey,
  resolveBindings,
  SNES,
  tokenLabel,
} from "../src/projects/widgets/console/gamepad";
import { playerPadConfig } from "../src/projects/widgets/console/gamepadStore";

const pad = (buttons: number[] = [], axes: number[] = [0, 0, 0, 0]): PadSnapshot => {
  const b = new Array(17).fill(0);
  buttons.forEach((i) => (b[i] = 1));
  return { buttons: b, axes };
};

describe("controller detection", () => {
  it("recognises common controllers from the Gamepad API id", () => {
    expect(detectController("Xbox 360 Controller (XInput STANDARD GAMEPAD)", "standard").kind).toBe("xbox");
    expect(detectController("Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 0b13)", "standard").kind).toBe("xbox");
    expect(detectController("GameSir-T4 Pro (Vendor: 3537 Product: 1010)", "standard").kind).toBe("gamesir");
    expect(detectController("DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)", "standard").kind).toBe("playstation");
    expect(detectController("Pro Controller (STANDARD GAMEPAD Vendor: 057e Product: 2009)", "standard").kind).toBe("nintendo");
    const generic = detectController("USB Joystick (Vendor: 0079 Product: 0006)", "");
    expect(generic).toMatchObject({ kind: "generic", standard: false, name: "USB Joystick" });
  });

  it("uses a stable key per controller model", () => {
    expect(profileKey("  Xbox 360   Controller (XInput STANDARD GAMEPAD) ")).toBe("xbox 360 controller (xinput standard gamepad)");
  });
});

describe("automatic bindings", () => {
  it("maps by position like the SNES pad (bottom = B, right = A)", () => {
    const b = resolveBindings(DEFAULT_PROFILE);
    expect(b[SNES.B]).toEqual(["b0"]);
    expect(b[SNES.A]).toEqual(["b1"]);
    expect(b[SNES.Y]).toEqual(["b2"]);
    expect(b[SNES.X]).toEqual(["b3"]);
    expect(b[SNES.START]).toEqual(["b9"]);
    expect(b[SNES.L]).toEqual(["b4", "b6"]);
  });

  it("can follow the Xbox letters instead", () => {
    const b = autoBindings("letters");
    expect(b[SNES.A]).toEqual(["b0"]);
    expect(b[SNES.B]).toEqual(["b1"]);
  });

  it("D-pad and left stick both move", () => {
    const b = resolveBindings(DEFAULT_PROFILE);
    expect([...pressedButtons(b, pad([12]))]).toEqual([SNES.UP]);
    expect([...pressedButtons(b, pad([], [-0.9, 0, 0, 0]))]).toEqual([SNES.LEFT]);
    expect(pressedButtons(b, pad([], [0.3, 0, 0, 0])).size).toBe(0);
    const noStick = resolveBindings({ ...DEFAULT_PROFILE, stick: false });
    expect(pressedButtons(noStick, pad([], [-0.9, 0, 0, 0])).size).toBe(0);
  });

  it("custom bindings replace the automatic ones for that button", () => {
    const b = resolveBindings({ ...DEFAULT_PROFILE, custom: { [SNES.B]: ["b2"] } });
    expect(b[SNES.B]).toEqual(["b2"]);
    expect([...pressedButtons(b, pad([2]))]).toContain(SNES.B);
  });
});

describe("capture and labels", () => {
  it("detects the first newly pressed input", () => {
    expect(newInput(pad([0]), pad([0, 3]))).toBe("b3");
    expect(newInput(pad(), pad([], [0, 0.9, 0, 0]))).toBe("a1+");
    expect(newInput(pad([1]), pad([1]))).toBeNull();
  });

  it("names buttons like the controller prints them", () => {
    expect(tokenLabel("b0", "xbox")).toBe("A");
    expect(tokenLabel("b0", "playstation")).toBe("✕");
    expect(tokenLabel("b0", "nintendo")).toBe("B");
    expect(tokenLabel("b6", "xbox")).toBe("LT");
    expect(tokenLabel("a1-", "xbox")).toBe("Analógico ↑");
    expect(tokenLabel("b4", "generic", false)).toBe("Botão 5");
  });

  it("builds the emulator config with an automatic fallback", () => {
    const cfg = playerPadConfig({ enabled: true, selected: "any", deadzone: 0.5, profiles: { x: { layout: "letters", stick: false, custom: {} } } });
    expect(cfg.fallback[SNES.B]).toEqual(["b0"]);
    expect(cfg.profiles.x[SNES.B]).toEqual(["b1"]);
    expect(cfg.profiles.x[SNES.UP]).toEqual(["b12"]);
  });
});
