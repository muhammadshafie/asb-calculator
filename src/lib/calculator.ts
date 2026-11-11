// ─────────────────────────────────────────────
// ASNB Dividend Calculator — Core Logic
// ─────────────────────────────────────────────
//
// ASNB fixed-price funds (ASB, ASB 2, ASM, …)
//  • NAV = RM 1.00 per unit (fixed), so units = ringgit balance
//  • Income distribution uses the MINIMUM MONTHLY BALANCE (MMB) method:
//      1. For each calendar month of the fund's financial year, take the
//         lowest balance recorded in the account during that month.
//      2. Dividend = (sum of the monthly minimums ÷ 12) × declared rate
//         — i.e. each month contributes  minimum × rate ÷ 12.
//  • A deposit therefore earns nothing for the month it is made in (the
//    balance before it arrived is that month's minimum), and a withdrawal
//    lowers the whole month even if the money is put back days later.
//  • The dividend is credited (reinvested as units) once a year, right
//    after the fund's financial year-end.
//  • initialBalance = balance already held at the start of the financial
//    year (not counted as a new deposit).

export interface ASNBFund {
  id: string;
  name: string;
  shortName: string;
  nav: number;
  dividendRate: number;
  /** Month (0 = Jan … 11 = Dec) in which the fund's financial year ends. */
  fyEndMonth: number;
  category: "fixed" | "variable";
  minInvestment: number;
  maxInvestment: number | null;
}

// Rates are the most recently declared total distribution (income + bonus):
//   ASB   5.75 sen — financial year ended 31 Dec 2025
//   ASB 2 5.50 sen — financial year ended 31 Mar 2026
//   ASM   5.00 sen — financial year ended 31 Mar 2026
// ASN is not listed: it is a variable-price fund, so this method does not apply.
export const ASNB_FUNDS: ASNBFund[] = [
  {
    id: "asb",
    name: "Amanah Saham Bumiputera (ASB)",
    shortName: "ASB",
    nav: 1.0,
    dividendRate: 0.0575,
    fyEndMonth: 11,
    category: "fixed",
    minInvestment: 10,
    maxInvestment: 200000,
  },
  {
    id: "asb2",
    name: "Amanah Saham Bumiputera 2 (ASB 2)",
    shortName: "ASB 2",
    nav: 1.0,
    dividendRate: 0.055,
    fyEndMonth: 2,
    category: "fixed",
    minInvestment: 10,
    maxInvestment: 200000,
  },
  {
    id: "asm",
    name: "Amanah Saham Malaysia (ASM)",
    shortName: "ASM",
    nav: 1.0,
    dividendRate: 0.05,
    fyEndMonth: 2,
    category: "fixed",
    minInvestment: 10,
    maxInvestment: null,
  },
  {
    id: "custom",
    name: "Custom Fund",
    shortName: "Custom",
    nav: 1.0,
    dividendRate: 0.05,
    fyEndMonth: 11,
    category: "fixed",
    minInvestment: 10,
    maxInvestment: null,
  },
];

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type InvestmentMode = "lumpsum" | "monthly" | "periodic";
export type TransactionType = "deposit" | "withdrawal";

export interface Transaction {
  date: string; // ISO date string YYYY-MM-DD
  amount: number;
  type: TransactionType;
}

export type Deposit = Transaction; // legacy alias

export interface MonthSummary {
  month: string;
  year: number;
  monthNum: number;
  deposited: number;
  withdrawn: number;
  /** Lowest balance recorded during the month — the figure the dividend is based on. */
  minBalance: number;
  /** minBalance × rate ÷ 12. Zero if the month is not complete within the period. */
  dividendEarned: number;
  /** False when the calculation ends part-way through this month. */
  counted: boolean;
  endingUnits: number;
  endingBalance: number;
}

