# ASNB Dividend Calculator

A web app to estimate dividend returns from ASNB fixed-price funds (ASB, ASB2, ASN) across different investment strategies.

## Features

- **Lump Sum** — One-time investment with flexible end date
- **Monthly/Regular** — Same amount every month (configurable months, day of month)
- **Periodic** — Custom deposits on any dates with preset scenarios (Quarterly, Annual, Salary+Bonus)
- **Fund selector** — ASB, ASB2, ASN, or Custom rate
- **Charts** — Cumulative growth + monthly dividend bar chart
- **Monthly breakdown table** — Per-month deposited, dividend, units, balance

## How ASNB Dividend is Calculated

- NAV = RM 1.00 (fixed price funds)
- Units = Amount ÷ 1.00
- Daily dividend = Units × (Annual Rate ÷ 365)
- Dividend is credited on 31 Dec and reinvested as new units

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
