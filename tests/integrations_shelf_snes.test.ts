import { describe, it, expect } from "vitest";
import { getWidgetDefinition } from "../src/projects/widgets/registry";
import {
  useSnesCustomizerStore,
  SnesCustomizerAPI,
  SNES_SKINS,
} from "../src/projects/widgets/console/snesCustomizer";
import { useIntegrationsStore } from "../src/core/stores/integrationsStore";
import {
  getSimulatedTrack,
  getSimulatedGmail,
} from "../src/core/services/mediaIntegrationsService";

describe("Desktop Shelf Widget & Personalizations", () => {
  it("should have desktop-shelf registered in WIDGET_REGISTRY with correct metadata", () => {
    const shelf = getWidgetDefinition("desktop-shelf");
    expect(shelf).toBeDefined();
    expect(shelf?.name).toBe("Prateleira da Área de Trabalho");
    expect(shelf?.category).toBe("productivity");
    expect(shelf?.defaultWidth).toBe(320);
    expect(shelf?.defaultHeight).toBe(180);
    expect(shelf?.tags).toContain("drag and drop");
    expect(shelf?.tags).toContain("prateleira");
  });

  it("should have official built-in widgets for Spotify, YouTube Music, and YouTube registered", () => {
    const spotify = getWidgetDefinition("spotify");
    expect(spotify).toBeDefined();
    expect(spotify?.name).toBe("Spotify Player Desktop");
    expect(spotify?.tags).toContain("spotify");

    const ytMusic = getWidgetDefinition("youtube-music");
    expect(ytMusic).toBeDefined();
    expect(ytMusic?.name).toBe("YouTube Music Desktop");
    expect(ytMusic?.tags).toContain("youtube");

    const yt = getWidgetDefinition("youtube");
    expect(yt).toBeDefined();
    expect(yt?.name).toBe("YouTube Vídeos & Mini Player");
    expect(yt?.tags).toContain("vídeo");
  });
});

describe("Mini Console SNES Customizer API", () => {
  it("should list all available official skins with retro/kawaii palettes", () => {
    const skins = SnesCustomizerAPI.listSkins();
    expect(skins.length).toBe(5);

    const skinIds = skins.map((s) => s.id);
    expect(skinIds).toContain("snes-classic");
    expect(skinIds).toContain("super-famicom");
    expect(skinIds).toContain("pastel-blossom");
    expect(skinIds).toContain("atomic-purple");
    expect(skinIds).toContain("dark-cyber");
  });

  it("should allow changing skins, LED power colors, and cartridge settings via store", () => {
    const store = useSnesCustomizerStore.getState();

    // Change skin to cute pastel blossom
    store.setSkin("pastel-blossom");
    expect(useSnesCustomizerStore.getState().config.skinId).toBe("pastel-blossom");

    // Change LED color
    store.setLedColor("pink");
    expect(useSnesCustomizerStore.getState().config.ledColor).toBe("pink");

    // Change Cartridge
    store.setCartridge({
      cartridgeColor: "#f472b6",
      cartridgeLabel: "CHRONO TRIGGER",
    });
    expect(useSnesCustomizerStore.getState().config.cartridgeLabel).toBe("CHRONO TRIGGER");
    expect(useSnesCustomizerStore.getState().config.cartridgeColor).toBe("#f472b6");

    // Test programmatic API
    SnesCustomizerAPI.setConfig({ scanlineIntensity: 30 });
    expect(SnesCustomizerAPI.getConfig().scanlineIntensity).toBe(30);

    // Reset defaults
    store.resetDefaults();
    expect(useSnesCustomizerStore.getState().config.skinId).toBe("snes-classic");
  });
});

describe("Media & Accounts Integration (Spotify, YouTube Music, Gmail)", () => {
  it("should simulate tracks for Spotify, YouTube Music, and YouTube", () => {
    const spotify = getSimulatedTrack("spotify");
    expect(spotify.provider).toBe("spotify");
    expect(spotify.title).toBeTruthy();
    expect(spotify.artist).toBeTruthy();

    const ytMusic = getSimulatedTrack("youtube-music");
    expect(ytMusic.provider).toBe("youtube-music");
    expect(ytMusic.title).toBeTruthy();

    const yt = getSimulatedTrack("youtube");
    expect(yt.provider).toBe("youtube");
    expect(yt.title).toBeTruthy();
  });

  it("should simulate Gmail unread count and messages correctly", () => {
    const gmail = getSimulatedGmail();
    expect(gmail.unreadCount).toBeGreaterThan(0);
    expect(gmail.recentMessages.length).toBeGreaterThan(0);
    expect(gmail.recentMessages[0].sender).toBeTruthy();
  });

  it("should manage playback state and track switching in useIntegrationsStore", () => {
    const store = useIntegrationsStore.getState();

    const initialPlaying = store.activeTrack.isPlaying;
    store.togglePlayPause();
    expect(useIntegrationsStore.getState().activeTrack.isPlaying).toBe(!initialPlaying);

    // Skip to next track
    const prevProvider = useIntegrationsStore.getState().activeTrack.provider;
    store.skipTrack("next");
    expect(useIntegrationsStore.getState().activeTrack.provider).not.toBe(prevProvider);
  });
});