export interface CalculationResult {
  transactions: Transaction[];
  initialBalance: number;        // opening balance carried in
  initialUnits: number;          // = initialBalance / nav
  totalDeposited: number;        // sum of new deposits only
  totalWithdrawn: number;
  netInvested: number;           // totalDeposited - totalWithdrawn
  totalUnits: number;            // final unit count, including pendingDividend
  totalDividend: number;
  /** Part of totalDividend earned but not yet credited (period ends before the fund's year-end). */
  pendingDividend: number;
  effectiveRate: number;
  months: MonthSummary[];
  startDate: string;
  endDate: string;
  fundName: string;
  dividendRate: number;
  fyEndMonth: number;
  // legacy aliases
  totalInvested: number;
  deposits: Transaction[];
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/** Local calendar date as YYYY-MM-DD. (toISOString() would shift the day in UTC+8.) */
export function toISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayISO(): string {
  return toISO(new Date());
}

export function parseDate(str: string): Date {
  return new Date(str + "T00:00:00");
}

/** `iso` moved forward by `months`, clamped to the last day of the target month. */
export function addMonthsISO(iso: string, months: number): string {
  const d = parseDate(iso);
  const day = d.getDate();
  const target = new Date(d.getFullYear(), d.getMonth() + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, lastDay));
  return toISO(target);
}

function monthKey(date: Date): string {
  return date.toLocaleString("en-MY", { month: "short", year: "numeric" });
}

// ─────────────────────────────────────────────
// Core Calculator
// ─────────────────────────────────────────────

/**
 * @param transactions  New deposits / withdrawals during the period
 * @param fund          Fund config
 * @param customRate    Override rate (% per annum, not decimal)
 * @param endDate       Last day of the period (defaults to 31 Dec of the last transaction's year)
 * @param initialBalance  Balance already held at the start of the financial year.
 *                        When given, the period starts on the first day of the
 *                        financial year containing the first transaction (or today),
 *                        so this balance earns for every month of that year.
 */
