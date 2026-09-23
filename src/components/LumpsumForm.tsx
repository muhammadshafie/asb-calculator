"use client";

import { useState } from "react";
import { ASNBFund, Transaction } from "@/lib/calculator";
import { Plus, Trash2, ChevronDown, ChevronUp, Info } from "lucide-react";

interface Props {
  fund: ASNBFund;
  onCalculate: (
    amount: number,
    date: string,
    withdrawals: Transaction[],
    endDate: string,
    initialBalance: number,
  ) => void;
}

interface WithdrawalRow {
  id: number;
  date: string;
  amount: string;
}

let _wid = 1;
const nextWid = () => _wid++;

export default function LumpsumForm({ fund, onCalculate }: Props) {
  const today = new Date().toISOString().split("T")[0];
  const yearEnd = `${new Date().getFullYear()}-12-31`;

  const [initialBalance, setInitialBalance] = useState("");
  const [amount, setAmount] = useState("10000");
  const [date, setDate] = useState(today);
  const [endDate, setEndDate] = useState(yearEnd);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRow[]>([]);
  const [showWithdrawals, setShowWithdrawals] = useState(false);

  // ── withdrawal helpers ──────────────────────────────
  const addWithdrawal = () => {
    setShowWithdrawals(true);
    const lastDate = withdrawals[withdrawals.length - 1]?.date ?? date;
    const next = new Date(lastDate + "T00:00:00");
    next.setMonth(next.getMonth() + 1);
    setWithdrawals([
      ...withdrawals,
      { id: nextWid(), date: next.toISOString().split("T")[0], amount: "" },
    ]);
  };

  const removeWithdrawal = (id: number) =>
    setWithdrawals(withdrawals.filter((w) => w.id !== id));

  const updateWithdrawal = (
    id: number,
    field: "date" | "amount",
    val: string,
  ) =>
    setWithdrawals(
      withdrawals.map((w) => (w.id === id ? { ...w, [field]: val } : w)),
    );

  // ── submit ──────────────────────────────────────────
  const handleSubmit = () => {
    const amt = parseFloat(amount);
    const initBal = parseFloat(initialBalance) || 0;
    // At least one of initial balance or deposit amount must exist
    if ((!amt || amt <= 0) && initBal <= 0) return;

    const wTx: Transaction[] = withdrawals
      .filter((w) => w.amount && parseFloat(w.amount) > 0 && w.date)
      .map((w) => ({
        date: w.date,
        amount: parseFloat(w.amount),
        type: "withdrawal" as const,
      }));

    onCalculate(amt || 0, date, wTx, endDate, initBal);
  };

  const totalWithdrawn = withdrawals.reduce(
    (s, w) => s + (parseFloat(w.amount) || 0),
    0,
  );

  return (
    <div className="space-y-6">
      {/* ── Opening Balance ───────────────────────────── */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
        <div className="flex items-start gap-2">
          <Info size={15} className="text-amber-600 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-700 font-medium">
            Already invested in previous years? Enter your current total balance
            (principal + dividends received) so the calculator continues from
            where you left off.
          </p>
        </div>
        <div className="max-w-xs">
          <label className="label">Opening Balance (RM) — optional</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500 font-semibold text-sm">
              RM
            </span>
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

      {/* ── New Deposit ───────────────────────────────── */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">New Deposit Amount (RM)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-sm">
              RM
            </span>
            <input
              type="number"
              className="input-field pl-10"
              min={0}
              max={fund.maxInvestment ?? undefined}
              step="100"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0 if none"
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Leave 0 if no new deposit this period
          </p>
        </div>

        <div>
          <label className="label">Deposit Date</label>
          <input
            type="date"
            className="input-field"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div>
          <label className="label">Calculate Until</label>
          <input
            type="date"
            className="input-field"
            value={endDate}
            min={date}
            onChange={(e) => setEndDate(e.target.value)}
          />
          <p className="text-xs text-gray-400 mt-1">
            Dividend is credited on 31 Dec each year
          </p>
        </div>
      </div>

      {/* Quick amount buttons */}
      <div>
        <p className="label mb-2">Quick Deposit Amount</p>
        <div className="flex flex-wrap gap-2">
          {[0, 1000, 5000, 10000, 20000, 50000].map((amt) => (
            <button
              key={amt}
              onClick={() => setAmount(String(amt))}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                amount === String(amt)
                  ? "bg-[#006747] text-white border-[#006747]"
                  : "bg-white text-gray-600 border-gray-200 hover:border-[#006747]/50"
              }`}
            >
              {amt === 0 ? "No deposit" : `RM ${amt.toLocaleString()}`}
            </button>
          ))}
        </div>
      </div>

      {/* ── Withdrawals ───────────────────────────────── */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <button
          onClick={() => setShowWithdrawals(!showWithdrawals)}
          className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-all text-sm font-semibold text-gray-600"
        >
          <span className="flex items-center gap-2">
            <span className="text-red-500">−</span>
            Withdrawals
            {totalWithdrawn > 0 && (
              <span className="text-xs bg-red-100 text-red-600 font-semibold px-2 py-0.5 rounded-full">
                {withdrawals.filter((w) => parseFloat(w.amount) > 0).length} ·
                RM{" "}
                {totalWithdrawn.toLocaleString("en-MY", {
                  minimumFractionDigits: 2,
                })}
              </span>
            )}
          </span>
          {showWithdrawals ? (
            <ChevronUp size={16} />
          ) : (
            <ChevronDown size={16} />
          )}
        </button>

        {showWithdrawals && (
          <div className="p-4 space-y-3">
            {withdrawals.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-2">
                No withdrawals added yet.
              </p>
            )}

            {withdrawals.map((w, idx) => (
              <div
                key={w.id}
                className="flex flex-col gap-2 sm:grid sm:grid-cols-[1fr_1fr_auto] sm:items-center bg-red-50 rounded-xl px-3 py-2.5 border border-red-100"
              >
                <div>
                  <label className="label mb-1 sm:hidden">Date</label>
                  {idx === 0 && (
                    <label className="label mb-1 hidden sm:block">Date</label>
                  )}
                  <input
                    type="date"
                    className="input-field text-sm py-2 border-red-200 focus:border-red-400 focus:ring-red-100"
                    value={w.date}
                    onChange={(e) =>
                      updateWithdrawal(w.id, "date", e.target.value)
                    }
                  />
                </div>
                <div className="flex gap-2 items-end sm:contents">
                  <div className="flex-1 min-w-0">
                    <label className="label mb-1 sm:hidden">Amount (RM)</label>
                    {idx === 0 && (
                      <label className="label mb-1 hidden sm:block">
                        Amount (RM)
                      </label>
                    )}
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-red-400 text-xs font-semibold">
                        −RM
                      </span>
                      <input
                        type="number"
                        className="input-field pl-10 text-sm py-2 border-red-200 focus:border-red-400 focus:ring-red-100 text-red-600"
                        min={0}
                        step="100"
                        placeholder="0"
                        value={w.amount}
                        onChange={(e) =>
                          updateWithdrawal(w.id, "amount", e.target.value)
                        }
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => removeWithdrawal(w.id)}
                    className={`p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-white transition-all shrink-0 ${
                      idx === 0 ? "sm:mt-5" : ""
                    }`}
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

      {/* ── Summary preview ───────────────────────────── */}
      {(parseFloat(initialBalance) > 0 || parseFloat(amount) > 0) && (
        <div className="bg-[#E8F5EE] rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          {parseFloat(initialBalance) > 0 && (
            <div>
              <div className="text-xs text-gray-500">Opening Balance</div>
              <div className="font-bold text-amber-600">
                RM{" "}
                {parseFloat(initialBalance).toLocaleString("en-MY", {
                  minimumFractionDigits: 2,
                })}
              </div>
            </div>
          )}
          {parseFloat(amount) > 0 && (
            <div>
              <div className="text-xs text-gray-500">New Deposit</div>
              <div className="font-bold text-[#006747]">
                RM{" "}
                {parseFloat(amount).toLocaleString("en-MY", {
                  minimumFractionDigits: 2,
                })}
              </div>
            </div>
          )}
          {totalWithdrawn > 0 && (
            <div>
              <div className="text-xs text-gray-500">Total Withdrawn</div>
              <div className="font-bold text-red-600">
                −RM{" "}
                {totalWithdrawn.toLocaleString("en-MY", {
                  minimumFractionDigits: 2,
                })}
              </div>
            </div>
          )}
          <div>
            <div className="text-xs text-gray-500">Net Capital</div>
            <div className="font-bold text-[#006747]">
              RM{" "}
              {(
                (parseFloat(initialBalance) || 0) +
                (parseFloat(amount) || 0) -
                totalWithdrawn
              ).toLocaleString("en-MY", { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      )}

      <button onClick={handleSubmit} className="btn-primary w-full sm:w-auto">
        Calculate Dividend →
      </button>
    </div>
  );
}
