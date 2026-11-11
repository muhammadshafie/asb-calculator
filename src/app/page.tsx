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
import { Segmented } from "@/components/ui";

const MODES: { id: InvestmentMode; label: string; desc: string }[] = [
  { id: "lumpsum", label: "Lump sum", desc: "One deposit, left to grow until the date you choose." },
  { id: "monthly", label: "Monthly", desc: "The same amount deposited every month." },
  { id: "periodic", label: "Custom", desc: "Your own mix of deposits and withdrawals on any dates." },
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

  const activeMode = MODES.find((m) => m.id === mode)!;

  return (
    <div className="min-h-screen bg-fog">
      {/* Global bar */}
      <header className="sticky top-0 z-20 border-b border-black/[0.08] bg-[rgba(250,250,252,0.8)] backdrop-blur-xl backdrop-saturate-[1.8]">
        <div className="mx-auto flex h-12 max-w-[980px] items-center justify-between gap-4 px-4 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] sm:px-6">
          <span className="text-[17px] font-semibold tracking-tight text-ink">ASNB Calculator</span>
          <span className="text-xs text-sub">Estimates only</span>
        </div>
      </header>

      <main className="mx-auto max-w-[980px] px-4 pb-10 sm:px-6">
        {/* Hero */}
        <div className="mx-auto max-w-[720px] px-2 pb-8 pt-10 text-center sm:pb-12 sm:pt-16">
          <h1 className="text-[40px] font-semibold leading-[1.07] tracking-[-0.022em] text-ink sm:text-[56px] lg:text-[64px]">
            ASNB dividend calculator
          </h1>
          <p className="mx-auto mt-4 max-w-[30em] text-[19px] leading-[1.35] text-sub sm:text-[21px]">
            See what your ASB, ASB 2 or ASM savings could earn, using ASNB’s minimum monthly balance method.
          </p>
        </div>

        <div className="mx-auto max-w-[720px] space-y-3">
          {/* Fund */}
          <section className="card" aria-labelledby="fund-heading">
            <h2 id="fund-heading" className="card-title">Choose a fund</h2>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {ASNB_FUNDS.map((fund) => {
                const active = selectedFundId === fund.id;
                return (
                  <button
                    key={fund.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setSelectedFundId(fund.id)}
                    className={`min-h-[76px] rounded-2xl px-4 py-3 text-left transition-shadow ${
                      active
                        ? "shadow-[inset_0_0_0_2px_#0071e3]"
                        : "shadow-[inset_0_0_0_1px_#d2d2d7] hover:shadow-[inset_0_0_0_1px_#86868b]"
                    }`}
                  >
                    <div className="text-[17px] font-semibold text-ink">{fund.shortName}</div>
                    <div className="tabular mt-0.5 text-sm text-sub">
                      {fund.id !== "custom" ? `${(fund.dividendRate * 100).toFixed(2)}% a year` : "Your own rate"}
                    </div>
                  </button>
                );
              })}
            </div>

            {isCustom ? (
              <div className="mt-5 sm:max-w-[calc(50%-0.375rem)]">
                <label htmlFor="custom-rate" className="label">Dividend rate per year</label>
                <div className="relative">
                  <input
                    id="custom-rate"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    max="20"
                    className="input-field tabular pr-10"
                    placeholder="5.25"
                    value={customRate}
                    onChange={(e) => setCustomRate(e.target.value)}
                  />
                  <span aria-hidden className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[17px] text-sub">%</span>
                </div>
              </div>
            ) : (
              <p className="hint mt-4">
                Rates are the latest declared: ASB for 2025, ASB 2 and ASM for the year to 31 March 2026. Future rates may differ.
              </p>
            )}
          </section>

          {/* Strategy + details */}
          <section className="card" aria-labelledby="plan-heading">
            <h2 id="plan-heading" className="card-title">How will you invest?</h2>
            <div className="mt-5">
              <Segmented
                label="Investment strategy"
                options={MODES}
                value={mode}
                onChange={(id) => { setMode(id); setResult(null); setError(""); }}
              />
              <p className="mt-3 text-center text-[15px] text-sub">{activeMode.desc}</p>
            </div>

            <hr className="my-6 border-black/[0.08]" />

            {error && (
              <div role="alert" className="mb-5 rounded-xl bg-[#fff1f1] px-4 py-3 text-[15px] text-loss">
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
        </div>

        {/* Results */}
        <div id="results" className="mt-3 scroll-mt-16">
          {result && <ResultsPanel result={result} />}
        </div>

        {/* Disclaimer */}
        <footer className="mx-auto mt-10 max-w-[720px] border-t border-hairline px-2 pt-5 text-xs leading-relaxed text-sub pb-[env(safe-area-inset-bottom)]">
          This calculator is for estimation only. Dividend rates are not guaranteed and are
          declared annually by ASNB, so the dividend actually credited may differ. For official
          information, visit{" "}
          <a href="https://www.asnb.com.my" target="_blank" rel="noopener noreferrer" className="text-action-link hover:underline">
            asnb.com.my
          </a>
          .
        </footer>
      </main>
    </div>
  );
}
