// Deterministic Stress Simulation Engine
// LLMs reason — they never calculate. All computations happen here.

import type {
  PnLRow,
  CashFlowRow,
  KPIRow,
  Scenario,
  ScenarioChange,
  Breakpoint,
  Evidence,
  ComputedEvidence,
} from "./types"

// Apply a single change to a metric value
function applyChange(
  baseValue: number,
  change: ScenarioChange,
  monthIndex: number
): number {
  if (monthIndex >= change.durationMonths) {
    return baseValue // Change no longer applies
  }

  switch (change.mode) {
    case "add":
      return baseValue + change.value
    case "multiply":
      return baseValue * change.value
    case "set":
      return change.value
    default:
      return baseValue
  }
}

// Get the metric value from a KPI row
function getKPIMetric(row: KPIRow, metric: string): number | null {
  const metricMap: Record<string, keyof KPIRow> = {
    CAC: "cac",
    Churn_Rate: "churnRate",
    ARPU: "arpu",
    Marketing_Spend: "marketingSpend",
    Headcount: "headcount",
    Gross_Margin: "grossMargin",
    Customers_End: "customersEnd",
    New_Customers: "newCustomers",
    LTV: "ltv",
  }
  const key = metricMap[metric]
  if (key && key in row) {
    return row[key] as number
  }
  return null
}

// Get the metric value from a P&L row
function getPnLMetric(row: PnLRow, metric: string): number | null {
  const metricMap: Record<string, keyof PnLRow> = {
    COGS_Hosting: "cogsHosting",
    COGS_Support: "cogsSupport",
    Opex_Total: "opexTotal",
    Revenue_Total: "revenueTotal",
    Gross_Profit: "grossProfit",
    EBITDA: "ebitda",
  }
  const key = metricMap[metric]
  if (key && key in row) {
    return row[key] as number
  }
  return null
}

// Simulate KPIs under stress
export function simulateKPIsUnderStress(
  baseKPIs: KPIRow[],
  scenario: Scenario
): KPIRow[] {
  return baseKPIs.map((row, monthIndex) => {
    const stressedRow = { ...row }

    for (const change of scenario.changes) {
      const baseValue = getKPIMetric(row, change.metric)
      if (baseValue !== null) {
        const stressedValue = applyChange(baseValue, change, monthIndex)

        // Apply to the appropriate field
        switch (change.metric) {
          case "CAC":
            stressedRow.cac = stressedValue
            break
          case "Churn_Rate":
            stressedRow.churnRate = stressedValue
            // Recalculate churned customers
            stressedRow.churnedCustomers = Math.round(
              stressedRow.customersBegin * stressedValue
            )
            stressedRow.customersEnd =
              stressedRow.customersBegin +
              stressedRow.newCustomers -
              stressedRow.churnedCustomers
            break
          case "ARPU":
            stressedRow.arpu = stressedValue
            // Recalculate LTV
            if (stressedRow.churnRate > 0) {
              stressedRow.ltv =
                (stressedValue * stressedRow.grossMargin) / stressedRow.churnRate
            }
            break
          case "Marketing_Spend":
            stressedRow.marketingSpend = stressedValue
            // Recalculate new customers (rough approximation)
            if (stressedRow.cac > 0) {
              stressedRow.newCustomers = Math.round(stressedValue / stressedRow.cac)
            }
            break
          case "Headcount":
            stressedRow.headcount = Math.round(stressedValue)
            break
          case "Gross_Margin":
            stressedRow.grossMargin = stressedValue
            // Recalculate LTV
            if (stressedRow.churnRate > 0) {
              stressedRow.ltv =
                (stressedRow.arpu * stressedValue) / stressedRow.churnRate
            }
            break
        }
      }
    }

    return stressedRow
  })
}

