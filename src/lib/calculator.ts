// ─────────────────────────────────────────────
// ASNB Dividend Calculator — Core Logic
// ─────────────────────────────────────────────
//
// ASNB Fixed-Price funds (ASB, ASB2, ASN Equity, etc.)
//  • NAV = RM 1.00 per unit (fixed, never changes)
//  • Units = Amount ÷ 1.00 = Amount (straightforward)
//  • Dividend accrues DAILY based on units held at end of day
//  • Dividend Rate announced annually (e.g. 5.25% for ASB 2023)
//  • Daily Rate = Annual Rate ÷ 365
//  • Withdrawal reduces units held; dividend only accrues on remaining units
//  • initialBalance = existing balance carried in from a prior period (not counted as new deposit)

export interface ASNBFund {
  id: string;
  name: string;
  shortName: string;
  nav: number;
  dividendRate: number;
  category: "fixed" | "variable";
  minInvestment: number;
  maxInvestment: number | null;
}

export const ASNB_FUNDS: ASNBFund[] = [
  {
    id: "asb",
    name: "Amanah Saham Bumiputera (ASB)",
    shortName: "ASB",
    nav: 1.0,
    dividendRate: 0.0525,
    category: "fixed",
    minInvestment: 10,
    maxInvestment: 200000,
  },
  {
    id: "asb2",
    name: "Amanah Saham Bumiputera 2 (ASB 2)",
    shortName: "ASB 2",
    nav: 1.0,
    dividendRate: 0.046,
    category: "fixed",
    minInvestment: 10,
    maxInvestment: 200000,
  },
  {
    id: "asn",
    name: "Amanah Saham Nasional (ASN)",
    shortName: "ASN",
    nav: 1.0,
    dividendRate: 0.05,
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
  date: string; // ISO YYYY-MM-DD
  amount: number; // always positive
  type: TransactionType;
}

export type Deposit = Transaction; // legacy alias

export interface DayEntry {
  date: string;
  unitsChange: number;
  cumulativeUnits: number;
  dailyDividend: number;
  cumulativeDividend: number;
  deposited: number;
  withdrawn: number;
}

export interface MonthSummary {
  month: string;
  year: number;
  monthNum: number;
  deposited: number;
  withdrawn: number;
  dividendEarned: number;
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
  totalUnits: number;            // final unit count
  totalDividend: number;
  effectiveRate: number;
  months: MonthSummary[];
  dailyEntries: DayEntry[];
  startDate: string;
  endDate: string;
  fundName: string;
  dividendRate: number;
  // legacy aliases
  totalInvested: number;
  deposits: Transaction[];
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function toISO(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function parseDate(str: string): Date {
  return new Date(str + "T00:00:00");
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
 * @param endDate       Simulation end date (defaults to Dec 31 of last tx year)
 * @param initialBalance  Pre-existing balance (principal + dividend from prior years).
 *                        Seeded as opening units on startDate; NOT counted as a new deposit.
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

  // Sort transactions by date
  const sorted = [...transactions]
    .filter((t) => t.amount > 0 && t.date)
    .sort((a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime());

  if (sorted.length === 0 && initialBalance <= 0) {
    throw new Error("Please enter an initial balance or at least one transaction.");
  }

  // Determine simulation start date
  const startDate =
    sorted.length > 0
      ? parseDate(sorted[0].date)
      : parseDate(new Date().toISOString().split("T")[0]);

  // Determine simulation end date
  let end: Date;
  if (endDate) {
    end = parseDate(endDate);
  } else if (sorted.length > 0) {
    const lastTx = parseDate(sorted[sorted.length - 1].date);
    end = new Date(lastTx.getFullYear(), 11, 31);
  } else {
    end = new Date(startDate.getFullYear(), 11, 31);
  }

  // Build per-date maps
  const txMap = new Map<string, { deposited: number; withdrawn: number }>();
  let totalDeposited = 0;
  let totalWithdrawn = 0;

  for (const tx of sorted) {
    const key = toISO(parseDate(tx.date));
    if (!txMap.has(key)) txMap.set(key, { deposited: 0, withdrawn: 0 });
    const entry = txMap.get(key)!;
    if (tx.type === "withdrawal") {
      entry.withdrawn += tx.amount;
      totalWithdrawn += tx.amount;
    } else {
      entry.deposited += tx.amount;
      totalDeposited += tx.amount;
    }
  }

  // Seed opening balance as units (NOT counted in totalDeposited)
  const initialUnits = initialBalance / nav;
  const dailyRate = rate / 365;
  let currentUnits = initialUnits;
  let cumulativeDividend = 0;
  let yearDividend = 0;

  const dailyEntries: DayEntry[] = [];
  const monthMap = new Map<string, MonthSummary>();

  let current = new Date(startDate);

  while (current <= end) {
    const dateStr = toISO(current);
    const tx = txMap.get(dateStr);
    const depositedToday = tx?.deposited ?? 0;
    const withdrawnToday = tx?.withdrawn ?? 0;

    // Apply transactions: deposits add units, withdrawals subtract (clamped)
    const depositUnits = depositedToday / nav;
    const withdrawUnits = Math.min(withdrawnToday / nav, currentUnits);
    const unitsChange = depositUnits - withdrawUnits;
    currentUnits = Math.max(0, currentUnits + unitsChange);

    // Dividend accrues on holdings after today's transactions
    const dailyDividend = currentUnits * dailyRate;
    yearDividend += dailyDividend;
    cumulativeDividend += dailyDividend;

    dailyEntries.push({
      date: dateStr,
      unitsChange,
      cumulativeUnits: currentUnits,
      dailyDividend,
      cumulativeDividend,
      deposited: depositedToday,
      withdrawn: withdrawnToday,
    });

    // Month summary
    const mk = monthKey(current);
    if (!monthMap.has(mk)) {
      monthMap.set(mk, {
        month: mk,
        year: current.getFullYear(),
        monthNum: current.getMonth(),
        deposited: 0,
        withdrawn: 0,
        dividendEarned: 0,
        endingUnits: 0,
        endingBalance: 0,
      });
    }
    const ms = monthMap.get(mk)!;
    ms.deposited += depositedToday;
    ms.withdrawn += withdrawnToday;
    ms.dividendEarned += dailyDividend;
    ms.endingUnits = currentUnits;
    ms.endingBalance = currentUnits * nav;

    // 31 Dec: credit accrued dividend as new units (reinvestment)
    const isYearEnd = current.getMonth() === 11 && current.getDate() === 31;
    if (isYearEnd) {
      const dividendUnits = yearDividend / nav;
      currentUnits += dividendUnits;
      yearDividend = 0;
      dailyEntries[dailyEntries.length - 1].cumulativeUnits = currentUnits;
      ms.endingUnits = currentUnits;
      ms.endingBalance = currentUnits * nav;
    }

    current = addDays(current, 1);
  }

  const months = Array.from(monthMap.values()).sort((a, b) =>
    a.year !== b.year ? a.year - b.year : a.monthNum - b.monthNum
  );

  // Effective rate = dividend earned / (initial balance + total new deposits) if any capital at play
  const totalCapital = initialBalance + totalDeposited;
  const effectiveRate = totalCapital > 0 ? (cumulativeDividend / totalCapital) * 100 : 0;
  const netInvested = totalDeposited - totalWithdrawn;

  return {
    transactions: sorted,
    initialBalance,
    initialUnits,
    totalDeposited,
    totalWithdrawn,
    netInvested,
    totalUnits: currentUnits,
    totalDividend: cumulativeDividend,
    effectiveRate,
    months,
    dailyEntries,
    startDate: toISO(startDate),
    endDate: toISO(end),
    fundName: fund.name,
    dividendRate: rate * 100,
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
    const d = new Date(start.getFullYear(), start.getMonth() + i, dayOfMonth);
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(dayOfMonth, lastDay));
    transactions.push({ date: toISO(d), amount, type: "deposit" });
  }
  return transactions;
}

export function buildPeriodicTransactions(entries: Transaction[]): Transaction[] {
  return entries.filter((d) => d.amount > 0 && d.date);
}

// Legacy compat
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
