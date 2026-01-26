// Restaurant Stress-Testing Copilot - AI Client
// Provider-agnostic LLM interface with OpenAI and Mock adapters

"use server"

import { generateObject } from "ai"
import type {
  ContextPack,
  Assumption,
  Scenario,
  Mitigation,
  AIAssumptionsResponse,
  AIScenariosResponse,
  AIMitigationsResponse,
} from "./types"
import {
  AIAssumptionsResponseSchema,
  AIScenariosResponseSchema,
  AIMitigationsResponseSchema,
} from "./schemas"

// =============================================================================
// PROMPTS
// =============================================================================

const SYSTEM_PROMPT = `You are a restaurant financial analyst AI assistant. Your role is to help analyze restaurant financial data and generate insights.

CRITICAL RULES:
1. You NEVER create new top-level KPIs. The KPI spine is fixed: TOTAL_REVENUE, COST_OF_GOODS_SOLD, GROSS_PROFIT, WAGE_COSTS, OPERATING_EXPENSES, NON_OPERATING_EXPENSES, NET_PROFIT.
2. You NEVER compute KPIs - all calculations are done by the engine.
3. You MUST reference evidence IDs when making claims.
4. Scenarios shock ASSUMPTIONS, not KPIs directly.
5. Mitigations modify DRIVERS (like menu_price, labor_hours), not KPIs directly.
6. If evidence is weak or missing, set confidence to "low" and needs_user_confirmation to true.
`

const ASSUMPTIONS_PROMPT = (context: ContextPack) => `
Analyze this restaurant's financial data and extract key assumptions.

Restaurant: ${context.metadata.name}
Data Period: ${context.kpi_series[0]?.date} to ${context.kpi_series[context.kpi_series.length - 1]?.date}

KPI Summary (derived metrics):
- Gross Margin: ${context.derived_summary.gross_margin_pct.mean.toFixed(1)}% (trend: ${context.derived_summary.gross_margin_pct.trend})
- COGS %: ${context.derived_summary.cogs_pct.mean.toFixed(1)}% (volatility: ${context.derived_summary.cogs_pct.volatility.toFixed(2)})
- Wage %: ${context.derived_summary.wage_pct.mean.toFixed(1)}% (trend: ${context.derived_summary.wage_pct.trend})
- Prime Cost %: ${context.derived_summary.prime_cost_pct.mean.toFixed(1)}%
- Net Margin: ${context.derived_summary.net_margin.mean.toFixed(1)}%

Available Evidence IDs: ${context.evidence_registry.slice(0, 20).map(e => e.id).join(', ')}...

Generate 8-12 assumptions covering:
- Revenue drivers (pricing, traffic, seasonality)
- COGS drivers (food costs, supplier pricing)
- Wage drivers (staffing, hourly rates)
- Operating expense drivers
- External factors (competition, economy)

Each assumption must have:
- A unique ID (A1, A2, etc.)
- Clear label and description
- Baseline value with min/max range
- Evidence references (use actual evidence IDs from the list)
- Confidence level (high/medium/low)
- If evidence is weak, set needs_user_confirmation: true
`

const SCENARIOS_PROMPT = (context: ContextPack, assumptions: Assumption[]) => `
Generate stress test scenarios for this restaurant based on the approved assumptions.

Restaurant: ${context.metadata.name}

Assumptions to stress:
${assumptions.map(a => `- ${a.id}: ${a.label} (baseline: ${a.baseline_value} ${a.unit}, category: ${a.category})`).join('\n')}

Generate 5-8 scenarios covering:
1. Revenue decline scenarios (customer drop, competition)
2. Cost increase scenarios (food prices, labor costs)
3. Combined stress scenarios (recession, pandemic-like)
4. Seasonality scenarios
5. External shock scenarios

CRITICAL: Scenarios must shock ASSUMPTIONS by their IDs, not KPIs directly.
Each scenario should have:
- Unique ID (S1, S2, etc.)
- Clear name and description
- Severity (low/moderate/high/critical)
- Probability (0-1)
- List of assumption_shocks with:
  - assumption_id (must match an assumption ID like A1, A2)
  - shock_type (multiply, add, or set)
  - shock_value (the multiplier, addend, or absolute value)
  - duration_months (optional)
`