export function calculateASNBDividend(
  transactions: Transaction[],
  fund: ASNBFund,
  customRate?: number,
  endDate?: string,
  initialBalance: number = 0
): CalculationResult {
  const rate = customRate !== undefined ? customRate / 100 : fund.dividendRate;
  const nav = fund.nav;
  const fyEndMonth = fund.fyEndMonth;

  const all = [...transactions]
    .filter((t) => t.amount > 0 && t.date)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (all.length === 0 && initialBalance <= 0) {
    throw new Error("Enter an opening balance or at least one transaction.");
  }

  // ── Period ──────────────────────────────────
  const anchor = all.length > 0 ? parseDate(all[0].date) : parseDate(todayISO());
  let start: Date;
  if (initialBalance > 0) {
    const fyStartMonth = (fyEndMonth + 1) % 12;
    const year = anchor.getMonth() >= fyStartMonth ? anchor.getFullYear() : anchor.getFullYear() - 1;
    start = new Date(year, fyStartMonth, 1);
  } else {
    start = anchor;
  }

  let end: Date;
  if (endDate) {
    end = parseDate(endDate);
  } else {
    const last = all.length > 0 ? parseDate(all[all.length - 1].date) : start;
    end = new Date(last.getFullYear(), 11, 31);
  }
  if (end < start) {
    throw new Error("The calculate-until date is before the first transaction.");
  }
  const endISO = toISO(end);

  // Transactions after the end date are outside the period.
  const sorted = all.filter((t) => t.date <= endISO);

  // Net movement per day, grouped by month ("YYYY-MM")
  const byMonth = new Map<string, Map<string, { deposited: number; withdrawn: number }>>();
  let totalDeposited = 0;
  let totalWithdrawn = 0;
  for (const tx of sorted) {
    const mk = tx.date.slice(0, 7);
    if (!byMonth.has(mk)) byMonth.set(mk, new Map());
    const days = byMonth.get(mk)!;
    if (!days.has(tx.date)) days.set(tx.date, { deposited: 0, withdrawn: 0 });
    const entry = days.get(tx.date)!;
    if (tx.type === "withdrawal") entry.withdrawn += tx.amount;
    else entry.deposited += tx.amount;
  }

  // ── Month by month ──────────────────────────
  const initialUnits = initialBalance / nav;
  let units = initialUnits;
  let totalDividend = 0;
  let yearDividend = 0; // earned in the current financial year, not yet credited
  const months: MonthSummary[] = [];

  let y = start.getFullYear();
  let m = start.getMonth();
  while (y < end.getFullYear() || (y === end.getFullYear() && m <= end.getMonth())) {
    const first = new Date(y, m, 1);
    const lastDay = new Date(y, m + 1, 0);
    const complete = lastDay <= end;

    // The balance carried into the month is the first one "recorded" in it,
    // so a deposit made during the month cannot raise that month's minimum.
    let minUnits = units;
    let deposited = 0;
    let withdrawn = 0;

    const days = byMonth.get(`${y}-${String(m + 1).padStart(2, "0")}`);
    if (days) {
      for (const key of Array.from(days.keys()).sort()) {
        const day = days.get(key)!;
        // Deposits add units; withdrawals are capped at what is available.
        const afterDeposit = units + day.deposited / nav;
        const taken = Math.min(day.withdrawn / nav, afterDeposit);
        units = afterDeposit - taken;
        deposited += day.deposited;
        withdrawn += taken * nav;
        totalDeposited += day.deposited;
        totalWithdrawn += taken * nav;
        minUnits = Math.min(minUnits, units);
      }
    }

    const dividendEarned = complete ? (minUnits * nav * rate) / 12 : 0;
    yearDividend += dividendEarned;
    totalDividend += dividendEarned;

    // Financial year-end: credit the year's dividend as new units.
    if (complete && m === fyEndMonth) {
      units += yearDividend / nav;
      yearDividend = 0;
    }

    months.push({
      month: monthKey(first),
      year: y,
      monthNum: m,
      deposited,
      withdrawn,
      minBalance: minUnits * nav,
      dividendEarned,
      counted: complete,
      endingUnits: units,
      endingBalance: units * nav,
    });

    m += 1;
    if (m > 11) { m = 0; y += 1; }
  }

  // Dividend earned since the last year-end is added to the final figure,
  // although ASNB only credits it after the fund's financial year closes.
  const pendingDividend = yearDividend;
  const totalUnits = units + pendingDividend / nav;

  // Effective rate = dividend earned / (initial balance + total new deposits)
  const totalCapital = initialBalance + totalDeposited;
  const effectiveRate = totalCapital > 0 ? (totalDividend / totalCapital) * 100 : 0;

  return {
    transactions: sorted,
    initialBalance,
    initialUnits,
    totalDeposited,
    totalWithdrawn,
    netInvested: totalDeposited - totalWithdrawn,
    totalUnits,
    totalDividend,
    pendingDividend,
    effectiveRate,
    months,
    startDate: toISO(start),
    endDate: endISO,
    fundName: fund.name,
    dividendRate: rate * 100,
    fyEndMonth,
    totalInvested: totalDeposited,
    deposits: sorted,
  };
}

// ─────────────────────────────────────────────
// Mode Builders
// ─────────────────────────────────────────────

export function buildLumpsumTransactions(
  amount: number,
  date: string
): Transaction[] {
  return amount > 0 ? [{ date, amount, type: "deposit" }] : [];
}

export function buildMonthlyTransactions(
  amount: number,
  startDate: string,
  months: number,
  dayOfMonth: number = 1
): Transaction[] {
  const transactions: Transaction[] = [];
  const start = parseDate(startDate);
  for (let i = 0; i < months; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(dayOfMonth, lastDay));
    transactions.push({ date: toISO(d), amount, type: "deposit" });
  }
  return transactions;
}

export function buildPeriodicTransactions(entries: Transaction[]): Transaction[] {
  return entries.filter((d) => d.amount > 0 && d.date);
}

// Legacy aliases
export const buildLumpsumDeposits = buildLumpsumTransactions;
export const buildMonthlyDeposits = buildMonthlyTransactions;
export const buildPeriodicDeposits = buildPeriodicTransactions;

// ─────────────────────────────────────────────
// Formatters
// ─────────────────────────────────────────────

export function formatRM(value: number): string {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatUnits(value: number): string {
  return new Intl.NumberFormat("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value);
}
