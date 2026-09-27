// Mini console player: runs EmulatorJS in isolation and talks to the host widget via postMessage.
(function () {
  "use strict";

  var SNES_INDICES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

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

  // Keyboard only: controllers are read by the loop below (no value2), so EmulatorJS never
  // handles gamepads itself and inputs are not doubled.
  function buildControls(keys) {
    var p0 = {};
    SNES_INDICES.forEach(function (idx) {
      p0[idx] = { value: keys && keys[idx] !== undefined ? Number(keys[idx]) : 0 };
    });
    return { 0: p0, 1: {}, 2: {}, 3: {} };
  }

  function currentControls() {
    var e = emulator();
    var keys = {};
    if (!e || !e.controls || !e.controls[0]) return { keys: keys, pads: {} };
    SNES_INDICES.forEach(function (idx) {
      var c = e.controls[0][idx];
      if (c && typeof c.value === "number") keys[idx] = c.value;
    });
    return { keys: keys, pads: {} };
  }

  // ---- Controllers (mirror of src/projects/widgets/console/gamepad.ts) ---------------------
  var padConfig = null;
  var padHeld = {};
  var padLoopStarted = false;

  function profileKey(id) {
    return String(id).replace(/\s+/g, " ").trim().toLowerCase();
  }

  function tokenActive(token, pad, deadzone) {
    var m = /^([ab])(\d+)([+-])?$/.exec(token);
    if (!m) return false;
    var n = Number(m[2]);
    if (m[1] === "b") {
      var b = pad.buttons[n];
      return !!b && (b.pressed || b.value > 0.5);
    }
    var v = pad.axes[n] || 0;
    return m[3] === "-" ? v < -deadzone : v > deadzone;
  }

  function releasePads() {
    var g = gm();
    Object.keys(padHeld).forEach(function (idx) {
      if (padHeld[idx] && g) g.simulateInput(0, Number(idx), 0);
    });
    padHeld = {};
  }

  function pollPads() {
    requestAnimationFrame(pollPads);
    var g = gm();
    if (!started || !g || !padConfig || !padConfig.enabled || !navigator.getGamepads) return;
    var now = {};
    var pads = navigator.getGamepads();
    for (var i = 0; i < pads.length; i++) {
      var pad = pads[i];
      if (!pad || !pad.connected) continue;
      var key = profileKey(pad.id);
      if (padConfig.selected !== "any" && padConfig.selected !== key) continue;
      var bindings = padConfig.profiles[key] || padConfig.fallback;
      Object.keys(bindings).forEach(function (idx) {
        if (now[idx]) return;
        var tokens = bindings[idx] || [];
        for (var t = 0; t < tokens.length; t++) {
          if (tokenActive(tokens[t], pad, padConfig.deadzone)) {
            now[idx] = true;
            break;
          }
        }
      });
    }
    SNES_INDICES.forEach(function (idx) {
      var on = !!now[idx];
      if (on !== !!padHeld[idx]) {
        g.simulateInput(0, idx, on ? 1 : 0);
        padHeld[idx] = on;
      }
    });
  }

  function setPadConfig(cfg) {
    releasePads();
    padConfig = cfg || null;
    if (!padLoopStarted) {
      padLoopStarted = true;
      requestAnimationFrame(pollPads);
    }
  }

  window.addEventListener("gamepaddisconnected", releasePads);
  window.addEventListener("blur", releasePads);

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
    window.EJS_defaultControls = buildControls(cfg.keys);
    setPadConfig(cfg.gamepad);
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
    if (cmd === "setGamepad") {
      setPadConfig(arg);
      return Promise.resolve(null);
    }
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
        e.controls = buildControls(arg.keys);
        e.checkGamepadInputs && e.checkGamepadInputs();
        focusGame();
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
