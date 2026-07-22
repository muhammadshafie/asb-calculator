"use client";

import { useState } from "react";
import {
  ASNB_FUNDS,
  ASNBFund,
  InvestmentMode,
  Transaction,
  CalculationResult,
  buildLumpsumTransactions,
  buildMonthlyTransactions,
  buildPeriodicTransactions,
  calculateASNBDividend,
} from "@/lib/calculator";
import LumpsumForm from "@/components/LumpsumForm";
import MonthlyForm from "@/components/MonthlyForm";
import PeriodicForm from "@/components/PeriodicForm";
import ResultsPanel from "@/components/ResultsPanel";

const MODES: { id: InvestmentMode; label: string; icon: string; desc: string }[] = [
  { id: "lumpsum", label: "Lump Sum", icon: "💰", desc: "One-time deposit" },
  { id: "monthly", label: "Monthly", icon: "📅", desc: "Same amount every month" },
  { id: "periodic", label: "Periodic", icon: "✏️", desc: "Custom dates & amounts" },
];

export default function Home() {
  const [mode, setMode] = useState<InvestmentMode>("lumpsum");
  const [selectedFundId, setSelectedFundId] = useState("asb");
  const [customRate, setCustomRate] = useState<string>("");
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [error, setError] = useState<string>("");

  const selectedFund = ASNB_FUNDS.find((f) => f.id === selectedFundId)!;
  const isCustom = selectedFundId === "custom";

  function handleCalculate(
    transactions: Transaction[],
    endDate?: string,
    initialBalance: number = 0
  ) {
    setError("");
    try {
      const rate = isCustom && customRate ? parseFloat(customRate) : undefined;
      const fund: ASNBFund = isCustom
        ? { ...selectedFund, dividendRate: (rate ?? 5) / 100 }
        : selectedFund;

      if (isCustom && (!customRate || isNaN(parseFloat(customRate)))) {
        setError("Please enter a custom dividend rate.");
        return;
      }

      const res = calculateASNBDividend(transactions, fund, rate, endDate, initialBalance);
      setResult(res);
      // Scroll to results
      setTimeout(() => {
        document.getElementById("results")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Calculation error");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f0f7f4] via-white to-[#f5f5f0]">
      {/* Header */}
      <header className="bg-white border-b border-green-100 shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#006747] flex items-center justify-center text-white font-bold text-lg shrink-0">
            A
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#006747] font-display leading-tight">
              ASNB Dividend Calculator
            </h1>
            <p className="text-xs text-gray-400 font-medium">
              Estimate your returns from ASNB fixed-price funds
            </p>
          </div>
          <div className="ml-auto hidden sm:block">
            <span className="text-xs bg-[#E8F5EE] text-[#006747] font-semibold px-3 py-1.5 rounded-full">
              For estimation only
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Fund Selector */}
        <section className="card">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">Select Fund</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {ASNB_FUNDS.map((fund) => (
              <button
                key={fund.id}
                onClick={() => setSelectedFundId(fund.id)}
                className={`p-3 rounded-xl border-2 text-left transition-all ${
                  selectedFundId === fund.id
                    ? "border-[#006747] bg-[#E8F5EE]"
                    : "border-gray-100 hover:border-[#006747]/30 bg-white"
                }`}
              >
                <div className="font-bold text-[#006747] text-sm">{fund.shortName}</div>
                {fund.id !== "custom" ? (
                  <div className="text-xs text-gray-500 mt-0.5">{(fund.dividendRate * 100).toFixed(2)}% p.a.</div>
                ) : (
                  <div className="text-xs text-gray-400 mt-0.5">Set your own rate</div>
                )}
              </button>
            ))}
          </div>

          {isCustom && (
            <div className="mt-4 max-w-xs">
              <label className="label">Custom Dividend Rate (% per annum)</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="20"
                  className="input-field pr-10"
                  placeholder="e.g. 5.25"
                  value={customRate}
                  onChange={(e) => setCustomRate(e.target.value)}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">%</span>
              </div>
            </div>
          )}

          {!isCustom && (
            <p className="mt-3 text-xs text-gray-400">
              * Dividend rate shown is indicative based on recent declarations. Actual rates may vary.
            </p>
          )}
        </section>

        {/* Mode Selector */}
        <section className="card">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">Investment Strategy</h2>
          <div className="grid grid-cols-3 gap-3">
            {MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => { setMode(m.id); setResult(null); setError(""); }}
                className={`p-4 rounded-xl border-2 text-center transition-all ${
                  mode === m.id
                    ? "border-[#006747] bg-[#E8F5EE]"
                    : "border-gray-100 hover:border-[#006747]/30 bg-white"
                }`}
              >
                <div className="text-2xl mb-1">{m.icon}</div>
                <div className="font-bold text-sm text-[#006747]">{m.label}</div>
                <div className="text-xs text-gray-400 mt-0.5">{m.desc}</div>
              </button>
            ))}
          </div>
        </section>

        {/* Input Form */}
        <section className="card">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-5">
            {MODES.find((m) => m.id === mode)?.label} Details
          </h2>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          {mode === "lumpsum" && (
            <LumpsumForm
              fund={selectedFund}
              onCalculate={(amount, date, withdrawals, endDate, initialBalance) => {
                const deposits = amount > 0 ? buildLumpsumTransactions(amount, date) : [];
                handleCalculate([...deposits, ...withdrawals], endDate, initialBalance);
              }}
            />
          )}

          {mode === "monthly" && (
            <MonthlyForm
              fund={selectedFund}
              onCalculate={(amount, startDate, months, dayOfMonth, withdrawals, initialBalance) => {
                const deposits = amount > 0
                  ? buildMonthlyTransactions(amount, startDate, months, dayOfMonth)
                  : [];
                handleCalculate([...deposits, ...withdrawals], undefined, initialBalance);
              }}
            />
          )}

          {mode === "periodic" && (
            <PeriodicForm
              fund={selectedFund}
              onCalculate={(transactions, endDate, initialBalance) =>
                handleCalculate(buildPeriodicTransactions(transactions), endDate, initialBalance)
              }
            />
          )}
        </section>

        {/* Results */}
        <div id="results">
          {result && <ResultsPanel result={result} />}
        </div>

        {/* Disclaimer */}
        <footer className="text-center text-xs text-gray-400 pb-8 max-w-2xl mx-auto">
          This calculator is for <strong>estimation purposes only</strong>. Dividend rates are
          not guaranteed and are declared annually by ASNB. The actual dividend credited may differ.
          Please refer to{" "}
          <a href="https://www.asnb.com.my" target="_blank" rel="noopener noreferrer" className="text-[#006747] underline">
            www.asnb.com.my
          </a>{" "}
          for official information.
        </footer>
      </main>
    </div>
  );
}