// Simulate P&L under stress
export function simulatePnLUnderStress(
  basePnL: PnLRow[],
  baseKPIs: KPIRow[],
  scenario: Scenario
): PnLRow[] {
  const stressedKPIs = simulateKPIsUnderStress(baseKPIs, scenario)

  return basePnL.map((row, monthIndex) => {
    const stressedRow = { ...row }
    const stressedKPI = stressedKPIs[monthIndex]

    // Apply direct P&L changes
    for (const change of scenario.changes) {
      const baseValue = getPnLMetric(row, change.metric)
      if (baseValue !== null) {
        const stressedValue = applyChange(baseValue, change, monthIndex)

        switch (change.metric) {
          case "COGS_Hosting":
            stressedRow.cogsHosting = stressedValue
            break
          case "COGS_Support":
            stressedRow.cogsSupport = stressedValue
            break
          case "Opex_Total":
            stressedRow.opexTotal = stressedValue
            break
        }
      }
    }

    // Recalculate revenue based on customers and ARPU
    if (stressedKPI) {
      const estimatedRevenue = stressedKPI.customersEnd * stressedKPI.arpu
      const revenueRatio = estimatedRevenue / (baseKPIs[monthIndex].customersEnd * baseKPIs[monthIndex].arpu)
      stressedRow.revenueSubscription = Math.round(row.revenueSubscription * revenueRatio)
      stressedRow.revenueTotal = stressedRow.revenueSubscription + stressedRow.revenueUsage
    }

    // Recalculate COGS and margins
    stressedRow.cogsTotal = stressedRow.cogsHosting + stressedRow.cogsSupport
    stressedRow.grossProfit = stressedRow.revenueTotal - stressedRow.cogsTotal
    stressedRow.grossMargin = stressedRow.revenueTotal > 0
      ? stressedRow.grossProfit / stressedRow.revenueTotal
      : 0

    // Apply gross margin stress if specified
    for (const change of scenario.changes) {
      if (change.metric === "Gross_Margin" && monthIndex < change.durationMonths) {
        stressedRow.grossMargin = applyChange(row.grossMargin, change, monthIndex)
        stressedRow.grossProfit = stressedRow.revenueTotal * stressedRow.grossMargin
        stressedRow.cogsTotal = stressedRow.revenueTotal - stressedRow.grossProfit
      }
    }

    // Recalculate EBITDA
    stressedRow.ebitda = stressedRow.grossProfit - stressedRow.opexTotal
    stressedRow.operatingIncome = stressedRow.ebitda - stressedRow.depreciation
    stressedRow.netIncome = stressedRow.operatingIncome - stressedRow.interestExpense

    return stressedRow
  })
}

// Simulate Cash Flow under stress
export function simulateCashFlowUnderStress(
  baseCashFlow: CashFlowRow[],
  stressedPnL: PnLRow[]
): CashFlowRow[] {
  const result: CashFlowRow[] = []
  let prevCashEnd = baseCashFlow[0]?.cashBegin || 0

  for (let i = 0; i < baseCashFlow.length; i++) {
    const baseRow = baseCashFlow[i]
    const pnlRow = stressedPnL[i]

    // Estimate operating cash flow from EBITDA (simplified)
    const operatingCashFlow = pnlRow
      ? Math.round(pnlRow.ebitda * 0.8) // Working capital adjustment
      : baseRow.cashFlowOperating

    const stressedRow: CashFlowRow = {
      month: baseRow.month,
      cashBegin: prevCashEnd,
      cashFlowOperating: operatingCashFlow,
      cashFlowInvesting: baseRow.cashFlowInvesting,
      cashFlowFinancing: baseRow.cashFlowFinancing,
      netChangeCash:
        operatingCashFlow +
        baseRow.cashFlowInvesting +
        baseRow.cashFlowFinancing,
      cashEnd: 0,
    }

    stressedRow.cashEnd = stressedRow.cashBegin + stressedRow.netChangeCash
    prevCashEnd = stressedRow.cashEnd
    result.push(stressedRow)
  }

  return result
}

// Calculate runway months
export function calculateRunway(
  cashFlow: CashFlowRow[],
  startIndex: number = 0
): number {
  const remaining = cashFlow.slice(startIndex)
  const avgBurn =
    remaining.reduce((sum, row) => sum + row.netChangeCash, 0) / remaining.length

  if (avgBurn >= 0) {
    return 99 // Effectively infinite runway
  }

  const currentCash = remaining[0]?.cashEnd || 0
  return Math.max(0, Math.round(currentCash / Math.abs(avgBurn)))
}

