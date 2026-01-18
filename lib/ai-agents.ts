// Multi-Agent LLM Reasoning Layer
// Agents communicate via strict JSON - LLMs reason, never calculate

import type {
  Assumption,
  Scenario,
  Mitigation,
  Evidence,
  AssumptionCategory,
  ConfidenceLevel,
} from "./types"

// Agent 1: Assumption Miner Prompt
export const ASSUMPTION_MINER_PROMPT = `You are an expert financial analyst specializing in extracting assumptions from business plans.

Your task is to analyze the provided plan text and financial data to extract both explicit and implicit assumptions.

RULES:
1. Every assumption must be grounded in evidence from the source material
2. Classify each assumption as "explicit" (directly stated) or "implicit" (inferred)
3. Categorize into: demand, acquisition, retention, pricing, margin, costs, execution, liquidity, working_capital, market
4. Assign confidence based on evidence strength: high (directly quoted), medium (inferred with data), low (inferred without data)
5. NEVER invent numbers - only cite what exists in the source

For each assumption, output:
{
  "id": "A##",
  "statement": "Clear description of the assumption",
  "type": "explicit|implicit",
  "category": "category_name",
  "baseline": { "metric": "metric_name", "value": number|null, "unit": "string" },
  "evidenceHint": "Brief quote or description of where this comes from"
}`

// Agent 2: Risk & Dependency Analyst Prompt
export const RISK_ANALYST_PROMPT = `You are a risk analyst specializing in identifying fragility and dependencies in financial assumptions.

Your task is to analyze each assumption and:
1. Score FRAGILITY (0-1): How easily could this assumption break?
   - 0.0-0.3: Very stable, multiple supporting factors
   - 0.4-0.6: Moderate, some uncertainty
   - 0.7-1.0: Fragile, highly dependent on external factors

2. Score IMPACT (0-1): If this assumption breaks, how severe are consequences?
   - 0.0-0.3: Minor impact on one metric
   - 0.4-0.6: Moderate impact on multiple metrics
   - 0.7-1.0: Severe impact, could threaten plan viability

3. Identify DEPENDENCIES: Which other assumptions does this one depend on?
   - Create a dependency graph

RULES:
- Be conservative - if uncertain, score higher on fragility
- Consider second-order effects
- Identify load-bearing assumptions (high fragility + high impact)`

// Agent 3: Scenario Designer Prompt
export const SCENARIO_DESIGNER_PROMPT = `You are a scenario planning expert specializing in financial stress testing.

Your task is to design realistic stress scenarios based on the identified assumptions and risks.

RULES:
1. Create scenarios that test specific assumptions
2. Bound all shocks to realistic ranges (no extreme hallucinations)
3. Include both single-factor and multi-factor scenarios
4. Cover all major risk categories:
   - Demand/Growth shocks
   - Cost/Margin pressure
   - Retention/Churn spikes
   - Execution delays
   - Liquidity constraints

For each scenario, specify:
{
  "id": "S##",
  "name": "Descriptive name",
  "changes": [
    { "metric": "metric_name", "mode": "add|multiply|set", "value": number, "durationMonths": number }
  ],
  "rationale": "Why this scenario is worth testing",
  "severity": "low|moderate|severe",
  "affectedAssumptions": ["A##", "A##"]
}`

// Agent 4: Mitigation Strategist Prompt
export const MITIGATION_STRATEGIST_PROMPT = `You are a strategic advisor specializing in risk mitigation for SaaS businesses.

Your task is to propose mitigations for scenarios that break the plan.

For each critical scenario, provide:
1. PREVENTIVE ACTIONS: Steps to reduce likelihood of the scenario
2. CONTINGENCY ACTIONS: Steps to take if the scenario occurs
3. MONITORING METRICS: What to watch for early warning
4. TRIGGER THRESHOLDS: When to activate contingency plans

RULES:
- Be specific and actionable
- Consider time required to implement
- Prioritize by impact and feasibility
- Include leading indicators, not just lagging ones`

// Evidence Store Functions
export function createEvidenceId(): string {
  return `E${String(Date.now()).slice(-6)}${Math.random().toString(36).slice(2, 5)}`
}

export function findEvidenceForAssumption(
  assumption: Assumption,
  evidenceStore: Evidence[]
): Evidence[] {
  return evidenceStore.filter((e) => assumption.evidenceIds.includes(e.id))
}

// Risk Scoring Functions
export function calculateRiskScore(assumption: Assumption): number {
  return assumption.fragility * assumption.impact
}

export function categorizeRisk(score: number): "low" | "medium" | "high" | "critical" {
  if (score < 0.25) return "low"
  if (score < 0.5) return "medium"
  if (score < 0.75) return "high"
  return "critical"
}

