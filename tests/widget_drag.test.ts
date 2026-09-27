import { describe, it, expect } from "vitest";
import { arrangeInArea, clampToArea, simulatorScale } from "../src/projects/widgets/dragLogic";

const monitor = { x: 0, y: 0, width: 1920, height: 1080 };

describe("widget placement on the real monitor", () => {
  it("keeps a widget fully on screen", () => {
    expect(clampToArea(-50, -10, { width: 200, height: 100 }, monitor)).toEqual({ x: 0, y: 0 });
    expect(clampToArea(1900, 1070, { width: 200, height: 100 }, monitor)).toEqual({ x: 1720, y: 980 });
    expect(clampToArea(300, 200, { width: 200, height: 100 }, monitor)).toEqual({ x: 300, y: 200 });
  });

  it("respects a monitor that does not start at 0,0", () => {
    const second = { x: 1920, y: 0, width: 1280, height: 720 };
    expect(clampToArea(0, 0, { width: 100, height: 100 }, second)).toEqual({ x: 1920, y: 0 });
  });

  it("arranges widgets in rows without leaving the work area", () => {
    const boxes = Array.from({ length: 12 }, () => ({ width: 300, height: 260 }));
    const spots = arrangeInArea(boxes, { ...monitor, height: 1032 });
    expect(spots[0]).toEqual({ x: 40, y: 40 });
    expect(spots[1]).toEqual({ x: 360, y: 40 });
    for (const s of spots) {
      expect(s.x).toBeGreaterThanOrEqual(0);
      expect(s.y).toBeGreaterThanOrEqual(0);
      expect(s.x + 300).toBeLessThanOrEqual(1920);
      expect(s.y + 260).toBeLessThanOrEqual(1032);
    }
    // Row wrap: 5 fit per row on 1920 px, the 6th starts a new row.
    expect(spots[5]).toEqual({ x: 40, y: 320 });
  });

  it("scales the simulator to the monitor's proportions", () => {
    expect(simulatorScale(960, monitor)).toBeCloseTo(0.5);
    expect(simulatorScale(1920, monitor, 540)).toBeCloseTo(0.5);
    expect(simulatorScale(0, monitor)).toBe(1);
  });
});