const MITIGATIONS_PROMPT = (scenario: Scenario, assumptions: Assumption[]) => `
Generate mitigation strategies for this scenario.

Scenario: ${scenario.name}
Description: ${scenario.description}
Severity: ${scenario.severity}
Expected Impact: ${scenario.expected_impact}

Shocks applied:
${scenario.assumption_shocks.map(s => {
  const assumption = assumptions.find(a => a.id === s.assumption_id)
  return `- ${s.assumption_id} (${assumption?.label || 'Unknown'}): ${s.shock_type} by ${s.shock_value}`
}).join('\n')}

Generate 3-5 mitigations with:
- Unique ID (M1, M2, etc.)
- Clear name and description
- Category (revenue, cost_reduction, efficiency, hedging, contingency)
- Driver modifications (what levers to pull):
  - driver: the operational lever (menu_price, food_cost, labor_hours, staff_count, marketing, etc.)
  - modification_type: increase, decrease, or replace
  - target_value: the change amount (percentage or absolute)
  - unit: %, $, or count
  - implementation_cost: estimated cost to implement
  - time_to_implement_days: how long to implement
- Expected impact on net_profit, prime_cost, and gross_margin (as percentage changes)
- Prerequisites and risks

CRITICAL: Mitigations modify DRIVERS, not KPIs directly.
`

// =============================================================================
// MOCK DATA (for USE_MOCK_LLM=true)
// =============================================================================

const MOCK_ASSUMPTIONS: Assumption[] = [
  {
    id: "A1",
    label: "Average Check",
    description: "Average revenue per customer visit",
    category: "revenue",
    baseline_value: 35,
    range_min: 30,
    range_max: 45,
    unit: "$",
    evidence_refs: ["E1", "E2"],
    confidence: "high",
    needs_user_confirmation: false,
    rationale: "Based on historical transaction data showing consistent average check",
    version: 1,
    approved: false,
  },
  {
    id: "A2",
    label: "Daily Covers",
    description: "Average number of customers served per day",
    category: "revenue",
    baseline_value: 150,
    range_min: 100,
    range_max: 200,
    unit: "count",
    evidence_refs: ["E3", "E4"],
    confidence: "medium",
    needs_user_confirmation: true,
    rationale: "Derived from revenue and average check, but varies by day",
    version: 1,
    approved: false,
  },
  {
    id: "A3",
    label: "Food Cost Ratio",
    description: "COGS as percentage of revenue",
    category: "cogs",
    baseline_value: 32,
    range_min: 28,
    range_max: 38,
    unit: "%",
    evidence_refs: ["E5", "E6"],
    confidence: "high",
    needs_user_confirmation: false,
    rationale: "Consistent with industry benchmarks and historical data",
    version: 1,
    approved: false,
  },
  {
    id: "A4",
    label: "Labor Cost Ratio",
    description: "Wage costs as percentage of revenue",
    category: "wages",
    baseline_value: 28,
    range_min: 25,
    range_max: 35,
    unit: "%",
    evidence_refs: ["E7", "E8"],
    confidence: "high",
    needs_user_confirmation: false,
    rationale: "Based on payroll data and industry standards",
    version: 1,
    approved: false,
  },
  {
    id: "A5",
    label: "Rent Expense",
    description: "Monthly rent and occupancy costs",
    category: "operating_expenses",
    baseline_value: 8000,
    range_min: 8000,
    range_max: 8500,
    unit: "$",
    evidence_refs: ["E9"],
    confidence: "high",
    needs_user_confirmation: false,
    rationale: "Fixed lease agreement",
    version: 1,
    approved: false,
  },
  {
    id: "A6",
    label: "Seasonality Factor",
    description: "Revenue variation due to seasonal patterns",
    category: "seasonality",
    baseline_value: 1.0,
    range_min: 0.8,
    range_max: 1.3,
    unit: "multiplier",
    evidence_refs: ["E10", "E11"],
    confidence: "medium",
    needs_user_confirmation: true,
    rationale: "Historical patterns show summer peak and winter dip",
    version: 1,
    approved: false,
  },
]

