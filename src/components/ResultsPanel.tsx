"use client";

import { useState } from "react";
import {
  AreaChart, Area,
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { CalculationResult, formatRM, formatUnits } from "@/lib/calculator";
import { TrendingUp, Table, BarChart2, ArrowDownCircle, ArrowUpCircle, Wallet } from "lucide-react";

interface Props { result: CalculationResult; }
type Tab = "overview" | "monthly" | "chart";

export default function ResultsPanel({ result }: Props) {
  const [tab, setTab] = useState<Tab>("overview");

  const {
    initialBalance, totalDeposited, totalWithdrawn, netInvested,
    totalUnits, totalDividend, effectiveRate,
    months, dividendRate, fundName, transactions,
  } = result;

  const hasWithdrawals = totalWithdrawn > 0;
  const hasInitial = initialBalance > 0;
  const hasDeposits = totalDeposited > 0;
  const finalBalance = totalUnits; // NAV = 1.00, so balance = units

  // Cumulative chart
  let cumDep = 0, cumWith = 0, cumDiv = 0;
  const cumulativeData = months.map((m) => {
    cumDep += m.deposited;
    cumWith += m.withdrawn;
    cumDiv += m.dividendEarned;
    return {
      name: m.month,
      "Portfolio Value": parseFloat(m.endingBalance.toFixed(2)),
      "Dividend Earned": parseFloat(cumDiv.toFixed(2)),
      ...(hasWithdrawals ? { "Withdrawn": parseFloat(cumWith.toFixed(2)) } : {}),
    };
  });

  const barData = months.map((m) => ({
    name: m.month,
    Deposited: parseFloat(m.deposited.toFixed(2)),
    ...(hasWithdrawals ? { Withdrawn: parseFloat(m.withdrawn.toFixed(2)) } : {}),
    Dividend: parseFloat(m.dividendEarned.toFixed(2)),
  }));

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "overview", label: "Overview", icon: <TrendingUp size={14} /> },
    { id: "monthly", label: "Monthly Breakdown", icon: <Table size={14} /> },
    { id: "chart", label: "Charts", icon: <BarChart2 size={14} /> },
  ];

  return (
    <section className="space-y-4">
      {/* ── Stat cards ──────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Opening balance — only shown if provided */}
        {hasInitial && (
          <div className="bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-2xl p-5 shadow-md">
            <div className="text-xs font-semibold uppercase tracking-wide opacity-70 mb-1 flex items-center gap-1">
              <Wallet size={12} /> Opening Balance
            </div>
            <div className="text-xl font-bold">{formatRM(initialBalance)}</div>
            <div className="text-xs opacity-60 mt-1">Carried from prior period</div>
          </div>
        )}

        {/* New deposits — only shown if any */}
        {hasDeposits && (
          <div className="stat-card">
            <div className="text-xs font-semibold uppercase tracking-wide opacity-70 mb-1 flex items-center gap-1">
              <ArrowDownCircle size={12} /> New Deposits
            </div>
            <div className="text-xl font-bold">{formatRM(totalDeposited)}</div>
            <div className="text-xs opacity-60 mt-1">
              {transactions.filter((t) => t.type === "deposit").length} transaction{transactions.filter((t) => t.type === "deposit").length !== 1 ? "s" : ""}
            </div>
          </div>
        )}

        {/* Withdrawals — only shown if any */}
        {hasWithdrawals && (
          <div className="bg-gradient-to-br from-red-500 to-red-700 text-white rounded-2xl p-5 shadow-md">
            <div className="text-xs font-semibold uppercase tracking-wide opacity-70 mb-1 flex items-center gap-1">
              <ArrowUpCircle size={12} /> Withdrawn
            </div>
            <div className="text-xl font-bold">{formatRM(totalWithdrawn)}</div>
            <div className="text-xs opacity-60 mt-1">
              {transactions.filter((t) => t.type === "withdrawal").length} transaction{transactions.filter((t) => t.type === "withdrawal").length !== 1 ? "s" : ""}
            </div>
          </div>
        )}

        {/* Dividend earned — always shown */}
        <div className="stat-card-gold">
          <div className="text-xs font-semibold uppercase tracking-wide opacity-70 mb-1">Dividend Earned</div>
          <div className="text-xl font-bold">{formatRM(totalDividend)}</div>
          <div className="text-xs opacity-60 mt-1">{dividendRate.toFixed(2)}% p.a.</div>
        </div>

        {/* Final balance — always shown */}
        <div className="bg-white rounded-2xl p-5 border border-green-100 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Final Balance</div>
          <div className="text-xl font-bold text-[#006747]">{formatRM(finalBalance)}</div>
          <div className="text-xs text-gray-400 mt-1">{formatUnits(totalUnits)} units</div>
        </div>

        {/* Effective yield — always shown */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Effective Yield</div>
          <div className="text-xl font-bold text-[#C8A951]">{effectiveRate.toFixed(2)}%</div>
          <div className="text-xs text-gray-400 mt-1">on total capital</div>
        </div>
      </div>

      {/* ── Detailed panel ───────────────────────────── */}
      <div className="card">
        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                tab === t.id ? "bg-white text-[#006747] shadow-sm" : "text-gray-500 hover:text-[#006747]"
              }`}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* ── Overview ── */}
        {tab === "overview" && (
          <div className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-gray-50">
              <div className="space-y-0 sm:pr-6">
                <InfoRow label="Fund" value={fundName} />
                <InfoRow label="Dividend Rate" value={`${dividendRate.toFixed(2)}% per annum`} />
                <InfoRow label="Period" value={`${formatDate(result.startDate)} → ${formatDate(result.endDate)}`} />
                <InfoRow label="Final Units" value={formatUnits(totalUnits)} />
              </div>
              <div className="space-y-0 sm:pl-6 pt-4 sm:pt-0">
                {hasInitial && <InfoRow label="Opening Balance" value={formatRM(initialBalance)} highlight="amber" />}
                {hasDeposits && <InfoRow label="Total Deposited" value={formatRM(totalDeposited)} highlight="green" />}
                {hasWithdrawals && <InfoRow label="Total Withdrawn" value={`−${formatRM(totalWithdrawn)}`} highlight="red" />}
                <InfoRow label="Dividend Earned" value={formatRM(totalDividend)} highlight="gold" />
                <InfoRow label="Final Balance" value={formatRM(finalBalance)} highlight="green" />
              </div>
            </div>

            {/* Transaction history */}
            {transactions.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Transaction History</h3>
                <div className="bg-gray-50 rounded-xl overflow-hidden border border-gray-100">
                  <div className="grid grid-cols-4 text-xs font-semibold text-gray-400 uppercase px-4 py-2.5 border-b border-gray-100">
                    <span>#</span><span>Type</span><span>Date</span><span className="text-right">Amount</span>
                  </div>
                  <div className="max-h-52 overflow-y-auto">
                    {transactions.map((tx, i) => {
                      const isW = tx.type === "withdrawal";
                      return (
                        <div key={i} className={`grid grid-cols-4 text-sm px-4 py-2.5 items-center ${i % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                          <span className="text-gray-400 text-xs font-medium">{i + 1}</span>
                          <span>
                            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                              isW ? "bg-red-100 text-red-600" : "bg-[#E8F5EE] text-[#006747]"
                            }`}>
                              {isW ? <ArrowUpCircle size={10} /> : <ArrowDownCircle size={10} />}
                              {isW ? "Withdraw" : "Deposit"}
                            </span>
                          </span>
                          <span className="font-medium text-gray-700">{formatDate(tx.date)}</span>
                          <span className={`text-right font-semibold ${isW ? "text-red-600" : "text-[#006747]"}`}>
                            {isW ? "−" : "+"}{formatRM(tx.amount)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Balance composition bar */}
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Balance Composition</h3>
              <div className="bg-gray-50 rounded-xl p-4">
                {(() => {
                  const totalCapital = initialBalance + totalDeposited - totalWithdrawn;
                  const total = totalCapital + totalDividend;
                  const capPct = total > 0 ? (totalCapital / total) * 100 : 0;
                  const initPct = total > 0 ? (initialBalance / total) * 100 : 0;
                  const depPct = total > 0 ? (totalDeposited / total) * 100 : 0;
                  const withPct = total > 0 ? (totalWithdrawn / total) * 100 : 0;
                  const divPct = total > 0 ? (totalDividend / total) * 100 : 0;
                  return (
                    <>
                      <div className="flex justify-between text-xs text-gray-500 mb-2">
                        <span>Net Capital ({capPct.toFixed(1)}%)</span>
                        <span>Dividend ({divPct.toFixed(1)}%)</span>
                      </div>
                      <div className="h-5 rounded-full overflow-hidden flex gap-px">
                        {hasInitial && (
                          <div className="bg-amber-400 transition-all" style={{ width: `${initPct}%` }} title={`Opening: ${formatRM(initialBalance)}`} />
                        )}
                        {hasDeposits && (
                          <div className="bg-[#006747] transition-all" style={{ width: `${depPct}%` }} title={`Deposited: ${formatRM(totalDeposited)}`} />
                        )}
                        {hasWithdrawals && (
                          <div className="bg-red-300 transition-all opacity-60" style={{ width: `${withPct}%` }} title={`Withdrawn: ${formatRM(totalWithdrawn)}`} />
                        )}
                        <div className="bg-[#C8A951] transition-all flex-1" title={`Dividend: ${formatRM(totalDividend)}`} />
                      </div>
                      <div className="flex flex-wrap gap-3 mt-3">
                        {hasInitial && (
                          <span className="flex items-center gap-1 text-xs text-gray-600">
                            <span className="w-3 h-3 rounded-sm bg-amber-400 inline-block" /> Opening {formatRM(initialBalance)}
                          </span>
                        )}
                        {hasDeposits && (
                          <span className="flex items-center gap-1 text-xs text-gray-600">
                            <span className="w-3 h-3 rounded-sm bg-[#006747] inline-block" /> Deposited {formatRM(totalDeposited)}
                          </span>
                        )}
                        {hasWithdrawals && (
                          <span className="flex items-center gap-1 text-xs text-gray-600">
                            <span className="w-3 h-3 rounded-sm bg-red-300 inline-block" /> Withdrawn {formatRM(totalWithdrawn)}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-xs text-gray-600">
                          <span className="w-3 h-3 rounded-sm bg-[#C8A951] inline-block" /> Dividend {formatRM(totalDividend)}
                        </span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* ── Monthly Breakdown ── */}
        {tab === "monthly" && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide pb-3 pr-3">Month</th>
                  <th className="text-right text-xs font-semibold text-[#006747] uppercase tracking-wide pb-3 pr-3">Deposited</th>
                  {hasWithdrawals && (
                    <th className="text-right text-xs font-semibold text-red-400 uppercase tracking-wide pb-3 pr-3">Withdrawn</th>
                  )}
                  <th className="text-right text-xs font-semibold text-[#C8A951] uppercase tracking-wide pb-3 pr-3">Dividend</th>
                  <th className="text-right text-xs font-semibold text-gray-400 uppercase tracking-wide pb-3 pr-3">Units</th>
                  <th className="text-right text-xs font-semibold text-gray-400 uppercase tracking-wide pb-3">Balance</th>
                </tr>
              </thead>
              <tbody>
                {months.map((m, i) => (
                  <tr key={i} className={`border-b border-gray-50 ${i % 2 !== 0 ? "bg-gray-50/50" : ""}`}>
                    <td className="py-2.5 pr-3 font-medium text-gray-700">{m.month}</td>
                    <td className="py-2.5 pr-3 text-right">
                      {m.deposited > 0
                        ? <span className="text-[#006747] font-semibold">{formatRM(m.deposited)}</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    {hasWithdrawals && (
                      <td className="py-2.5 pr-3 text-right">
                        {m.withdrawn > 0
                          ? <span className="text-red-500 font-semibold">−{formatRM(m.withdrawn)}</span>
                          : <span className="text-gray-300">—</span>}
                      </td>
                    )}
                    <td className="py-2.5 pr-3 text-right text-[#C8A951] font-semibold">{formatRM(m.dividendEarned)}</td>
                    <td className="py-2.5 pr-3 text-right text-gray-500 text-xs">{formatUnits(m.endingUnits)}</td>
                    <td className="py-2.5 text-right font-bold text-[#006747]">{formatRM(m.endingBalance)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-[#006747]/20 bg-[#E8F5EE]">
                  <td className="py-3 pr-3 font-bold text-[#006747] text-xs uppercase tracking-wide">Total</td>
                  <td className="py-3 pr-3 text-right font-bold text-[#006747]">{formatRM(totalDeposited)}</td>
                  {hasWithdrawals && (
                    <td className="py-3 pr-3 text-right font-bold text-red-600">−{formatRM(totalWithdrawn)}</td>
                  )}
                  <td className="py-3 pr-3 text-right font-bold text-[#C8A951]">{formatRM(totalDividend)}</td>
                  <td className="py-3 pr-3 text-right font-bold text-[#006747] text-xs">{formatUnits(totalUnits)}</td>
                  <td className="py-3 text-right font-bold text-[#006747]">{formatRM(finalBalance)}</td>
                </tr>
              </tfoot>
            </table>
            {hasInitial && (
              <p className="text-xs text-amber-600 mt-3 bg-amber-50 px-3 py-2 rounded-lg border border-amber-100">
                ℹ️ Opening balance of {formatRM(initialBalance)} is included in the starting unit count but not shown as a monthly deposit.
              </p>
            )}
          </div>
        )}

        {/* ── Charts ── */}
        {tab === "chart" && (
          <div className="space-y-8">
            <div>
              <h3 className="text-sm font-semibold text-gray-600 mb-4">Portfolio Value Over Time</h3>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={cumulativeData}>
                  <defs>
                    <linearGradient id="valueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#006747" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#006747" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="divGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#C8A951" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#C8A951" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#9ca3af" }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} tickFormatter={(v) => `RM${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: number) => formatRM(value)} contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb", fontSize: "12px" }} />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  <Area type="monotone" dataKey="Portfolio Value" stroke="#006747" fill="url(#valueGrad)" strokeWidth={2} />
                  <Area type="monotone" dataKey="Dividend Earned" stroke="#C8A951" fill="url(#divGrad)" strokeWidth={2} />
                  {hasWithdrawals && (
                    <Area type="monotone" dataKey="Withdrawn" stroke="#ef4444" fill="none" strokeWidth={1.5} strokeDasharray="4 2" />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-600 mb-4">Monthly Activity</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#9ca3af" }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} tickFormatter={(v) => `RM${v.toFixed(0)}`} />
                  <Tooltip formatter={(value: number) => formatRM(value)} contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb", fontSize: "12px" }} />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  <Bar dataKey="Deposited" fill="#006747" radius={[4, 4, 0, 0]} opacity={0.85} />
                  {hasWithdrawals && <Bar dataKey="Withdrawn" fill="#ef4444" radius={[4, 4, 0, 0]} opacity={0.75} />}
                  <Bar dataKey="Dividend" fill="#C8A951" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: "green" | "red" | "gold" | "amber" }) {
  const colors: Record<string, string> = {
    green: "text-[#006747]",
    red: "text-red-600",
    gold: "text-[#C8A951]",
    amber: "text-amber-600",
  };
  return (
    <div className="flex justify-between items-start py-3 border-b border-gray-50">
      <span className="text-sm text-gray-400">{label}</span>
      <span className={`text-sm font-semibold text-right ml-4 ${highlight ? colors[highlight] : "text-gray-700"}`}>
        {value}
      </span>
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-MY", {
    day: "numeric", month: "short", year: "numeric",
  });
}
