// Restaurant Stress-Testing Copilot - Core Types
// Following the fixed KPI spine: 
// TOTAL_REVENUE, COST_OF_GOODS_SOLD, GROSS_PROFIT, WAGE_COSTS, OPERATING_EXPENSES, NON_OPERATING_EXPENSES, NET_PROFIT

// =============================================================================
// KPI SPINE (FIXED - DO NOT ADD NEW TOP-LEVEL KPIS)
// =============================================================================

export const KPI_SPINE = [
  'TOTAL_REVENUE',
  'COST_OF_GOODS_SOLD', 
  'GROSS_PROFIT',
  'WAGE_COSTS',
  'OPERATING_EXPENSES',
  'NON_OPERATING_EXPENSES',
  'NET_PROFIT',
] as const

export type KPIName = typeof KPI_SPINE[number]

// Derived KPIs (computed from spine)
export const DERIVED_KPIS = [
  'gross_margin_pct',
  'cogs_pct',
  'wage_pct',
  'prime_cost',
  'prime_cost_pct',
  'net_margin',
] as const

export type DerivedKPIName = typeof DERIVED_KPIS[number]

// =============================================================================
// DATA STRUCTURES
// =============================================================================

export interface KPIDataPoint {
  date: string // ISO date string
  total_revenue: number
  cost_of_goods_sold: number
  gross_profit: number // Computed: total_revenue - cost_of_goods_sold
  wage_costs: number
  operating_expenses: number
  non_operating_expenses: number
  net_profit: number // Computed: gross_profit - wage_costs - operating_expenses - non_operating_expenses
}

export interface DerivedKPIs {
  gross_margin_pct: number // gross_profit / total_revenue
  cogs_pct: number // cost_of_goods_sold / total_revenue
  wage_pct: number // wage_costs / total_revenue
  prime_cost: number // cost_of_goods_sold + wage_costs
  prime_cost_pct: number // prime_cost / total_revenue
  net_margin: number // net_profit / total_revenue
}

export interface KPISummaryStats {
  mean: number
  min: number
  max: number
  volatility: number // standard deviation
  trend: 'increasing' | 'decreasing' | 'stable'
}

// =============================================================================
// EVIDENCE SYSTEM
// =============================================================================

export interface Evidence {
  id: string // E1, E2, etc.
  type: 'csv_cell' | 'computed' | 'user_input' | 'ai_inferred'
  source: string // file name or computation reference
  row?: number
  column?: string
  value: string | number
  timestamp: string
}

// =============================================================================
// CONTEXT PACK (Input to AI)
// =============================================================================

export interface RestaurantMetadata {
  name: string
  location?: string
  cuisine_type?: string
  seating_capacity?: number
  dataset_id: string
  uploaded_at: string
}

export interface ContextPack {
  id: string
  metadata: RestaurantMetadata
  kpi_series: KPIDataPoint[]
  derived_summary: Record<DerivedKPIName, KPISummaryStats>
  evidence_registry: Evidence[]
  created_at: string
}

// =============================================================================
// ASSUMPTIONS
// =============================================================================

export type AssumptionCategory = 
  | 'revenue' 
  | 'cogs' 
  | 'wages' 
  | 'operating_expenses' 
  | 'non_operating_expenses'
  | 'seasonality'
  | 'external'

export type ConfidenceLevel = 'high' | 'medium' | 'low'

export interface Assumption {
  id: string // A1, A2, etc.
  label: string
  description: string
  category: AssumptionCategory
  baseline_value: number
  range_min: number
  range_max: number
  unit: string // '%', '$', 'count', etc.
  evidence_refs: string[] // Evidence IDs
  confidence: ConfidenceLevel
  needs_user_confirmation: boolean
  rationale: string
  version: number
  approved: boolean
  approved_by?: string
  approved_at?: string
}

export interface AssumptionSet {
  id: string
  context_pack_id: string
  assumptions: Assumption[]
  status: 'draft' | 'approved'
  version: number
  created_at: string
  updated_at: string
}

// =============================================================================
// SCENARIOS
// =============================================================================

