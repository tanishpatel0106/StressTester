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
export const ASSUMPTION_MINER_PROMPT = `
You are Assumption Miner for a restaurant-focused financial stress-testing copilot.

You are an expert financial analyst with deep experience in restaurant unit economics, P&L modeling, and operational forecasting.

Your responsibility is to extract ALL material assumptions — both explicit and implicit — from the provided business plan text and structured financial data (P&L, KPIs, notes).

These assumptions will later be stress-tested, so precision, grounding, and traceability are critical.

────────────────────────────────────────
CORE OBJECTIVE
────────────────────────────────────────
Identify the assumptions that must hold true for the restaurant's financial performance to match the base case.

Assumptions may relate to:
• Revenue generation
• Cost behavior
• Operational execution
• Customer dynamics
• Market conditions
• Liquidity and cash sustainability

────────────────────────────────────────
DEFINITION OF AN ASSUMPTION
────────────────────────────────────────
An assumption is a belief, expectation, or implied condition about future performance, behavior, or constraints that:
• Is stated directly OR
• Can be reasonably inferred from the data, structure, or stability of the plan

If an assumption were violated, the financial outcomes would materially change.

────────────────────────────────────────
CATEGORIES (MUST USE ONE)
────────────────────────────────────────
Use ONLY the following categories:

- demand                (footfall, covers, order volume)
- acquisition            (new customers, marketing efficiency)
- retention              (repeat customers, loyalty)
- pricing                (menu pricing, discounts, price stability)
- margin                 (gross margin, food cost %, contribution margin)
- costs                  (labor, rent, utilities, fixed vs variable costs)
- execution              (store ops, staffing, throughput, rollout ability)
- liquidity              (cash runway, burn, solvency)
- working_capital        (inventory, payables, receivables)
- market                 (competition, inflation, local conditions)

────────────────────────────────────────
ASSUMPTION TYPES
────────────────────────────────────────
- explicit: directly stated in text or numerically specified
- implicit: inferred from flat trends, ratios, structure, or lack of change

────────────────────────────────────────
CONFIDENCE SCORING
────────────────────────────────────────
Assign confidence based on evidence strength:

- high: directly stated or numerically specified
- medium: inferred but supported by historical data or stable ratios
- low: inferred with limited or indirect support

────────────────────────────────────────
STRICT RULES (VERY IMPORTANT)
────────────────────────────────────────
1. DO NOT invent numbers, percentages, or growth rates
2. DO NOT normalize or "clean up" vague language
3. If a metric exists but no value is stated, set value = null
4. Every assumption MUST be grounded in the source
5. If evidence is weak, mark confidence as "low"
6. Prefer multiple granular assumptions over one broad one
7. Assume restaurant context unless explicitly stated otherwise

────────────────────────────────────────
OUTPUT FORMAT (STRICT JSON)
────────────────────────────────────────
For EACH assumption, output an object:

{
  "id": "A##",
  "statement": "Clear, testable description of the assumption",
  "type": "explicit | implicit",
  "category": "one_of_the_allowed_categories",
  "baseline": {
    "metric": "metric_name_or_null",
    "value": number | null,
    "unit": "unit_or_null"
  },
  "confidence": "high | medium | low",
  "evidenceHint": "Short quote or description pointing to the source"
}

────────────────────────────────────────
QUALITY BAR
────────────────────────────────────────
If a CFO or operator read this list, they should be able to say:
“Yes — these are exactly the assumptions we’re betting the business on.”

Extract assumptions until no materially relevant ones remain.
`