export function rankAssumptionsByRisk(assumptions: Assumption[]): Assumption[] {
  return [...assumptions].sort(
    (a, b) => calculateRiskScore(b) - calculateRiskScore(a)
  )
}

// Dependency Graph Functions
export function buildDependencyGraph(
  assumptions: Assumption[]
): Map<string, string[]> {
  const graph = new Map<string, string[]>()

  for (const assumption of assumptions) {
    graph.set(assumption.id, assumption.dependencies)
  }

  return graph
}

export function findLoadBearingAssumptions(
  assumptions: Assumption[]
): Assumption[] {
  const dependencyCount = new Map<string, number>()

  // Count how many assumptions depend on each assumption
  for (const assumption of assumptions) {
    for (const depId of assumption.dependencies) {
      dependencyCount.set(depId, (dependencyCount.get(depId) || 0) + 1)
    }
  }

  // Load-bearing = high dependency count + high risk score
  return assumptions.filter((a) => {
    const depCount = dependencyCount.get(a.id) || 0
    const riskScore = calculateRiskScore(a)
    return depCount >= 2 || riskScore >= 0.5
  })
}

// Scenario Analysis Functions
export function categorizeScenarioSeverity(
  scenario: Scenario,
  assumptions: Assumption[]
): "low" | "moderate" | "severe" {
  const affectedAssumptions = assumptions.filter((a) =>
    scenario.affectedAssumptions.includes(a.id)
  )

  const avgRiskScore =
    affectedAssumptions.reduce((sum, a) => sum + calculateRiskScore(a), 0) /
    affectedAssumptions.length

  // Consider both number of changes and average risk
  const changeImpact = scenario.changes.reduce((sum, c) => {
    if (c.mode === "multiply") {
      return sum + Math.abs(1 - c.value)
    }
    return sum + Math.abs(c.value) * 0.1
  }, 0)

  const combinedScore = avgRiskScore * 0.6 + changeImpact * 0.4

  if (combinedScore < 0.2) return "low"
  if (combinedScore < 0.4) return "moderate"
  return "severe"
}

