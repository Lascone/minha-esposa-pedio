import React, { useState, useEffect, useCallback } from "react";
import { WidgetInstance } from "../types";

interface CalculatorWidgetProps {
  widget: WidgetInstance;
}

export const CalculatorWidget: React.FC<CalculatorWidgetProps> = ({ widget }) => {
  const [display, setDisplay] = useState("0");
  const [equation, setEquation] = useState("");
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [memory, setMemory] = useState<number | null>(null);

  const handleDigit = useCallback(
    (digit: string) => {
      if (waitingForOperand) {
        setDisplay(digit);
        setWaitingForOperand(false);
      } else {
        setDisplay(display === "0" ? digit : display + digit);
      }
    },
    [display, waitingForOperand]
  );

  const handleDecimal = useCallback(() => {
    if (waitingForOperand) {
      setDisplay("0.");
      setWaitingForOperand(false);
      return;
    }
    if (!display.includes(".")) {
      setDisplay(display + ".");
    }
  }, [display, waitingForOperand]);

  const handleClear = useCallback(() => {
    setDisplay("0");
    setEquation("");
    setMemory(null);
    setWaitingForOperand(false);
  }, []);

  const handleBackspace = useCallback(() => {
    if (waitingForOperand) return;
    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay("0");
    }
  }, [display, waitingForOperand]);

  const calculate = (a: number, b: number, op: string): number => {
    switch (op) {
      case "+":
        return a + b;
      case "-":
        return a - b;
      case "×":
      case "*":
        return a * b;
      case "÷":
      case "/":
        return b !== 0 ? a / b : 0;
      default:
        return b;
    }
  };

  const handleOperator = useCallback(
    (op: string) => {
      const inputValue = parseFloat(display);

      if (memory === null) {
        setMemory(inputValue);
        setEquation(`${inputValue} ${op}`);
      } else if (!waitingForOperand) {
        const lastOp = equation.slice(-1);
        const result = calculate(memory, inputValue, lastOp);
        setMemory(result);
        setDisplay(String(Number(result.toFixed(6))));
        setEquation(`${result} ${op}`);
      } else {
        setEquation(`${memory} ${op}`);
      }

      setWaitingForOperand(true);
    },
    [display, memory, waitingForOperand, equation]
  );

  const handleEqual = useCallback(() => {
    if (memory === null) return;
    const inputValue = parseFloat(display);
    const lastOp = equation.trim().split(" ").pop() || "+";
    const result = calculate(memory, inputValue, lastOp);

    setEquation("");
    setDisplay(String(Number(result.toFixed(6))));
    setMemory(null);
    setWaitingForOperand(true);
  }, [memory, display, equation]);

  const handlePercent = useCallback(() => {
    const val = parseFloat(display) / 100;
    setDisplay(String(val));
  }, [display]);

  const handleToggleSign = useCallback(() => {
    const val = parseFloat(display) * -1;
    setDisplay(String(val));
  }, [display]);

  // Keyboard shortcut listener
  useEffect(() => {
    if (widget.settings?.__preview) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
      if (e.key >= "0" && e.key <= "9") {
        handleDigit(e.key);
      } else if (e.key === ".") {
        handleDecimal();
      } else if (e.key === "+" || e.key === "-") {
        handleOperator(e.key);
      } else if (e.key === "*") {
        handleOperator("×");
      } else if (e.key === "/") {
        e.preventDefault();
        handleOperator("÷");
      } else if (e.key === "Enter" || e.key === "=") {
        e.preventDefault();
        handleEqual();
      } else if (e.key === "Backspace") {
        handleBackspace();
      } else if (e.key === "Escape") {
        handleClear();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [widget.settings?.__preview, handleDigit, handleDecimal, handleOperator, handleEqual, handleBackspace, handleClear]);

  const isCute = widget.theme === "cute-pastel";

  return (
    <div className="flex flex-col h-full w-full select-none p-1">
      {/* Display Screen */}
      <div
        className={`rounded-xl p-2.5 mb-2 flex flex-col justify-end text-right transition-all border ${
          isCute
            ? "bg-pink-100/60 dark:bg-pink-950/40 border-pink-300/40 text-pink-900 dark:text-pink-100"
            : "bg-black/35 backdrop-blur-md border-white/10 text-white shadow-inner"
        }`}
      >
        <div className="text-[10px] text-white/50 h-3 font-mono overflow-hidden truncate">
          {equation}
        </div>
        <div className="text-2xl font-semibold font-mono tracking-tight overflow-hidden truncate">
          {display}
        </div>
      </div>

      {/* Buttons Grid */}
      <div className="grid grid-cols-4 gap-1 flex-1 text-sm font-medium">
        <button
          onClick={handleClear}
          className="col-span-1 rounded-lg bg-red-500/20 hover:bg-red-500/35 border border-red-500/30 text-red-300 active:scale-95 transition flex items-center justify-center font-bold"
        >
          C
        </button>
        <button
          onClick={handleToggleSign}
          className="rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 text-white/90 active:scale-95 transition flex items-center justify-center"
        >
          ±
        </button>
        <button
          onClick={handlePercent}
          className="rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 text-white/90 active:scale-95 transition flex items-center justify-center"
        >
          %
        </button>
        <button
          onClick={() => handleOperator("÷")}
          className="rounded-lg bg-pink-500/30 hover:bg-pink-500/45 border border-pink-500/40 text-pink-200 active:scale-95 transition flex items-center justify-center text-lg"
        >
          ÷
        </button>

        {["7", "8", "9"].map((d) => (
          <button
            key={d}
            onClick={() => handleDigit(d)}
            className="rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-white/90 active:scale-95 transition flex items-center justify-center text-base"
          >
            {d}
          </button>
        ))}
        <button
          onClick={() => handleOperator("×")}
          className="rounded-lg bg-pink-500/30 hover:bg-pink-500/45 border border-pink-500/40 text-pink-200 active:scale-95 transition flex items-center justify-center text-base"
        >
          ×
        </button>

        {["4", "5", "6"].map((d) => (
          <button
            key={d}
            onClick={() => handleDigit(d)}
            className="rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-white/90 active:scale-95 transition flex items-center justify-center text-base"
          >
            {d}
          </button>
        ))}
        <button
          onClick={() => handleOperator("-")}
          className="rounded-lg bg-pink-500/30 hover:bg-pink-500/45 border border-pink-500/40 text-pink-200 active:scale-95 transition flex items-center justify-center text-base"
        >
          -
        </button>

        {["1", "2", "3"].map((d) => (
          <button
            key={d}
            onClick={() => handleDigit(d)}
            className="rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-white/90 active:scale-95 transition flex items-center justify-center text-base"
          >
            {d}
          </button>
        ))}
        <button
          onClick={() => handleOperator("+")}
          className="rounded-lg bg-pink-500/30 hover:bg-pink-500/45 border border-pink-500/40 text-pink-200 active:scale-95 transition flex items-center justify-center text-base"
        >
          +
        </button>

        <button
          onClick={() => handleDigit("0")}
          className="col-span-2 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-white/90 active:scale-95 transition flex items-center justify-center text-base"
        >
          0
        </button>
        <button
          onClick={handleDecimal}
          className="rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-white/90 active:scale-95 transition flex items-center justify-center text-base font-bold"
        >
          .
        </button>
        <button
          onClick={handleEqual}
          className="rounded-lg bg-gradient-to-tr from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500 text-white font-bold shadow-lg shadow-pink-500/20 active:scale-95 transition flex items-center justify-center text-base"
        >
          =
        </button>
      </div>
    </div>
  );
};