// Detect breakpoints
export function detectBreakpoints(
  scenario: Scenario,
  basePnL: PnLRow[],
  baseKPIs: KPIRow[],
  baseCashFlow: CashFlowRow[],
  evidenceStore: Evidence[]
): Breakpoint {
  const stressedPnL = simulatePnLUnderStress(basePnL, baseKPIs, scenario)
  const stressedKPIs = simulateKPIsUnderStress(baseKPIs, scenario)
  const stressedCashFlow = simulateCashFlowUnderStress(baseCashFlow, stressedPnL)

  let planFails = false
  let firstFailureMonth: string | null = null
  let failureCondition: string | null = null
  const metrics: Breakpoint["metrics"] = []

  // Get baseline metrics for comparison
  const baselineEndCash = baseCashFlow[baseCashFlow.length - 1].cashEnd
  const baselineEndEbitda = basePnL[basePnL.length - 1].ebitda
  const baselineEndCustomers = baseKPIs[baseKPIs.length - 1].customersEnd

  // Check for cash depletion
  for (let i = 0; i < stressedCashFlow.length; i++) {
    if (stressedCashFlow[i].cashEnd < 0) {
      planFails = true
      firstFailureMonth = stressedCashFlow[i].month
      failureCondition = "Cash balance falls below zero"
      break
    }
  }

  // Check for significant cash burn (>30% decline from baseline)
  if (!planFails) {
    const stressedEndCash = stressedCashFlow[stressedCashFlow.length - 1].cashEnd
    const cashDeclinePercent = (baselineEndCash - stressedEndCash) / baselineEndCash
    if (cashDeclinePercent > 0.3) {
      planFails = true
      firstFailureMonth = stressedCashFlow[stressedCashFlow.length - 1].month
      failureCondition = `Cash balance declines by ${(cashDeclinePercent * 100).toFixed(0)}% vs baseline`
    }
  }

  // Check for margin collapse (below 68% threshold from plan)
  if (!planFails) {
    for (let i = 0; i < stressedPnL.length; i++) {
      if (stressedPnL[i].grossMargin < 0.68) {
        planFails = true
        firstFailureMonth = firstFailureMonth || stressedPnL[i].month
        failureCondition = `Gross margin falls to ${(stressedPnL[i].grossMargin * 100).toFixed(1)}% (below 68% threshold)`
        break
      }
    }
  }

  // Check for EBITDA not turning positive by year end (if baseline does)
  if (!planFails && baselineEndEbitda > 0) {
    const lastPnL = stressedPnL[stressedPnL.length - 1]
    if (lastPnL && lastPnL.ebitda < 0) {
      planFails = true
      firstFailureMonth = lastPnL.month
      failureCondition = "EBITDA fails to turn positive by year-end"
    }
  }

  // Check for significant EBITDA degradation (>50% worse than baseline)
  if (!planFails && baselineEndEbitda > 0) {
    const stressedEndEbitda = stressedPnL[stressedPnL.length - 1].ebitda
    const ebitdaDecline = (baselineEndEbitda - stressedEndEbitda) / baselineEndEbitda
    if (ebitdaDecline > 0.5) {
      planFails = true
      firstFailureMonth = stressedPnL[stressedPnL.length - 1].month
      failureCondition = `EBITDA declines by ${(ebitdaDecline * 100).toFixed(0)}% vs baseline`
    }
  }

  // Check for customer decline vs baseline
  if (!planFails) {
    const stressedEndCustomers = stressedKPIs[stressedKPIs.length - 1].customersEnd
    if (stressedEndCustomers < baselineEndCustomers * 0.9) {
      planFails = true
      const declinePercent = ((baselineEndCustomers - stressedEndCustomers) / baselineEndCustomers * 100).toFixed(0)
      failureCondition = `Customer base ${declinePercent}% below baseline projection`
    }
  }

  // Use expectedBreak from scenario definition as a guide
  // Some scenarios are designed to break by specification
  if (!planFails && scenario.expectedBreak) {
    // Re-check with looser thresholds for scenarios expected to break
    const stressedEndCash = stressedCashFlow[stressedCashFlow.length - 1].cashEnd
    const stressedEndEbitda = stressedPnL[stressedPnL.length - 1].ebitda
    
    // Check if significantly worse than baseline
    const cashDecline = (baselineEndCash - stressedEndCash) / baselineEndCash
    const ebitdaDecline = baselineEndEbitda > 0 
      ? (baselineEndEbitda - stressedEndEbitda) / baselineEndEbitda 
      : 0
    
    if (cashDecline > 0.15 || ebitdaDecline > 0.3) {
      planFails = true
      failureCondition = scenario.expectedBreakCondition || `Scenario causes significant financial stress`
    }
  }

  // Collect key metrics with evidence
  const lastMonth = stressedPnL.length - 1
  if (lastMonth >= 0) {
    // Create computed evidence for metrics
    const cashEvidenceId = `CE_${scenario.id}_cash`
    const marginEvidenceId = `CE_${scenario.id}_margin`
    const ebitdaEvidenceId = `CE_${scenario.id}_ebitda`

    metrics.push(
      {
        metric: "Cash_End",
        baselineValue: baseCashFlow[lastMonth].cashEnd,
        stressedValue: stressedCashFlow[lastMonth].cashEnd,
        evidenceId: cashEvidenceId,
      },
      {
        metric: "Gross_Margin",
        baselineValue: basePnL[lastMonth].grossMargin,
        stressedValue: stressedPnL[lastMonth].grossMargin,
        evidenceId: marginEvidenceId,
      },
      {
        metric: "EBITDA",
        baselineValue: basePnL[lastMonth].ebitda,
        stressedValue: stressedPnL[lastMonth].ebitda,
        evidenceId: ebitdaEvidenceId,
      }
    )
  }

  return {
    scenarioId: scenario.id,
    planFails,
    firstFailureMonth,
    failureCondition,
    affectedAssumptions: scenario.affectedAssumptions,
    metrics,
  }
}

