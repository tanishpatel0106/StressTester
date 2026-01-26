"use server"

import { generateObject } from "ai"
import { z } from "zod"
import type {
  Assumption,
  Scenario,
  Mitigation,
  PnLRow,
  KPIRow,
  CashFlowRow,
  BalanceSheetRow,
} from "@/lib/types"

// Use OpenAI model via Vercel AI Gateway
const AI_MODEL = "openai/gpt-4o"

// Simpler schemas that are easier for the model to match

// Extract assumptions from financial data using AI
export async function extractAssumptions(
  pnl: PnLRow[],
  kpis: KPIRow[],
  cashFlow: CashFlowRow[],
  balanceSheet: BalanceSheetRow[]
): Promise<Assumption[]> {
  const financialSummary = {
    revenue: {
      start: pnl[0]?.revenue,
      end: pnl[pnl.length - 1]?.revenue,
      growth: pnl.length > 1 ? ((pnl[pnl.length - 1].revenue - pnl[0].revenue) / pnl[0].revenue) : 0,
    },
    grossMargin: {
      average: pnl.reduce((sum, row) => sum + row.grossMargin, 0) / pnl.length,
      trend: pnl[pnl.length - 1]?.grossMargin - pnl[0]?.grossMargin,
    },
    customers: {
      start: kpis[0]?.customersEnd,
      end: kpis[kpis.length - 1]?.customersEnd,
      avgChurn: kpis.reduce((sum, row) => sum + row.churnRate, 0) / kpis.length,
      avgArpu: kpis.reduce((sum, row) => sum + row.arpu, 0) / kpis.length,
    },
    cash: {
      start: cashFlow[0]?.cashStart,
      end: cashFlow[cashFlow.length - 1]?.cashEnd,
      totalBurn: cashFlow.reduce((sum, row) => sum + Math.min(0, row.operatingCF), 0),
    },
    ebitda: {
      start: pnl[0]?.ebitda,
      end: pnl[pnl.length - 1]?.ebitda,
      turnsPositive: pnl.findIndex((row) => row.ebitda > 0),
    },
  }

  const prompt = `You are a financial analyst. Analyze this data and extract 15-20 key assumptions.

DATA:
${JSON.stringify(financialSummary, null, 2)}

P&L (first 3 months):
${JSON.stringify(pnl.slice(0, 3), null, 2)}

KPIs (first 3 months):
${JSON.stringify(kpis.slice(0, 3), null, 2)}

Return a JSON object with an "assumptions" array. Each assumption must have:
- id: string like "A1", "A2", etc.
- label: short name (string)
- description: detailed description (string)
- category: one of "revenue", "cost", "growth", "churn", "pricing"
- baselineValue: number from the data
- unit: string like "%", "$", "count"
- riskScore: number from 0 to 100
- fragility: number from 0 to 1
- impact: number from 0 to 1
- rationale: why this risk level (string)`

  try {
    const { object } = await generateObject({
      model: AI_MODEL,
      output: "object",
      schema: z.object({
        assumptions: z.array(
          z.object({
            id: z.string(),
            label: z.string(),
            description: z.string(),
            category: z.string(),
            baselineValue: z.number(),
            unit: z.string(),
            riskScore: z.number(),
            fragility: z.number(),
            impact: z.number(),
            rationale: z.string(),
          })
        ),
      }),
      prompt,
    })

    return object.assumptions.map((a, idx) => {
      const validCategories = ["revenue", "cost", "growth", "churn", "pricing", "headcount", "capex", "working_capital", "macro"]
      const normalizedCategory = validCategories.includes(a.category.toLowerCase()) 
        ? a.category.toLowerCase() 
        : "revenue"
      
      return {
        ...a,
        category: normalizedCategory as Assumption["category"],
        riskScore: Math.max(0, Math.min(100, a.riskScore)),
        fragility: Math.max(0, Math.min(1, a.fragility)),
        impact: Math.max(0, Math.min(1, a.impact)),
        evidenceIds: [`ev-${normalizedCategory}-${idx}`],
        linkedMetrics: [],
      }
    })
  } catch (error) {
    console.error("[v0] extractAssumptions error:", error)
    throw error
  }
}

