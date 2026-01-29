// Legacy analysis helpers for the /api/restaurant routes.

import type {
  AnalysisAssumption,
  AnalysisScenario,
  AnalysisScenarioResult,
  AnalysisMitigation,
  BaselineKPIs,
  ExecutiveSummary,
} from "./types"

type RawDataRow = Record<string, number | string | null | undefined>

const sumField = (rows: RawDataRow[], fields: string[]): number => {
  return rows.reduce((total, row) => {
    const value = fields.reduce<number | null>((found, field) => {
      if (found !== null) return found
      const raw = row[field]
      const parsed = typeof raw === "number" ? raw : Number(raw)
      return Number.isFinite(parsed) ? parsed : null
    }, null)

    return total + (value ?? 0)
  }, 0)
}

const getLatestValue = (rows: RawDataRow[], fields: string[]): number => {
  for (let i = rows.length - 1; i >= 0; i -= 1) {
    const row = rows[i]
    for (const field of fields) {
      const raw = row[field]
      const parsed = typeof raw === "number" ? raw : Number(raw)
      if (Number.isFinite(parsed)) return parsed
    }
  }
  return 0
}

export function computeBaselineKPIs(rawData: unknown): BaselineKPIs {
  const rows = Array.isArray(rawData) ? (rawData as RawDataRow[]) : []

  const revenue = sumField(rows, ["total_revenue", "revenue", "sales", "totalRevenue"])
  const foodCost = sumField(rows, ["cost_of_goods_sold", "cogs", "costOfGoodsSold"])
  const laborCost = sumField(rows, ["wage_costs", "labor_costs", "laborCosts", "wages"])
  const operatingExpenses = sumField(rows, ["operating_expenses", "operatingExpenses"])
  const nonOperatingExpenses = sumField(rows, ["non_operating_expenses", "nonOperatingExpenses"])

  const ebitda = revenue - foodCost - laborCost - operatingExpenses - nonOperatingExpenses
  const denominator = revenue || 1
  const cashBalance = getLatestValue(rows, ["cash_balance", "cashBalance", "cash"])
  const averageMonthlyBurn = rows.length > 0 && ebitda < 0 ? Math.abs(ebitda / rows.length) : 0
  const runwayMonths = averageMonthlyBurn > 0 ? Math.max(0, Math.floor(cashBalance / averageMonthlyBurn)) : 0

  return {
    revenue,
    foodCostPercent: foodCost / denominator,
    laborCostPercent: laborCost / denominator,
    primeCostPercent: (foodCost + laborCost) / denominator,
    ebitda,
    ebitdaMargin: ebitda / denominator,
    cashBalance,
    runwayMonths,
  }
}

export function runScenario(
  _rawData: unknown,
  baselineKPIs: BaselineKPIs,
  _assumptions: AnalysisAssumption[],
  scenario: AnalysisScenario
): AnalysisScenarioResult {
  const severityMultiplier = {
    low: 0.02,
    moderate: 0.05,
    high: 0.1,
    critical: 0.2,
  }[scenario.severity]

  const revenueDelta = baselineKPIs.revenue * -severityMultiplier
  const ebitdaDelta = baselineKPIs.ebitda * -severityMultiplier
  const breaks = scenario.severity === "critical" || baselineKPIs.ebitda + ebitdaDelta < 0

  return {
    breaks,
    breakReason: breaks ? "Projected EBITDA turns negative under this scenario." : undefined,
    kpiDelta: {
      revenueChange: revenueDelta,
      ebitdaChange: ebitdaDelta,
    },
  }
}

export async function extractAssumptions(
  _rawData: unknown,
  baselineKPIs: BaselineKPIs
): Promise<AnalysisAssumption[]> {
  return [
    {
      id: "A1",
      label: "Baseline revenue",
      category: "revenue",
      value: baselineKPIs.revenue,
      unit: "$",
      riskScore: 50,
      rationale: "Derived from the uploaded baseline revenue totals.",
    },
    {
      id: "A2",
      label: "Food cost percentage",
      category: "costs",
      value: baselineKPIs.foodCostPercent * 100,
      unit: "%",
      riskScore: 45,
      rationale: "Computed from baseline COGS over revenue.",
    },
    {
      id: "A3",
      label: "Labor cost percentage",
      category: "costs",
      value: baselineKPIs.laborCostPercent * 100,
      unit: "%",
      riskScore: 40,
      rationale: "Computed from baseline labor costs over revenue.",
    },
  ]
}

export async function generateScenarios(
  _assumptions: AnalysisAssumption[],
  _baselineKPIs: BaselineKPIs
): Promise<AnalysisScenario[]> {
  return [
    {
      id: "S1",
      name: "Moderate demand dip",
      description: "Seasonal softness reduces revenue by a few points.",
      severity: "moderate",
      probability: 0.3,
    },
    {
      id: "S2",
      name: "Labor cost spike",
      description: "Unexpected wage inflation pressures margins.",
      severity: "high",
      probability: 0.2,
    },
    {
      id: "S3",
      name: "Critical margin compression",
      description: "Combined revenue decline and cost inflation.",
      severity: "critical",
      probability: 0.1,
    },
  ]
}

export async function generateMitigations(
  scenario: AnalysisScenario,
  _assumptions: AnalysisAssumption[],
  _baselineKPIs: BaselineKPIs
): Promise<AnalysisMitigation> {
  return {
    scenarioId: scenario.id,
    preventiveActions: [
      {
        action: "Review weekly labor scheduling against demand signals.",
        timing: "Immediate",
        cost: "Low",
        effectiveness: 0.6,
      },
    ],
    contingencyActions: [
      {
        trigger: "Revenue tracking below plan for 2 consecutive weeks.",
        action: "Launch targeted promotions and adjust staffing.",
        timeline: "2 weeks",
        impact: "Stabilize revenue and reduce labor overages.",
      },
    ],
    monitoringMetrics: [
      {
        metric: "Weekly revenue vs. plan",
        threshold: "Below plan by 5%",
        frequency: "Weekly",
      },
    ],
  }
}

export async function generateExecutiveSummary(
  assumptions: AnalysisAssumption[],
  scenarios: AnalysisScenario[],
  scenarioResults: AnalysisScenarioResult[],
  _baselineKPIs: BaselineKPIs
): Promise<ExecutiveSummary> {
  const breakingCount = scenarioResults.filter(result => result.breaks).length
  const overallRiskRating =
    breakingCount === 0
      ? "low"
      : breakingCount >= scenarios.length
        ? "critical"
        : breakingCount >= Math.ceil(scenarios.length / 2)
          ? "high"
          : "moderate"

  return {
    overallRiskRating,
    keyFindings: [
      `${assumptions.length} assumptions analyzed across ${scenarios.length} scenarios.`,
      `${breakingCount} scenarios are projected to break the plan.`,
      "Focus on proactive margin monitoring to reduce downside exposure.",
    ],
    topRisks: [
      {
        risk: "Revenue softness",
        likelihood: "Medium",
        impact: "High",
      },
      {
        risk: "Cost inflation",
        likelihood: "Medium",
        impact: "Medium",
      },
    ],
    recommendations: [
      "Tighten labor scheduling to match demand volatility.",
      "Negotiate supplier contracts for price stability.",
      "Increase monitoring cadence for weekly margin KPIs.",
    ],
  }
}
