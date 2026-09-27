import React, { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Gamepad2, RotateCcw, Wand2 } from "lucide-react";
import { ConsoleSystem } from "../systems";
import {
  ControllerInfo,
  detectController,
  newInput,
  PadSnapshot,
  pressedButtons,
  profileKey,
  resolveBindings,
  snapshotOf,
  tokenLabel,
} from "../gamepad";
import { profileFor, useGamepadStore } from "../gamepadStore";

interface ConnectedPad {
  index: number;
  id: string;
  key: string;
  info: ControllerInfo;
  snapshot: PadSnapshot;
}

function readPads(): ConnectedPad[] {
  if (typeof navigator === "undefined" || !navigator.getGamepads) return [];
  const list: ConnectedPad[] = [];
  for (const pad of navigator.getGamepads()) {
    if (!pad || !pad.connected) continue;
    list.push({ index: pad.index, id: pad.id, key: profileKey(pad.id), info: detectController(pad.id, pad.mapping), snapshot: snapshotOf(pad) });
  }
  return list;
}

/** Live list of connected controllers (refreshed ~20×/s while mounted). */
function useConnectedPads(): ConnectedPad[] {
  const [pads, setPads] = useState<ConnectedPad[]>(() => readPads());
  useEffect(() => {
    const t = window.setInterval(() => setPads(readPads()), 50);
    return () => window.clearInterval(t);
  }, []);
  return pads;
}

interface GamepadSettingsProps {
  system: ConsoleSystem;
}