// Generate default mitigations based on assumption category
export function generateDefaultMitigations(
  assumption: Assumption,
  scenarioId: string
): Mitigation {
  const mitigationsByCategory: Record<
    AssumptionCategory,
    { preventive: string[]; contingency: string[]; metrics: string[] }
  > = {
    demand: {
      preventive: [
        "Diversify customer acquisition channels",
        "Build product features that increase stickiness",
        "Invest in brand awareness to reduce CAC dependency",
      ],
      contingency: [
        "Activate referral programs",
        "Offer promotional pricing for new segments",
        "Accelerate product-led growth initiatives",
      ],
      metrics: ["New_Customers", "MQL_to_SQL_Rate", "Trial_Conversion"],
    },
    acquisition: {
      preventive: [
        "Negotiate long-term ad contracts",
        "Build first-party data capabilities",
        "Invest in organic channels (SEO, content)",
      ],
      contingency: [
        "Reduce paid spend and shift to outbound",
        "Implement referral incentives",
        "Focus on high-intent channels only",
      ],
      metrics: ["CAC", "Marketing_Spend", "CAC_Payback"],
    },
    retention: {
      preventive: [
        "Implement health scoring for accounts",
        "Increase customer success touchpoints",
        "Build automated intervention workflows",
      ],
      contingency: [
        "Launch retention campaigns",
        "Offer renewal incentives",
        "Escalate at-risk accounts to executives",
      ],
      metrics: ["Churn_Rate", "NPS", "Feature_Adoption"],
    },
    pricing: {
      preventive: [
        "Validate pricing with customer research",
        "Build value metrics into pricing model",
        "Create pricing tiers for different segments",
      ],
      contingency: [
        "Offer grandfathered pricing for existing customers",
        "Create lite tier to prevent downgrades",
        "Bundle with services to preserve value",
      ],
      metrics: ["ARPU", "Expansion_Rate", "Discount_Rate"],
    },
    margin: {
      preventive: [
        "Negotiate volume discounts with vendors",
        "Invest in infrastructure efficiency",
        "Automate support with AI tools",
      ],
      contingency: [
        "Renegotiate vendor contracts",
        "Defer infrastructure upgrades",
        "Prioritize high-margin customer segments",
      ],
      metrics: ["Gross_Margin", "COGS_per_Customer", "Support_Tickets"],
    },
    costs: {
      preventive: [
        "Implement cost monitoring dashboards",
        "Set per-unit cost targets",
        "Automate cost optimization reviews",
      ],
      contingency: [
        "Freeze non-essential spending",
        "Renegotiate contracts",
        "Consolidate tools and vendors",
      ],
      metrics: ["Opex_Total", "Cost_per_Employee", "Vendor_Spend"],
    },
    execution: {
      preventive: [
        "Build robust hiring pipeline",
        "Cross-train team members",
        "Document critical processes",
      ],
      contingency: [
        "Engage contractors for critical roles",
        "Delay non-critical initiatives",
        "Redistribute workload",
      ],
      metrics: ["Headcount", "Time_to_Hire", "Employee_Turnover"],
    },
    liquidity: {
      preventive: [
        "Maintain 6+ month cash runway",
        "Establish credit line",
        "Monitor weekly cash flow",
      ],
      contingency: [
        "Accelerate receivables collection",
        "Defer payables where possible",
        "Engage bridge financing discussions",
      ],
      metrics: ["Cash_End", "Runway_Months", "Operating_Cash_Flow"],
    },
    working_capital: {
      preventive: [
        "Implement automated invoicing",
        "Offer early payment discounts",
        "Monitor DSO weekly",
      ],
      contingency: [
        "Engage collections agency",
        "Offer payment plans",
        "Factor receivables if needed",
      ],
      metrics: ["Accounts_Receivable", "DSO", "DPO"],
    },
    market: {
      preventive: [
        "Monitor competitor moves regularly",
        "Build differentiated product features",
        "Strengthen customer relationships",
      ],
      contingency: [
        "Respond with targeted competitive offers",
        "Double down on unique value prop",
        "Consider strategic partnerships",
      ],
      metrics: ["Win_Rate", "Competitive_Losses", "Market_Share"],
    },
  }

  const categoryMitigations = mitigationsByCategory[assumption.category]

  // Calculate trigger thresholds based on baseline
  const triggerThresholds: { metric: string; threshold: number }[] = []

  if (assumption.baseline.value !== null) {
    const baseValue = assumption.baseline.value
    const isRatio = assumption.baseline.unit === "ratio"

    if (isRatio) {
      // For ratios, trigger at 10-20% deviation
      triggerThresholds.push({
        metric: assumption.baseline.metric,
        threshold: baseValue * (baseValue > 0.5 ? 0.9 : 1.1),
      })
    } else {
      // For absolute values, trigger at 15-25% deviation
      triggerThresholds.push({
        metric: assumption.baseline.metric,
        threshold: baseValue * 1.2,
      })
    }
  }

  return {
    assumptionId: assumption.id,
    scenarioId,
    preventiveActions: categoryMitigations.preventive,
    contingencyActions: categoryMitigations.contingency,
    monitoringMetrics: categoryMitigations.metrics,
    triggerThresholds,
  }
}

// Generate executive summary
export function generateExecutiveSummary(
  assumptions: Assumption[],
  scenarios: Scenario[],
  breakingScenarios: string[]
): {
  topRiskyAssumptions: string[]
  worstCaseScenario: string
  earliestFailure: string | null
  strategicRecommendations: string[]
} {
  // Get top 5 risky assumptions
  const rankedAssumptions = rankAssumptionsByRisk(assumptions)
  const topRiskyAssumptions = rankedAssumptions.slice(0, 5).map((a) => a.id)

  // Find worst case scenario
  const breakingScenarioObjects = scenarios.filter((s) =>
    breakingScenarios.includes(s.id)
  )
  const worstCaseScenario =
    breakingScenarioObjects.find((s) => s.severity === "severe")?.name ||
    breakingScenarioObjects[0]?.name ||
    "None identified"

  // Strategic recommendations based on top risks
  const topCategories = rankedAssumptions
    .slice(0, 3)
    .map((a) => a.category)
  const uniqueCategories = [...new Set(topCategories)]

  const recommendationsByCategory: Record<string, string> = {
    demand: "Diversify growth channels to reduce acquisition risk",
    acquisition: "Reduce CAC dependency by investing in organic channels",
    retention: "Prioritize customer success to protect recurring revenue",
    pricing: "Validate pricing power through customer research",
    margin: "Build infrastructure efficiency roadmap",
    costs: "Implement quarterly cost review process",
    execution: "Strengthen hiring pipeline for critical roles",
    liquidity: "Establish contingency credit facilities",
    working_capital: "Automate AR processes to accelerate collections",
    market: "Monitor competitive landscape and differentiate aggressively",
  }

  const strategicRecommendations = uniqueCategories.map(
    (cat) =>
      recommendationsByCategory[cat] ||
      "Review and stress-test key assumptions quarterly"
  )

  return {
    topRiskyAssumptions,
    worstCaseScenario,
    earliestFailure: null, // Will be filled by breakpoint analysis
    strategicRecommendations,
  }
}
