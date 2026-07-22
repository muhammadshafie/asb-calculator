"use client";

import { useState } from "react";
import { Transaction, TransactionType, ASNBFund } from "@/lib/calculator";
import { Plus, Trash2, Copy, ArrowDownCircle, ArrowUpCircle, Info } from "lucide-react";

interface Props {
  fund: ASNBFund;
  onCalculate: (transactions: Transaction[], endDate: string, initialBalance: number) => void;
}

const today = new Date().toISOString().split("T")[0];
const in3months = (() => {
  const d = new Date();
  d.setMonth(d.getMonth() + 3);
  return d.toISOString().split("T")[0];
})();

const DEFAULT_ROWS: Transaction[] = [
  { date: today, amount: 5000, type: "deposit" },
  { date: in3months, amount: 3000, type: "deposit" },
];

export default function PeriodicForm({ fund, onCalculate }: Props) {
  const [initialBalance, setInitialBalance] = useState("");
  const [transactions, setTransactions] = useState<Transaction[]>(DEFAULT_ROWS);
  const [endDate, setEndDate] = useState(`${new Date().getFullYear()}-12-31`);

  const addRow = () => {
    const last = transactions[transactions.length - 1];
    const next = new Date((last?.date ?? today) + "T00:00:00");
    next.setMonth(next.getMonth() + 1);
    setTransactions([
      ...transactions,
      { date: next.toISOString().split("T")[0], amount: 0, type: "deposit" },
    ]);
  };

  const removeRow = (idx: number) =>
    setTransactions(transactions.filter((_, i) => i !== idx));

  const duplicateRow = (idx: number) => {
    const row = transactions[idx];
    const d = new Date(row.date + "T00:00:00");
    d.setMonth(d.getMonth() + 1);
    const updated = [...transactions];
    updated.splice(idx + 1, 0, { ...row, date: d.toISOString().split("T")[0] });
    setTransactions(updated);
  };

  const updateField = <K extends keyof Transaction>(idx: number, field: K, value: Transaction[K]) => {
    const updated = [...transactions];
    updated[idx] = { ...updated[idx], [field]: value };
    setTransactions(updated);
  };

  const totalDeposited = transactions.filter((t) => t.type === "deposit").reduce((s, t) => s + (t.amount || 0), 0);
  const totalWithdrawn = transactions.filter((t) => t.type === "withdrawal").reduce((s, t) => s + (t.amount || 0), 0);
  const initBal = parseFloat(initialBalance) || 0;

  const handleSubmit = () => {
    const valid = transactions.filter((t) => t.amount > 0 && t.date);
    if (valid.length === 0 && initBal <= 0) return;
    onCalculate(valid, endDate, initBal);
  };

  const applyPreset = (preset: "quarterly" | "yearly" | "bonus" | "mixed") => {
    const year = new Date().getFullYear();
    if (preset === "quarterly") {
      setTransactions([
        { date: `${year}-01-01`, amount: 2000, type: "deposit" },
        { date: `${year}-04-01`, amount: 2000, type: "deposit" },
        { date: `${year}-07-01`, amount: 2000, type: "deposit" },
        { date: `${year}-10-01`, amount: 2000, type: "deposit" },
      ]);
    } else if (preset === "yearly") {
      setTransactions([
        { date: `${year}-01-01`, amount: 10000, type: "deposit" },
        { date: `${year + 1}-01-01`, amount: 10000, type: "deposit" },
        { date: `${year + 2}-01-01`, amount: 10000, type: "deposit" },
      ]);
      setEndDate(`${year + 2}-12-31`);
    } else if (preset === "bonus") {
      setTransactions([
        { date: `${year}-01-01`, amount: 500, type: "deposit" },
        { date: `${year}-03-15`, amount: 5000, type: "deposit" },
        { date: `${year}-07-01`, amount: 500, type: "deposit" },
        { date: `${year}-12-01`, amount: 3000, type: "deposit" },
      ]);
    } else if (preset === "mixed") {
      setTransactions([
        { date: `${year}-01-01`, amount: 10000, type: "deposit" },
        { date: `${year}-04-01`, amount: 2000, type: "deposit" },
        { date: `${year}-07-01`, amount: 1500, type: "withdrawal" },
        { date: `${year}-10-01`, amount: 2000, type: "deposit" },
        { date: `${year}-12-15`, amount: 3000, type: "withdrawal" },
      ]);
    }
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

      {/* ── Presets ───────────────────────────────────── */}
      <div>
        <p className="label mb-2">Quick Presets</p>
        <div className="flex flex-wrap gap-2">
          {[
            { id: "quarterly" as const, label: "Quarterly (4×)", icon: "🗓️" },
            { id: "yearly" as const, label: "Annual 3yr", icon: "📆" },
            { id: "bonus" as const, label: "Salary + Bonus", icon: "💼" },
            { id: "mixed" as const, label: "Deposit + Withdraw", icon: "🔄" },
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => applyPreset(p.id)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-gray-200 hover:border-[#006747]/50 hover:bg-[#E8F5EE] text-gray-600 transition-all"
            >
              {p.icon} {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Transaction rows ──────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="label">Transactions</p>
          <span className="text-xs text-gray-400">{transactions.length} entries</span>
        </div>

        <div className="space-y-2">
          {/* Column headers */}
          <div className="grid grid-cols-[32px_1fr_1fr_1fr_56px] gap-2 px-1">
            <span />
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Type</span>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Date</span>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Amount (RM)</span>
            <span />
          </div>

          {transactions.map((tx, idx) => {
            const isW = tx.type === "withdrawal";
            return (
              <div
                key={idx}
                className={`grid grid-cols-[32px_1fr_1fr_1fr_56px] gap-2 items-center rounded-xl px-3 py-2.5 border transition-all ${
                  isW
                    ? "bg-red-50 border-red-100 hover:border-red-200"
                    : "bg-gray-50 border-gray-100 hover:border-[#006747]/20"
                }`}
              >
                <span className="text-xs text-gray-400 font-medium text-center">{idx + 1}</span>

                {/* Type toggle */}
                <div className="flex gap-1">
                  <button
                    onClick={() => updateField(idx, "type", "deposit")}
                    title="Deposit"
                    className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      !isW
                        ? "bg-[#006747] text-white"
                        : "bg-white border border-gray-200 text-gray-400 hover:text-[#006747]"
                    }`}
                  >
                    <ArrowDownCircle size={12} />
                    <span className="hidden sm:inline">Deposit</span>
                  </button>
                  <button
                    onClick={() => updateField(idx, "type", "withdrawal")}
                    title="Withdrawal"
                    className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      isW
                        ? "bg-red-500 text-white"
                        : "bg-white border border-gray-200 text-gray-400 hover:text-red-500"
                    }`}
                  >
                    <ArrowUpCircle size={12} />
                    <span className="hidden sm:inline">Withdraw</span>
                  </button>
                </div>

                {/* Date */}
                <input
                  type="date"
                  className={`input-field text-sm py-2 ${isW ? "border-red-200 focus:border-red-400 focus:ring-red-100" : ""}`}
                  value={tx.date}
                  onChange={(e) => updateField(idx, "date", e.target.value)}
                />

                {/* Amount */}
                <div className="relative">
                  <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold ${isW ? "text-red-400" : "text-gray-400"}`}>
                    {isW ? "−RM" : "+RM"}
                  </span>
                  <input
                    type="number"
                    className={`input-field pl-10 text-sm py-2 ${isW ? "border-red-200 focus:border-red-400 focus:ring-red-100 text-red-600" : "text-[#006747]"}`}
                    min={0}
                    step="100"
                    value={tx.amount || ""}
                    onChange={(e) => updateField(idx, "amount", parseFloat(e.target.value) || 0)}
                    placeholder="0"
                  />
                </div>

                {/* Row actions */}
                <div className="flex gap-1">
                  <button onClick={() => duplicateRow(idx)} title="Duplicate" className="p-1.5 rounded-lg text-gray-400 hover:text-[#006747] hover:bg-white transition-all">
                    <Copy size={13} />
                  </button>
                  <button onClick={() => removeRow(idx)} title="Remove" className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-white transition-all" disabled={transactions.length <= 1}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={addRow}
          className="mt-3 flex items-center gap-2 text-sm text-[#006747] font-semibold hover:bg-[#E8F5EE] px-3 py-2 rounded-lg transition-all border border-dashed border-[#006747]/30 w-full justify-center"
        >
          <Plus size={16} /> Add Transaction
        </button>
      </div>

      {/* ── End Date + Summary ────────────────────────── */}
      <div className="grid sm:grid-cols-2 gap-4 items-start">
        <div>
          <label className="label">Calculate Until</label>
          <input
            type="date"
            className="input-field"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          {initBal > 0 && (
            <div className="bg-amber-50 rounded-xl px-4 py-3 flex justify-between items-center border border-amber-100">
              <span className="text-sm text-gray-500">Opening Balance</span>
              <span className="font-bold text-amber-600">RM {initBal.toLocaleString("en-MY", { minimumFractionDigits: 2 })}</span>
            </div>
          )}
          {totalDeposited > 0 && (
            <div className="bg-[#E8F5EE] rounded-xl px-4 py-3 flex justify-between items-center">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <ArrowDownCircle size={14} className="text-[#006747]" /> Deposits
              </div>
              <span className="font-bold text-[#006747]">RM {totalDeposited.toLocaleString("en-MY", { minimumFractionDigits: 2 })}</span>
            </div>
          )}
          {totalWithdrawn > 0 && (
            <div className="bg-red-50 rounded-xl px-4 py-3 flex justify-between items-center border border-red-100">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <ArrowUpCircle size={14} className="text-red-500" /> Withdrawn
              </div>
              <span className="font-bold text-red-600">RM {totalWithdrawn.toLocaleString("en-MY", { minimumFractionDigits: 2 })}</span>
            </div>
          )}
          {(initBal > 0 || totalDeposited > 0 || totalWithdrawn > 0) && (
            <div className="bg-white rounded-xl px-4 py-3 flex justify-between items-center border border-gray-100">
              <span className="text-sm text-gray-500 font-medium">Total Capital</span>
              <span className="font-bold text-[#006747]">
                RM {(initBal + totalDeposited - totalWithdrawn).toLocaleString("en-MY", { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}
        </div>
      </div>

      <button onClick={handleSubmit} className="btn-primary w-full sm:w-auto">
        Calculate →
      </button>
    </div>
  );
}
