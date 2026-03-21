# B2B Funnel Velocity Calculator

A constraint-solver-powered calculator that models how B2B marketing accounts flow through your funnel over time. Understand the true cost and timeline of generating revenue from cold outreach, warm leads, and existing pipeline.

Built with React 19, TypeScript, Tailwind CSS, and Recharts.

## What It Does

Most B2B revenue models treat the funnel as a static spreadsheet: X leads times Y conversion rate equals Z deals. Reality is different. Accounts take quarters to mature. Ad algorithms need learning periods. Frequency targeting compounds over time. Deal size affects velocity.

This calculator models all of that. You set your revenue goal, configure your campaigns, and the constraint solver computes everything else in real-time — or you lock specific variables and let the solver work backwards.

### Key Concepts

**Constraint Solver with Lock/Unlock**
- Lock the variables you know (e.g., your budget and target accounts)
- The solver computes everything else: conversion rates, required leads, achievable revenue
- Three modes: Forward (goal-driven), Reverse (budget-driven), Analysis (free exploration)

**Cohort-Based Velocity Curves**
- Accounts don't convert instantly. Each quarterly batch follows a realistic velocity distribution
- Q1 is weak (campaigns are still learning), Q2 peaks, Q3 dips, Q4 captures the long tail
- Quarterly dropout modeling accounts for leads going cold over time

**Dual Cost Model**
- **Frequency targeting cost**: keeping all accounts under active targeting with monthly ad touches
- **CPL-based lead generation cost**: the marginal cost of converting accounts into leads
- Most calculators only model one of these — this models both

**ASP-Linked Scaling**
- Conversion rates and sales velocity automatically adjust based on average deal size
- Larger deals close slower with lower conversion rates (realistic enterprise dynamics)

## Campaign Profiles

### Cold Profiles (Full Funnel)

| Profile | Use Case | Account-to-Lead | Opp-to-Close | Default ASP |
|---------|----------|-----------------|--------------|-------------|
| **ABM** | Named account targeting, 1:1 campaigns | 15% | 20% | $100K |
| **Competitive** | Targeting competitor install base | 12% | 18% | $100K |
| **Inbound/Content** | SEO, webinars, paid search | 20% | 22% | $75K |

### Warm Profiles (Higher Conversion)

| Profile | Use Case | Key Difference |
|---------|----------|---------------|
| **Partner Leads** | Partner-referred warm leads | 75% account-to-lead, 50% close rate |
| **Founder-Led** | Founder-sourced deals | 90% account-to-lead, bypasses MQL stage |
| **Existing Pipeline** | Opps already in pipeline | Enters at opportunity stage, 35% close |

Mix and match up to 8 cohorts with different profiles, start quarters, and conversion overrides.

## Dashboard Tabs

| Tab | What It Shows |
|-----|---------------|
| **Timeline** | Funnel volume by quarter (leads, MQLs, opps, deals), cumulative revenue vs. goal |
| **Budget** | Quarterly cost breakdown (frequency, CPL, software, agency), investment-to-revenue crossover |
| **Cohorts** | Per-cohort contribution, closed-won attribution, cost-per-deal comparison |
| **Sensitivity** | What-if analysis — how changes to key variables affect outcomes |
| **Data** | Raw quarterly numbers, exportable as CSV |

## Hero Metrics

The top-level dashboard shows five key metrics with traffic-light health indicators:

- **First Revenue** — which quarter you'll close your first deal, and the investment period to get there
- **Revenue Generated** — total revenue vs. your ARR goal (% progress)
- **Pipeline Generated** — total pipeline value and pipeline-to-marketing-spend ratio
- **Total Investment** — cumulative spend across all cost categories with ROI
- **True CPL** — fully-loaded cost per lead (not just single-channel CPL)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Install & Run

```bash
git clone https://github.com/ntalbert/funnel-calculator.git
cd funnel-calculator
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for Production

```bash
npm run build
npm run preview
```

The production build outputs to `dist/`.

## How to Use

1. **Set your revenue target** — Enter your ARR goal and average selling price (ASP). The solver auto-sizes the number of accounts needed.

2. **Choose a campaign profile** — Select cold (ABM, Competitive, Inbound) or warm (Partner, Founder-Led, Existing Pipeline) depending on your go-to-market motion.

3. **Adjust your budget** — Set total budget, blended CPL, and frequency. The dual cost model computes both frequency targeting and lead generation costs.

4. **Lock what you know** — Click the lock icon next to any variable to fix it. The solver recomputes everything else around your constraints.

5. **Read the dashboard** — The hero metrics show overall health. Dive into each tab for detailed analysis. Traffic lights (green/amber/red) flag where your model is strong or at risk.

6. **Add more cohorts** — Model multiple campaigns simultaneously. Each cohort can have its own profile, start quarter, and conversion overrides.

7. **Export** — Generate a branded PDF infographic or export raw data as CSV.

A built-in wizard (auto-opens on first visit, re-open via the "Guide" button) walks through each section.

## Advanced Configuration

| Parameter | Default | What It Controls |
|-----------|---------|-----------------|
| Quarterly Dropout Rate | 15% | Accounts going cold each quarter |
| Sales Velocity | 167 days | Median days from opportunity to close |
| Max Velocity Improvement | 30% | How much frequency can speed up close times |
| Quarterly Onboarding Cap | 750 | Max accounts activated per quarter (overflow queues) |
| Tier Multipliers | 1.0x / 1.5x / 2.0x | Frequency intensity by account maturity stage |
| Model Horizon | 8 quarters | How far out to project (6–12 quarters) |

## Tech Stack

- **React 19** — UI framework
- **TypeScript** — Type safety
- **Tailwind CSS 3** — Styling
- **Recharts** — Charts and data visualization
- **Motion (Framer Motion v12)** — Animations
- **jsPDF + html2canvas** — PDF export
- **Vite** — Build tool

## Project Structure

```
src/
  components/calculator/
    engine/          # Constraint solver, calculation engine, types
    state/           # React context, reducer, scenarios
    panels/          # Input sidebar (solver panel, cohort builder, advanced)
    dashboard/       # Output tabs (timeline, budget, cohorts, sensitivity, data)
    shared/          # Reusable components (inputs, tooltips, formatters, charts)
    export/          # PDF infographic generation
```

## License

MIT
