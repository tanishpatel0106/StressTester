import type {
  PnLRow,
  CashFlowRow,
  BalanceSheetRow,
  KPIRow,
  Assumption,
  Scenario,
  Evidence,
  StressConfig,
} from "./types"

// Sample Configuration
export const sampleConfig: StressConfig = {
  businessType: "SaaS",
  timeGranularity: "monthly",
  horizonMonths: 12,
  objective: "preserve_runway",
  stressSeverity: "moderate",
  targetMetrics: ["cash_end", "runway_months", "gross_margin", "ebitda"],
  currency: "USD",
}

// Sample P&L Data
export const samplePnL: PnLRow[] = [
  { month: "2026-01", revenueSubscription: 440000, revenueUsage: 60000, revenueTotal: 500000, cogsHosting: 91800, cogsSupport: 43200, cogsTotal: 135000, grossProfit: 365000, grossMargin: 0.73, opexRnD: 170000, opexSalesMarketing: 190000, opexGA: 60000, opexTotal: 420000, ebitda: -55000, depreciation: 10000, operatingIncome: -65000, interestExpense: 5000, netIncome: -70000 },
  { month: "2026-02", revenueSubscription: 466400, revenueUsage: 63600, revenueTotal: 530000, cogsHosting: 98600, cogsSupport: 46400, cogsTotal: 145000, grossProfit: 385000, grossMargin: 0.7264, opexRnD: 172000, opexSalesMarketing: 195000, opexGA: 63000, opexTotal: 430000, ebitda: -45000, depreciation: 10000, operatingIncome: -55000, interestExpense: 5000, netIncome: -60000 },
  { month: "2026-03", revenueSubscription: 497370, revenueUsage: 64630, revenueTotal: 562000, cogsHosting: 106175, cogsSupport: 48825, cogsTotal: 155000, grossProfit: 407000, grossMargin: 0.7242, opexRnD: 176000, opexSalesMarketing: 202000, opexGA: 67000, opexTotal: 445000, ebitda: -38000, depreciation: 10000, operatingIncome: -48000, interestExpense: 5000, netIncome: -53000 },
  { month: "2026-04", revenueSubscription: 527460, revenueUsage: 68540, revenueTotal: 596000, cogsHosting: 115080, cogsSupport: 52920, cogsTotal: 168000, grossProfit: 428000, grossMargin: 0.7181, opexRnD: 185000, opexSalesMarketing: 210000, opexGA: 65000, opexTotal: 460000, ebitda: -32000, depreciation: 10000, operatingIncome: -42000, interestExpense: 5000, netIncome: -47000 },
  { month: "2026-05", revenueSubscription: 562480, revenueUsage: 69520, revenueTotal: 632000, cogsHosting: 124200, cogsSupport: 55800, cogsTotal: 180000, grossProfit: 452000, grossMargin: 0.7152, opexRnD: 187000, opexSalesMarketing: 212000, opexGA: 71000, opexTotal: 470000, ebitda: -18000, depreciation: 10000, operatingIncome: -28000, interestExpense: 5000, netIncome: -33000 },
  { month: "2026-06", revenueSubscription: 596300, revenueUsage: 73700, revenueTotal: 670000, cogsHosting: 132480, cogsSupport: 59520, cogsTotal: 192000, grossProfit: 478000, grossMargin: 0.7134, opexRnD: 189000, opexSalesMarketing: 214000, opexGA: 77000, opexTotal: 480000, ebitda: -2000, depreciation: 10000, operatingIncome: -12000, interestExpense: 5000, netIncome: -17000 },
  { month: "2026-07", revenueSubscription: 633320, revenueUsage: 76680, revenueTotal: 710000, cogsHosting: 141450, cogsSupport: 63550, cogsTotal: 205000, grossProfit: 505000, grossMargin: 0.7113, opexRnD: 198000, opexSalesMarketing: 223000, opexGA: 79000, opexTotal: 500000, ebitda: 5000, depreciation: 10000, operatingIncome: -5000, interestExpense: 5000, netIncome: -10000 },
  { month: "2026-08", revenueSubscription: 671676, revenueUsage: 81324, revenueTotal: 753000, cogsHosting: 150420, cogsSupport: 67580, cogsTotal: 218000, grossProfit: 535000, grossMargin: 0.7105, opexRnD: 200000, opexSalesMarketing: 225000, opexGA: 85000, opexTotal: 510000, ebitda: 25000, depreciation: 10000, operatingIncome: 15000, interestExpense: 5000, netIncome: 10000 },
  { month: "2026-09", revenueSubscription: 713412, revenueUsage: 84588, revenueTotal: 798000, cogsHosting: 161240, cogsSupport: 70760, cogsTotal: 232000, grossProfit: 566000, grossMargin: 0.7093, opexRnD: 203000, opexSalesMarketing: 232000, opexGA: 90000, opexTotal: 525000, ebitda: 41000, depreciation: 10000, operatingIncome: 31000, interestExpense: 5000, netIncome: 26000 },
  { month: "2026-10", revenueSubscription: 756324, revenueUsage: 89676, revenueTotal: 846000, cogsHosting: 171665, cogsSupport: 75335, cogsTotal: 247000, grossProfit: 599000, grossMargin: 0.708, opexRnD: 212000, opexSalesMarketing: 238000, opexGA: 90000, opexTotal: 540000, ebitda: 59000, depreciation: 10000, operatingIncome: 49000, interestExpense: 5000, netIncome: 44000 },
  { month: "2026-11", revenueSubscription: 803712, revenueUsage: 93288, revenueTotal: 897000, cogsHosting: 183400, cogsSupport: 78600, cogsTotal: 262000, grossProfit: 635000, grossMargin: 0.7079, opexRnD: 215000, opexSalesMarketing: 245000, opexGA: 95000, opexTotal: 555000, ebitda: 80000, depreciation: 10000, operatingIncome: 70000, interestExpense: 5000, netIncome: 65000 },
  { month: "2026-12", revenueSubscription: 852096, revenueUsage: 98904, revenueTotal: 951000, cogsHosting: 194600, cogsSupport: 83400, cogsTotal: 278000, grossProfit: 673000, grossMargin: 0.7077, opexRnD: 218000, opexSalesMarketing: 252000, opexGA: 100000, opexTotal: 570000, ebitda: 103000, depreciation: 10000, operatingIncome: 93000, interestExpense: 5000, netIncome: 88000 },
]

