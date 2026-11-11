"use client";

import { useMemo, useState } from "react";
import { ASNBFund, Transaction, todayISO } from "@/lib/calculator";
import {
  DateInput,
  Field,
  MoneyInput,
  OpeningBalance,
  SubmitBar,
  Summary,
  WithdrawalRow,
  Withdrawals,
  money,
  sumWithdrawals,
  withdrawalsToTransactions,
} from "@/components/ui";

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

const MONTH_PRESETS = [6, 12, 24, 36, 60];

export default function MonthlyForm({ onCalculate }: Props) {
  const today = todayISO();

  const [initialBalance, setInitialBalance] = useState("");
  const [amount, setAmount] = useState("500");
  const [startDate, setStartDate] = useState(today);
  const [months, setMonths] = useState("12");
  const [dayOfMonth, setDayOfMonth] = useState("1");
  const [withdrawals, setWithdrawals] = useState<WithdrawalRow[]>([]);
  const [showSchedule, setShowSchedule] = useState(false);

  const perMonth = parseFloat(amount || "0") || 0;
  const monthCount = parseInt(months || "0") || 0;
  const totalDeposit = perMonth * monthCount;
  const totalWithdrawn = sumWithdrawals(withdrawals);
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

  const handleSubmit = () => {
    const day = parseInt(dayOfMonth);
    if (perMonth <= 0 && initBal <= 0) return;
    if (monthCount <= 0) return;
    onCalculate(perMonth, startDate, monthCount, day, withdrawalsToTransactions(withdrawals), initBal);
  };

  return (
    <div className="space-y-6">
      <OpeningBalance value={initialBalance} onChange={setInitialBalance} />

      <div className="grid gap-6 sm:grid-cols-2 sm:gap-4">
        <Field label="Monthly deposit" hint="Enter 0 to track an existing balance only.">
          {(id) => <MoneyInput id={id} value={amount} onChange={setAmount} step="50" placeholder="500" />}
        </Field>

        <Field label="Start date">
          {(id) => (
            <DateInput id={id} value={startDate} onChange={setStartDate} />
          )}
        </Field>

        <div>
          <Field label="Number of months">
            {(id) => (
              <input
                id={id}
                type="number"
                inputMode="numeric"
                className="input-field tabular"
                min={1}
                max={120}
                value={months}
                onChange={(e) => setMonths(e.target.value)}
                placeholder="12"
              />
            )}
          </Field>
          <div className="chip-grid mt-3 grid-cols-5">
            {MONTH_PRESETS.map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={months === String(m)}
                aria-label={`${m} months`}
                onClick={() => setMonths(String(m))}
                className={`chip tabular ${months === String(m) ? "chip-active" : ""}`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <Field label="Day of month" hint="Pick 1 to 28. Each deposit starts earning from the following month, whichever day you choose.">
          {(id) => (
            <input
              id={id}
              type="number"
              inputMode="numeric"
              className="input-field tabular"
              min={1}
              max={28}
              value={dayOfMonth}
              onChange={(e) => setDayOfMonth(e.target.value)}
              placeholder="1"
            />
          )}
        </Field>
      </div>

      <Withdrawals rows={withdrawals} onChange={setWithdrawals} startFrom={startDate} />

      {(initBal > 0 || totalDeposit > 0) && (
        <div>
          <Summary
            rows={[
              ...(initBal > 0 ? [{ label: "Opening balance", value: `RM ${money(initBal)}` }] : []),
              ...(totalDeposit > 0
                ? [
                    {
                      label: `${monthCount} deposits of RM ${money(perMonth)}`,
                      value: `RM ${money(totalDeposit)}`,
                    },
                  ]
                : []),
              ...(totalWithdrawn > 0
                ? [{ label: "Withdrawn", value: `−RM ${money(totalWithdrawn)}`, tone: "loss" as const }]
                : []),
              {
                label: "Net capital",
                value: `RM ${money(initBal + totalDeposit - totalWithdrawn)}`,
                strong: true,
              },
            ]}
          />

          {schedule.length > 0 && perMonth > 0 && (
            <div className="mt-2">
              <button
                type="button"
                aria-expanded={showSchedule}
                onClick={() => setShowSchedule(!showSchedule)}
                className="min-h-[44px] text-[15px] text-action-link hover:underline"
              >
                {showSchedule ? "Hide deposit schedule" : "Show deposit schedule"}
              </button>
              {showSchedule && (
                <ol className="max-h-56 divide-y divide-black/[0.06] overflow-y-auto rounded-2xl bg-fog px-4">
                  {schedule.map((label, i) => (
                    <li key={i} className="flex items-baseline justify-between gap-4 py-2.5 text-[15px]">
                      <span className="text-ink">
                        <span className="tabular mr-3 inline-block w-5 text-sub">{i + 1}</span>
                        {label}
                      </span>
                      <span className="tabular font-medium text-gain">+RM {money(perMonth)}</span>
                    </li>
                  ))}
                  {monthCount > 24 && (
                    <li className="py-2.5 text-center text-[13px] text-sub">
                      and {monthCount - 24} more months
                    </li>
                  )}
                </ol>
              )}
            </div>
          )}
        </div>
      )}

      <SubmitBar onClick={handleSubmit}>Calculate dividend</SubmitBar>
    </div>
  );
}
