// Mini console player: runs EmulatorJS in isolation and talks to the host widget via postMessage.
(function () {
  "use strict";

  var DEFAULT_PADS = {
    0: "BUTTON_2", 1: "BUTTON_4", 2: "SELECT", 3: "START",
    4: "DPAD_UP", 5: "DPAD_DOWN", 6: "DPAD_LEFT", 7: "DPAD_RIGHT",
    8: "BUTTON_1", 9: "BUTTON_3", 10: "LEFT_TOP_SHOULDER", 11: "RIGHT_TOP_SHOULDER"
  };

  var started = false;
  var initialized = false;
  var pendingSram = null;
  var startTimer = null;
  var audioUnlock = document.getElementById("audio-unlock");

  function post(msg) {
    window.parent.postMessage(msg, window.location.origin);
  }

  function status(state, message) {
    post({ type: "ejs:status", status: state, message: message || "" });
  }

  function emulator() {
    return window.EJS_emulator;
  }

  function gm() {
    var e = emulator();
    return e && e.gameManager;
  }

  function buildControls(keys, pads) {
    var p0 = {};
    Object.keys(DEFAULT_PADS).forEach(function (idx) {
      p0[idx] = {
        value: keys && keys[idx] !== undefined ? Number(keys[idx]) : 0,
        value2: pads && pads[idx] ? pads[idx] : DEFAULT_PADS[idx]
      };
    });
    return { 0: p0, 1: {}, 2: {}, 3: {} };
  }

  function currentControls() {
    var e = emulator();
    var keys = {};
    var pads = {};
    if (!e || !e.controls || !e.controls[0]) return { keys: keys, pads: pads };
    Object.keys(DEFAULT_PADS).forEach(function (idx) {
      var c = e.controls[0][idx];
      if (!c) return;
      if (typeof c.value === "number") keys[idx] = c.value;
      if (typeof c.value2 === "string" && c.value2) pads[idx] = c.value2;
    });
    return { keys: keys, pads: pads };
  }

  function audioContexts() {
    var e = emulator();
    var list = [];
    try {
      e.Module.AL.currentCtx.sources.forEach(function (s) {
        if (s && s.gain && s.gain.context && list.indexOf(s.gain.context) === -1) list.push(s.gain.context);
      });
    } catch (err) { /* audio not ready yet */ }
    return list;
  }

  function watchAudio() {
    var checks = 0;
    var timer = setInterval(function () {
      checks++;
      var ctxs = audioContexts();
      var suspended = ctxs.some(function (c) { return c.state === "suspended"; });
      audioUnlock.style.display = suspended ? "flex" : "none";
      post({ type: "ejs:audio", blocked: suspended });
      if ((ctxs.length && !suspended) || checks > 40) clearInterval(timer);
    }, 500);
  }

  audioUnlock.addEventListener("click", function () {
    audioContexts().forEach(function (c) { try { c.resume(); } catch (err) { /* ignore */ } });
    audioUnlock.style.display = "none";
    post({ type: "ejs:audio", blocked: false });
    focusGame();
  });

  function focusGame() {
    var e = emulator();
    try { window.focus(); } catch (err) { /* ignore */ }
    if (e && e.elements && e.elements.parent) e.elements.parent.focus();
  }

  function loadSram(bytes) {
    var g = gm();
    if (!g || !bytes || !bytes.byteLength) return;
    var path = g.getSaveFilePath();
    var parts = path.split("/");
    var cp = "";
    for (var i = 0; i < parts.length - 1; i++) {
      if (!parts[i]) continue;
      cp += "/" + parts[i];
      if (!g.FS.analyzePath(cp).exists) g.FS.mkdir(cp);
    }
    if (g.FS.analyzePath(path).exists) g.FS.unlink(path);
    g.FS.writeFile(path, new Uint8Array(bytes));
    g.loadSaveFiles();
  }

  function observeControlMenu() {
    var e = emulator();
    if (!e || !e.controlMenu || typeof MutationObserver === "undefined") return;
    var wasOpen = false;
    new MutationObserver(function () {
      var open = e.controlMenu.style.display !== "none";
      if (wasOpen && !open) {
        var c = currentControls();
        post({ type: "ejs:controls-changed", keys: c.keys, pads: c.pads });
        focusGame();
      }
      wasOpen = open;
    }).observe(e.controlMenu, { attributes: true, attributeFilter: ["style"] });
  }

  function init(cfg) {
    if (initialized) return;
    initialized = true;
    pendingSram = cfg.sram || null;

    if (!navigator.onLine) {
      status("error", "offline");
      return;
    }
    status("loading", "Baixando o emulador…");

    var romUrl = URL.createObjectURL(new Blob([cfg.rom], { type: "application/octet-stream" }));

    window.EJS_player = "#game";
    window.EJS_core = cfg.core;
    window.EJS_gameName = cfg.gameName;
    window.EJS_gameUrl = romUrl;
    window.EJS_pathtodata = cfg.dataPath;
    window.EJS_language = "pt-BR";
    window.EJS_startOnLoaded = true;
    window.EJS_volume = cfg.muted ? 0 : cfg.volume;
    window.EJS_backgroundColor = "#000000";
    window.EJS_color = "#ec4899";
    window.EJS_disableLocalStorage = true;
    window.EJS_defaultControls = buildControls(cfg.keys, cfg.pads);
    window.EJS_Buttons = {
      playPause: false, restart: false, mute: false, settings: false, fullscreen: false,
      saveState: false, loadState: false, screenRecord: false, gamepad: false, cheat: false,
      volume: false, saveSavFiles: false, loadSavFiles: false, quickSave: false, quickLoad: false,
      screenshot: false, cacheManager: false, exitEmulation: false, netplay: false, diskButton: false,
      rightClick: false
    };
    window.EJS_onGameStart = function () {
      started = true;
      clearTimeout(startTimer);
      try { loadSram(pendingSram); } catch (err) { console.warn("SRAM", err); }
      pendingSram = null;
      if (cfg.muted) emulator().setVolume(0);
      observeControlMenu();
      focusGame();
      watchAudio();
      status("started");
    };

    // The CDN or the core may fail without an explicit error event; give up after a while.
    startTimer = setTimeout(function () {
      if (!started) status("error", "timeout");
    }, 90000);

    var script = document.createElement("script");
    script.src = cfg.dataPath + "loader.js";
    script.onerror = function () {
      clearTimeout(startTimer);
      status("error", "offline");
    };
    document.body.appendChild(script);
  }

  function withTimeout(promise, ms) {
    return Promise.race([
      promise,
      new Promise(function (_, reject) { setTimeout(function () { reject(new Error("timeout")); }, ms); })
    ]);
  }

  function handleCommand(cmd, arg) {
    var e = emulator();
    var g = gm();
    if (!started || !e || !g) return Promise.reject(new Error("O jogo ainda não começou."));
    switch (cmd) {
      case "pause":
        e.pause();
        return Promise.resolve(true);
      case "play":
        e.play();
        focusGame();
        return Promise.resolve(false);
      case "restart":
        g.restart();
        if (e.paused) e.play();
        focusGame();
        return Promise.resolve(null);
      case "volume":
        e.volume = Number(arg);
        e.setVolume(Number(arg));
        return Promise.resolve(null);
      case "getState": {
        var state = g.getState();
        return withTimeout(g.screenshot(), 3000)
          .catch(function () { return null; })
          .then(function (shot) {
            return { state: state.slice().buffer, screenshot: shot ? new Uint8Array(shot).slice().buffer : null };
          });
      }
      case "loadState":
        g.loadState(new Uint8Array(arg));
        if (e.paused) e.play();
        focusGame();
        return Promise.resolve(null);
      case "getSram": {
        var sram = g.getSaveFile();
        return Promise.resolve(sram ? new Uint8Array(sram).slice().buffer : null);
      }
      case "setControls":
        e.controls = buildControls(arg.keys, arg.pads);
        e.checkGamepadInputs && e.checkGamepadInputs();
        focusGame();
        return Promise.resolve(null);
      case "openControls":
        e.controlMenu.style.display = "";
        return Promise.resolve(null);
      case "focus":
        focusGame();
        return Promise.resolve(null);
      default:
        return Promise.reject(new Error("Comando desconhecido: " + cmd));
    }
  }

  window.addEventListener("message", function (event) {
    if (event.source !== window.parent || event.origin !== window.location.origin) return;
    var data = event.data;
    if (!data || typeof data !== "object") return;
    if (data.type === "ejs:init") {
      init(data.payload);
    } else if (data.type === "ejs:cmd") {
      handleCommand(data.cmd, data.arg).then(
        function (result) {
          var transfer = [];
          if (result instanceof ArrayBuffer) transfer.push(result);
          if (result && result.state instanceof ArrayBuffer) transfer.push(result.state);
          if (result && result.screenshot instanceof ArrayBuffer) transfer.push(result.screenshot);
          window.parent.postMessage({ type: "ejs:reply", id: data.id, ok: true, data: result }, window.location.origin, transfer);
        },
        function (err) {
          post({ type: "ejs:reply", id: data.id, ok: false, error: String((err && err.message) || err) });
        }
      );
    }
  });

  post({ type: "ejs:hello" });
})();