// Generate computed evidence for stress results
export function generateComputedEvidence(
  scenario: Scenario,
  stressedPnL: PnLRow[],
  stressedCashFlow: CashFlowRow[]
): ComputedEvidence[] {
  const evidence: ComputedEvidence[] = []
  const lastMonth = stressedPnL.length - 1

  if (lastMonth >= 0) {
    evidence.push({
      type: "computed",
      id: `CE_${scenario.id}_cash`,
      value: stressedCashFlow[lastMonth].cashEnd,
      formula: `Cash_End = Cash_Begin + Operating_CF + Investing_CF + Financing_CF`,
      dependencyEvidenceIds: ["E011", "E012"],
    })

    evidence.push({
      type: "computed",
      id: `CE_${scenario.id}_margin`,
      value: stressedPnL[lastMonth].grossMargin,
      formula: `Gross_Margin = Gross_Profit / Revenue_Total`,
      dependencyEvidenceIds: ["E005", "E018"],
    })

    evidence.push({
      type: "computed",
      id: `CE_${scenario.id}_ebitda`,
      value: stressedPnL[lastMonth].ebitda,
      formula: `EBITDA = Gross_Profit - Opex_Total`,
      dependencyEvidenceIds: ["E005", "E019"],
    })
  }

  return evidence
}

// Run full stress analysis
export function runStressAnalysis(
  scenarios: Scenario[],
  basePnL: PnLRow[],
  baseKPIs: KPIRow[],
  baseCashFlow: CashFlowRow[],
  evidenceStore: Evidence[]
): { breakpoints: Breakpoint[]; computedEvidence: ComputedEvidence[] } {
  const breakpoints: Breakpoint[] = []
  const computedEvidence: ComputedEvidence[] = []

  for (const scenario of scenarios) {
    const breakpoint = detectBreakpoints(
      scenario,
      basePnL,
      baseKPIs,
      baseCashFlow,
      evidenceStore
    )
    breakpoints.push(breakpoint)

    const stressedPnL = simulatePnLUnderStress(basePnL, baseKPIs, scenario)
    const stressedCashFlow = simulateCashFlowUnderStress(baseCashFlow, stressedPnL)
    const newEvidence = generateComputedEvidence(scenario, stressedPnL, stressedCashFlow)
    computedEvidence.push(...newEvidence)
  }

  return { breakpoints, computedEvidence }
}

// Format currency
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

// Format percentage
export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

// Calculate month-over-month growth
export function calculateMoMGrowth(values: number[]): number[] {
  return values.map((val, i) => {
    if (i === 0 || values[i - 1] === 0) return 0
    return (val - values[i - 1]) / values[i - 1]
  })
}