// Sample Cash Flow Data
export const sampleCashFlow: CashFlowRow[] = [
  { month: "2026-01", cashBegin: 3000000, cashFlowOperating: -45000, cashFlowInvesting: -30000, cashFlowFinancing: 0, netChangeCash: -75000, cashEnd: 2925000 },
  { month: "2026-02", cashBegin: 2925000, cashFlowOperating: -38000, cashFlowInvesting: -30000, cashFlowFinancing: 0, netChangeCash: -68000, cashEnd: 2857000 },
  { month: "2026-03", cashBegin: 2857000, cashFlowOperating: -32000, cashFlowInvesting: -25000, cashFlowFinancing: 0, netChangeCash: -57000, cashEnd: 2800000 },
  { month: "2026-04", cashBegin: 2800000, cashFlowOperating: -28000, cashFlowInvesting: -25000, cashFlowFinancing: 0, netChangeCash: -53000, cashEnd: 2747000 },
  { month: "2026-05", cashBegin: 2747000, cashFlowOperating: -15000, cashFlowInvesting: -25000, cashFlowFinancing: 0, netChangeCash: -40000, cashEnd: 2707000 },
  { month: "2026-06", cashBegin: 2707000, cashFlowOperating: -5000, cashFlowInvesting: -25000, cashFlowFinancing: 0, netChangeCash: -30000, cashEnd: 2677000 },
  { month: "2026-07", cashBegin: 2677000, cashFlowOperating: 5000, cashFlowInvesting: -25000, cashFlowFinancing: 0, netChangeCash: -20000, cashEnd: 2657000 },
  { month: "2026-08", cashBegin: 2657000, cashFlowOperating: 20000, cashFlowInvesting: -25000, cashFlowFinancing: 0, netChangeCash: -5000, cashEnd: 2652000 },
  { month: "2026-09", cashBegin: 2652000, cashFlowOperating: 30000, cashFlowInvesting: -25000, cashFlowFinancing: 0, netChangeCash: 5000, cashEnd: 2657000 },
  { month: "2026-10", cashBegin: 2657000, cashFlowOperating: 45000, cashFlowInvesting: -25000, cashFlowFinancing: 0, netChangeCash: 20000, cashEnd: 2677000 },
  { month: "2026-11", cashBegin: 2677000, cashFlowOperating: 60000, cashFlowInvesting: -25000, cashFlowFinancing: 0, netChangeCash: 35000, cashEnd: 2712000 },
  { month: "2026-12", cashBegin: 2712000, cashFlowOperating: 80000, cashFlowInvesting: -25000, cashFlowFinancing: 0, netChangeCash: 55000, cashEnd: 2767000 },
]

