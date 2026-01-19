# StressTester

StressTester is a Next.js application for running AI-assisted financial stress tests. It combines deterministic simulations with optional AI workflows to extract assumptions, generate scenarios, and summarize results. The UI provides dashboards for KPIs, scenario timelines, mitigation playbooks, and data tables so teams can explore how operating plans perform under pressure.

## Features

- **Interactive stress testing dashboard** with KPI overview, timeline charts, and scenario panels.
- **AI-assisted analysis pipeline** that extracts assumptions, generates scenarios, produces mitigations, and drafts executive summaries.
- **Deterministic stress engine** for repeatable baseline vs. stressed outcomes.
- **Data ingestion UI** for swapping sample data with uploaded P&L, cash flow, balance sheet, and KPI inputs.
- **Mitigation playbooks** to capture responses for high-risk or failing scenarios.

## Tech Stack

- **Next.js 16** with React 19
- **TypeScript**
- **Tailwind CSS** and Radix UI components
- **Vercel Analytics**

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm/yarn

### Install Dependencies

```bash
pnpm install
```

### Run the App

```bash
pnpm dev
```

Visit `http://localhost:3000` to explore the StressTester UI.

## Useful Scripts

```bash
pnpm dev      # Run the development server
pnpm build    # Build for production
pnpm start    # Start the production server
pnpm lint     # Run linting
```

## Project Structure

- `app/` — Next.js app router, layouts, and pages
- `components/` — UI and stress-tester specific components
- `lib/` — Sample data, stress engine, and shared types
- `public/` — Static assets

## Notes

- The AI workflow is optional; the app can run deterministic analysis with sample data out of the box.
- Uploading data through the UI triggers AI-assisted analysis when enabled.

## License

This project is provided as-is for internal use and experimentation.
