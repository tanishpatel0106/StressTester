// Restaurant Stress-Testing Copilot - JSON Schemas (Draft 2020-12 style for validation)
// All schemas have additionalProperties: false for strictness

import { z } from "zod"

// =============================================================================
// KPI SCHEMAS
// =============================================================================

export const KPIDataPointSchema = z.object({
  date: z.string(),
  total_revenue: z.number(),
  cost_of_goods_sold: z.number(),
  gross_profit: z.number(),
  wage_costs: z.number(),
  operating_expenses: z.number(),
  non_operating_expenses: z.number(),
  net_profit: z.number(),
}).strict()

export const DerivedKPIsSchema = z.object({
  gross_margin_pct: z.number(),
  cogs_pct: z.number(),
  wage_pct: z.number(),
  prime_cost: z.number(),
  prime_cost_pct: z.number(),
  net_margin: z.number(),
}).strict()

// =============================================================================
// EVIDENCE SCHEMA
// =============================================================================

export const EvidenceSchema = z.object({
  id: z.string(),
  type: z.enum(['csv_cell', 'computed', 'user_input', 'ai_inferred']),
  source: z.string(),
  row: z.number().optional(),
  column: z.string().optional(),
  value: z.union([z.string(), z.number()]),
  timestamp: z.string(),
}).strict()

// =============================================================================
// CONTEXT PACK SCHEMA
// =============================================================================

export const RestaurantMetadataSchema = z.object({
  name: z.string(),
  location: z.string().optional(),
  cuisine_type: z.string().optional(),
  seating_capacity: z.number().optional(),
  dataset_id: z.string(),
  uploaded_at: z.string(),
}).strict()

export const KPISummaryStatsSchema = z.object({
  mean: z.number(),
  min: z.number(),
  max: z.number(),
  volatility: z.number(),
  trend: z.enum(['increasing', 'decreasing', 'stable']),
}).strict()

export const ContextPackSchema = z.object({
  id: z.string(),
  metadata: RestaurantMetadataSchema,
  kpi_series: z.array(KPIDataPointSchema),
  derived_summary: z.record(z.string(), KPISummaryStatsSchema),
  evidence_registry: z.array(EvidenceSchema),
  created_at: z.string(),
}).strict()

// =============================================================================
// ASSUMPTION SCHEMAS
// =============================================================================

export const AssumptionCategorySchema = z.enum([
  'revenue',
  'cogs',
  'wages',
  'operating_expenses',
  'non_operating_expenses',
  'seasonality',
  'external',
])

export const ConfidenceLevelSchema = z.enum(['high', 'medium', 'low'])

export const AssumptionSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string(),
  category: AssumptionCategorySchema,
  baseline_value: z.number(),
  range_min: z.number(),
  range_max: z.number(),
  unit: z.string(),
  evidence_refs: z.array(z.string()),
  confidence: ConfidenceLevelSchema,
  needs_user_confirmation: z.boolean(),
  rationale: z.string(),
  version: z.number(),
  approved: z.boolean(),
  approved_by: z.string().optional(),
  approved_at: z.string().optional(),
}).strict()

export const AssumptionSetSchema = z.object({
  id: z.string(),
  context_pack_id: z.string(),
  assumptions: z.array(AssumptionSchema),
  status: z.enum(['draft', 'approved']),
  version: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
}).strict()

// =============================================================================
// SCENARIO SCHEMAS
// =============================================================================

export const ScenarioSeveritySchema = z.enum(['low', 'moderate', 'high', 'critical'])
export const ShockCurveSchema = z.enum(['flat', 'decay', 'recovery'])

export const AssumptionShockSchema = z.object({
  assumption_id: z.string(),
  shock_type: z.enum(['multiply', 'add', 'set']),
  shock_value: z.number(),
  start_month_offset: z.number().optional(),
  duration_months: z.number().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
}).strict()

export const ScenarioSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  severity: ScenarioSeveritySchema,
  probability: z.number().min(0).max(1),
  shock_curve: ShockCurveSchema.optional(),
  assumption_shocks: z.array(AssumptionShockSchema),
  trigger_conditions: z.array(z.string()),
  expected_impact: z.string(),
  evidence_refs: z.array(z.string()),
  version: z.number(),
  approved: z.boolean(),
  approved_by: z.string().optional(),
  approved_at: z.string().optional(),
}).strict()