// Sample Balance Sheet Data
export const sampleBalanceSheet: BalanceSheetRow[] = [
  { month: "2026-01", cash: 2925000, accountsReceivable: 210000, inventory: 0, prepaidExpenses: 45000, totalCurrentAssets: 3180000, ppAndENet: 180000, totalAssets: 3360000, accountsPayable: 95000, accruedExpenses: 120000, shortTermDebt: 35000, totalCurrentLiabilities: 250000, longTermDebt: 200000, totalLiabilities: 450000, equity: 2910000, totalLiabilitiesAndEquity: 3360000 },
  { month: "2026-02", cash: 2857000, accountsReceivable: 220000, inventory: 0, prepaidExpenses: 46000, totalCurrentAssets: 3123000, ppAndENet: 195000, totalAssets: 3318000, accountsPayable: 98000, accruedExpenses: 122000, shortTermDebt: 35000, totalCurrentLiabilities: 255000, longTermDebt: 200000, totalLiabilities: 455000, equity: 2863000, totalLiabilitiesAndEquity: 3318000 },
  { month: "2026-03", cash: 2800000, accountsReceivable: 230000, inventory: 0, prepaidExpenses: 47000, totalCurrentAssets: 3077000, ppAndENet: 210000, totalAssets: 3287000, accountsPayable: 102000, accruedExpenses: 125000, shortTermDebt: 35000, totalCurrentLiabilities: 262000, longTermDebt: 200000, totalLiabilities: 462000, equity: 2825000, totalLiabilitiesAndEquity: 3287000 },
  { month: "2026-04", cash: 2747000, accountsReceivable: 240000, inventory: 0, prepaidExpenses: 48000, totalCurrentAssets: 3035000, ppAndENet: 225000, totalAssets: 3260000, accountsPayable: 105000, accruedExpenses: 128000, shortTermDebt: 35000, totalCurrentLiabilities: 268000, longTermDebt: 200000, totalLiabilities: 468000, equity: 2792000, totalLiabilitiesAndEquity: 3260000 },
  { month: "2026-05", cash: 2707000, accountsReceivable: 250000, inventory: 0, prepaidExpenses: 49000, totalCurrentAssets: 3006000, ppAndENet: 240000, totalAssets: 3246000, accountsPayable: 110000, accruedExpenses: 130000, shortTermDebt: 35000, totalCurrentLiabilities: 275000, longTermDebt: 200000, totalLiabilities: 475000, equity: 2771000, totalLiabilitiesAndEquity: 3246000 },
  { month: "2026-06", cash: 2677000, accountsReceivable: 260000, inventory: 0, prepaidExpenses: 50000, totalCurrentAssets: 2987000, ppAndENet: 255000, totalAssets: 3242000, accountsPayable: 115000, accruedExpenses: 133000, shortTermDebt: 35000, totalCurrentLiabilities: 283000, longTermDebt: 200000, totalLiabilities: 483000, equity: 2759000, totalLiabilitiesAndEquity: 3242000 },
  { month: "2026-07", cash: 2657000, accountsReceivable: 270000, inventory: 0, prepaidExpenses: 51000, totalCurrentAssets: 2978000, ppAndENet: 270000, totalAssets: 3248000, accountsPayable: 120000, accruedExpenses: 136000, shortTermDebt: 35000, totalCurrentLiabilities: 291000, longTermDebt: 200000, totalLiabilities: 491000, equity: 2757000, totalLiabilitiesAndEquity: 3248000 },
  { month: "2026-08", cash: 2652000, accountsReceivable: 280000, inventory: 0, prepaidExpenses: 52000, totalCurrentAssets: 2984000, ppAndENet: 285000, totalAssets: 3269000, accountsPayable: 125000, accruedExpenses: 138000, shortTermDebt: 35000, totalCurrentLiabilities: 298000, longTermDebt: 200000, totalLiabilities: 498000, equity: 2771000, totalLiabilitiesAndEquity: 3269000 },
  { month: "2026-09", cash: 2657000, accountsReceivable: 305000, inventory: 0, prepaidExpenses: 54000, totalCurrentAssets: 3016000, ppAndENet: 300000, totalAssets: 3316000, accountsPayable: 130000, accruedExpenses: 140000, shortTermDebt: 35000, totalCurrentLiabilities: 305000, longTermDebt: 200000, totalLiabilities: 505000, equity: 2811000, totalLiabilitiesAndEquity: 3316000 },
  { month: "2026-10", cash: 2677000, accountsReceivable: 300000, inventory: 0, prepaidExpenses: 55000, totalCurrentAssets: 3032000, ppAndENet: 315000, totalAssets: 3347000, accountsPayable: 135000, accruedExpenses: 142000, shortTermDebt: 35000, totalCurrentLiabilities: 312000, longTermDebt: 200000, totalLiabilities: 512000, equity: 2835000, totalLiabilitiesAndEquity: 3347000 },
  { month: "2026-11", cash: 2712000, accountsReceivable: 310000, inventory: 0, prepaidExpenses: 56000, totalCurrentAssets: 3078000, ppAndENet: 330000, totalAssets: 3408000, accountsPayable: 138000, accruedExpenses: 145000, shortTermDebt: 35000, totalCurrentLiabilities: 318000, longTermDebt: 200000, totalLiabilities: 518000, equity: 2890000, totalLiabilitiesAndEquity: 3408000 },
  { month: "2026-12", cash: 2767000, accountsReceivable: 320000, inventory: 0, prepaidExpenses: 58000, totalCurrentAssets: 3145000, ppAndENet: 345000, totalAssets: 3490000, accountsPayable: 140000, accruedExpenses: 148000, shortTermDebt: 35000, totalCurrentLiabilities: 323000, longTermDebt: 200000, totalLiabilities: 523000, equity: 2967000, totalLiabilitiesAndEquity: 3490000 },
]

