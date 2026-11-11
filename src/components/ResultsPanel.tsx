"use client";

import { useState } from "react";
import {
  AreaChart, Area,
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { CalculationResult, formatRM, formatUnits } from "@/lib/calculator";
import { Segmented } from "@/components/ui";

interface Props { result: CalculationResult; }
type Tab = "overview" | "monthly" | "chart";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "monthly", label: "Monthly" },
  { id: "chart", label: "Charts" },
];

// Chart colours
const C_BALANCE = "#0071e3";
const C_DIVIDEND = "#30a14e";
const C_WITHDRAWN = "#e5484d";

const compactRM = (v: number) =>
  Math.abs(v) >= 1_000_000
    ? `${(v / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`
    : Math.abs(v) >= 1000
      ? `${(v / 1000).toFixed(1).replace(/\.0$/, "")}k`
      : `${Math.round(v)}`;

const tooltipStyle = {
  borderRadius: "14px",
  border: "none",
  boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
  fontSize: "13px",
  padding: "10px 14px",
};

export default function ResultsPanel({ result }: Props) {
  const [tab, setTab] = useState<Tab>("overview");

  const {
    initialBalance, totalDeposited, totalWithdrawn,
    totalUnits, totalDividend, effectiveRate,
    months, dividendRate, fundName, transactions, pendingDividend, fyEndMonth,
  } = result;
  const fyEndName = ["January","February","March","April","May","June","July","August","September","October","November","December"][fyEndMonth];
  const hasUncounted = months.some((m) => !m.counted);

  const hasWithdrawals = totalWithdrawn > 0;
  const hasInitial = initialBalance > 0;
  const hasDeposits = totalDeposited > 0;
  const finalBalance = totalUnits; // NAV = 1.00, so balance = units

  const depositCount = transactions.filter((t) => t.type === "deposit").length;
  const withdrawalCount = transactions.filter((t) => t.type === "withdrawal").length;

  // Cumulative chart
  let cumWith = 0, cumDiv = 0;
  const cumulativeData = months.map((m) => {
    cumWith += m.withdrawn;
    cumDiv += m.dividendEarned;
    return {
      name: m.month,
      "Portfolio value": parseFloat(m.endingBalance.toFixed(2)),
      "Dividend earned": parseFloat(cumDiv.toFixed(2)),
      ...(hasWithdrawals ? { "Withdrawn": parseFloat(cumWith.toFixed(2)) } : {}),
    };
  });

  const barData = months.map((m) => ({
    name: m.month,
    Deposited: parseFloat(m.deposited.toFixed(2)),
    ...(hasWithdrawals ? { Withdrawn: parseFloat(m.withdrawn.toFixed(2)) } : {}),
    Dividend: parseFloat(m.dividendEarned.toFixed(2)),
  }));

  const netCapital = initialBalance + totalDeposited - totalWithdrawn;
  const compTotal = netCapital + totalDividend;
  const divPct = compTotal > 0 ? (totalDividend / compTotal) * 100 : 0;
  const capPct = 100 - divPct;

  return (
    <section aria-label="Results" className="space-y-3">
      {/* ── The answer ──────────────────────────────── */}
      <div className="card text-center sm:py-12">
        <h2 className="text-[17px] text-sub">Estimated final balance</h2>
        <p className="tabular mt-1 text-[40px] font-semibold leading-[1.1] tracking-[-0.02em] text-ink min-[400px]:text-[46px] sm:text-[64px]">
          {formatRM(finalBalance)}
        </p>
        <p className="mx-auto mt-3 max-w-md text-[17px] leading-snug text-sub">
          Includes{" "}
          <span className="tabular font-semibold text-gain">{formatRM(totalDividend)}</span> in dividends
          at {dividendRate.toFixed(2)}% a year.
        </p>
        {pendingDividend > 0.005 && (
          <p className="mx-auto mt-2 max-w-md text-[13px] leading-snug text-sub">
            <span className="tabular">{formatRM(pendingDividend)}</span> of that is earned but not yet credited.
            ASNB credits it after the fund&rsquo;s year ends in {fyEndName}.
          </p>
        )}
      </div>

      {/* ── Supporting figures ──────────────────────── */}
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {hasInitial && (
          <Stat label="Opening balance" value={formatRM(initialBalance)} note="Carried from before" />
        )}
        {hasDeposits && (
          <Stat
            label="New deposits"
            value={formatRM(totalDeposited)}
            note={`${depositCount} transaction${depositCount !== 1 ? "s" : ""}`}
          />
        )}
        {hasWithdrawals && (
          <Stat
            label="Withdrawn"
            value={`−${formatRM(totalWithdrawn)}`}
            tone="loss"
            note={`${withdrawalCount} transaction${withdrawalCount !== 1 ? "s" : ""}`}
          />
        )}
        <Stat label="Dividend earned" value={formatRM(totalDividend)} tone="gain" note={`${dividendRate.toFixed(2)}% a year`} />
        <Stat label="Effective yield" value={`${effectiveRate.toFixed(2)}%`} note="On total capital" />
        <Stat label="Units held" value={formatUnits(totalUnits)} note="At RM 1.00 each" />
      </dl>

      {/* ── Detail ──────────────────────────────────── */}
      <div className="card">
        <div className="mx-auto mb-6 sm:max-w-sm">
          <Segmented label="Result view" options={TABS} value={tab} onChange={setTab} />
        </div>

        {/* ── Overview ── */}
        {tab === "overview" && (
          <div className="space-y-8">
            <dl className="grid gap-x-10 sm:grid-cols-2">
              <div>
                <InfoRow label="Fund" value={fundName} />
                <InfoRow label="Dividend rate" value={`${dividendRate.toFixed(2)}% a year`} />
                <InfoRow label="Period" value={`${formatDate(result.startDate)} to ${formatDate(result.endDate)}`} />
              </div>
              <div>
                {hasInitial && <InfoRow label="Opening balance" value={formatRM(initialBalance)} />}
                {hasDeposits && <InfoRow label="Total deposited" value={formatRM(totalDeposited)} />}
                {hasWithdrawals && <InfoRow label="Total withdrawn" value={`−${formatRM(totalWithdrawn)}`} tone="loss" />}
                <InfoRow label="Dividend earned" value={formatRM(totalDividend)} tone="gain" />
                <InfoRow label="Final balance" value={formatRM(finalBalance)} strong />
              </div>
            </dl>

            {/* Balance composition */}
            <div>
              <h3 className="mb-3 text-[17px] font-semibold text-ink">What the balance is made of</h3>
              <div className="flex h-3 gap-0.5 overflow-hidden rounded-full" role="img"
                aria-label={`Net capital ${capPct.toFixed(1)} percent, dividend ${divPct.toFixed(1)} percent`}>
                <div className="rounded-l-full transition-all" style={{ width: `${capPct}%`, background: C_BALANCE }} />
                <div className="min-w-[6px] flex-1 rounded-r-full transition-all" style={{ background: C_DIVIDEND }} />
              </div>
              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-[15px] text-sub">
                <span className="flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: C_BALANCE }} />
                  Net capital <span className="tabular text-ink">{formatRM(netCapital)}</span> ({capPct.toFixed(1)}%)
                </span>
                <span className="flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: C_DIVIDEND }} />
                  Dividend <span className="tabular text-ink">{formatRM(totalDividend)}</span> ({divPct.toFixed(1)}%)
                </span>
              </div>
            </div>

            {/* Transaction history */}
            {transactions.length > 0 && (
              <div>
                <h3 className="mb-3 text-[17px] font-semibold text-ink">Transactions</h3>
                <ol className="max-h-72 divide-y divide-black/[0.06] overflow-y-auto rounded-2xl bg-fog px-4">
                  {transactions.map((tx, i) => {
                    const isW = tx.type === "withdrawal";
                    return (
                      <li key={i} className="flex items-center justify-between gap-4 py-3">
                        <div className="min-w-0">
                          <div className="text-[15px] font-medium text-ink">{isW ? "Withdrawal" : "Deposit"}</div>
                          <div className="tabular text-[13px] text-sub">{formatDate(tx.date)}</div>
                        </div>
                        <span className={`tabular text-[15px] font-semibold ${isW ? "text-loss" : "text-gain"}`}>
                          {isW ? "−" : "+"}{formatRM(tx.amount)}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}
          </div>
        )}

        {/* ── Monthly breakdown ── */}
        {tab === "monthly" && (
          <div>
            {/* Phones: one block per month. Every figure sits on its own line,
                label on the left and amount on the right, so the numbers form
                one aligned column however many lines a month has. */}
            <ol className="space-y-2 sm:hidden">
              {months.map((m, i) => (
                <li key={i} className="rounded-2xl bg-fog px-3 py-3 min-[360px]:px-4">
                  <h4 className="text-[17px] font-semibold text-ink">{m.month}</h4>
                  <dl className="mt-1.5">
                    <MonthLine label="Lowest balance" value={formatRM(m.minBalance)} />
                    {m.deposited > 0 && <MonthLine label="Deposited" value={`+${formatRM(m.deposited)}`} />}
                    {m.withdrawn > 0 && <MonthLine label="Withdrawn" value={`−${formatRM(m.withdrawn)}`} tone="loss" />}
                    {m.counted
                      ? <MonthLine label="Dividend" value={`+${formatRM(m.dividendEarned)}`} tone="gain" />
                      : <MonthLine label="Dividend" value="Not counted" muted />}
                    <MonthLine label="Closing balance" value={formatRM(m.endingBalance)} strong />
                  </dl>
                </li>
              ))}
              <li className="rounded-2xl bg-ink px-3 py-3 text-white min-[360px]:px-4">
                <h4 className="text-[17px] font-semibold">Total</h4>
                <dl className="mt-1.5">
                  <MonthLine label="Deposited" value={formatRM(totalDeposited)} onDark />
                  {hasWithdrawals && <MonthLine label="Withdrawn" value={`−${formatRM(totalWithdrawn)}`} onDark />}
                  <MonthLine label="Dividend" value={formatRM(totalDividend)} onDark />
                  <MonthLine label="Final balance" value={formatRM(finalBalance)} strong onDark />
                </dl>
              </li>
            </ol>

            {/* Tablets and up: full table */}
            <div className="hidden overflow-x-auto sm:block">
              <table className="tabular w-full text-[15px]">
                <thead>
                  <tr className="border-b border-hairline text-[13px] text-sub">
                    <th scope="col" className="pb-3 pr-3 text-left font-medium">Month</th>
                    <th scope="col" className="pb-3 pr-3 text-right font-medium">Deposited</th>
                    {hasWithdrawals && <th scope="col" className="pb-3 pr-3 text-right font-medium">Withdrawn</th>}
                    <th scope="col" className="pb-3 pr-3 text-right font-medium">Lowest balance</th>
                    <th scope="col" className="pb-3 pr-3 text-right font-medium">Dividend</th>
                    <th scope="col" className="pb-3 text-right font-medium">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {months.map((m, i) => (
                    <tr key={i} className="border-b border-black/[0.06]">
                      <td className="py-3 pr-3 font-medium text-ink">{m.month}</td>
                      <td className="py-3 pr-3 text-right text-ink">
                        {m.deposited > 0 ? formatRM(m.deposited) : <span className="text-hairline">–</span>}
                      </td>
                      {hasWithdrawals && (
                        <td className="py-3 pr-3 text-right text-loss">
                          {m.withdrawn > 0 ? `−${formatRM(m.withdrawn)}` : <span className="text-hairline">–</span>}
                        </td>
                      )}
                      <td className="py-3 pr-3 text-right text-sub">{formatRM(m.minBalance)}</td>
                      <td className="py-3 pr-3 text-right text-gain">
                        {m.counted ? formatRM(m.dividendEarned) : <span className="text-hairline">–</span>}
                      </td>
                      <td className="py-3 text-right font-semibold text-ink">{formatRM(m.endingBalance)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-semibold text-ink">
                    <td className="pt-4 pr-3">Total</td>
                    <td className="pt-4 pr-3 text-right">{formatRM(totalDeposited)}</td>
                    {hasWithdrawals && <td className="pt-4 pr-3 text-right text-loss">−{formatRM(totalWithdrawn)}</td>}
                    <td className="pt-4 pr-3" />
                    <td className="pt-4 pr-3 text-right text-gain">{formatRM(totalDividend)}</td>
                    <td className="pt-4 text-right">{formatRM(finalBalance)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <p className="mt-4 rounded-xl bg-fog px-4 py-3 text-[13px] leading-snug text-sub">
              Each month&rsquo;s dividend is its lowest balance &times; {dividendRate.toFixed(2)}% &divide; 12.
              {" "}Balances show the dividend once it is credited after {fyEndName}.
              {hasUncounted && " A month that ends after your calculate-until date is not counted."}
              {hasInitial && ` The opening balance of ${formatRM(initialBalance)} is held from the start of the financial year and is not shown as a deposit.`}
            </p>
          </div>
        )}

        {/* ── Charts ── */}
        {tab === "chart" && (
          <div className="space-y-10">
            <div>
              <h3 className="mb-4 text-[17px] font-semibold text-ink">Portfolio value over time</h3>
              <div className="-ml-2 h-[240px] sm:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={cumulativeData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="valueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={C_BALANCE} stopOpacity={0.18} />
                        <stop offset="95%" stopColor={C_BALANCE} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="divGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={C_DIVIDEND} stopOpacity={0.2} />
                        <stop offset="95%" stopColor={C_DIVIDEND} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="#e8e8ed" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6e6e73" }} tickLine={false} axisLine={{ stroke: "#d2d2d7" }} interval="preserveStartEnd" minTickGap={24} />
                    <YAxis width={44} tick={{ fontSize: 11, fill: "#6e6e73" }} tickLine={false} axisLine={false} tickFormatter={compactRM} />
                    <Tooltip formatter={(value: number) => formatRM(value)} contentStyle={tooltipStyle} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "13px", paddingTop: 8 }} />
                    <Area type="monotone" dataKey="Portfolio value" stroke={C_BALANCE} fill="url(#valueGrad)" strokeWidth={2} />
                    <Area type="monotone" dataKey="Dividend earned" stroke={C_DIVIDEND} fill="url(#divGrad)" strokeWidth={2} />
                    {hasWithdrawals && (
                      <Area type="monotone" dataKey="Withdrawn" stroke={C_WITHDRAWN} fill="none" strokeWidth={1.5} strokeDasharray="4 2" />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div>
              <h3 className="mb-4 text-[17px] font-semibold text-ink">Monthly activity</h3>
              <div className="-ml-2 h-[220px] sm:h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid vertical={false} stroke="#e8e8ed" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6e6e73" }} tickLine={false} axisLine={{ stroke: "#d2d2d7" }} interval="preserveStartEnd" minTickGap={24} />
                    <YAxis width={44} tick={{ fontSize: 11, fill: "#6e6e73" }} tickLine={false} axisLine={false} tickFormatter={compactRM} />
                    <Tooltip formatter={(value: number) => formatRM(value)} contentStyle={tooltipStyle} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "13px", paddingTop: 8 }} />
                    <Bar dataKey="Deposited" fill={C_BALANCE} radius={[4, 4, 0, 0]} />
                    {hasWithdrawals && <Bar dataKey="Withdrawn" fill={C_WITHDRAWN} radius={[4, 4, 0, 0]} />}
                    <Bar dataKey="Dividend" fill={C_DIVIDEND} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-2 text-[13px] text-sub">Amounts in RM.</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function Stat({ label, value, note, tone }: { label: string; value: string; note?: string; tone?: "gain" | "loss" }) {
  return (
    <div className="rounded-[18px] bg-white p-4 sm:p-5">
      <dt className="text-[13px] text-sub">{label}</dt>
      <dd
        className={`tabular mt-1 text-[19px] font-semibold tracking-tight min-[400px]:text-[21px] sm:text-2xl ${
          tone === "gain" ? "text-gain" : tone === "loss" ? "text-loss" : "text-ink"
        }`}
      >
        {value}
      </dd>
      {note && <dd className="mt-0.5 text-[13px] text-sub">{note}</dd>}
    </div>
  );
}

function MonthLine({
  label, value, tone, strong, muted, onDark,
}: { label: string; value: string; tone?: "gain" | "loss"; strong?: boolean; muted?: boolean; onDark?: boolean }) {
  const labelColor = onDark ? "text-white/70" : "text-sub";
  const valueColor = onDark
    ? "text-white"
    : muted ? "text-sub" : tone === "gain" ? "text-gain" : tone === "loss" ? "text-loss" : "text-ink";
  return (
    <div
      className={`flex items-baseline justify-between gap-3 py-1 text-sm min-[360px]:text-[15px] ${
        strong ? `mt-1 border-t pt-2 ${onDark ? "border-white/20" : "border-black/[0.08]"}` : ""
      }`}
    >
      <dt className={`whitespace-nowrap ${strong ? (onDark ? "font-semibold text-white" : "font-semibold text-ink") : labelColor}`}>
        {label}
      </dt>
      <dd className={`whitespace-nowrap text-right ${muted ? "" : "tabular"} ${strong ? "font-semibold" : "font-medium"} ${valueColor}`}>
        {value}
      </dd>
    </div>
  );
}

function InfoRow({ label, value, tone, strong }: { label: string; value: string; tone?: "gain" | "loss"; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-black/[0.06] py-3">
      <dt className="shrink-0 text-[15px] text-sub">{label}</dt>
      <dd
        className={`tabular text-right text-[15px] ${strong ? "font-semibold" : "font-medium"} ${
          tone === "gain" ? "text-gain" : tone === "loss" ? "text-loss" : "text-ink"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-MY", {
    day: "numeric", month: "short", year: "numeric",
  });
}