const MOCK_SCENARIOS: Scenario[] = [
  {
    id: "S1",
    name: "Customer Traffic Decline",
    description: "20% reduction in daily covers due to increased competition",
    severity: "moderate",
    probability: 0.3,
    assumption_shocks: [
      { assumption_id: "A2", shock_type: "multiply", shock_value: 0.8 },
    ],
    trigger_conditions: ["New competitor opens within 1 mile", "Negative reviews"],
    expected_impact: "Revenue decline of ~20%, net profit significantly impacted",
    evidence_refs: ["E3"],
    version: 1,
    approved: false,
  },
  {
    id: "S2",
    name: "Food Cost Spike",
    description: "15% increase in food costs due to supply chain disruption",
    severity: "high",
    probability: 0.2,
    assumption_shocks: [
      { assumption_id: "A3", shock_type: "multiply", shock_value: 1.15 },
    ],
    trigger_conditions: ["Supply chain disruption", "Commodity price increase"],
    expected_impact: "Gross margin compression, pressure on net profit",
    evidence_refs: ["E5", "E6"],
    version: 1,
    approved: false,
  },
  {
    id: "S3",
    name: "Labor Cost Increase",
    description: "Minimum wage increase leads to 10% higher labor costs",
    severity: "moderate",
    probability: 0.4,
    assumption_shocks: [
      { assumption_id: "A4", shock_type: "multiply", shock_value: 1.1 },
    ],
    trigger_conditions: ["Minimum wage legislation", "Labor market tightening"],
    expected_impact: "Prime cost increase, margin pressure",
    evidence_refs: ["E7", "E8"],
    version: 1,
    approved: false,
  },
  {
    id: "S4",
    name: "Perfect Storm",
    description: "Combined revenue decline and cost increases (recession scenario)",
    severity: "critical",
    probability: 0.1,
    assumption_shocks: [
      { assumption_id: "A2", shock_type: "multiply", shock_value: 0.75 },
      { assumption_id: "A3", shock_type: "multiply", shock_value: 1.1 },
      { assumption_id: "A4", shock_type: "multiply", shock_value: 1.05 },
    ],
    trigger_conditions: ["Economic recession", "Consumer spending decline"],
    expected_impact: "Severe profitability impact, potential cash flow crisis",
    evidence_refs: [],
    version: 1,
    approved: false,
  },
]

const MOCK_MITIGATIONS: Mitigation[] = [
  {
    id: "M1",
    scenario_id: "S1",
    name: "Menu Price Optimization",
    description: "Increase prices on high-margin items by 5-8%",
    category: "revenue",
    driver_modifications: [
      {
        driver: "menu_price",
        modification_type: "increase",
        target_value: 7,
        unit: "%",
        implementation_cost: 500,
        time_to_implement_days: 7,
      },
    ],
    expected_impact: {
      net_profit_change: 3,
      prime_cost_change: 0,
      gross_margin_change: 2,
    },
    prerequisites: ["Menu engineering analysis", "Competitor price check"],
    risks: ["Customer pushback", "Reduced traffic"],
    evidence_refs: ["E1"],
    enabled: true,
    version: 1,
    approved: false,
  },
  {
    id: "M2",
    scenario_id: "S2",
    name: "Supplier Renegotiation",
    description: "Negotiate better terms with suppliers or find alternatives",
    category: "cost_reduction",
    driver_modifications: [
      {
        driver: "supplier_cost",
        modification_type: "decrease",
        target_value: 5,
        unit: "%",
        implementation_cost: 0,
        time_to_implement_days: 30,
      },
    ],
    expected_impact: {
      net_profit_change: 2,
      prime_cost_change: -3,
      gross_margin_change: 1.5,
    },
    prerequisites: ["Supplier market research", "Volume commitments"],
    risks: ["Quality concerns", "Transition period"],
    evidence_refs: ["E5"],
    enabled: true,
    version: 1,
    approved: false,
  },
  {
    id: "M3",
    scenario_id: "S3",
    name: "Labor Efficiency Program",
    description: "Optimize scheduling and cross-train staff",
    category: "efficiency",
    driver_modifications: [
      {
        driver: "labor_hours",
        modification_type: "decrease",
        target_value: 8,
        unit: "%",
        implementation_cost: 2000,
        time_to_implement_days: 60,
      },
    ],
    expected_impact: {
      net_profit_change: 4,
      prime_cost_change: -5,
      gross_margin_change: 0,
    },
    prerequisites: ["Scheduling software", "Staff training"],
    risks: ["Service quality impact", "Staff morale"],
    evidence_refs: ["E7"],
    enabled: true,
    version: 1,
    approved: false,
  },
]

