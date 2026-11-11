"use client";

import { useState } from "react";
import { Transaction, TransactionType, ASNBFund, addMonthsISO, todayISO } from "@/lib/calculator";
import { Plus, Trash2, Copy } from "lucide-react";
import { DateInput, Field, MoneyInput, OpeningBalance, Segmented, SubmitBar, Summary, money } from "@/components/ui";

interface Props {
  fund: ASNBFund;
  onCalculate: (transactions: Transaction[], endDate: string, initialBalance: number) => void;
}

const today = todayISO();
const in3months = addMonthsISO(today, 3);

const DEFAULT_ROWS: Transaction[] = [
  { date: today, amount: 5000, type: "deposit" },
  { date: in3months, amount: 3000, type: "deposit" },
];

type Preset = "quarterly" | "yearly" | "bonus" | "mixed";

const PRESETS: { id: Preset; label: string }[] = [
  { id: "quarterly", label: "Quarterly" },
  { id: "yearly", label: "Yearly for 3 years" },
  { id: "bonus", label: "Salary and bonus" },
  { id: "mixed", label: "With withdrawals" },
];

const TYPE_OPTIONS: { id: TransactionType; label: string }[] = [
  { id: "deposit", label: "Deposit" },
  { id: "withdrawal", label: "Withdraw" },
];

export default function PeriodicForm({ onCalculate }: Props) {
  const [initialBalance, setInitialBalance] = useState("");
  const [transactions, setTransactions] = useState<Transaction[]>(DEFAULT_ROWS);
  const [endDate, setEndDate] = useState(`${new Date().getFullYear()}-12-31`);

  const addRow = () => {
    const last = transactions[transactions.length - 1];
    setTransactions([
      ...transactions,
      { date: addMonthsISO(last?.date ?? today, 1), amount: 0, type: "deposit" },
    ]);
  };

  const removeRow = (idx: number) =>
    setTransactions(transactions.filter((_, i) => i !== idx));

  const duplicateRow = (idx: number) => {
    const row = transactions[idx];
    const updated = [...transactions];
    updated.splice(idx + 1, 0, { ...row, date: addMonthsISO(row.date, 1) });
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

  const applyPreset = (preset: Preset) => {
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
      <OpeningBalance value={initialBalance} onChange={setInitialBalance} />

      <div>
        <p className="label">Start from an example</p>
        <div className="chip-grid grid-cols-2 sm:grid-cols-4">
          {PRESETS.map((p) => (
            <button key={p.id} type="button" onClick={() => applyPreset(p.id)} className="chip">
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-baseline justify-between">
          <p className="text-sm font-medium text-ink">Transactions</p>
          <span className="tabular text-[13px] text-sub">
            {transactions.length} {transactions.length === 1 ? "entry" : "entries"}
          </span>
        </div>

        <ol className="space-y-2">
          {transactions.map((tx, idx) => {
            const isW = tx.type === "withdrawal";
            return (
              <li
                key={idx}
                className="grid gap-2 rounded-2xl bg-fog p-3 sm:grid-cols-[190px_1fr_1fr_auto] sm:items-center sm:p-2"
              >
                <div className="flex items-center gap-1 sm:contents">
                  <div className="flex-1 sm:flex-none">
                    <Segmented
                      compact
                      label={`Transaction ${idx + 1} type`}
                      options={TYPE_OPTIONS}
                      value={tx.type}
                      onChange={(t) => updateField(idx, "type", t)}
                    />
                  </div>
                  <div className="flex sm:order-last">
                    <button
                      type="button"
                      onClick={() => duplicateRow(idx)}
                      aria-label={`Duplicate transaction ${idx + 1} one month later`}
                      className="icon-btn"
                    >
                      <Copy size={17} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeRow(idx)}
                      aria-label={`Remove transaction ${idx + 1}`}
                      className="icon-btn hover:text-loss"
                      disabled={transactions.length <= 1}
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </div>

                <DateInput ariaLabel={`Transaction ${idx + 1} date`} value={tx.date} onChange={(v) => updateField(idx, "date", v)} />

                <MoneyInput
                  ariaLabel={`Transaction ${idx + 1} amount`}
                  prefix={isW ? "−RM" : "+RM"}
                  negative={isW}
                  value={tx.amount || ""}
                  onChange={(v) => updateField(idx, "amount", parseFloat(v) || 0)}
                  placeholder="0"
                />
              </li>
            );
          })}
        </ol>

        <button
          type="button"
          onClick={addRow}
          className="mt-2 inline-flex min-h-[44px] items-center gap-1.5 text-[17px] text-action-link hover:underline"
        >
          <Plus size={18} /> Add a transaction
        </button>
      </div>

      <div className="sm:max-w-[calc(50%-0.5rem)]">
        <Field label="Calculate until" hint="Only complete months count towards the dividend.">
          {(id) => (
            <DateInput id={id} value={endDate} onChange={setEndDate} />
          )}
        </Field>
      </div>

      {(initBal > 0 || totalDeposited > 0 || totalWithdrawn > 0) && (
        <Summary
          rows={[
            ...(initBal > 0 ? [{ label: "Opening balance", value: `RM ${money(initBal)}` }] : []),
            ...(totalDeposited > 0 ? [{ label: "Deposits", value: `RM ${money(totalDeposited)}` }] : []),
            ...(totalWithdrawn > 0
              ? [{ label: "Withdrawn", value: `−RM ${money(totalWithdrawn)}`, tone: "loss" as const }]
              : []),
            {
              label: "Net capital",
              value: `RM ${money(initBal + totalDeposited - totalWithdrawn)}`,
              strong: true,
            },
          ]}
        />
      )}

      <SubmitBar onClick={handleSubmit}>Calculate dividend</SubmitBar>
    </div>
  );
}
