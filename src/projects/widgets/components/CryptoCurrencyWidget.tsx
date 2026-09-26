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

const FALLBACK_RATES: CurrencyRate[] = [
  { code: "USD", name: "Dólar Comercial", symbol: "$", bid: 5.42, pctChange: 0.15 },
  { code: "EUR", name: "Euro", symbol: "€", bid: 5.92, pctChange: -0.22 },
  { code: "BTC", name: "Bitcoin", symbol: "₿", bid: 348500, pctChange: 1.84 },
  { code: "ETH", name: "Ethereum", symbol: "Ξ", bid: 15400, pctChange: 0.95 },
];

export const CryptoCurrencyWidget: React.FC<CryptoCurrencyWidgetProps> = ({ widget }) => {
  const [rates, setRates] = useState<CurrencyRate[]>(FALLBACK_RATES);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [brlInput, setBrlInput] = useState<string>("100");
  const [activeTab, setActiveTab] = useState<"cards" | "convert">("cards");

  const fetchRates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("https://economia.awesomeapi.com.br/last/USD-BRL,EUR-BRL,BTC-BRL,ETH-BRL");
      if (res.ok) {
        const data = await res.json();
        const updated: CurrencyRate[] = [
          {
            code: "USD",
            name: "Dólar",
            symbol: "$",
            bid: parseFloat(data.USDBRL?.bid || "5.42"),
            pctChange: parseFloat(data.USDBRL?.pctChange || "0"),
          },
          {
            code: "EUR",
            name: "Euro",
            symbol: "€",
            bid: parseFloat(data.EURBRL?.bid || "5.92"),
            pctChange: parseFloat(data.EURBRL?.pctChange || "0"),
          },
          {
            code: "BTC",
            name: "Bitcoin",
            symbol: "₿",
            bid: parseFloat(data.BTCBRL?.bid || "348500"),
            pctChange: parseFloat(data.BTCBRL?.pctChange || "0"),
          },
          {
            code: "ETH",
            name: "Ethereum",
            symbol: "Ξ",
            bid: parseFloat(data.ETHBRL?.bid || "15400"),
            pctChange: parseFloat(data.ETHBRL?.pctChange || "0"),
          },
        ];
        setRates(updated);
        setLastUpdated(new Date());
      }
    } catch {
      // Keep previous rates on network error
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
      {activeTab === "cards" ? (
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
        Atualizado às {lastUpdated.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
      </div>
    </div>
  );
};