// Sample KPI Data
export const sampleKPIs: KPIRow[] = [
  { month: "2026-01", customersBegin: 10000, newCustomers: 1040, churnedCustomers: 300, customersEnd: 10740, churnRate: 0.03, arpu: 50, cac: 120, marketingSpend: 240000, headcount: 42, grossMargin: 0.73, ltv: 1216.67, paybackMonths: 3.29 },
  { month: "2026-02", customersBegin: 10740, newCustomers: 1066, churnedCustomers: 322, customersEnd: 11484, churnRate: 0.03, arpu: 50, cac: 122, marketingSpend: 250000, headcount: 42, grossMargin: 0.7264, ltv: 1210.67, paybackMonths: 3.36 },
  { month: "2026-03", customersBegin: 11484, newCustomers: 1090, churnedCustomers: 356, customersEnd: 12218, churnRate: 0.031, arpu: 50, cac: 124, marketingSpend: 260000, headcount: 43, grossMargin: 0.7242, ltv: 1168.06, paybackMonths: 3.42 },
  { month: "2026-04", customersBegin: 12218, newCustomers: 1123, churnedCustomers: 379, customersEnd: 12962, churnRate: 0.031, arpu: 50, cac: 125, marketingSpend: 270000, headcount: 44, grossMargin: 0.7181, ltv: 1158.23, paybackMonths: 3.48 },
  { month: "2026-05", customersBegin: 12962, newCustomers: 1135, churnedCustomers: 415, customersEnd: 13682, churnRate: 0.032, arpu: 50, cac: 126, marketingSpend: 275000, headcount: 45, grossMargin: 0.7152, ltv: 1117.5, paybackMonths: 3.52 },
  { month: "2026-06", customersBegin: 13682, newCustomers: 1138, churnedCustomers: 438, customersEnd: 14382, churnRate: 0.032, arpu: 50, cac: 128, marketingSpend: 280000, headcount: 46, grossMargin: 0.7134, ltv: 1114.69, paybackMonths: 3.59 },
  { month: "2026-07", customersBegin: 14382, newCustomers: 1162, churnedCustomers: 475, customersEnd: 15069, churnRate: 0.033, arpu: 50, cac: 132, marketingSpend: 295000, headcount: 48, grossMargin: 0.7113, ltv: 1077.73, paybackMonths: 3.71 },
  { month: "2026-08", customersBegin: 15069, newCustomers: 1156, churnedCustomers: 512, customersEnd: 15713, churnRate: 0.034, arpu: 50, cac: 135, marketingSpend: 300000, headcount: 48, grossMargin: 0.7105, ltv: 1044.85, paybackMonths: 3.8 },
  { month: "2026-09", customersBegin: 15713, newCustomers: 1168, churnedCustomers: 534, customersEnd: 16347, churnRate: 0.034, arpu: 50, cac: 138, marketingSpend: 310000, headcount: 49, grossMargin: 0.7093, ltv: 1043.09, paybackMonths: 3.89 },
  { month: "2026-10", customersBegin: 16347, newCustomers: 1189, churnedCustomers: 572, customersEnd: 16964, churnRate: 0.035, arpu: 50, cac: 140, marketingSpend: 320000, headcount: 50, grossMargin: 0.708, ltv: 1011.43, paybackMonths: 3.95 },
  { month: "2026-11", customersBegin: 16964, newCustomers: 1218, churnedCustomers: 594, customersEnd: 17588, churnRate: 0.035, arpu: 51, cac: 143, marketingSpend: 335000, headcount: 50, grossMargin: 0.7079, ltv: 1031.51, paybackMonths: 3.96 },
  { month: "2026-12", customersBegin: 17588, newCustomers: 1255, churnedCustomers: 616, customersEnd: 18227, churnRate: 0.035, arpu: 51, cac: 145, marketingSpend: 350000, headcount: 50, grossMargin: 0.7077, ltv: 1031.22, paybackMonths: 4.02 },
]