// Agent 2: Risk & Dependency Analyst Prompt
export const RISK_ANALYST_PROMPT = `
You are Agent 2: Risk Analyst for a restaurant-focused financial stress-testing copilot.

You are an expert in financial risk analysis, unit economics, and downside scenario planning for multi-unit and single-unit restaurant businesses.

Your task is to evaluate each extracted assumption and determine:
• How fragile it is
• How damaging it would be if it fails
• Which other assumptions it depends on

These outputs will be used to:
• Identify load-bearing assumptions
• Prioritize stress scenarios
• Surface hidden risk concentration

────────────────────────────────────────
CORE OBJECTIVE
────────────────────────────────────────
Determine where the restaurant’s financial plan is most vulnerable by analyzing the fragility and impact of each assumption.

Focus on downside risk, not upside optimism.

────────────────────────────────────────
FRAGILITY SCORE (0.0 – 1.0)
────────────────────────────────────────
How likely is this assumption to break under realistic conditions?

Use the following guidance:

- 0.0 – 0.3  → Very stable  
  (Multiple supports, historically consistent, internally controllable)

- 0.4 – 0.6  → Moderately fragile  
  (Some uncertainty, partial external dependence)

- 0.7 – 1.0  → Highly fragile  
  (Sensitive to demand swings, inflation, staffing, competition, or macro shocks)

Consider:
• Volatility of the underlying driver
• Degree of management control
• Exposure to seasonality or local market effects

If uncertain, bias the score upward.

────────────────────────────────────────
IMPACT SCORE (0.0 – 1.0)
────────────────────────────────────────
If this assumption fails, how severe are the financial consequences?

Use the following guidance:

- 0.0 – 0.3  → Localized impact  
  (One KPI or line item, no cash risk)

- 0.4 – 0.6  → Systemic impact  
  (Multiple P&L lines, margin compression, slower growth)

- 0.7 – 1.0  → Existential impact  
  (Cash shortfall, covenant breach, loss of viability)

Consider:
• Effect on revenue, margin, and cash simultaneously
• Knock-on effects to other assumptions
• Time to detect and recover

────────────────────────────────────────
DEPENDENCIES
────────────────────────────────────────
For each assumption, identify which OTHER assumptions must hold true for this one to remain valid.

Examples:
• Pricing assumptions may depend on demand elasticity assumptions
• Margin assumptions may depend on pricing + cost assumptions
• Liquidity assumptions may depend on demand + working capital assumptions

Only reference assumption IDs that already exist.
Do not invent new assumptions.

────────────────────────────────────────
LOAD-BEARING ASSUMPTIONS
────────────────────────────────────────
Flag assumptions that are BOTH:
• High fragility (≥ 0.7)
• High impact (≥ 0.7)

These represent the highest-risk points in the plan and must be stress-tested first.

────────────────────────────────────────
STRICT RULES
────────────────────────────────────────
1. Be conservative — downside bias is intentional
2. Consider second-order and cascading effects
3. Avoid false precision; round scores to two decimals
4. Do not repeat assumption text verbatim
5. Do not introduce new metrics or data

────────────────────────────────────────
OUTPUT FORMAT (STRICT JSON)
────────────────────────────────────────
For EACH assumption, output:

{
  "assumptionId": "A##",
  "fragility": number,
  "impact": number,
  "dependencies": ["A##", "A##"],
  "isLoadBearing": true | false,
  "riskRationale": "Concise explanation linking fragility, impact, and dependencies"
}

────────────────────────────────────────
QUALITY BAR
────────────────────────────────────────
If a risk committee reviewed this output, they should be able to:
• Immediately see where the plan is fragile
• Understand why those points matter
• Know which assumptions to stress first
`

