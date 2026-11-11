# ASNB Dividend Calculator

A web app to estimate dividend returns from ASNB fixed-price funds (ASB, ASB 2, ASM) across different investment strategies.

## Features

- **Lump Sum** — One-time investment with flexible end date
- **Monthly/Regular** — Same amount every month (configurable months, day of month)
- **Periodic** — Custom deposits on any dates with preset scenarios (Quarterly, Annual, Salary+Bonus)
- **Fund selector** — ASB, ASB 2, ASM, or Custom rate
- **Charts** — Cumulative growth + monthly dividend bar chart
- **Monthly breakdown table** — Per-month deposited, lowest balance, dividend, balance

## How the dividend is calculated

The calculator uses ASNB's **minimum monthly balance** method:

1. For each calendar month, take the lowest balance recorded in the account.
2. Dividend = (sum of the monthly minimums ÷ 12) × declared rate. Each month contributes `minimum × rate ÷ 12`.

What follows from that:

- A deposit earns nothing for the month it is made in, including a deposit on the 1st. It starts earning the following month.
- A withdrawal lowers the whole month, even if the money is put back days later.
- Only complete months count. If "Calculate until" falls mid-month, that month is left out.
- The dividend is credited once a year after the fund's financial year-end: 31 December for ASB, 31 March for ASB 2 and ASM.
- An opening balance is treated as held from the first day of the financial year.

Rates in `src/lib/calculator.ts` are the latest declared (ASB 5.75 sen for 2025; ASB 2 5.50 sen and ASM 5.00 sen for the year to 31 March 2026). Update them when ASNB declares new ones.

Run `npm run verify` to check the calculation against an independent day-by-day reference and hand-worked figures.

## Setup

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Deploy to Netlify

1. Push to GitHub
2. Connect repo to Netlify
3. Build settings:
   - **Build command:** `npm run build`
   - **Publish directory:** `.next`
4. Add the Netlify Next.js plugin: `npm install -D @netlify/plugin-nextjs`
5. The `netlify.toml` in this repo handles the rest

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Recharts (charts)
- Lucide React (icons)
- Netlify (hosting)

## Disclaimer

For estimation purposes only. Actual ASNB dividend rates are declared annually and may differ. Refer to [asnb.com.my](https://www.asnb.com.my) for official rates.
# asb-calculator
