import { describe, it, expect } from "vitest";
import { autoclickRunMode } from "@/projects/autoclick/store/autoclickStore";

describe("autoclick run mode", () => {
  it("keeps a fixed coordinate on the quick click path", () => {
    expect(autoclickRunMode("quick")).toBe("quick");
    expect(autoclickRunMode("settings")).toBe("quick");
    expect(autoclickRunMode("keyboard")).toBe("quick");
  });

  it("only uses multi-point and timeline on their own tabs", () => {
    expect(autoclickRunMode("multipoint")).toBe("multipoint");
    expect(autoclickRunMode("builder")).toBe("timeline");
  });
});