// Sample Plan Text
export const samplePlanText = `# SaaS Startup — Growth Plan Under CAC Pressure (Sample Plan)

## Executive Summary
We are a B2B SaaS company selling workflow automation to mid-market teams. The next 12 months focus on scaling ARR while preserving cash runway.

## Targets (Next 12 Months)
- Maintain customer growth of approximately **~6% month-over-month** driven primarily by paid acquisition.
- Keep CAC stable around **$120–$130** in H1; allow modest drift upward in H2 due to competitive bidding.
- Maintain gross margin **above 70%** through the year via infrastructure optimization and support efficiency.
- Keep hiring disciplined: **+2 engineers per quarter** plus selective customer success hires.
- Preserve liquidity: maintain **>= 12 months runway** under the base plan while moving toward EBITDA breakeven in the second half.

## Current Baseline (Starting Month = 2026-01)
- Customers: ~10,000
- ARPU: ~$50 / month
- CAC: ~$120
- Monthly churn: ~3.0%
- Beginning cash balance: $3.0M

## Operating Model Assumptions
### Growth & Acquisition
1. New customers are primarily acquired via performance marketing with conversion rates assumed stable.
2. CAC is expected to remain around **$120–$130** through mid-year, supported by improved creative iteration and channel mix.
3. Paid acquisition remains effective even as we scale (implicit assumption: addressable audience is not saturated).

### Retention
4. Churn remains around **3.0–3.5% monthly**, with mild seasonal uplift in Q3 due to budget cycles.
5. Net revenue retention is assumed stable (implicit assumption: expansion and downgrades roughly offset).

### Pricing / ARPU
6. ARPU is assumed to remain ~$50 with mild uplift to $51 by year-end (implicit assumption: pricing power is preserved).

### Costs & Efficiency
7. Gross margin remains above **70%**, assuming hosting unit costs do not rise faster than revenue.
8. Support cost scales slower than revenue due to tooling improvements.
9. Opex increases stepwise in April/July/October due to hiring waves.

### Liquidity & Runway
10. No external financing is assumed in the base case.
11. Cash runway is evaluated using cash end balance and forward operating cash flows.

## Risks We Acknowledge
- CAC volatility if competitor bidding increases unexpectedly.
- Churn spikes if a product release causes instability.
- Short-term margin compression if hosting costs rise.

## Risks We Are Implicitly Taking
- CAC does not exceed ~$150 for sustained periods.
- Churn does not exceed ~4.5% for sustained periods.
- Gross margin does not fall below ~68%.

## Monitoring KPIs
- CAC, New Customers, Churn Rate, Customers End
- Gross Margin, EBITDA, Operating Cash Flow
- Ending Cash Balance, Runway Months`

