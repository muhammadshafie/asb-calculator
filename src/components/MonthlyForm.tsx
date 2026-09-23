"use client";

import { useState, useMemo } from "react";
import { ASNBFund, Transaction, parseDate, toISO } from "@/lib/calculator";
import { Plus, Trash2, ChevronDown, ChevronUp, Info } from "lucide-react";

interface Props {
  fund: ASNBFund;
  onCalculate: (
    amount: number,
    startDate: string,
    months: number,
    dayOfMonth: number,
    withdrawals: Transaction[],
    initialBalance: number
  ) => void;
}

interface WithdrawalRow {
  id: number;
  date: string;
  amount: string;
}

let _wid = 100;
const nextWid = () => _wid++;

export default function MonthlyForm({ fund, onCalculate }: Props) {
  const today = new Date().toISOString().split("T")[0];

  const [initialBalance, setInitialBalance] = useState("");
  const [amount, setAmount] = useState("500");
  const [startDate, setStartDate] = useState(today);
  const [months, setMonths] = useState("12");
  const [dayOfMonth, setDayOfMonth] = useState("1");
  const [withdrawals, setWithdrawals] = useState<WithdrawalRow[]>([]);
  const [showWithdrawals, setShowWithdrawals] = useState(false);

  // ── withdrawal helpers ──────────────────────────────
  const addWithdrawal = () => {
    setShowWithdrawals(true);
    const lastDate = withdrawals[withdrawals.length - 1]?.date ?? startDate;
    const next = new Date(lastDate + "T00:00:00");
    next.setMonth(next.getMonth() + 1);
    setWithdrawals([
      ...withdrawals,
      { id: nextWid(), date: next.toISOString().split("T")[0], amount: "" },
    ]);
  };

  const removeWithdrawal = (id: number) =>
    setWithdrawals(withdrawals.filter((w) => w.id !== id));

  const updateWithdrawal = (id: number, field: "date" | "amount", val: string) =>
    setWithdrawals(withdrawals.map((w) => (w.id === id ? { ...w, [field]: val } : w)));

  // ── derived values ──────────────────────────────────
  const totalDeposit = parseFloat(amount || "0") * parseInt(months || "0");
  const totalWithdrawn = withdrawals.reduce((s, w) => s + (parseFloat(w.amount) || 0), 0);
  const initBal = parseFloat(initialBalance) || 0;

  // Build preview schedule (deposits only — withdrawals shown separately)
  const schedule = useMemo(() => {
    if (!startDate) return [];
    const n = Math.min(parseInt(months) || 0, 24);
    const start = new Date(startDate + "T00:00:00");
    const day = parseInt(dayOfMonth) || 1;
    return Array.from({ length: n }, (_, i) => {
      const d = new Date(start.getFullYear(), start.getMonth() + i, day);
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      d.setDate(Math.min(day, lastDay));
      return d.toLocaleString("en-MY", { month: "short", year: "numeric" });
    });
  }, [startDate, months, dayOfMonth]);

  // ── submit ──────────────────────────────────────────
  const handleSubmit = () => {
    const amt = parseFloat(amount);
    const m = parseInt(months);
    const day = parseInt(dayOfMonth);
    if ((!amt || amt <= 0) && initBal <= 0) return;
    if (!m || m <= 0) return;

    const wTx: Transaction[] = withdrawals
      .filter((w) => w.amount && parseFloat(w.amount) > 0 && w.date)
      .map((w) => ({ date: w.date, amount: parseFloat(w.amount), type: "withdrawal" as const }));

    onCalculate(amt || 0, startDate, m, day, wTx, initBal);
  };

  return (
    <div className="space-y-6">
      {/* ── Opening Balance ───────────────────────────── */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
        <div className="flex items-start gap-2">
          <Info size={15} className="text-amber-600 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-700 font-medium">
            Already have existing savings? Enter your current total balance so the calculator starts from your actual position.
          </p>
        </div>
        <div className="max-w-xs">
          <label className="label">Opening Balance (RM) — optional</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500 font-semibold text-sm">RM</span>
            <input
              type="number"
              className="input-field pl-10 border-amber-200 focus:border-amber-400 focus:ring-amber-200"
              min={0}
              step="100"
              placeholder="e.g. 25000"
              value={initialBalance}
              onChange={(e) => setInitialBalance(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ── Monthly deposit config ─────────────────────── */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Monthly Deposit (RM)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-sm">RM</span>
            <input
              type="number"
              className="input-field pl-10"
              min={0}
              step="50"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="500"
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">Set 0 if only tracking existing balance</p>
        </div>

        <div>
          <label className="label">Start Date</label>
          <input
            type="date"
            className="input-field"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        <div>
          <label className="label">Number of Months</label>
          <input
            type="number"
            className="input-field"
            min={1}
            max={120}
            value={months}
            onChange={(e) => setMonths(e.target.value)}
            placeholder="12"
          />
          <div className="flex gap-2 mt-2 flex-wrap">
            {[6, 12, 24, 36, 60].map((m) => (
              <button
                key={m}
                onClick={() => setMonths(String(m))}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                  months === String(m)
                    ? "bg-[#006747] text-white border-[#006747]"
                    : "bg-white text-gray-600 border-gray-200 hover:border-[#006747]/50"
                }`}
              >
                {m}m
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Day of Month</label>
          <input
            type="number"
            className="input-field"
            min={1}
            max={28}
            value={dayOfMonth}
            onChange={(e) => setDayOfMonth(e.target.value)}
            placeholder="1"
          />
          <p className="text-xs text-gray-400 mt-1">Use 1–28 to avoid month-end issues</p>
        </div>
      </div>

      {/* Summary preview */}
      {(initBal > 0 || totalDeposit > 0) && (
        <div className="bg-[#E8F5EE] rounded-xl p-4 flex flex-wrap gap-4 text-sm">
          {initBal > 0 && (
            <div>
              <span className="text-gray-500 text-xs">Opening Balance </span>
              <span className="font-bold text-amber-600">RM {initBal.toLocaleString("en-MY", { minimumFractionDigits: 2 })}</span>
            </div>
          )}
          {totalDeposit > 0 && (
            <>
              <div>
                <span className="text-gray-500 text-xs">Total New Deposits </span>
                <span className="font-bold text-[#006747]">RM {totalDeposit.toLocaleString("en-MY", { minimumFractionDigits: 2 })}</span>
              </div>
              <div>
                <span className="text-gray-500 text-xs">Per month </span>
                <span className="font-bold text-[#006747]">RM {parseFloat(amount || "0").toLocaleString("en-MY", { minimumFractionDigits: 2 })}</span>
              </div>
            </>
          )}
          {totalWithdrawn > 0 && (
            <div>
              <span className="text-gray-500 text-xs">Total Withdrawn </span>
              <span className="font-bold text-red-600">−RM {totalWithdrawn.toLocaleString("en-MY", { minimumFractionDigits: 2 })}</span>
            </div>
          )}
        </div>
      )}

      {/* Schedule preview table */}
      {schedule.length > 0 && parseFloat(amount) > 0 && (
        <div>
          <p className="label mb-2">Deposit Schedule Preview</p>
          <div className="bg-gray-50 rounded-xl overflow-hidden border border-gray-100">
            <div className="grid grid-cols-3 text-xs font-semibold text-gray-500 uppercase px-4 py-2.5 border-b border-gray-100">
              <span>#</span><span>Month</span><span className="text-right">Amount</span>
            </div>
            <div className="max-h-44 overflow-y-auto">
              {schedule.map((label, i) => (
                <div key={i} className={`grid grid-cols-3 text-xs px-4 py-2.5 ${i % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                  <span className="text-gray-400 font-medium">{i + 1}</span>
                  <span className="font-medium text-gray-700">{label}</span>
                  <span className="text-right text-[#006747] font-semibold">
                    + RM {parseFloat(amount || "0").toLocaleString("en-MY", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
              {parseInt(months) > 24 && (
                <div className="text-center text-xs text-gray-400 py-2">
                  … and {parseInt(months) - 24} more months
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Withdrawals ───────────────────────────────── */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <button
          onClick={() => setShowWithdrawals(!showWithdrawals)}
          className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-all text-sm font-semibold text-gray-600"
        >
          <span className="flex items-center gap-2">
            <span className="text-red-500 font-bold">−</span>
            Withdrawals during this period
            {totalWithdrawn > 0 && (
              <span className="text-xs bg-red-100 text-red-600 font-semibold px-2 py-0.5 rounded-full">
                {withdrawals.filter((w) => parseFloat(w.amount) > 0).length} · RM {totalWithdrawn.toLocaleString("en-MY", { minimumFractionDigits: 2 })}
              </span>
            )}
          </span>
          {showWithdrawals ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showWithdrawals && (
          <div className="p-4 space-y-3">
            <p className="text-xs text-gray-400">
              Add any months where you made a withdrawal. The calculator will deduct those units on the specified date.
            </p>

            {withdrawals.length === 0 && (
              <p className="text-xs text-gray-300 text-center py-2">No withdrawals added yet.</p>
            )}

            {withdrawals.map((w, idx) => (
              <div key={w.id} className="flex flex-col gap-2 sm:grid sm:grid-cols-[1fr_1fr_auto] sm:items-center bg-red-50 rounded-xl px-3 py-2.5 border border-red-100">
                <div>
                  <label className="label mb-1 sm:hidden">Withdrawal Date</label>
                  {idx === 0 && <label className="label mb-1 hidden sm:block">Withdrawal Date</label>}
                  <input
                    type="date"
                    className="input-field text-sm py-2 border-red-200 focus:border-red-400 focus:ring-red-100"
                    value={w.date}
                    onChange={(e) => updateWithdrawal(w.id, "date", e.target.value)}
                  />
                </div>
                <div className="flex gap-2 items-end sm:contents">
                  <div className="flex-1 min-w-0">
                    <label className="label mb-1 sm:hidden">Amount (RM)</label>
                    {idx === 0 && <label className="label mb-1 hidden sm:block">Amount (RM)</label>}
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-red-400 text-xs font-semibold">−RM</span>
                      <input
                        type="number"
                        className="input-field pl-10 text-sm py-2 border-red-200 focus:border-red-400 focus:ring-red-100 text-red-600"
                        min={0}
                        step="100"
                        placeholder="0"
                        value={w.amount}
                        onChange={(e) => updateWithdrawal(w.id, "amount", e.target.value)}
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => removeWithdrawal(w.id)}
                    className={`p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-white transition-all shrink-0 ${idx === 0 ? "sm:mt-5" : ""}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}

            <button
              onClick={addWithdrawal}
              className="flex items-center gap-2 text-sm text-red-500 font-semibold hover:bg-red-50 px-3 py-2 rounded-lg transition-all border border-dashed border-red-200 w-full justify-center"
            >
              <Plus size={15} /> Add Withdrawal
            </button>
          </div>
        )}
      </div>

      <button onClick={handleSubmit} className="btn-primary w-full sm:w-auto">
        Calculate Dividend →
      </button>
    </div>
  );
}
