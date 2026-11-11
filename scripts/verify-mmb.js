const root = require("path").resolve(__dirname, "..");
const ts = require(root + "/node_modules/typescript");
const src = require("fs").readFileSync(root + "/src/lib/calculator.ts", "utf8");
const js = ts.transpileModule(src, { compilerOptions: { module: "commonjs", target: "es2020" } }).outputText;
const m = { exports: {} }; new Function("module", "exports", js)(m, m.exports);
const calc = m.exports;
const [ASB, ASB2] = calc.ASNB_FUNDS;
const dep = (date, amount) => ({ date, amount, type: "deposit" });
const wd = (date, amount) => ({ date, amount, type: "withdrawal" });
const pad = (n) => String(n).padStart(2, "0");
const monthly = (day, amt, type = "deposit") => Array.from({ length: 12 }, (_, i) => ({ date: `2026-${pad(i + 1)}-${pad(day)}`, amount: amt, type }));

// Independent reference, written separately from the app: walks every DAY of the
// calendar year by plain y/m/d arithmetic (no Date objects), tracking the lowest balance.
function reference(opening, txs, year, rate) {
  let bal = opening, sum = 0;
  for (let mo = 1; mo <= 12; mo++) {
    const dim = [31, (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mo - 1];
    let min = bal;
    for (let d = 1; d <= dim; d++) {
      const key = `${year}-${pad(mo)}-${pad(d)}`;
      let inn = 0, out = 0;
      for (const t of txs) if (t.date === key) (t.type === "deposit" ? (inn += t.amount) : (out += t.amount));
      bal = bal + inn; bal -= Math.min(out, bal);
      if (bal < min) min = bal;
    }
    sum += min;
  }
  return (sum / 12) * rate;
}

let fails = 0;
const check = (name, got, want) => {
  const ok = Math.abs(got - want) < 0.005;
  if (!ok) fails++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}: app ${got.toFixed(2)}, expected ${want.toFixed(2)}`);
};
const run = (txs, opening, end = "2026-12-31", fund = ASB) => calc.calculateASNBDividend(txs, fund, undefined, end, opening);
const R = ASB.dividendRate;

console.log(`TZ=${process.env.TZ}  ASB rate ${R}`);
// 1. App vs independent day-by-day reference
const cases = [
  ["RM10,000 held all year", 10000, []],
  ["RM10,000 deposited 1 Jan", 0, [dep("2026-01-01", 10000)]],
  ["RM10,000 deposited 15 Jun", 0, [dep("2026-06-15", 10000)]],
  ["RM10,000 deposited 30 Jun", 0, [dep("2026-06-30", 10000)]],
  ["RM500 monthly on the 1st", 0, monthly(1, 500)],
  ["RM500 monthly on the 15th", 0, monthly(15, 500)],
  ["RM10,000 held; 5,000 out 10 Mar, back 20 Mar", 10000, [wd("2026-03-10", 5000), dep("2026-03-20", 5000)]],
  ["RM10,000 held; 5,000 out 31 Mar, back 1 Apr", 10000, [wd("2026-03-31", 5000), dep("2026-04-01", 5000)]],
  ["RM50,000 held; 300 out on the 5th monthly", 50000, monthly(5, 300, "withdrawal")],
  ["RM20,000 held; deposits and withdrawals mixed", 20000, [dep("2026-02-14", 3000), wd("2026-02-20", 8000), dep("2026-05-01", 1000), wd("2026-09-30", 2500), dep("2026-12-10", 9000)]],
  ["Withdrawal larger than balance", 1000, [wd("2026-04-10", 5000), dep("2026-08-03", 2000)]],
];
for (const [name, opening, txs] of cases) check(name, run(txs, opening).totalDividend, reference(opening, txs, 2026, R));

// 2. Hand-worked figures
check("Hand: 10,000 all year = 10,000 x rate", run([], 10000).totalDividend, 10000 * R);
check("Hand: deposit 15 Jun earns Jul-Dec = 6/12", run([dep("2026-06-15", 10000)], 0).totalDividend, 10000 * R * 6 / 12);
check("Hand: 500 monthly = 500 x (0+1+...+11)/12 x rate", run(monthly(15, 500), 0).totalDividend, 500 * 66 / 12 * R);
check("Hand: out 10 Mar/back 20 Mar loses half of March", run([wd("2026-03-10", 5000), dep("2026-03-20", 5000)], 10000).totalDividend, 10000 * R - 5000 * R / 12);

// 3. Period handling
let r = run([dep("2026-03-10", 5000)], 10000);
console.log(`     opening balance + deposit 10 Mar -> period ${r.startDate} to ${r.endDate}`);
check("Opening balance earns from 1 Jan", r.totalDividend, 10000 * R + 5000 * R * 9 / 12);
check("End date mid-month: only complete months (Jan-Jul)", run([], 10000, "2026-08-15").totalDividend, 10000 * R * 7 / 12);
r = run([], 10000, "2026-08-15");
check("Mid-year final balance includes uncredited dividend", r.totalUnits, 10000 + r.totalDividend);

// 4. Compounding across years: dividend credited at year-end earns next year
r = run([], 10000, "2027-12-31");
check("Two years compound", r.totalDividend, 10000 * R + 10000 * (1 + R) * R);
check("Two years final balance", r.totalUnits, 10000 * (1 + R) * (1 + R));

// 5. ASB 2: financial year 1 Apr - 31 Mar
r = calc.calculateASNBDividend([dep("2026-05-20", 12000)], ASB2, undefined, "2027-03-31", 0);
check("ASB 2: deposit 20 May earns Jun-Mar = 10/12", r.totalDividend, 12000 * ASB2.dividendRate * 10 / 12);
check("ASB 2: credited at 31 Mar (nothing pending)", r.pendingDividend, 0);
r = calc.calculateASNBDividend([dep("2026-06-10", 1)], ASB2, undefined, "2027-03-31", 8000);
console.log(`     ASB 2 opening balance -> period ${r.startDate} to ${r.endDate}`);

// 6. Timezone: dates must not shift
const built = calc.buildMonthlyTransactions(500, "2026-01-01", 3, 1).map((t) => t.date).join(", ");
const okDates = built === "2026-01-01, 2026-02-01, 2026-03-01";
if (!okDates) fails++;
console.log(`${okDates ? "PASS" : "FAIL"}  Monthly builder on the 1st: ${built}`);
r = run([dep("2026-11-11", 10000)], 0);
const okPeriod = r.startDate === "2026-11-11" && r.endDate === "2026-12-31";
if (!okPeriod) fails++;
console.log(`${okPeriod ? "PASS" : "FAIL"}  Period labels: ${r.startDate} to ${r.endDate}`);
const add = [calc.addMonthsISO("2026-01-31", 1), calc.addMonthsISO("2026-12-15", 1)].join(", ");
const okAdd = add === "2026-02-28, 2027-01-15";
if (!okAdd) fails++;
console.log(`${okAdd ? "PASS" : "FAIL"}  Add one month: ${add}`);
console.log(fails ? `\n${fails} FAILED` : "\nALL PASSED");
process.exit(fails ? 1 : 0);
