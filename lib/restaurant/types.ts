import type { ConfidenceLevel, DriverKey, KpiKey, ProbabilityLevel } from "./constants"

export interface KpiSpineRow {
  period: string
  TOTAL_REVENUE: number | null
  COST_OF_GOODS_SOLD: number | null
  GROSS_PROFIT: number | null
  WAGE_COSTS: number | null
  OPERATING_EXPENSES: number | null
  NON_OPERATING_EXPENSES: number | null
  NET_PROFIT: number | null
}

export interface DerivedKpiRow {
  period: string
  gross_margin_pct: number | null
  cogs_pct: number | null
  wage_pct: number | null
  prime_cost: number | null
  prime_cost_pct: number | null
  net_margin: number | null
  breakeven_revenue: number | null
}

export interface DriverSeriesRow {
  period: string
  drivers: Record<DriverKey, number | null>
}

export interface DriverRange {
  min: number
  max: number
}

export interface DriverAssumption {
  id: string
  driver: DriverKey
  baseline: number
  range: DriverRange
  unit: string
  confidence: ConfidenceLevel
  evidence_refs: string[]
  notes?: string
}

export type ShockMode = "add" | "multiply" | "set"

export interface ScenarioShock {
  driver: DriverKey
  mode: ShockMode
  value: number
  duration_months: number
}

export interface Scenario {
  id: string
  name: string
  description: string
  shocks: ScenarioShock[]
  probability: ProbabilityLevel
  confidence: ConfidenceLevel
  evidence_refs: string[]
}

export interface MitigationAdjustment {
  driver: DriverKey
  mode: ShockMode
  value: number
  duration_months: number
}

export interface Mitigation {
  id: string
  name: string
  description: string
  adjustments: MitigationAdjustment[]
  constraints: string[]
  implementation_steps: string[]
  confidence: ConfidenceLevel
  evidence_refs: string[]
}

export interface EvidenceItem {
  id: string
  type: "table_cell" | "text_span" | "document" | "observation"
  source: string
  description: string
  confidence: ConfidenceLevel
}

export interface RestaurantMetadata {
  restaurant_name: string
  location: string
  currency: string
  period_start: string
  period_end: string
  timezone: string
}

export interface KpiSummaryStats {
  average: number | null
  trend: number | null
  volatility: number | null
  min: number | null
  max: number | null
}

export interface ContextPack {
  metadata: RestaurantMetadata
  kpi_series: KpiSpineRow[]
  derived_kpis: DerivedKpiRow[]
  summary: Record<string, KpiSummaryStats>
  evidence_registry: EvidenceItem[]
}

export interface AiAssumptionsResponse {
  assumptions: DriverAssumption[]
}

export interface AiScenariosResponse {
  scenarios: Scenario[]
}

export interface AiMitigationsResponse {
  mitigations: Mitigation[]
}