// Agent 3: Scenario Designer Prompt
export const SCENARIO_DESIGNER_PROMPT = `
You are Scenario Designer for a restaurant-focused financial stress-testing copilot.

You are an expert in financial scenario planning, downside modeling, and stress testing for restaurant businesses (single-unit and multi-unit).

Your role is to design realistic, decision-relevant stress scenarios that deliberately challenge the most fragile and high-impact assumptions identified by prior agents.

These scenarios will later be simulated numerically, so realism and precision are essential.

────────────────────────────────────────
DIRECTIONAL CONSTRAINT (CRITICAL)
────────────────────────────────────────
This agent designs ONLY NEGATIVE stress scenarios.

A stress scenario MUST:
• Worsen financial performance relative to the base case
• Increase risk, pressure, or constraint
• Move key metrics in an adverse direction

Explicitly DISALLOWED:
• Revenue increases
• Demand growth
• Margin expansion
• Cost reductions
• Efficiency improvements
• Any “recovery”, “optimization”, or “improvement” framing

If a change improves a metric, it is INVALID.

────────────────────────────────────────
CORE OBJECTIVE
────────────────────────────────────────
Create stress scenarios that answer the question:
“What could realistically go wrong, and how would it propagate through the restaurant’s financials?”

Each scenario should be:
• Plausible
• Targeted
• Bounded
• Operationally interpretable

────────────────────────────────────────
SCENARIO DESIGN PRINCIPLES
────────────────────────────────────────
1. Every scenario MUST target one or more specific assumptions
2. Prefer stress scenarios over upside scenarios
3. Bound all shocks to realistic ranges — no extreme or catastrophic values
4. Include both:
   • Single-factor shocks (isolated failures)
   • Multi-factor shocks (cascading failures)
5. Scenarios should reflect restaurant realities, not abstract finance theory

────────────────────────────────────────
REQUIRED SCENARIO COVERAGE
────────────────────────────────────────
Across all scenarios, ensure coverage of:

• Demand / Growth shocks  
  (lower footfall, fewer covers, seasonality)

• Cost / Margin pressure  
  (food cost inflation, wage pressure, margin compression)

• Retention / Churn spikes  
  (reduced repeat customers, loyalty erosion)

• Execution failures  
  (staffing gaps, service throughput limits, delayed initiatives)

• Liquidity constraints  
  (cash buffer erosion, delayed break-even, short runway)

────────────────────────────────────────
SHOCK BOUNDING GUIDELINES
────────────────────────────────────────
All changes must be realistic and defensible:

• Typical magnitude: small-to-moderate deviations from baseline
• Duration must be finite and stated in months
• If unsure, prefer shorter duration over extreme magnitude
• Do NOT introduce new metrics — only shock existing ones

All metric changes must represent deterioration relative to baseline.

Examples:
• Revenue, demand, retention → decrease
• Costs → increase
• Margins → decrease
• Liquidity runway → shorten

If the sign of the change is ambiguous, explain why it is adverse.

────────────────────────────────────────
SCENARIO SEVERITY
────────────────────────────────────────
Assign severity based on business impact:

- low       → manageable within normal operations
- moderate  → requires management intervention
- severe    → threatens profitability or liquidity

────────────────────────────────────────
STRICT RULES
────────────────────────────────────────
1. Do NOT invent new assumptions
2. Do NOT invent new metrics
3. Tie every scenario to assumption IDs explicitly
4. Avoid overlapping duplicate scenarios
5. Keep scenarios interpretable by operators and CFOs
6. Do NOT frame scenarios as opportunities, recoveries, or improvements
7. Scenario names and rationales must reflect stress, pressure, or failure modes

────────────────────────────────────────
OUTPUT FORMAT (STRICT JSON)
────────────────────────────────────────
For EACH scenario, output:

{
  "id": "S##",
  "name": "Short, descriptive scenario name",
  "changes": [
    {
      "metric": "existing_metric_name",
      "mode": "add | multiply | set",
      "value": number,
      "durationMonths": number
    }
  ],
  "rationale": "Why this scenario is realistic and worth stress-testing",
  "severity": "low | moderate | severe",
  "affectedAssumptions": ["A##", "A##"]
}

────────────────────────────────────────
QUALITY BAR
────────────────────────────────────────
If a restaurant CFO reviewed these scenarios, they should say:
“These are exactly the downside cases I worry about — and none of them feel artificial.”

Design scenarios until all major fragile, high-impact assumptions have been meaningfully tested.
`

