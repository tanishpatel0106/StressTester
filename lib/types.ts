// Core Types for AI Assumption Stress-Tester

// Evidence Types
export type EvidenceType = 'table_cell' | 'text_span' | 'computed'

export interface TableCellEvidence {
  type: 'table_cell'
  id: string
  file: string
  sheet?: string
  row: number
  column: string
  value: string | number
  unit?: string
  period?: string
}

export interface TextSpanEvidence {
  type: 'text_span'
  id: string
  file: string
  startChar: number
  endChar: number
  quotedText: string
}

export interface ComputedEvidence {
  type: 'computed'
  id: string
  value: number
  formula: string
  dependencyEvidenceIds: string[]
}

export type Evidence = TableCellEvidence | TextSpanEvidence | ComputedEvidence

// Assumption Types
export type AssumptionType = 'explicit' | 'implicit'
export type AssumptionCategory = 
  | 'demand' 
  | 'acquisition' 
  | 'retention' 
  | 'pricing' 
  | 'margin' 
  | 'costs' 
  | 'execution' 
  | 'liquidity' 
  | 'working_capital' 
  | 'market'
  | 'revenue'
  | 'cost'
  | 'growth'
  | 'churn'
  | 'headcount'
  | 'capex'
  | 'macro'

export type ConfidenceLevel = 'high' | 'medium' | 'low'

export interface Assumption {
  id: string
  statement?: string // Legacy field
  label?: string // AI-generated field
  description?: string // AI-generated field
  type?: AssumptionType
  category: AssumptionCategory
  baseline?: {
    metric: string
    value: number | null
    unit: string
  }
  baselineValue?: number // AI-generated field
  unit?: string // AI-generated field
  evidenceIds: string[]
  fragility: number // 0-1
  impact: number // 0-1
  riskScore?: number // AI-generated field (0-100)
  rationale?: string // AI-generated field
  confidence?: ConfidenceLevel
  dependencies?: string[]
  linkedMetrics?: string[]
}

// Scenario Types
export type StressMode = 'add' | 'multiply' | 'set'

export interface ScenarioChange {
  metric: string
  mode: StressMode
  value: number
  durationMonths: number
}

export interface Scenario {
  id: string
  name: string
  description?: string
  changes: ScenarioChange[]
  rationale?: string
  severity: 'low' | 'moderate' | 'high' | 'critical' | 'severe' // Support both old and new severity names
  probability?: number
  expectedBreak: boolean
  expectedBreakCondition: string | null
  affectedAssumptions: string[]
  shockMagnitudes?: Record<string, number>
  triggerConditions?: string[]
}

// Financial Data Types
export interface PnLRow {
  month: string
  revenueSubscription: number
  revenueUsage: number
  revenueTotal: number
  cogsHosting: number
  cogsSupport: number
  cogsTotal: number
  grossProfit: number
  grossMargin: number
  opexRnD: number
  opexSalesMarketing: number
  opexGA: number
  opexTotal: number
  ebitda: number
  depreciation: number
  operatingIncome: number
  interestExpense: number
  netIncome: number
}

export interface CashFlowRow {
  month: string
  cashBegin: number
  cashFlowOperating: number
  cashFlowInvesting: number
  cashFlowFinancing: number
  netChangeCash: number
  cashEnd: number
}

export interface BalanceSheetRow {
  month: string
  cash: number
  accountsReceivable: number
  inventory: number
  prepaidExpenses: number
  totalCurrentAssets: number
  ppAndENet: number
  totalAssets: number
  accountsPayable: number
  accruedExpenses: number
  shortTermDebt: number
  totalCurrentLiabilities: number
  longTermDebt: number
  totalLiabilities: number
  equity: number
  totalLiabilitiesAndEquity: number
}

export interface KPIRow {
  month: string
  customersBegin: number
  newCustomers: number
  churnedCustomers: number
  customersEnd: number
  churnRate: number
  arpu: number
  cac: number
  marketingSpend: number
  headcount: number
  grossMargin: number
  ltv: number
  paybackMonths: number
}

// Configuration
export interface StressConfig {
  businessType: 'SaaS' | 'Marketplace' | 'Retail' | 'Services'
  timeGranularity: 'monthly' | 'quarterly'
  horizonMonths: number
  objective: 'preserve_runway' | 'reach_profitability' | 'maintain_margins'
  stressSeverity: 'conservative' | 'moderate' | 'aggressive'
  targetMetrics: string[]
  currency: string
}

// Breakpoint Analysis
export interface Breakpoint {
  scenarioId: string
  planFails: boolean
  firstFailureMonth: string | null
  failureCondition: string | null
  affectedAssumptions: string[]
  metrics: {
    metric: string
    baselineValue: number
    stressedValue: number
    evidenceId: string
  }[]
}

// Mitigation - supports both simple strings and AI-generated detailed objects
export interface PreventiveAction {
  action: string
  timing: string
  cost: string
  effectiveness: number
}

export interface ContingencyAction {
  trigger: string
  action: string
  timeline: string
  impact: string
}

export interface MonitoringMetric {
  metric: string
  threshold: string
  frequency: string
}

export interface Mitigation {
  assumptionId?: string // Optional for AI-generated
  scenarioId: string
  // Can be simple strings (legacy) or detailed objects (AI-generated)
  preventiveActions: string[] | PreventiveAction[]
  contingencyActions: string[] | ContingencyAction[]
  monitoringMetrics: string[] | MonitoringMetric[]
  triggerThresholds?: { metric: string; threshold: number }[]
}

// Full Analysis Result
export interface AnalysisResult {
  assumptions: Assumption[]
  scenarios: Scenario[]
  breakpoints: Breakpoint[]
  mitigations: Mitigation[]
  evidenceStore: Evidence[]
  executiveSummary: {
    topRiskyAssumptions: string[]
    worstCaseScenario: string
    earliestFailure: string | null
    strategicRecommendations: string[]
  }
}