export const ScenarioSetSchema = z.object({
  id: z.string(),
  context_pack_id: z.string(),
  assumption_set_id: z.string(),
  scenarios: z.array(ScenarioSchema),
  status: z.enum(['draft', 'approved']),
  version: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
}).strict()

// =============================================================================
// MITIGATION SCHEMAS
// =============================================================================

export const MitigationCategorySchema = z.enum([
  'revenue',
  'cost_reduction',
  'efficiency',
  'hedging',
  'contingency',
])

export const DriverModificationSchema = z.object({
  driver: z.string(),
  modification_type: z.enum(['increase', 'decrease', 'replace']),
  target_value: z.number(),
  unit: z.string(),
  implementation_cost: z.number(),
  time_to_implement_days: z.number(),
}).strict()

export const MitigationSchema = z.object({
  id: z.string(),
  scenario_id: z.string(),
  name: z.string(),
  description: z.string(),
  category: MitigationCategorySchema,
  driver_modifications: z.array(DriverModificationSchema),
  expected_impact: z.object({
    net_profit_change: z.number(),
    prime_cost_change: z.number(),
    gross_margin_change: z.number(),
  }).strict(),
  prerequisites: z.array(z.string()),
  risks: z.array(z.string()),
  evidence_refs: z.array(z.string()),
  enabled: z.boolean(),
  version: z.number(),
  approved: z.boolean(),
  approved_by: z.string().optional(),
  approved_at: z.string().optional(),
}).strict()

export const MitigationSetSchema = z.object({
  id: z.string(),
  context_pack_id: z.string(),
  scenario_set_id: z.string(),
  mitigations: z.array(MitigationSchema),
  status: z.enum(['draft', 'approved']),
  version: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
}).strict()

// =============================================================================
// AI RESPONSE WRAPPER SCHEMAS (for validating LLM output)
// =============================================================================

export const AIAssumptionOutputSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string(),
  category: z.string(), // Validated later to map to valid category
  baseline_value: z.number(),
  range_min: z.number(),
  range_max: z.number(),
  unit: z.string(),
  evidence_refs: z.array(z.string()),
  confidence: z.string(),
  needs_user_confirmation: z.boolean(),
  rationale: z.string(),
})

export const AIAssumptionsResponseSchema = z.object({
  assumptions: z.array(AIAssumptionOutputSchema),
})

export const AIScenarioOutputSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  severity: z.string(),
  probability: z.number(),
  shock_curve: z.string().nullable(),
  assumption_shocks: z.array(z.object({
    assumption_id: z.string(),
    shock_type: z.string(),
    shock_value: z.number(),
    start_month_offset: z.number().nullable(),
    duration_months: z.number().nullable(),
    start_date: z.string().nullable(),
    end_date: z.string().nullable(),
  })),
  trigger_conditions: z.array(z.string()),
  expected_impact: z.string(),
  evidence_refs: z.array(z.string()),
})

export const AIScenariosResponseSchema = z.object({
  scenarios: z.array(AIScenarioOutputSchema),
})

export const AIMitigationOutputSchema = z.object({
  id: z.string(),
  scenario_id: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.string(),
  driver_modifications: z.array(z.object({
    driver: z.string(),
    modification_type: z.string(),
    target_value: z.number(),
    unit: z.string(),
    implementation_cost: z.number(),
    time_to_implement_days: z.number(),
  })),
  expected_impact: z.object({
    net_profit_change: z.number(),
    prime_cost_change: z.number(),
    gross_margin_change: z.number(),
  }),
  prerequisites: z.array(z.string()),
  risks: z.array(z.string()),
  evidence_refs: z.array(z.string()),
})

export const AIMitigationsResponseSchema = z.object({
  mitigations: z.array(AIMitigationOutputSchema),
})

// =============================================================================
// CSV SCHEMA
// =============================================================================

export const CSVRowSchema = z.object({
  date: z.string(),
  total_revenue: z.number(),
  cost_of_goods_sold: z.number(),
  wage_costs: z.number(),
  operating_expenses: z.number(),
  non_operating_expenses: z.number(),
})
