"use client";

import { useState } from "react";
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
    date: string,
    withdrawals: Transaction[],
    endDate: string,
    initialBalance: number,
  ) => void;
}

const QUICK_AMOUNTS = [0, 1000, 5000, 10000, 20000, 50000];

export default function LumpsumForm({ fund, onCalculate }: Props) {
  const today = todayISO();
  const yearEnd = `${new Date().getFullYear()}-12-31`;

  const [initialBalance, setInitialBalance] = useState("");
  const [amount, setAmount] = useState("10000");
  const [date, setDate] = useState(today);
  const [endDate, setEndDate] = useState(yearEnd);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRow[]>([]);

  const initBal = parseFloat(initialBalance) || 0;
  const deposit = parseFloat(amount) || 0;
  const totalWithdrawn = sumWithdrawals(withdrawals);

  const handleSubmit = () => {
    // At least one of initial balance or deposit amount must exist
    if (deposit <= 0 && initBal <= 0) return;
    onCalculate(deposit, date, withdrawalsToTransactions(withdrawals), endDate, initBal);
  };

  return (
    <div className="space-y-6">
      <OpeningBalance value={initialBalance} onChange={setInitialBalance} />

      <div>
        <Field label="New deposit">
          {(id) => (
            <MoneyInput
              id={id}
              value={amount}
              onChange={setAmount}
              max={fund.maxInvestment ?? undefined}
              placeholder="0"
            />
          )}
        </Field>
        <div className="chip-grid mt-3 grid-cols-2 min-[360px]:grid-cols-3 sm:grid-cols-6">
          {QUICK_AMOUNTS.map((amt) => (
            <button
              key={amt}
              type="button"
              aria-pressed={amount === String(amt)}
              onClick={() => setAmount(String(amt))}
              className={`chip tabular whitespace-nowrap ${amount === String(amt) ? "chip-active" : ""}`}
            >
              {amt === 0 ? "No deposit" : `RM ${amt.toLocaleString()}`}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 sm:gap-4">
        <Field label="Deposit date" hint="A deposit starts earning from the following month.">
          {(id) => (
            <DateInput id={id} value={date} onChange={setDate} />
          )}
        </Field>
        <Field label="Calculate until" hint="Only complete months count towards the dividend.">
          {(id) => (
            <DateInput id={id} value={endDate} min={date} onChange={setEndDate} />
          )}
        </Field>
      </div>

      <Withdrawals rows={withdrawals} onChange={setWithdrawals} startFrom={date} />

      {(initBal > 0 || deposit > 0) && (
        <Summary
          rows={[
            ...(initBal > 0 ? [{ label: "Opening balance", value: `RM ${money(initBal)}` }] : []),
            ...(deposit > 0 ? [{ label: "New deposit", value: `RM ${money(deposit)}` }] : []),
            ...(totalWithdrawn > 0
              ? [{ label: "Withdrawn", value: `−RM ${money(totalWithdrawn)}`, tone: "loss" as const }]
              : []),
            { label: "Net capital", value: `RM ${money(initBal + deposit - totalWithdrawn)}`, strong: true },
          ]}
        />
      )}

      <SubmitBar onClick={handleSubmit}>Calculate dividend</SubmitBar>
    </div>
  );
}