// Sample Assumptions (extracted)
export const sampleAssumptions: Assumption[] = [
  {
    id: "A01",
    statement: "Customer growth averages ~6% month-over-month.",
    type: "explicit",
    category: "demand",
    baseline: { metric: "Customers_End", value: null, unit: "count" },
    evidenceIds: ["E001"],
    fragility: 0.6,
    impact: 0.9,
    confidence: "high",
    dependencies: ["A02", "A08"],
  },
  {
    id: "A02",
    statement: "CAC stabilizes around $120–$130 through the first half of the year.",
    type: "explicit",
    category: "acquisition",
    baseline: { metric: "CAC", value: 125, unit: "USD" },
    evidenceIds: ["E002"],
    fragility: 0.7,
    impact: 0.8,
    confidence: "high",
    dependencies: ["A08", "A20"],
  },
  {
    id: "A03",
    statement: "CAC drifts upward in the second half due to competitive bidding.",
    type: "implicit",
    category: "acquisition",
    baseline: { metric: "CAC", value: 145, unit: "USD" },
    evidenceIds: ["E003"],
    fragility: 0.5,
    impact: 0.7,
    confidence: "medium",
    dependencies: ["A20"],
  },
  {
    id: "A04",
    statement: "Monthly churn remains ~3.0–3.5% with a mild uplift in Q3.",
    type: "explicit",
    category: "retention",
    baseline: { metric: "Churn_Rate", value: 0.032, unit: "ratio" },
    evidenceIds: ["E004"],
    fragility: 0.65,
    impact: 0.85,
    confidence: "high",
    dependencies: [],
  },
  {
    id: "A05",
    statement: "Gross margin remains above 70% through the year.",
    type: "explicit",
    category: "margin",
    baseline: { metric: "Gross_Margin", value: 0.7, unit: "ratio" },
    evidenceIds: ["E005"],
    fragility: 0.5,
    impact: 0.75,
    confidence: "high",
    dependencies: ["A06", "A15"],
  },
  {
    id: "A06",
    statement: "Infrastructure costs do not rise faster than revenue.",
    type: "implicit",
    category: "costs",
    baseline: { metric: "COGS_Hosting", value: null, unit: "USD" },
    evidenceIds: ["E006"],
    fragility: 0.6,
    impact: 0.7,
    confidence: "medium",
    dependencies: [],
  },
  {
    id: "A07",
    statement: "Hiring occurs in stepwise waves (+2 engineers per quarter).",
    type: "explicit",
    category: "execution",
    baseline: { metric: "Headcount", value: null, unit: "count" },
    evidenceIds: ["E007"],
    fragility: 0.3,
    impact: 0.5,
    confidence: "high",
    dependencies: ["A19"],
  },
  {
    id: "A08",
    statement: "Sales & Marketing spend remains sufficient to sustain acquisition efficiency.",
    type: "implicit",
    category: "acquisition",
    baseline: { metric: "Marketing_Spend", value: null, unit: "USD" },
    evidenceIds: ["E008"],
    fragility: 0.55,
    impact: 0.7,
    confidence: "medium",
    dependencies: ["A02"],
  },
  {
    id: "A09",
    statement: "ARPU stays near $50 with slight uplift to $51 by year end.",
    type: "explicit",
    category: "pricing",
    baseline: { metric: "ARPU", value: 50, unit: "USD" },
    evidenceIds: ["E009"],
    fragility: 0.4,
    impact: 0.8,
    confidence: "high",
    dependencies: [],
  },
  {
    id: "A10",
    statement: "No external financing is required in the base case.",
    type: "explicit",
    category: "liquidity",
    baseline: { metric: "CashFlow_Financing", value: 0, unit: "USD" },
    evidenceIds: ["E010"],
    fragility: 0.7,
    impact: 0.6,
    confidence: "high",
    dependencies: ["A11", "A12"],
  },
  {
    id: "A11",
    statement: "Operating cash flow improves in H2 as EBITDA turns positive.",
    type: "implicit",
    category: "liquidity",
    baseline: { metric: "CashFlow_Operating", value: null, unit: "USD" },
    evidenceIds: ["E011"],
    fragility: 0.6,
    impact: 0.8,
    confidence: "medium",
    dependencies: ["A05"],
  },
  {
    id: "A12",
    statement: "Runway remains >= 12 months under base case.",
    type: "explicit",
    category: "liquidity",
    baseline: { metric: "RunwayMonths", value: 12, unit: "months" },
    evidenceIds: ["E012"],
    fragility: 0.75,
    impact: 0.95,
    confidence: "medium",
    dependencies: ["A10", "A11"],
  },
  {
    id: "A13",
    statement: "Churn does not exceed ~4.5% for sustained periods.",
    type: "explicit",
    category: "retention",
    baseline: { metric: "Churn_Rate", value: 0.045, unit: "ratio" },
    evidenceIds: ["E013"],
    fragility: 0.8,
    impact: 0.9,
    confidence: "high",
    dependencies: ["A04"],
  },
  {
    id: "A14",
    statement: "CAC does not exceed ~$150 for sustained periods.",
    type: "explicit",
    category: "acquisition",
    baseline: { metric: "CAC", value: 150, unit: "USD" },
    evidenceIds: ["E014"],
    fragility: 0.75,
    impact: 0.85,
    confidence: "high",
    dependencies: ["A02", "A03"],
  },
  {
    id: "A15",
    statement: "Support costs scale slower than revenue due to tooling improvements.",
    type: "implicit",
    category: "costs",
    baseline: { metric: "COGS_Support", value: null, unit: "USD" },
    evidenceIds: ["E015"],
    fragility: 0.5,
    impact: 0.6,
    confidence: "medium",
    dependencies: [],
  },
  {
    id: "A16",
    statement: "Customer lifetime value remains stable (no deterioration).",
    type: "implicit",
    category: "retention",
    baseline: { metric: "LTV", value: null, unit: "USD" },
    evidenceIds: ["E016"],
    fragility: 0.6,
    impact: 0.75,
    confidence: "low",
    dependencies: ["A04", "A09"],
  },
  {
    id: "A17",
    statement: "Collections remain stable with no major AR delays.",
    type: "implicit",
    category: "working_capital",
    baseline: { metric: "Accounts_Receivable", value: null, unit: "USD" },
    evidenceIds: ["E017"],
    fragility: 0.4,
    impact: 0.5,
    confidence: "low",
    dependencies: [],
  },
  {
    id: "A18",
    statement: "Gross margin does not fall below ~68% even in mild stress.",
    type: "explicit",
    category: "margin",
    baseline: { metric: "Gross_Margin", value: 0.68, unit: "ratio" },
    evidenceIds: ["E018"],
    fragility: 0.7,
    impact: 0.8,
    confidence: "high",
    dependencies: ["A05", "A06"],
  },
  {
    id: "A19",
    statement: "Opex increases stepwise in Apr/Jul/Oct due to hiring waves.",
    type: "implicit",
    category: "execution",
    baseline: { metric: "Opex_Total", value: null, unit: "USD" },
    evidenceIds: ["E019"],
    fragility: 0.4,
    impact: 0.55,
    confidence: "medium",
    dependencies: ["A07"],
  },
  {
    id: "A20",
    statement: "Competitive bidding pressure is the main driver of CAC risk.",
    type: "explicit",
    category: "market",
    baseline: { metric: "CAC", value: null, unit: "USD" },
    evidenceIds: ["E020"],
    fragility: 0.8,
    impact: 0.7,
    confidence: "high",
    dependencies: [],
  },
]

