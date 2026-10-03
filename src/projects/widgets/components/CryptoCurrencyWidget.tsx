import React, { useState, useEffect, useCallback } from "react";
import { WidgetInstance } from "../types";

interface CryptoCurrencyWidgetProps {
  widget: WidgetInstance;
}

interface CurrencyRate {
  code: string;
  name: string;
  symbol: string;
  bid: number;
  pctChange: number;
}

const CURRENCIES = [
  { code: "USD", key: "USDBRL", name: "Dólar", symbol: "$" },
  { code: "EUR", key: "EURBRL", name: "Euro", symbol: "€" },
  { code: "BTC", key: "BTCBRL", name: "Bitcoin", symbol: "₿" },
  { code: "ETH", key: "ETHBRL", name: "Ethereum", symbol: "Ξ" },
] as const;

export const CryptoCurrencyWidget: React.FC<CryptoCurrencyWidgetProps> = ({ widget }) => {
  const [rates, setRates] = useState<CurrencyRate[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState(false);
  const [brlInput, setBrlInput] = useState<string>("100");
  const [activeTab, setActiveTab] = useState<"cards" | "convert">("cards");

  const fetchRates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("https://economia.awesomeapi.com.br/last/USD-BRL,EUR-BRL,BTC-BRL,ETH-BRL");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const updated: CurrencyRate[] = CURRENCIES.flatMap((c) => {
        const bid = parseFloat(data?.[c.key]?.bid);
        if (!Number.isFinite(bid)) return [];
        const pct = parseFloat(data?.[c.key]?.pctChange);
        return [{ code: c.code, name: c.name, symbol: c.symbol, bid, pctChange: Number.isFinite(pct) ? pct : 0 }];
      });
      if (updated.length === 0) throw new Error("sem dados");
      setRates(updated);
      setLastUpdated(new Date());
      setError(false);
    } catch {
      // Previous real rates stay on screen; the footer says they are not fresh.
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRates();
    const interval = setInterval(fetchRates, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, [fetchRates]);

  const numInput = parseFloat(brlInput) || 0;

  return (
    <div className="flex flex-col h-full w-full select-none p-1 text-white">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-white/10 text-xs">
        <div className="flex items-center gap-1.5 font-medium">
          <button
            onClick={() => setActiveTab("cards")}
            className={`px-2 py-0.5 rounded transition ${
              activeTab === "cards" ? "bg-white/20 text-white" : "text-white/50 hover:text-white"
            }`}
          >
            Cotações
          </button>
          <button
            onClick={() => setActiveTab("convert")}
            className={`px-2 py-0.5 rounded transition ${
              activeTab === "convert" ? "bg-white/20 text-white" : "text-white/50 hover:text-white"
            }`}
          >
            Conversor
          </button>
        </div>

        <button
          onClick={fetchRates}
          disabled={loading}
          title="Atualizar cotações"
          className="p-1 rounded-md hover:bg-white/10 text-white/60 hover:text-white transition active:scale-95"
        >
          <span className={`inline-block ${loading ? "animate-spin" : ""}`}>🔄</span>
        </button>
      </div>

      {/* Content Area */}
      {rates.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-1 text-center text-xs text-white/60">
          {loading ? (
            <span className="animate-pulse">Buscando cotações…</span>
          ) : (
            <>
              <span>Sem conexão com as cotações agora.</span>
              <button onClick={fetchRates} className="px-2 py-0.5 rounded bg-white/15 hover:bg-white/25 text-white">
                Tentar de novo
              </button>
            </>
          )}
        </div>
      ) : activeTab === "cards" ? (
        <div className="grid grid-cols-2 gap-1.5 flex-1 overflow-auto">
          {rates.map((r) => {
            const isPositive = r.pctChange >= 0;
            return (
              <div
                key={r.code}
                className="rounded-xl bg-black/20 hover:bg-black/30 border border-white/10 p-2 flex flex-col justify-between transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-xs text-pink-300">{r.symbol}</span>
                    <span className="text-[11px] font-semibold text-white/80">{r.code}</span>
                  </div>
                  <span
                    className={`text-[9px] px-1 py-0.5 rounded font-mono font-bold ${
                      isPositive ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                    }`}
                  >
                    {isPositive ? "+" : ""}
                    {r.pctChange.toFixed(2)}%
                  </span>
                </div>

                <div className="mt-1">
                  <div className="text-sm font-bold font-mono tracking-tight">
                    R$ {r.bid >= 1000 ? r.bid.toLocaleString("pt-BR", { maximumFractionDigits: 0 }) : r.bid.toFixed(2)}
                  </div>
                  <div className="text-[9px] text-white/40 truncate">{r.name}</div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col gap-2 flex-1 justify-center p-1">
          <div className="flex items-center gap-2 bg-black/30 p-2 rounded-xl border border-white/10">
            <span className="text-xs text-white/60 font-medium">R$</span>
            <input
              type="number"
              value={brlInput}
              onChange={(e) => setBrlInput(e.target.value)}
              className="w-full bg-transparent text-sm font-mono font-bold focus:outline-none text-white"
              placeholder="Valor em Reais"
            />
          </div>

          <div className="flex flex-col gap-1 text-xs">
            {rates.map((r) => {
              const converted = r.bid > 0 ? numInput / r.bid : 0;
              return (
                <div
                  key={r.code}
                  className="flex items-center justify-between px-2 py-1 rounded-lg bg-white/5 border border-white/5 font-mono"
                >
                  <span className="text-white/60">{r.name} ({r.code}):</span>
                  <span className="font-bold text-pink-300">
                    {r.symbol} {converted < 0.01 ? converted.toFixed(6) : converted.toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer Timestamp */}
      <div className="text-[9px] text-white/40 text-center pt-1 font-mono">
        {lastUpdated
          ? `${error ? "Sem conexão · última atualização" : "Atualizado"} às ${lastUpdated.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
          : error
            ? "Cotações indisponíveis"
            : "Carregando…"}
      </div>
    </div>
  );
};