export const GamepadSettings: React.FC<GamepadSettingsProps> = ({ system }) => {
  const { enabled, selected, deadzone, profiles, setEnabled, setSelected, setDeadzone, updateProfile, setBinding, resetProfile } = useGamepadStore();
  const pads = useConnectedPads();
  const [editKey, setEditKey] = useState<string | null>(null);
  const [capturing, setCapturing] = useState<number | null>(null);
  const lastSnap = useRef<PadSnapshot | null>(null);

  const editing = pads.find((p) => p.key === editKey) || pads.find((p) => selected !== "any" && p.key === selected) || pads[0];
  const profile = editing ? profileFor(profiles, editing.key) : null;
  const bindings = useMemo(() => (profile ? resolveBindings(profile) : {}), [profile]);
  const held = editing && profile ? pressedButtons(bindings, editing.snapshot, deadzone) : new Set<number>();

  // "Press a button on the controller" capture.
  useEffect(() => {
    if (capturing === null || !editing) {
      lastSnap.current = null;
      return;
    }
    const prev = lastSnap.current;
    lastSnap.current = editing.snapshot;
    if (!prev) return;
    const token = newInput(prev, editing.snapshot);
    if (token) {
      setBinding(editing.key, capturing, [token]);
      setCapturing(null);
    }
  }, [capturing, editing, setBinding]);

  useEffect(() => {
    if (capturing === null) return;
    const t = window.setTimeout(() => setCapturing(null), 8000);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setCapturing(null);
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [capturing]);

  const letters = editing?.info.kind === "playstation" ? "Símbolos do PlayStation" : editing?.info.kind === "nintendo" || editing?.info.kind === "8bitdo" ? "Letras do controle" : "Letras do Xbox";

  return (
    <div className="space-y-2.5">
      <label className="flex items-center justify-between gap-2">
        <span className="font-bold flex items-center gap-1.5">
          <Gamepad2 size={13} /> Controles (Xbox, GameSir, PlayStation, USB/Bluetooth)
        </span>
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="accent-pink-500 w-4 h-4" />
      </label>

      {!pads.length ? (
        <p className="rounded-xl bg-black/30 border border-white/10 p-2.5 text-[11px] text-white/70 leading-relaxed">
          Nenhum controle detectado. Conecte o controle (cabo, Bluetooth ou receptor) e <b>aperte qualquer botão</b>: o Windows só mostra o controle
          para os apps depois do primeiro botão. Controles Xbox e GameSir no modo XInput funcionam sem instalar nada.
        </p>
      ) : (
        <div className="space-y-1.5">
          {pads.map((p) => {
            const custom = Object.keys(profiles[p.key]?.custom || {}).length > 0;
            const active = editing?.key === p.key;
            return (
              <button
                key={`${p.index}-${p.key}`}
                type="button"
                onClick={() => setEditKey(p.key)}
                className={`w-full flex items-center gap-2 rounded-xl border px-2.5 py-1.5 text-left ${
                  active ? "border-pink-400 bg-pink-500/15" : "border-white/10 bg-black/30 hover:border-pink-400/50"
                }`}
              >
                <Gamepad2 size={14} className="text-pink-300 shrink-0" />
                <span className="flex-1 min-w-0">
                  <span className="block truncate text-[11px] font-bold">{p.info.name}</span>
                  <span className="block text-[10px] text-white/55">
                    {!p.info.standard
                      ? "Layout não reconhecido: ajuste os botões abaixo"
                      : custom
                      ? "Configuração personalizada"
                      : "Configurado automaticamente"}
                  </span>
                </span>
                {p.info.standard && !custom && <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}

      {pads.length > 1 && (
        <label className="flex items-center justify-between gap-2 text-[11px]">
          <span className="text-white/75">Quem joga</span>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="max-w-[60%] rounded-lg bg-black/40 border border-white/15 px-2 py-1 text-[11px]"
          >
            <option value="any">Qualquer controle conectado</option>
            {pads.map((p) => (
              <option key={p.key} value={p.key}>
                Só {p.info.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {editing && profile && (
        <div className="space-y-2 rounded-xl bg-black/25 border border-white/10 p-2.5">
          <div className="flex gap-1">
            {(
              [
                ["position", "Posição do SNES"],
                ["letters", letters],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => updateProfile(editing.key, { layout: value })}
                className={`flex-1 rounded-lg px-2 py-1 text-[10px] font-bold ${profile.layout === value ? "bg-pink-500 text-white" : "bg-white/10 text-white/75 hover:bg-white/20"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-white/50">
            {profile.layout === "position"
              ? "O botão de baixo do controle vira o B do SNES, o da direita vira o A (igual ao controle original)."
              : "Cada botão segue a letra impressa no controle (A do controle = A do SNES)."}
          </p>

          <label className="flex items-center justify-between gap-2 text-[11px]">
            <span className="text-white/80">Analógico esquerdo também move</span>
            <input type="checkbox" checked={profile.stick} onChange={(e) => updateProfile(editing.key, { stick: e.target.checked })} className="accent-pink-500" />
          </label>
          <label className="flex items-center justify-between gap-2 text-[11px]">
            <span className="text-white/80">Zona morta do analógico</span>
            <input
              type="range"
              min={0.15}
              max={0.9}
              step={0.05}
              value={deadzone}
              onChange={(e) => setDeadzone(Number(e.target.value))}
              className="w-28 accent-pink-500"
            />
          </label>

          <div className="grid grid-cols-2 gap-1.5">
            {system.buttons.map((btn) => {
              const tokens = bindings[btn.index] || [];
              const isCapturing = capturing === btn.index;
              const on = held.has(btn.index);
              return (
                <button
                  key={btn.index}
                  type="button"
                  onClick={() => setCapturing(isCapturing ? null : btn.index)}
                  className={`flex items-center justify-between gap-2 rounded-xl border px-2 py-1.5 text-[11px] transition-colors ${
                    isCapturing
                      ? "bg-pink-500/30 border-pink-400 animate-pulse"
                      : on
                      ? "bg-emerald-500/25 border-emerald-400"
                      : "bg-black/30 border-white/10 hover:border-pink-400/60"
                  }`}
                  title="Clique e aperte o botão do controle"
                >
                  <span className="font-bold">{btn.label}</span>
                  <span className="truncate text-right font-mono text-[10px] text-pink-200">
                    {isCapturing ? "Aperte no controle…" : tokens.map((t) => tokenLabel(t, editing.info.kind, editing.info.standard)).join(" / ") || "(nenhum)"}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-2 text-[10px] text-white/55">
            <span className="flex items-center gap-1">
              <Wand2 size={11} /> Aperte botões para testar: o que acende é o que o jogo recebe.
            </span>
            <button type="button" onClick={() => resetProfile(editing.key)} className="flex items-center gap-1 rounded-lg px-2 py-1 text-white/70 hover:bg-white/10">
              <RotateCcw size={11} /> Automático
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
