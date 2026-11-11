"use client";

import { ReactNode, useId, useState } from "react";
import { Calendar, ChevronDown, Plus, Trash2 } from "lucide-react";
import { Transaction, addMonthsISO } from "@/lib/calculator";

/** "1,234.50" — pair with an "RM" prefix where needed. */
export const money = (n: number) =>
  n.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ── Segmented control ──────────────────────────────────

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  compact = false,
}: {
  options: { id: T; label: ReactNode }[];
  value: T;
  onChange: (id: T) => void;
  label: string;
  compact?: boolean;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="grid grid-flow-col auto-cols-fr gap-0.5 rounded-full bg-[#e8e8ed] p-[3px]"
    >
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.id)}
            className={`inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-1 font-medium transition-colors min-[360px]:px-3 ${
              compact ? "min-h-[38px] text-[13px] min-[360px]:text-sm" : "min-h-[42px] text-sm min-[360px]:text-[15px]"
            } ${active ? "bg-white text-ink shadow-[0_1px_3px_rgba(0,0,0,0.12)]" : "text-sub hover:text-ink"}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Form fields ────────────────────────────────────────

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: (id: string) => ReactNode;
}) {
  const id = useId();
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="label">
        {label}
      </label>
      {children(id)}
      {hint && <p className="hint">{hint}</p>}
    </div>
  );
}

export function DateInput({
  id,
  value,
  onChange,
  min,
  ariaLabel,
  className = "",
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  min?: string;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <div className={`date-field ${className}`}>
      <input
        id={id}
        type="date"
        aria-label={ariaLabel}
        value={value}
        min={min}
        onChange={(e) => onChange(e.target.value)}
      />
      <Calendar aria-hidden className="date-field-icon" />
    </div>
  );
}

export function MoneyInput({
  id,
  value,
  onChange,
  placeholder,
  step = "100",
  max,
  prefix = "RM",
  negative = false,
  ariaLabel,
}: {
  id?: string;
  value: string | number;
  onChange: (v: string) => void;
  placeholder?: string;
  step?: string;
  max?: number;
  prefix?: string;
  negative?: boolean;
  ariaLabel?: string;
}) {
  return (
    <div className="relative">
      <span
        aria-hidden
        className={`pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[17px] ${
          negative ? "text-loss" : "text-sub"
        }`}
      >
        {prefix}
      </span>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        aria-label={ariaLabel}
        className={`input-field tabular ${prefix.length > 2 ? "pl-[60px]" : "pl-[52px]"} ${
          negative ? "text-loss" : ""
        }`}
        min={0}
        max={max}
        step={step}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export function OpeningBalance({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Field
      label="Opening balance (optional)"
      hint="Already saving with ASNB? Enter your balance at the start of the fund's financial year, including past dividends. It counts for every month of that year."
    >
      {(id) => <MoneyInput id={id} value={value} onChange={onChange} placeholder="25000" />}
    </Field>
  );
}

// ── Withdrawals ────────────────────────────────────────

export interface WithdrawalRow {
  id: number;
  date: string;
  amount: string;
}

let _wid = 1;

export const withdrawalsToTransactions = (rows: WithdrawalRow[]): Transaction[] =>
  rows
    .filter((w) => w.amount && parseFloat(w.amount) > 0 && w.date)
    .map((w) => ({ date: w.date, amount: parseFloat(w.amount), type: "withdrawal" as const }));

export const sumWithdrawals = (rows: WithdrawalRow[]) =>
  rows.reduce((s, w) => s + (parseFloat(w.amount) || 0), 0);

export function Withdrawals({
  rows,
  onChange,
  startFrom,
}: {
  rows: WithdrawalRow[];
  onChange: (rows: WithdrawalRow[]) => void;
  /** First withdrawal defaults to one month after this date. */
  startFrom: string;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const total = sumWithdrawals(rows);
  const count = rows.filter((w) => parseFloat(w.amount) > 0).length;

  const add = () => {
    setOpen(true);
    const last = rows[rows.length - 1]?.date ?? startFrom;
    onChange([...rows, { id: _wid++, date: addMonthsISO(last, 1), amount: "" }]);
  };

  const update = (id: number, field: "date" | "amount", val: string) =>
    onChange(rows.map((w) => (w.id === id ? { ...w, [field]: val } : w)));

  return (
    <div className="rounded-2xl bg-fog">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
        className="flex w-full min-h-[56px] items-center justify-between gap-3 rounded-2xl px-4 text-left"
      >
        <span className="text-[17px] font-medium text-ink">Withdrawals</span>
        <span className="flex items-center gap-2 text-sm text-sub">
          {total > 0 ? (
            <span className="tabular text-loss">
              {count} totalling RM {money(total)}
            </span>
          ) : (
            <span>None</span>
          )}
          <ChevronDown
            size={18}
            className={`shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </span>
      </button>

      {open && (
        <div id={panelId} className="space-y-3 px-4 pb-4">
          <p className="text-[13px] leading-snug text-sub">
            A withdrawal lowers the minimum balance for its whole month, even if you top up again later that month.
          </p>

          {rows.map((w, i) => (
            <div key={w.id} className="grid grid-cols-[1fr_auto] gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <DateInput
                ariaLabel={`Withdrawal ${i + 1} date`}
                className="col-span-2 sm:col-span-1"
                value={w.date}
                onChange={(v) => update(w.id, "date", v)}
              />
              <MoneyInput
                ariaLabel={`Withdrawal ${i + 1} amount`}
                prefix="−RM"
                negative
                placeholder="0"
                value={w.amount}
                onChange={(v) => update(w.id, "amount", v)}
              />
              <button
                type="button"
                aria-label={`Remove withdrawal ${i + 1}`}
                onClick={() => onChange(rows.filter((r) => r.id !== w.id))}
                className="icon-btn mt-0.5 hover:text-loss"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={add}
            className="inline-flex min-h-[44px] items-center gap-1.5 text-[17px] text-action-link hover:underline"
          >
            <Plus size={18} /> Add a withdrawal
          </button>
        </div>
      )}
    </div>
  );
}

// ── Summary + submit ───────────────────────────────────

export function Summary({
  rows,
}: {
  rows: { label: string; value: string; tone?: "gain" | "loss"; strong?: boolean }[];
}) {
  if (rows.length === 0) return null;
  return (
    <dl className="divide-y divide-black/[0.06] rounded-2xl bg-fog px-4">
      {rows.map((r) => (
        <div key={r.label} className="flex items-baseline justify-between gap-4 py-3">
          <dt className={`text-[15px] ${r.strong ? "font-semibold text-ink" : "text-sub"}`}>{r.label}</dt>
          <dd
            className={`tabular whitespace-nowrap text-right text-[15px] ${r.strong ? "font-semibold" : "font-medium"} ${
              r.tone === "loss" ? "text-loss" : r.tone === "gain" ? "text-gain" : "text-ink"
            }`}
          >
            {r.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * On phones the button stays pinned to the bottom of the screen while the
 * form scrolls, so it is always one thumb-tap away. From `sm` up it sits
 * in the normal flow.
 */
export function SubmitBar({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <div
      className="sticky bottom-0 z-[5] -mx-5 -mb-5 rounded-b-tile border-t border-black/[0.08] bg-white/85 px-5 pt-3
        pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-xl backdrop-saturate-150
        sm:static sm:m-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none"
    >
      <button type="button" onClick={onClick} className="btn-primary w-full sm:w-auto sm:min-w-[220px]">
        {children}
      </button>
    </div>
  );
}