// Generate stress scenarios using AI
export async function generateScenarios(
  assumptions: Assumption[],
  pnl: PnLRow[],
  kpis: KPIRow[]
): Promise<Scenario[]> {
  const allowedMetrics = [
    "CAC",
    "Churn_Rate",
    "ARPU",
    "Marketing_Spend",
    "Headcount",
    "Gross_Margin",
    "Customers_End",
    "New_Customers",
    "LTV",
    "COGS_Hosting",
    "COGS_Support",
    "Opex_Total",
  ] as const

  const assumptionSummary = assumptions.slice(0, 10).map((a) => ({
    id: a.id,
    label: a.label || a.statement,
    category: a.category,
    riskScore: a.riskScore,
  }))

  const prompt = `Generate 10 stress test scenarios for this business.

ASSUMPTIONS:
${JSON.stringify(assumptionSummary, null, 2)}

CONTEXT:
- Starting revenue: $${pnl[0]?.revenue?.toLocaleString()}
- Starting customers: ${kpis[0]?.customersEnd}
- Avg churn: ${(kpis.reduce((s, k) => s + k.churnRate, 0) / kpis.length * 100).toFixed(1)}%

Return a JSON object with a "scenarios" array. Each scenario must have:
- id: string like "SC1", "SC2", etc.
- name: short name (string)
- description: what happens (string)
- severity: one of "low", "moderate", "high", "critical"
- probability: number from 0 to 1
- affectedAssumptions: array of assumption IDs like ["A1", "A2"]
- expectedBreak: boolean (true if scenario would break the plan)
- breakReason: string explaining why it breaks (or empty string if it doesn't)
- changes: array of 1-3 objects with:
  - metric: one of ${allowedMetrics.join(", ")}
  - mode: one of "add", "multiply", "set"
  - value: number
  - durationMonths: positive integer (>= 1)`

  try {
    const { object } = await generateObject({
      model: AI_MODEL,
      output: "object",
      schema: z.object({
        scenarios: z.array(
          z.object({
            id: z.string(),
            name: z.string(),
            description: z.string(),
            severity: z.string(),
            probability: z.number(),
            affectedAssumptions: z.array(z.string()),
            expectedBreak: z.boolean(),
            breakReason: z.string(),
            changes: z.array(
              z.object({
                metric: z.enum(allowedMetrics),
                mode: z.enum(["add", "multiply", "set"]),
                value: z.number(),
                durationMonths: z.number(),
              })
            ),
          })
        ),
      }),
      prompt,
    })

    return object.scenarios.map(s => {
      const validSeverities = ["low", "moderate", "high", "critical", "severe"]
      const normalizedSeverity = validSeverities.includes(s.severity.toLowerCase())
        ? s.severity.toLowerCase() as "low" | "moderate" | "high" | "critical" | "severe"
        : "moderate"

      const sanitizedChanges = s.changes
        .filter((change) => allowedMetrics.includes(change.metric))
        .map((change) => ({
          ...change,
          durationMonths: Math.max(1, Math.round(change.durationMonths)),
        }))

      const fallbackChange = (() => {
        switch (normalizedSeverity) {
          case "low":
            return { metric: "ARPU", mode: "multiply", value: 0.97, durationMonths: 4 }
          case "moderate":
            return { metric: "ARPU", mode: "multiply", value: 0.93, durationMonths: 6 }
          case "high":
            return { metric: "ARPU", mode: "multiply", value: 0.85, durationMonths: 9 }
          case "critical":
          case "severe":
            return { metric: "ARPU", mode: "multiply", value: 0.75, durationMonths: 12 }
          default:
            return { metric: "ARPU", mode: "multiply", value: 0.95, durationMonths: 6 }
        }
      })()
      
      return {
        ...s,
        severity: normalizedSeverity,
        probability: Math.max(0, Math.min(1, s.probability)),
        changes: sanitizedChanges.length > 0 ? sanitizedChanges : [fallbackChange],
        rationale: s.description,
        expectedBreakCondition: s.breakReason || null,
        shockMagnitudes: {},
        triggerConditions: [],
      }
    })
  } catch (error) {
    console.error("[v0] generateScenarios error:", error)
    throw error
  }
}