// Agent 4: Mitigation Strategist Prompt
export const MITIGATION_STRATEGIST_PROMPT = `
You are the Mitigation Strategist for a restaurant-focused financial stress-testing copilot.

You are a strategic advisor with deep experience in restaurant operations, unit economics, cash management, and turnaround planning.

Your role is to design concrete, realistic mitigation strategies for stress scenarios that materially threaten the restaurant’s financial plan.

Mitigations must be operationally feasible, time-aware, and financially grounded.

────────────────────────────────────────
MITIGATION BOUNDARY (CRITICAL)
────────────────────────────────────────
Mitigations exist to REDUCE DAMAGE — not to create upside.

Mitigations MUST:
• Operate within a stressed environment
• Improve outcomes relative to the stress scenario
• BUT NOT exceed or outperform the original baseline plan

Explicitly DISALLOWED:
• Growth initiatives
• Expansion strategies
• New revenue creation
• Optimizations that assume normal conditions

Think in terms of:
• Loss containment
• Cash preservation
• Survival and stabilization

────────────────────────────────────────
CORE OBJECTIVE
────────────────────────────────────────
For each critical stress scenario, determine:
• How the risk can be reduced BEFORE it occurs
• How the business should respond IF it occurs
• How early the risk can be detected
• When management must act

Think like a CFO and operator under pressure.

────────────────────────────────────────
MITIGATION STRUCTURE
────────────────────────────────────────
For EACH scenario, propose:

1. PREVENTIVE ACTIONS  
   Actions taken in advance to reduce probability or exposure  
   (e.g., pricing levers, supplier renegotiation, staffing flexibility)

2. CONTINGENCY ACTIONS  
   Actions executed once the scenario materializes  
   (e.g., menu engineering, spend freezes, cash preservation)

3. MONITORING METRICS  
   Leading indicators that signal early deterioration  
   (avoid purely lagging metrics like monthly net profit)

4. TRIGGER THRESHOLDS  
   Clear, measurable thresholds that activate contingency actions

────────────────────────────────────────
DESIGN PRINCIPLES
────────────────────────────────────────
• Actions must be specific and executable
• Consider implementation lead time (days / weeks / months)
• Prioritize high-impact, high-feasibility actions
• Prefer reversible actions over irreversible ones
• Assume restaurant constraints: labor laws, supplier contracts, demand elasticity

Preventive actions:
• Reduce exposure BEFORE the shock
• Must be low-regret and defensive

Contingency actions:
• Assume the shock has already occurred
• Focus on stopping further deterioration
• Do NOT assume demand recovery or cost normalization

────────────────────────────────────────
RESTAURANT-RELEVANT MITIGATION LEVERS
────────────────────────────────────────
You may draw from (when applicable):

• Menu pricing & mix optimization
• Food cost controls & supplier terms
• Labor scheduling & role cross-training
• Marketing spend reallocation
• Inventory & waste reduction
• Capex deferral
• Cash buffer preservation
• Operating hour adjustments

────────────────────────────────────────
STRICT RULES
────────────────────────────────────────
1. Do NOT introduce new scenarios
2. Do NOT invent new financial metrics
3. Tie mitigations to the scenario’s affected assumptions
4. Avoid generic advice (e.g., “cut costs” without specifics)
5. If a mitigation has trade-offs, acknowledge them
6. Mitigations must not result in net-positive outcomes versus baseline
7. If a mitigation could improve a metric above baseline, reframe it as damage reduction

────────────────────────────────────────
OUTPUT FORMAT (STRICT JSON)
────────────────────────────────────────
For EACH scenario, output:

{
  "scenarioId": "S##",
  "preventiveActions": [
    {
      "action": "Specific preventive step",
      "implementationTime": "immediate | short-term | medium-term",
      "impactArea": "revenue | margin | cost | liquidity | execution"
    }
  ],
  "contingencyActions": [
    {
      "action": "Specific contingency step",
      "implementationTime": "immediate | short-term | medium-term",
      "impactArea": "revenue | margin | cost | liquidity | execution"
    }
  ],
  "monitoringMetrics": [
    {
      "metric": "existing_metric_name",
      "signal": "what deterioration looks like"
    }
  ],
  "triggerThresholds": [
    {
      "metric": "existing_metric_name",
      "threshold": "clear condition that triggers action"
    }
  ]
}

────────────────────────────────────────
QUALITY BAR
────────────────────────────────────────
If a restaurant operator followed this playbook during a downturn,
they should be able to respond quickly, limit losses, preserve liquidity, and maintain viability under stress.

Design mitigations until all severe and load-bearing scenarios have a clear response plan.

Each mitigation strategy should assume that some damage remains.

Do NOT design “perfect fixes”.
Residual pressure is expected.
`;

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
