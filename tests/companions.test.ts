import { describe, it, expect, beforeEach } from "vitest";
import { DEFAULT_COMPANIONS, getCompanionManifest } from "../src/projects/widgets/companions/registry";
import { useCompanionsStore } from "../src/projects/widgets/companions/store/companionsStore";
import { CompanionManifest } from "../src/projects/widgets/companions/types";
import { frameCount, spriteCell } from "../src/projects/widgets/companions/sprite";

describe("Desktop Companions Module", () => {
  beforeEach(() => {
    useCompanionsStore.setState({
      activeCompanions: [],
      customCompanions: [],
      favoriteIds: ["waifu-sakura"],
    });
  });

  it("should have all default companions registered with valid animation frames and licenses", () => {
    expect(DEFAULT_COMPANIONS.length).toBeGreaterThanOrEqual(4);

    for (const comp of DEFAULT_COMPANIONS) {
      expect(comp.id).toBeTruthy();
      expect(comp.name).toBeTruthy();
      expect(comp.category).toMatch(/waifus|cats|dogs|creatures|other/);
      expect(comp.author).toBeTruthy();
      expect(comp.license).toBeTruthy();
      expect(comp.preview).toBeTruthy();
      expect(frameCount(comp.animations.idle, comp.animations.idle.frames?.length ?? 0)).toBeGreaterThan(0);
      expect(frameCount(comp.animations.walk, comp.animations.walk.frames?.length ?? 0)).toBeGreaterThan(0);
    }
  });

  it("should address sprite-sheet frames by explicit cells or by sequence", () => {
    const sheet = { src: "/s.gif", frameWidth: 32, frameHeight: 32, totalFrames: 4 };
    expect(spriteCell({ ...sheet, cells: [[3, 3], [7, 3]] }, 3)).toEqual([7, 3]);
    expect(spriteCell({ ...sheet, row: 2 }, 1)).toEqual([1, 2]);
    expect(spriteCell({ ...sheet, columns: 2 }, 3)).toEqual([1, 1]);

    const oneko = getCompanionManifest("cat-oneko")!;
    expect(oneko.animations.idle.spritesheet?.cells?.length).toBeGreaterThan(0);
    for (const anim of Object.values(oneko.animations)) {
      for (const [col, row] of anim?.spritesheet?.cells ?? []) {
        expect(col).toBeLessThan(8);
        expect(row).toBeLessThan(4);
      }
    }
  });

  it("should spawn, update action state, and remove a companion instance", async () => {
    const store = useCompanionsStore.getState();
    const instanceId = await store.spawnCompanion("waifu-sakura");

    expect(instanceId).toBeTruthy();
    expect(useCompanionsStore.getState().activeCompanions.length).toBe(1);

    const instance = useCompanionsStore.getState().activeCompanions[0];
    expect(instance.companionId).toBe("waifu-sakura");
    expect(instance.currentState).toBe("idle");

    // Change action to sleep
    store.setCompanionAction(instance.instanceId, "sleep");
    expect(useCompanionsStore.getState().activeCompanions[0].currentState).toBe("sleep");

    // Remove companion
    store.removeCompanion(instance.instanceId);
    expect(useCompanionsStore.getState().activeCompanions.length).toBe(0);
  });

  it("should support importing custom companion package safely", () => {
    const store = useCompanionsStore.getState();

    const customPack: CompanionManifest = {
      id: "custom-test-cat",
      name: "Gato de Teste",
      category: "cats",
      author: "Comunidade",
      license: "CC0",
      description: "Um gatinho de teste",
      preview: "/test/preview.png",
      dimensions: { width: 90, height: 90 },
      animations: {
        idle: { frames: ["/test/idle1.png"], frameDuration: 300 },
        walk: { frames: ["/test/walk1.png"], frameDuration: 200 },
      },
    };

    store.importCustomPackage(customPack);
    expect(useCompanionsStore.getState().customCompanions.length).toBe(1);

    const retrieved = getCompanionManifest(
      "custom-test-cat",
      useCompanionsStore.getState().customCompanions
    );
    expect(retrieved).toBeDefined();
    expect(retrieved?.name).toBe("Gato de Teste");
  });

  it("should enforce maximum companions limit", async () => {
    const store = useCompanionsStore.getState();
    store.updateSettings({ maxCompanions: 2 });

    const id1 = await store.spawnCompanion("waifu-sakura");
    const id2 = await store.spawnCompanion("cat-oneko");
    const id3 = await store.spawnCompanion("dog-hachi");

    expect(id1).toBeTruthy();
    expect(id2).toBeTruthy();
    expect(id3).toBeNull(); // Limit reached
    expect(useCompanionsStore.getState().activeCompanions.length).toBe(2);
  });
});
