// Restaurant Stress-Testing Copilot - AI Client
// Pure AI-powered LLM interface using OpenAI

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
  - duration_months (use null if not applicable)
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
// LLM CLIENT INTERFACE - AI ONLY
// =============================================================================

export async function generateAssumptions(
  contextPack: ContextPack
): Promise<AIAssumptionsResponse> {
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
    throw new Error(`Failed to generate assumptions: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export async function generateScenarios(
  contextPack: ContextPack,
  assumptions: Assumption[]
): Promise<AIScenariosResponse> {
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
          duration_months: shock.duration_months ?? undefined,
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
    throw new Error(`Failed to generate scenarios: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export async function generateMitigations(
  scenario: Scenario,
  assumptions: Assumption[]
): Promise<AIMitigationsResponse> {
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
    throw new Error(`Failed to generate mitigations: ${error instanceof Error ? error.message : 'Unknown error'}`)
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