// Generate mitigation playbook using AI
export async function generateMitigation(
  scenario: Scenario,
  assumptions: Assumption[],
  breakpointInfo?: { planFails: boolean; failureCondition: string | null }
): Promise<Mitigation> {
  const prompt = `Create a mitigation playbook for this scenario.

SCENARIO: ${scenario.name}
${scenario.description || scenario.rationale}
SEVERITY: ${scenario.severity}
BREAKS PLAN: ${breakpointInfo?.planFails ? "Yes" : "No"}

Return a JSON object with:
- preventiveActions: array of objects with {action, timing, cost, effectiveness}
  - action: what to do (string)
  - timing: when (string)
  - cost: estimated cost (string)
  - effectiveness: number from 0 to 1
- contingencyActions: array of objects with {trigger, action, timeline, impact}
  - trigger: what triggers this (string)
  - action: what to do (string)
  - timeline: how fast (string)
  - impact: expected result (string)
- monitoringMetrics: array of objects with {metric, threshold, frequency}
  - metric: what to monitor (string)
  - threshold: warning level (string)
  - frequency: how often (string)

Provide 3-4 items in each array.`

  try {
    const { object } = await generateObject({
      model: AI_MODEL,
      output: "object",
      schema: z.object({
        preventiveActions: z.array(
          z.object({
            action: z.string(),
            timing: z.string(),
            cost: z.string(),
            effectiveness: z.number(),
          })
        ),
        contingencyActions: z.array(
          z.object({
            trigger: z.string(),
            action: z.string(),
            timeline: z.string(),
            impact: z.string(),
          })
        ),
        monitoringMetrics: z.array(
          z.object({
            metric: z.string(),
            threshold: z.string(),
            frequency: z.string(),
          })
        ),
      }),
      prompt,
    })

    return {
      scenarioId: scenario.id,
      preventiveActions: object.preventiveActions.map(a => ({
        ...a,
        effectiveness: Math.max(0, Math.min(1, a.effectiveness)),
      })),
      contingencyActions: object.contingencyActions,
      monitoringMetrics: object.monitoringMetrics,
    }
  } catch (error) {
    console.error("[v0] generateMitigation error:", error)
    throw error
  }
}

// Generate executive summary using AI
export async function generateExecutiveSummary(
  assumptions: Assumption[],
  scenarios: Scenario[],
  breakingScenarios: string[],
  pnl: PnLRow[],
  cashFlow: CashFlowRow[]
): Promise<{
  overallRiskRating: "low" | "moderate" | "high" | "critical"
  keyFindings: string[]
  topRisks: { risk: string; likelihood: string; impact: string }[]
  recommendations: string[]
}> {
  const topRiskyAssumptions = [...assumptions]
    .sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0))
    .slice(0, 5)

  const prompt = `Provide an executive summary of this stress test.

TOP RISKY ASSUMPTIONS:
${JSON.stringify(topRiskyAssumptions.map((a) => ({ label: a.label || a.statement, riskScore: a.riskScore })), null, 2)}

SCENARIOS: ${scenarios.length} tested, ${breakingScenarios.length} breaking

FINANCIALS:
- Revenue: $${pnl[0]?.revenue?.toLocaleString()} to $${pnl[pnl.length - 1]?.revenue?.toLocaleString()}
- Cash: $${cashFlow[0]?.cashStart?.toLocaleString()} to $${cashFlow[cashFlow.length - 1]?.cashEnd?.toLocaleString()}

Return a JSON object with:
- overallRiskRating: one of "low", "moderate", "high", "critical"
- keyFindings: array of 3-5 key finding strings
- topRisks: array of 3-5 objects with {risk, likelihood, impact} (all strings)
- recommendations: array of 3-5 recommendation strings`

  try {
    const { object } = await generateObject({
      model: AI_MODEL,
      output: "object",
      schema: z.object({
        overallRiskRating: z.string(),
        keyFindings: z.array(z.string()),
        topRisks: z.array(
          z.object({
            risk: z.string(),
            likelihood: z.string(),
            impact: z.string(),
          })
        ),
        recommendations: z.array(z.string()),
      }),
      prompt,
    })

    const validRatings = ["low", "moderate", "high", "critical"]
    const normalizedRating = validRatings.includes(object.overallRiskRating.toLowerCase())
      ? object.overallRiskRating.toLowerCase() as "low" | "moderate" | "high" | "critical"
      : "moderate"

    return {
      overallRiskRating: normalizedRating,
      keyFindings: object.keyFindings,
      topRisks: object.topRisks,
      recommendations: object.recommendations,
    }
  } catch (error) {
    console.error("[v0] generateExecutiveSummary error:", error)
    throw error
  }
}