// =============================================================================
// LLM CLIENT INTERFACE
// =============================================================================

export async function generateAssumptions(
  contextPack: ContextPack,
  useMock: boolean = false
): Promise<AIAssumptionsResponse> {
  if (useMock || process.env.USE_MOCK_LLM === "true") {
    // Return mock data with simulated delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    return {
      assumptions: MOCK_ASSUMPTIONS,
      warnings: [],
      needs_review: ["A2", "A6"],
    }
  }

  try {
    const { object } = await generateObject({
      model: "openai/gpt-4o",
      schema: AIAssumptionsResponseSchema,
      system: SYSTEM_PROMPT,
      prompt: ASSUMPTIONS_PROMPT(contextPack),
      output: "object",
    })

    // Normalize and validate the output
    const normalizedAssumptions = object.assumptions.map((a, idx) => ({
      ...a,
      id: a.id || `A${idx + 1}`,
      version: 1,
      approved: false,
      confidence: normalizeConfidence(a.confidence),
      category: normalizeCategory(a.category),
    }))

    const needsReview = normalizedAssumptions
      .filter(a => a.needs_user_confirmation || a.confidence === 'low')
      .map(a => a.id)

    return {
      assumptions: normalizedAssumptions as Assumption[],
      warnings: [],
      needs_review: needsReview,
    }
  } catch (error) {
    console.error("[Restaurant AI] Error generating assumptions:", error)
    // Fallback to mock data on error
    return {
      assumptions: MOCK_ASSUMPTIONS,
      warnings: ["AI generation failed, using fallback assumptions"],
      needs_review: ["A2", "A6"],
    }
  }
}

export async function generateScenarios(
  contextPack: ContextPack,
  assumptions: Assumption[],
  useMock: boolean = false
): Promise<AIScenariosResponse> {
  if (useMock || process.env.USE_MOCK_LLM === "true") {
    await new Promise(resolve => setTimeout(resolve, 1000))
    return {
      scenarios: MOCK_SCENARIOS,
      warnings: [],
    }
  }

  try {
    const { object } = await generateObject({
      model: "openai/gpt-4o",
      schema: AIScenariosResponseSchema,
      system: SYSTEM_PROMPT,
      prompt: SCENARIOS_PROMPT(contextPack, assumptions),
      output: "object",
    })

    // Validate that scenarios reference valid assumption IDs
    const validAssumptionIds = new Set(assumptions.map(a => a.id))
    const warnings: string[] = []

    const normalizedScenarios = object.scenarios.map((s, idx) => {
      const validShocks = s.assumption_shocks.filter(shock => {
        if (!validAssumptionIds.has(shock.assumption_id)) {
          warnings.push(`Scenario ${s.id}: Invalid assumption reference ${shock.assumption_id}`)
          return false
        }
        return true
      })

      return {
        ...s,
        id: s.id || `S${idx + 1}`,
        assumption_shocks: validShocks.map(shock => ({
          ...shock,
          shock_type: normalizeShockType(shock.shock_type),
        })),
        severity: normalizeSeverity(s.severity),
        probability: Math.max(0, Math.min(1, s.probability)),
        version: 1,
        approved: false,
      }
    })

    return {
      scenarios: normalizedScenarios as Scenario[],
      warnings,
    }
  } catch (error) {
    console.error("[Restaurant AI] Error generating scenarios:", error)
    return {
      scenarios: MOCK_SCENARIOS,
      warnings: ["AI generation failed, using fallback scenarios"],
    }
  }
}