export type ScenarioSeverity = 'low' | 'moderate' | 'high' | 'critical'

export interface AssumptionShock {
  assumption_id: string
  shock_type: 'multiply' | 'add' | 'set'
  shock_value: number
  duration_months?: number | null
}

export interface Scenario {
  id: string // S1, S2, etc.
  name: string
  description: string
  severity: ScenarioSeverity
  probability: number // 0-1
  assumption_shocks: AssumptionShock[] // Shocks to assumptions, NOT to KPIs
  trigger_conditions: string[]
  expected_impact: string
  evidence_refs: string[]
  version: number
  approved: boolean
  approved_by?: string
  approved_at?: string
}

export interface ScenarioSet {
  id: string
  context_pack_id: string
  assumption_set_id: string
  scenarios: Scenario[]
  status: 'draft' | 'approved'
  version: number
  created_at: string
  updated_at: string
}

// =============================================================================
// MITIGATIONS
// =============================================================================

export type MitigationCategory = 'revenue' | 'cost_reduction' | 'efficiency' | 'hedging' | 'contingency'

export interface DriverModification {
  driver: string // e.g., 'menu_price', 'labor_hours', 'supplier_contract'
  modification_type: 'increase' | 'decrease' | 'replace'
  target_value: number
  unit: string
  implementation_cost: number
  time_to_implement_days: number
}

export interface Mitigation {
  id: string // M1, M2, etc.
  scenario_id: string
  name: string
  description: string
  category: MitigationCategory
  driver_modifications: DriverModification[]
  expected_impact: {
    net_profit_change: number
    prime_cost_change: number
    gross_margin_change: number
  }
  prerequisites: string[]
  risks: string[]
  evidence_refs: string[]
  enabled: boolean
  version: number
  approved: boolean
  approved_by?: string
  approved_at?: string
}

export interface MitigationSet {
  id: string
  context_pack_id: string
  scenario_set_id: string
  mitigations: Mitigation[]
  status: 'draft' | 'approved'
  version: number
  created_at: string
  updated_at: string
}

// =============================================================================
// COMPUTATION RESULTS
// =============================================================================

export type ComputationType = 'baseline' | 'scenario' | 'mitigated'

export interface ComputationRun {
  id: string
  context_pack_id: string
  computation_type: ComputationType
  scenario_id?: string
  mitigation_ids?: string[]
  input_assumptions: Assumption[]
  kpi_results: KPIDataPoint[]
  derived_results: DerivedKPIs[]
  summary: {
    total_revenue_change_pct: number
    net_profit_change_pct: number
    prime_cost_change_pct: number
    gross_margin_change_pct: number
  }
  computed_at: string
}

// =============================================================================
// API RESPONSE WRAPPERS
// =============================================================================

export interface AIAssumptionsResponse {
  assumptions: Assumption[]
  warnings: string[]
  needs_review: string[] // IDs of assumptions needing user confirmation
}

export interface AIScenariosResponse {
  scenarios: Scenario[]
  warnings: string[]
}

export interface AIMitigationsResponse {
  mitigations: Mitigation[]
  warnings: string[]
}

// =============================================================================
// APPLICATION STATE
// =============================================================================

export interface RestaurantState {
  dataset_id: string | null
  context_pack: ContextPack | null
  assumption_set: AssumptionSet | null
  scenario_set: ScenarioSet | null
  mitigation_set: MitigationSet | null
  baseline_computation: ComputationRun | null
  scenario_computations: ComputationRun[]
  mitigated_computations: ComputationRun[]
  current_step: 'upload' | 'baseline' | 'assumptions' | 'scenarios' | 'mitigations' | 'export'
}

// =============================================================================
// CSV INGESTION
// =============================================================================

export interface CSVRow {
  date: string
  total_revenue: number
  cost_of_goods_sold: number
  wage_costs: number
  operating_expenses: number
  non_operating_expenses: number
}

export interface CSVParseResult {
  success: boolean
  data: CSVRow[]
  errors: string[]
  warnings: string[]
}