// Sample Scenarios
export const sampleScenarios: Scenario[] = [
  {
    id: "S01",
    name: "CAC +25% for 3 months",
    changes: [{ metric: "CAC", mode: "multiply", value: 1.25, durationMonths: 3 }],
    rationale: "Simulates short-term competitive pressure in paid acquisition channels.",
    severity: "moderate",
    expectedBreak: false,
    expectedBreakCondition: null,
    affectedAssumptions: ["A02", "A03", "A14"],
  },
  {
    id: "S02",
    name: "Churn +1.5pp sustained",
    changes: [{ metric: "Churn_Rate", mode: "add", value: 0.015, durationMonths: 12 }],
    rationale: "Tests impact of sustained retention issues across the full year.",
    severity: "severe",
    expectedBreak: true,
    expectedBreakCondition: "Customers_End declines vs base; EBITDA fails to turn positive by year-end",
    affectedAssumptions: ["A04", "A13", "A16"],
  },
  {
    id: "S03",
    name: "Gross margin -5pp sustained",
    changes: [{ metric: "Gross_Margin", mode: "add", value: -0.05, durationMonths: 12 }],
    rationale: "Tests margin compression from infrastructure cost increases.",
    severity: "severe",
    expectedBreak: true,
    expectedBreakCondition: "EBITDA stays negative; operating cash flow negative in H2",
    affectedAssumptions: ["A05", "A06", "A18"],
  },
  {
    id: "S04",
    name: "Hiring acceleration (+1 headcount/month)",
    changes: [{ metric: "Headcount", mode: "add", value: 1, durationMonths: 12 }],
    rationale: "Tests impact of faster hiring on burn rate and runway.",
    severity: "low",
    expectedBreak: false,
    expectedBreakCondition: null,
    affectedAssumptions: ["A07", "A19"],
  },
  {
    id: "S05",
    name: "Marketing spend cut -15% (3 months)",
    changes: [{ metric: "Marketing_Spend", mode: "multiply", value: 0.85, durationMonths: 3 }],
    rationale: "Tests short-term cost optimization impact on acquisition.",
    severity: "low",
    expectedBreak: false,
    expectedBreakCondition: null,
    affectedAssumptions: ["A08", "A01"],
  },
  {
    id: "S06",
    name: "ARPU -3% sustained",
    changes: [{ metric: "ARPU", mode: "multiply", value: 0.97, durationMonths: 12 }],
    rationale: "Tests pricing pressure from competition or downgrades.",
    severity: "moderate",
    expectedBreak: true,
    expectedBreakCondition: "EBITDA breakeven delayed; runway months fall below 9",
    affectedAssumptions: ["A09"],
  },
  {
    id: "S07",
    name: "AR collection delay (AR +20%)",
    changes: [{ metric: "Accounts_Receivable", mode: "multiply", value: 1.2, durationMonths: 6 }],
    rationale: "Tests working capital pressure from slower collections.",
    severity: "low",
    expectedBreak: false,
    expectedBreakCondition: null,
    affectedAssumptions: ["A17", "A12"],
  },
  {
    id: "S08",
    name: "Combined: CAC +20% and churn +1pp",
    changes: [
      { metric: "CAC", mode: "multiply", value: 1.2, durationMonths: 6 },
      { metric: "Churn_Rate", mode: "add", value: 0.01, durationMonths: 6 },
    ],
    rationale: "Tests compounded stress from acquisition and retention headwinds.",
    severity: "severe",
    expectedBreak: true,
    expectedBreakCondition: "Runway months < 6 by month 10",
    affectedAssumptions: ["A02", "A04", "A12", "A14"],
  },
  {
    id: "S09",
    name: "COGS hosting +10% (unit cost pressure)",
    changes: [{ metric: "COGS_Hosting", mode: "multiply", value: 1.1, durationMonths: 12 }],
    rationale: "Tests infrastructure cost increases from vendor pricing changes.",
    severity: "moderate",
    expectedBreak: true,
    expectedBreakCondition: "Gross margin dips; EBITDA breakeven delayed",
    affectedAssumptions: ["A06", "A18"],
  },
  {
    id: "S10",
    name: "No margin improvement + opex +5%",
    changes: [{ metric: "Opex_Total", mode: "multiply", value: 1.05, durationMonths: 12 }],
    rationale: "Tests impact of cost discipline failure.",
    severity: "moderate",
    expectedBreak: true,
    expectedBreakCondition: "Operating cash flow negative in H2; runway months < 9",
    affectedAssumptions: ["A19", "A12"],
  },
]

