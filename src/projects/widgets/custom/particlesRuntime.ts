/**
 * Particle engine injected into every gadget sandbox as WidgetAPI.particles(...). Gadgets used to
 * hand-roll particles with dozens of animated divs, which the AI often got wrong (invisible,
 * stuck in a corner, heavy). One canvas, presets and a hard cap keep it pretty and cheap.
 * Plain ES5 inside a string: it runs in the iframe, not in the app bundle.
 */
export const PARTICLE_PRESETS = [
  "stars",
  "sparkles",
  "snow",
  "hearts",
  "sakura",
  "embers",
  "dark",
  "ash",
  "bubbles",
  "fireflies",
  "confetti",
  "rain",
] as const;

export const PARTICLES_RUNTIME = String.raw`
(function () {
  var PRESETS = {
    stars:     { shape: "dot",     count: 45, size: [0.6, 1.8], speed: 0.05, dir: "none",   twinkle: true, glow: true, colors: ["#ffffff", "#fff4c2", "#d6e4ff"] },
    sparkles:  { shape: "sparkle", count: 22, size: [2.5, 5.5], speed: 0.25, dir: "up",     twinkle: true, glow: true, fade: true, colors: ["#fff6b3", "#ffd1f0", "#ffffff"] },
    snow:      { shape: "dot",     count: 60, size: [1, 3.2],   speed: 0.6,  dir: "down",   sway: 0.6, colors: ["#ffffff", "#e8f4ff"] },
    hearts:    { shape: "heart",   count: 16, size: [5, 10],    speed: 0.45, dir: "up",     sway: 0.8, fade: true, colors: ["#ff5c9a", "#ff8fb8", "#ffc2d9"] },
    sakura:    { shape: "petal",   count: 26, size: [3.5, 7],   speed: 0.6,  dir: "down",   sway: 1.2, spin: true, colors: ["#ffc0d9", "#ffd6e7", "#ff9ec4"] },
    embers:    { shape: "dot",     count: 40, size: [0.8, 2.4], speed: 0.7,  dir: "up",     sway: 0.5, flicker: true, glow: true, fade: true, colors: ["#ff7a18", "#ffb347", "#ff3b3b"] },
    dark:      { shape: "dot",     count: 50, size: [1, 3.4],   speed: 0.3,  dir: "up",     sway: 0.4, glow: true, fade: true, twinkle: true, colors: ["#c1121f", "#8b0000", "#7b2cbf", "#e5e5e5"] },
    ash:       { shape: "dot",     count: 50, size: [0.6, 2.2], speed: 0.35, dir: "down",   sway: 0.9, colors: ["#9a9a9a", "#5c5c5c", "#c9c9c9"] },
    bubbles:   { shape: "ring",    count: 20, size: [3, 9],     speed: 0.5,  dir: "up",     sway: 0.6, colors: ["rgba(255,255,255,0.85)", "#bde0fe", "#ffc8dd"] },
    fireflies: { shape: "dot",     count: 18, size: [1.2, 2.6], speed: 0.3,  dir: "wander", glow: true, twinkle: true, colors: ["#e9ff70", "#c6ff5e", "#fff3a0"] },
    confetti:  { shape: "rect",    count: 45, size: [3, 6],     speed: 1,    dir: "down",   sway: 0.7, spin: true, colors: ["#ff5c9a", "#ffd166", "#06d6a0", "#118ab2", "#c77dff"] },
    rain:      { shape: "line",    count: 70, size: [8, 16],    speed: 4,    dir: "down",   colors: ["rgba(174,214,241,0.7)", "rgba(255,255,255,0.45)"] }
  };
  var ALIASES = {
    estrelas: "stars", brilhos: "sparkles", neve: "snow", coracoes: "hearts", "corações": "hearts",
    petalas: "sakura", "pétalas": "sakura", brasas: "embers", fogo: "embers", sombrio: "dark", gotico: "dark",
    "gótico": "dark", cinzas: "ash", bolhas: "bubbles", vagalumes: "fireflies", "vaga-lumes": "fireflies",
    confete: "confetti", chuva: "rain"
  };
  var MAX_PER_LAYER = 150;
  var reduced = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  function rand(a, b) { return a + Math.random() * (b - a); }
  function pick(list) { return list[(Math.random() * list.length) | 0]; }

  function resolveTarget(t) {
    if (t && t.nodeType === 1) return t;
    if (typeof t === "string") { var found = document.querySelector(t); if (found) return found; }
    var el = document.body.firstElementChild;
    while (el && (el.tagName === "SCRIPT" || el.tagName === "STYLE" || el.tagName === "CANVAS")) el = el.nextElementSibling;
    return el || document.body;
  }

  // Canvas can't read CSS variables: turn var(--accent, #fff) into the current theme's value.
  function resolveColor(color, host) {
    var m = /^\s*var\(\s*(--[\w-]+)\s*(?:,\s*([^)]+))?\)\s*$/.exec(String(color));
    if (!m) return String(color);
    var value = getComputedStyle(host).getPropertyValue(m[1]).trim() ||
      getComputedStyle(document.documentElement).getPropertyValue(m[1]).trim();
    return value || (m[2] ? m[2].trim() : "#ffffff");
  }

  function presetConfig(name, colors, host) {
    var key = ALIASES[String(name || "").toLowerCase()] || String(name || "").toLowerCase();
    var base = PRESETS[key] || PRESETS.sparkles;
    var cfg = {};
    for (var k in base) cfg[k] = base[k];
    if (colors) cfg.rawColors = Array.isArray(colors) && colors.length ? colors : [String(colors)];
    else cfg.rawColors = base.colors;
    cfg.colors = cfg.rawColors.map(function (c) { return resolveColor(c, host); });
    return cfg;
  }

  function particles(options) {
    var o = typeof options === "string" ? { preset: options } : (options || {});
    var host = resolveTarget(o.target);
    var cfg = presetConfig(o.preset, o.colors || o.color, host);
    var speedMul = o.speed > 0 ? o.speed : 1;
    var sizeMul = o.size > 0 ? o.size : 1;
    var opacity = o.opacity > 0 ? Math.min(1, o.opacity) : 1;
    var count = Math.max(1, Math.min(MAX_PER_LAYER, Math.round(o.count > 0 ? o.count : cfg.count)));
    var front = o.layer !== "back";

    var canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    canvas.className = "widget-particles";
    canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;border-radius:inherit;z-index:" + (front ? "30" : "-1") + ";";
    if (host === document.body) {
      canvas.style.position = "fixed";
    } else {
      if (getComputedStyle(host).position === "static") host.style.position = "relative";
      if (!front) host.style.isolation = "isolate";
    }
    host.insertBefore(canvas, host.firstChild);

    var ctx = canvas.getContext("2d");
    var list = [];
    var bursts = [];
    var W = 1, H = 1;
    function resize() {
      var r = canvas.getBoundingClientRect();
      var dpr = Math.min(2, window.devicePixelRatio || 1);
      var oldW = W, oldH = H;
      W = Math.max(1, r.width); H = Math.max(1, r.height);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // The iframe is often still 0x0 when the gadget starts: spread the particles over the real size.
      if (oldW !== W || oldH !== H) {
        for (var i = 0; i < list.length; i++) { list[i].x *= W / oldW; list[i].y *= H / oldH; }
      }
    }

    function spawn(p, anywhere) {
      p.size = rand(cfg.size[0], cfg.size[1]) * sizeMul;
      p.color = pick(cfg.colors);
      p.x = rand(0, W);
      if (anywhere || cfg.dir === "none" || cfg.dir === "wander") p.y = rand(0, H);
      else p.y = cfg.dir === "up" ? H + p.size * 2 : -p.size * 2;
      var s = cfg.speed * speedMul * rand(0.6, 1.4);
      p.speed = s;
      p.vx = (cfg.dir === "wander" || cfg.dir === "none") ? rand(-1, 1) * s : rand(-0.15, 0.15) * s;
      p.vy = cfg.dir === "up" ? -s : cfg.dir === "down" ? s : rand(-1, 1) * s;
      p.phase = rand(0, Math.PI * 2);
      p.rot = rand(0, Math.PI * 2);
      p.vr = cfg.spin ? rand(-0.04, 0.04) : 0;
      p.life = anywhere ? rand(0, 200) : 0;
      p.maxLife = rand(240, 540);
      return p;
    }

    function shape(p, kind) {
      var s = p.size;
      ctx.beginPath();
      if (kind === "sparkle") {
        ctx.moveTo(0, -s); ctx.quadraticCurveTo(0, 0, s, 0); ctx.quadraticCurveTo(0, 0, 0, s);
        ctx.quadraticCurveTo(0, 0, -s, 0); ctx.quadraticCurveTo(0, 0, 0, -s); ctx.fill();
      } else if (kind === "heart") {
        ctx.moveTo(0, 0.6 * s);
        ctx.bezierCurveTo(-0.15 * s, 0.45 * s, -0.6 * s, 0.15 * s, -0.6 * s, -0.15 * s);
        ctx.bezierCurveTo(-0.6 * s, -0.5 * s, -0.1 * s, -0.6 * s, 0, -0.25 * s);
        ctx.bezierCurveTo(0.1 * s, -0.6 * s, 0.6 * s, -0.5 * s, 0.6 * s, -0.15 * s);
        ctx.bezierCurveTo(0.6 * s, 0.15 * s, 0.15 * s, 0.45 * s, 0, 0.6 * s); ctx.fill();
      } else if (kind === "petal") {
        ctx.ellipse(0, 0, s, s * 0.55, 0, 0, Math.PI * 2); ctx.fill();
      } else if (kind === "ring") {
        ctx.lineWidth = Math.max(1, s * 0.15); ctx.arc(0, 0, s, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(-s * 0.35, -s * 0.35, s * 0.18, 0, Math.PI * 2); ctx.fill();
      } else if (kind === "rect") {
        ctx.scale(1, Math.cos(p.phase * 2)); ctx.fillRect(-s / 2, -s * 0.3, s, s * 0.6);
      } else if (kind === "line") {
        ctx.lineWidth = 1; ctx.moveTo(0, 0); ctx.lineTo(-p.vx * 2, -s); ctx.stroke();
      } else {
        ctx.arc(0, 0, s, 0, Math.PI * 2); ctx.fill();
      }
    }

    function draw(p, alpha, kind) {
      if (alpha <= 0.01) return;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color; ctx.strokeStyle = p.color;
      if (cfg.glow) { ctx.shadowBlur = p.size * 4; ctx.shadowColor = p.color; }
      ctx.translate(p.x, p.y);
      if (p.rot) ctx.rotate(p.rot);
      shape(p, kind);
      ctx.restore();
    }

    function fill() {
      list = [];
      for (var i = 0; i < count; i++) list.push(spawn({}, true));
    }

    function step(p, f) {
      p.life += f;
      p.phase += 0.03 * f;
      var sway = cfg.sway ? Math.sin(p.phase) * cfg.sway * 0.5 : 0;
      if (cfg.dir === "wander") {
        p.vx += rand(-0.04, 0.04) * f; p.vy += rand(-0.04, 0.04) * f;
        var v = Math.sqrt(p.vx * p.vx + p.vy * p.vy), max = p.speed * 1.5;
        if (v > max) { p.vx *= max / v; p.vy *= max / v; }
      }
      p.x += (p.vx + sway) * f; p.y += p.vy * f; p.rot += p.vr * f;
      var m = p.size * 3 + 10;
      if (cfg.dir === "none" || cfg.dir === "wander") {
        if (p.x < -m) p.x = W + m; else if (p.x > W + m) p.x = -m;
        if (p.y < -m) p.y = H + m; else if (p.y > H + m) p.y = -m;
        if (cfg.fade && p.life > p.maxLife) spawn(p, true);
      } else if (p.y < -m || p.y > H + m || p.x < -m * 3 || p.x > W + m * 3 || (cfg.fade && p.life > p.maxLife)) {
        spawn(p, false);
      }
    }

    function alphaOf(p) {
      var a = opacity;
      if (cfg.twinkle) a *= 0.55 + 0.45 * Math.sin(p.phase * 2.2);
      if (cfg.flicker) a *= 0.65 + 0.35 * Math.random();
      if (cfg.fade) a *= Math.min(1, p.life / 40) * Math.max(0, 1 - p.life / p.maxLife);
      return a;
    }

    var running = true, raf = 0, last = 0;
    function frame(t) {
      raf = 0;
      if (!running) return;
      var dt = last ? Math.min(50, t - last) : 16.7;
      last = t;
      var f = reduced ? 0 : dt / 16.7;
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < list.length; i++) {
        if (f) step(list[i], f);
        draw(list[i], alphaOf(list[i]), cfg.shape);
      }
      for (var j = bursts.length - 1; j >= 0; j--) {
        var b = bursts[j];
        b.life += dt / 16.7; b.vy += 0.05 * (dt / 16.7);
        b.x += b.vx * (dt / 16.7); b.y += b.vy * (dt / 16.7); b.rot += b.vr;
        if (b.life > b.maxLife) { bursts.splice(j, 1); continue; }
        draw(b, opacity * (1 - b.life / b.maxLife), b.kind);
      }
      if (!reduced || bursts.length) raf = requestAnimationFrame(frame);
    }
    function kick() { if (running && !raf && !document.hidden) { last = 0; raf = requestAnimationFrame(frame); } }

    resize();
    fill();
    kick();
    var ro = window.ResizeObserver ? new ResizeObserver(function () { resize(); kick(); }) : null;
    if (ro) ro.observe(canvas); else window.addEventListener("resize", function () { resize(); kick(); });
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) { if (raf) cancelAnimationFrame(raf); raf = 0; } else kick();
    });
    function recolor() {
      cfg.colors = cfg.rawColors.map(function (c) { return resolveColor(c, host); });
      for (var i = 0; i < list.length; i++) list[i].color = pick(cfg.colors);
      kick();
    }
    var themeWatch = window.MutationObserver ? new MutationObserver(function () {
      if (cfg.rawColors.some(function (c) { return String(c).indexOf("var(") !== -1; })) setTimeout(recolor, 0);
    }) : null;
    if (themeWatch) themeWatch.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    return {
      canvas: canvas,
      burst: function (x, y, n) {
        if (x && typeof x === "object" && "clientX" in x) {
          var r = canvas.getBoundingClientRect();
          n = y; y = x.clientY - r.top; x = x.clientX - r.left;
        }
        if (typeof x !== "number") { x = W / 2; y = H / 2; }
        var total = Math.max(1, Math.min(60, n || 18));
        var kind = cfg.shape === "line" ? "dot" : cfg.shape;
        for (var i = 0; i < total; i++) {
          var ang = rand(0, Math.PI * 2), sp = rand(1, 3.2);
          bursts.push({ x: x, y: y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 1, size: rand(cfg.size[0], cfg.size[1]) * sizeMul * 1.1,
            color: pick(cfg.colors), rot: rand(0, 6.28), vr: rand(-0.1, 0.1), phase: rand(0, 6.28), life: 0, maxLife: rand(40, 70), kind: kind });
        }
        kick();
      },
      setPreset: function (name, colors) { cfg = presetConfig(name, colors, host); fill(); kick(); },
      setColors: function (colors) { cfg.rawColors = Array.isArray(colors) && colors.length ? colors : [String(colors)]; recolor(); },
      setCount: function (n) { count = Math.max(1, Math.min(MAX_PER_LAYER, Math.round(n) || count)); fill(); kick(); },
      stop: function () { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; },
      start: function () { running = true; kick(); },
      destroy: function () { running = false; if (raf) cancelAnimationFrame(raf); if (ro) ro.disconnect(); if (themeWatch) themeWatch.disconnect(); if (canvas.parentNode) canvas.parentNode.removeChild(canvas); }
    };
  }

  particles.presets = Object.keys(PRESETS);
  window.WidgetAPI.particles = particles;
})();
`;