export async function generateMitigations(
  scenario: Scenario,
  assumptions: Assumption[],
  useMock: boolean = false
): Promise<AIMitigationsResponse> {
  if (useMock || process.env.USE_MOCK_LLM === "true") {
    await new Promise(resolve => setTimeout(resolve, 1000))
    const relevantMitigations = MOCK_MITIGATIONS.filter(m => m.scenario_id === scenario.id)
    return {
      mitigations: relevantMitigations.length > 0 ? relevantMitigations : MOCK_MITIGATIONS.slice(0, 2).map(m => ({ ...m, scenario_id: scenario.id })),
      warnings: [],
    }
  }

  try {
    const { object } = await generateObject({
      model: "openai/gpt-4o",
      schema: AIMitigationsResponseSchema,
      system: SYSTEM_PROMPT,
      prompt: MITIGATIONS_PROMPT(scenario, assumptions),
      output: "object",
    })

    const normalizedMitigations = object.mitigations.map((m, idx) => ({
      ...m,
      id: m.id || `M${idx + 1}`,
      scenario_id: scenario.id,
      category: normalizeMitigationCategory(m.category),
      driver_modifications: m.driver_modifications.map(dm => ({
        ...dm,
        modification_type: normalizeModificationType(dm.modification_type),
      })),
      enabled: true,
      version: 1,
      approved: false,
    }))

    return {
      mitigations: normalizedMitigations as Mitigation[],
      warnings: [],
    }
  } catch (error) {
    console.error("[Restaurant AI] Error generating mitigations:", error)
    return {
      mitigations: MOCK_MITIGATIONS.slice(0, 2).map(m => ({ ...m, scenario_id: scenario.id })),
      warnings: ["AI generation failed, using fallback mitigations"],
    }
  }
}

// =============================================================================
// HELPERS
// =============================================================================

function normalizeConfidence(conf: string): 'high' | 'medium' | 'low' {
  const lower = conf.toLowerCase()
  if (lower === 'high') return 'high'
  if (lower === 'medium') return 'medium'
  return 'low'
}

function normalizeCategory(cat: string): Assumption['category'] {
  const lower = cat.toLowerCase()
  const valid = ['revenue', 'cogs', 'wages', 'operating_expenses', 'non_operating_expenses', 'seasonality', 'external']
  return valid.includes(lower) ? lower as Assumption['category'] : 'revenue'
}

function normalizeSeverity(sev: string): Scenario['severity'] {
  const lower = sev.toLowerCase()
  const valid = ['low', 'moderate', 'high', 'critical']
  return valid.includes(lower) ? lower as Scenario['severity'] : 'moderate'
}

function normalizeShockType(type: string): 'multiply' | 'add' | 'set' {
  const lower = type.toLowerCase()
  if (lower === 'multiply') return 'multiply'
  if (lower === 'add') return 'add'
  return 'set'
}

function normalizeMitigationCategory(cat: string): Mitigation['category'] {
  const lower = cat.toLowerCase()
  const valid = ['revenue', 'cost_reduction', 'efficiency', 'hedging', 'contingency']
  return valid.includes(lower) ? lower as Mitigation['category'] : 'cost_reduction'
}

function normalizeModificationType(type: string): 'increase' | 'decrease' | 'replace' {
  const lower = type.toLowerCase()
  if (lower === 'increase') return 'increase'
  if (lower === 'decrease') return 'decrease'
  return 'replace'
}