// Sample Evidence Store
export const sampleEvidence: Evidence[] = [
  { type: "text_span", id: "E001", file: "plan.md", startChar: 245, endChar: 310, quotedText: "Maintain customer growth of approximately ~6% month-over-month" },
  { type: "text_span", id: "E002", file: "plan.md", startChar: 355, endChar: 420, quotedText: "Keep CAC stable around $120–$130 in H1" },
  { type: "table_cell", id: "E003", file: "kpis.csv", row: 12, column: "CAC", value: 145, unit: "USD", period: "2026-12" },
  { type: "text_span", id: "E004", file: "plan.md", startChar: 700, endChar: 760, quotedText: "Churn remains around 3.0–3.5% monthly" },
  { type: "text_span", id: "E005", file: "plan.md", startChar: 450, endChar: 510, quotedText: "Maintain gross margin above 70% through the year" },
  { type: "text_span", id: "E006", file: "plan.md", startChar: 900, endChar: 980, quotedText: "hosting unit costs do not rise faster than revenue" },
  { type: "text_span", id: "E007", file: "plan.md", startChar: 520, endChar: 580, quotedText: "+2 engineers per quarter" },
  { type: "table_cell", id: "E008", file: "kpis.csv", row: 1, column: "Marketing_Spend", value: 240000, unit: "USD", period: "2026-01" },
  { type: "text_span", id: "E009", file: "plan.md", startChar: 820, endChar: 890, quotedText: "ARPU is assumed to remain ~$50 with mild uplift to $51" },
  { type: "text_span", id: "E010", file: "plan.md", startChar: 1100, endChar: 1165, quotedText: "No external financing is assumed in the base case" },
  { type: "table_cell", id: "E011", file: "CashFlow.csv", row: 7, column: "CashFlow_Operating", value: 5000, unit: "USD", period: "2026-07" },
  { type: "text_span", id: "E012", file: "plan.md", startChar: 590, endChar: 640, quotedText: ">= 12 months runway under the base plan" },
  { type: "text_span", id: "E013", file: "plan.md", startChar: 1350, endChar: 1410, quotedText: "Churn does not exceed ~4.5% for sustained periods" },
  { type: "text_span", id: "E014", file: "plan.md", startChar: 1300, endChar: 1350, quotedText: "CAC does not exceed ~$150 for sustained periods" },
  { type: "text_span", id: "E015", file: "plan.md", startChar: 950, endChar: 1020, quotedText: "Support cost scales slower than revenue due to tooling improvements" },
  { type: "table_cell", id: "E016", file: "kpis.csv", row: 1, column: "LTV", value: 1216.67, unit: "USD", period: "2026-01" },
  { type: "table_cell", id: "E017", file: "BalanceSheet.csv", row: 1, column: "Accounts_Receivable", value: 210000, unit: "USD", period: "2026-01" },
  { type: "text_span", id: "E018", file: "plan.md", startChar: 1410, endChar: 1470, quotedText: "Gross margin does not fall below ~68%" },
  { type: "text_span", id: "E019", file: "plan.md", startChar: 1020, endChar: 1090, quotedText: "Opex increases stepwise in April/July/October due to hiring waves" },
  { type: "text_span", id: "E020", file: "plan.md", startChar: 1250, endChar: 1300, quotedText: "CAC volatility if competitor bidding increases" },
]
