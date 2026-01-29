// Restaurant Stress-Testing Copilot - Deterministic Engine
// LLMs reason — they NEVER calculate. All computations happen here.

import type {
  KPIDataPoint,
  DerivedKPIs,
  KPISummaryStats,
  Assumption,
  Scenario,
  AssumptionShock,
  Mitigation,
  ContextPack,
  Evidence,
  ComputationRun,
  CSVRow,
  CSVParseResult,
  DerivedKPIName,
  ShockCurveType,
} from "./types"
import { buildShockCurve } from "./forecasting"

// =============================================================================
// KPI SPINE COMPUTATIONS
// =============================================================================

/**
 * Compute the KPI spine from raw CSV data.
 * Ensures GROSS_PROFIT and NET_PROFIT follow the fixed formulas.
 */
export function computeKpiSpine(row: CSVRow): KPIDataPoint {
  const gross_profit = row.total_revenue - row.cost_of_goods_sold
  const net_profit = gross_profit - row.wage_costs - row.operating_expenses - row.non_operating_expenses

  return {
    date: row.date,
    total_revenue: row.total_revenue,
    cost_of_goods_sold: row.cost_of_goods_sold,
    gross_profit,
    wage_costs: row.wage_costs,
    operating_expenses: row.operating_expenses,
    non_operating_expenses: row.non_operating_expenses,
    net_profit,
  }
}

/**
 * Compute derived KPIs from a KPI data point.
 * These are percentages and ratios that help analyze the business.
 */
export function computeDerivedKpis(kpi: KPIDataPoint): DerivedKPIs {
  const safeRevenue = kpi.total_revenue || 1 // Avoid division by zero

  return {
    gross_margin_pct: (kpi.gross_profit / safeRevenue) * 100,
    cogs_pct: (kpi.cost_of_goods_sold / safeRevenue) * 100,
    wage_pct: (kpi.wage_costs / safeRevenue) * 100,
    prime_cost: kpi.cost_of_goods_sold + kpi.wage_costs,
    prime_cost_pct: ((kpi.cost_of_goods_sold + kpi.wage_costs) / safeRevenue) * 100,
    net_margin: (kpi.net_profit / safeRevenue) * 100,
  }
}

/**
 * Compute summary statistics for a series of values.
 */
export function computeSummaryStats(values: number[]): KPISummaryStats {
  if (values.length === 0) {
    return { mean: 0, min: 0, max: 0, volatility: 0, trend: 'stable' }
  }

  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const min = Math.min(...values)
  const max = Math.max(...values)
  
  // Standard deviation (volatility)
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2))
  const volatility = Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length)

  // Trend detection using simple linear regression slope
  let trend: 'increasing' | 'decreasing' | 'stable' = 'stable'
  if (values.length >= 3) {
    const n = values.length
    const xMean = (n - 1) / 2
    const yMean = mean
    
    let numerator = 0
    let denominator = 0
    for (let i = 0; i < n; i++) {
      numerator += (i - xMean) * (values[i] - yMean)
      denominator += Math.pow(i - xMean, 2)
    }
    
    const slope = denominator !== 0 ? numerator / denominator : 0
    const normalizedSlope = slope / (mean || 1)
    
    if (normalizedSlope > 0.02) trend = 'increasing'
    else if (normalizedSlope < -0.02) trend = 'decreasing'
  }

  return { mean, min, max, volatility, trend }
}

// =============================================================================
// CSV INGESTION
// =============================================================================

/**
 * Parse CSV text into rows with validation.
 */
export function parseCSV(csvText: string): CSVParseResult {
  const lines = csvText.trim().split('\n')
  const errors: string[] = []
  const warnings: string[] = []
  const data: CSVRow[] = []

  if (lines.length < 2) {
    return { success: false, data: [], errors: ['CSV must have header and at least one data row'], warnings: [] }
  }

  const header = lines[0].toLowerCase().split(',').map(h => h.trim())
  const requiredColumns = ['date', 'total_revenue', 'cost_of_goods_sold', 'wage_costs', 'operating_expenses', 'non_operating_expenses']
  
  for (const col of requiredColumns) {
    if (!header.includes(col)) {
      errors.push(`Missing required column: ${col}`)
    }
  }

  if (errors.length > 0) {
    return { success: false, data: [], errors, warnings }
  }

  const columnIndex: Record<string, number> = {}
  header.forEach((col, idx) => { columnIndex[col] = idx })

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim())
    
    if (values.length < requiredColumns.length) {
      warnings.push(`Row ${i + 1}: Incomplete data, skipping`)
      continue
    }

    const parseNum = (col: string): number => {
      const val = parseFloat(values[columnIndex[col]])
      return isNaN(val) ? 0 : val
    }

    try {
      data.push({
        date: values[columnIndex['date']],
        total_revenue: parseNum('total_revenue'),
        cost_of_goods_sold: parseNum('cost_of_goods_sold'),
        wage_costs: parseNum('wage_costs'),
        operating_expenses: parseNum('operating_expenses'),
        non_operating_expenses: parseNum('non_operating_expenses'),
      })
    } catch (e) {
      warnings.push(`Row ${i + 1}: Parse error, skipping`)
    }
  }

  return { success: data.length > 0, data, errors, warnings }
}

/**
 * Build a full context pack from CSV data.
 */
export function buildContextPack(
  csvRows: CSVRow[],
  restaurantName: string,
  datasetId: string
): ContextPack {
  const kpi_series = csvRows.map(computeKpiSpine)
  const derived_series = kpi_series.map(computeDerivedKpis)

  // Build evidence registry from CSV cells
  const evidence_registry: Evidence[] = []
  csvRows.forEach((row, rowIdx) => {
    Object.entries(row).forEach(([col, value]) => {
      if (col !== 'date') {
        evidence_registry.push({
          id: `E${evidence_registry.length + 1}`,
          type: 'csv_cell',
          source: 'uploaded_csv',
          row: rowIdx + 1,
          column: col,
          value,
          timestamp: new Date().toISOString(),
        })
      }
    })
  })

  // Compute derived summary stats
  const derived_summary: Record<DerivedKPIName, KPISummaryStats> = {
    gross_margin_pct: computeSummaryStats(derived_series.map(d => d.gross_margin_pct)),
    cogs_pct: computeSummaryStats(derived_series.map(d => d.cogs_pct)),
    wage_pct: computeSummaryStats(derived_series.map(d => d.wage_pct)),
    prime_cost: computeSummaryStats(derived_series.map(d => d.prime_cost)),
    prime_cost_pct: computeSummaryStats(derived_series.map(d => d.prime_cost_pct)),
    net_margin: computeSummaryStats(derived_series.map(d => d.net_margin)),
  }

  return {
    id: `CP_${datasetId}`,
    metadata: {
      name: restaurantName,
      dataset_id: datasetId,
      uploaded_at: new Date().toISOString(),
    },
    kpi_series,
    derived_summary,
    evidence_registry,
    created_at: new Date().toISOString(),
  }
}

// =============================================================================
// SCENARIO APPLICATION
// =============================================================================

/**
 * Apply a single shock to a value.
 */
function applyShock(baseValue: number, shock: AssumptionShock): number {
  switch (shock.shock_type) {
    case 'multiply':
      return baseValue * shock.shock_value
    case 'add':
      return baseValue + shock.shock_value
    case 'set':
      return shock.shock_value
    default:
      return baseValue
  }
}

function isShockActiveForMonth(shock: AssumptionShock, monthIdx: number, kpiDate: string): boolean {
  if (shock.start_date || shock.end_date) {
    const monthTime = new Date(kpiDate).getTime()
    const startTime = shock.start_date ? new Date(shock.start_date).getTime() : Number.NEGATIVE_INFINITY
    const endTime = shock.end_date ? new Date(shock.end_date).getTime() : Number.POSITIVE_INFINITY
    return monthTime >= startTime && monthTime <= endTime
  }

  const startOffset = shock.start_month_offset ?? 0
  if (monthIdx < startOffset) return false

  if (shock.duration_months === undefined) return true
  return monthIdx < startOffset + shock.duration_months
}

const resolveShockStartIndex = (shock: AssumptionShock, baseKpis: KPIDataPoint[]) => {
  if (shock.start_month_offset !== undefined) return shock.start_month_offset
  if (shock.start_date) {
    const startTime = new Date(shock.start_date).getTime()
    const foundIndex = baseKpis.findIndex(kpi => new Date(kpi.date).getTime() >= startTime)
    if (foundIndex >= 0) return foundIndex
  }
  return 0
}

const resolveShockEndIndex = (
  shock: AssumptionShock,
  baseKpis: KPIDataPoint[],
  startIndex: number
) => {
  if (shock.duration_months !== undefined) {
    return startIndex + Math.max(0, shock.duration_months - 1)
  }
  if (shock.end_date) {
    const endTime = new Date(shock.end_date).getTime()
    const reverseIndex = [...baseKpis].reverse().findIndex(
      kpi => new Date(kpi.date).getTime() <= endTime
    )
    if (reverseIndex >= 0) {
      return baseKpis.length - 1 - reverseIndex
    }
  }
  return baseKpis.length - 1
}

/**
 * Apply scenario shocks to assumptions and recompute KPIs.
 * Scenarios shock ASSUMPTIONS, not KPIs directly.
 */
export function applyScenario(
  baseKpis: KPIDataPoint[],
  assumptions: Assumption[],
  scenario: Scenario
): KPIDataPoint[] {
  // Create a map of assumption modifications
  const assumptionMods: Map<string, number> = new Map()
  const shockByAssumption: Map<string, AssumptionShock> = new Map()
  const curveCache: Map<string, number[]> = new Map()
  const shockWindowCache: Map<
    string,
    { startIndex: number; endIndex: number; horizonMonths: number }
  > = new Map()
  const scenarioCurve = scenario.shock_curve ?? 'flat'
  
  for (const shock of scenario.assumption_shocks) {
    const assumption = assumptions.find(a => a.id === shock.assumption_id)
    if (assumption) {
      const modifiedValue = applyShock(assumption.baseline_value, shock)
      assumptionMods.set(assumption.id, modifiedValue)
      shockByAssumption.set(assumption.id, shock)

      const startIndex = resolveShockStartIndex(shock, baseKpis)
      const endIndex = Math.min(
        baseKpis.length - 1,
        resolveShockEndIndex(shock, baseKpis, startIndex)
      )
      if (endIndex >= startIndex) {
        const horizonMonths = Math.max(1, endIndex - startIndex + 1)
        shockWindowCache.set(assumption.id, { startIndex, endIndex, horizonMonths })
        curveCache.set(
          assumption.id,
          buildShockCurve({
            curve: scenarioCurve,
            horizonMonths,
            kpiSeries: baseKpis,
          }).values
        )
      }
    }
  }

  // Apply modifications to KPIs based on assumption category
  return baseKpis.map((kpi, monthIdx) => {
    let modifiedKpi = { ...kpi }

    for (const assumption of assumptions) {
      const modValue = assumptionMods.get(assumption.id)
      if (modValue === undefined) continue

      // Check if shock applies to this month
      const shock = shockByAssumption.get(assumption.id)
      if (shock && !isShockActiveForMonth(shock, monthIdx, kpi.date)) continue

      // Calculate the change ratio
      const changeRatio = modValue / assumption.baseline_value
      const shockWindow = shockWindowCache.get(assumption.id)
      const curveValues = curveCache.get(assumption.id)
      let blendedRatio = changeRatio

      if (shock && shockWindow && curveValues) {
        const monthOffset = monthIdx - shockWindow.startIndex
        const blendToBaseline =
          monthOffset >= 0 && monthOffset < curveValues.length ? curveValues[monthOffset] : 1
        blendedRatio = changeRatio * (1 - blendToBaseline) + 1 * blendToBaseline
      }

      // Apply based on category (simplified mapping)
      switch (assumption.category) {
        case 'revenue':
          modifiedKpi.total_revenue = Math.round(modifiedKpi.total_revenue * blendedRatio)
          break
        case 'cogs':
          modifiedKpi.cost_of_goods_sold = Math.round(modifiedKpi.cost_of_goods_sold * blendedRatio)
          break
        case 'wages':
          modifiedKpi.wage_costs = Math.round(modifiedKpi.wage_costs * blendedRatio)
          break
        case 'operating_expenses':
          modifiedKpi.operating_expenses = Math.round(modifiedKpi.operating_expenses * blendedRatio)
          break
        case 'non_operating_expenses':
          modifiedKpi.non_operating_expenses = Math.round(modifiedKpi.non_operating_expenses * blendedRatio)
          break
        case 'seasonality':
          // Affects revenue
          modifiedKpi.total_revenue = Math.round(modifiedKpi.total_revenue * blendedRatio)
          break
        case 'external':
          // Could affect multiple - simplify to revenue
          modifiedKpi.total_revenue = Math.round(modifiedKpi.total_revenue * blendedRatio)
          break
      }
    }

    // Recompute derived values to maintain KPI identities
    modifiedKpi.gross_profit = modifiedKpi.total_revenue - modifiedKpi.cost_of_goods_sold
    modifiedKpi.net_profit = modifiedKpi.gross_profit - modifiedKpi.wage_costs - 
                            modifiedKpi.operating_expenses - modifiedKpi.non_operating_expenses

    return modifiedKpi
  })
}

// =============================================================================
// MITIGATION APPLICATION
// =============================================================================

/**
 * Apply mitigations to modify KPIs.
 * Mitigations modify DRIVERS which affect KPIs.
 */
export function applyMitigations(
  scenarioKpis: KPIDataPoint[],
  mitigations: Mitigation[],
  mitigationBlend?: {
    startIndex: number
    endIndex: number
    curveValues: number[]
  }
): KPIDataPoint[] {
  const enabledMitigations = mitigations.filter(m => m.enabled)
  
  if (enabledMitigations.length === 0) {
    return scenarioKpis
  }

  const avg = (values: number[]) => (values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length)
  const variance = (values: number[]) => {
    const mean = avg(values)
    return avg(values.map(value => (value - mean) ** 2))
  }
  const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)
  const elasticityFactors = (() => {
    const revenues = scenarioKpis.map(kpi => kpi.total_revenue)
    const cogs = scenarioKpis.map(kpi => kpi.cost_of_goods_sold)
    const wages = scenarioKpis.map(kpi => kpi.wage_costs)
    const opex = scenarioKpis.map(kpi => kpi.operating_expenses)

    const revenueVolatility = Math.sqrt(variance(revenues)) / Math.max(avg(revenues), 1)
    const cogsVolatility = Math.sqrt(variance(cogs)) / Math.max(avg(cogs), 1)
    const wageVolatility = Math.sqrt(variance(wages)) / Math.max(avg(wages), 1)
    const opexVolatility = Math.sqrt(variance(opex)) / Math.max(avg(opex), 1)

    return {
      revenue: clamp(1 + revenueVolatility, 0.7, 1.5),
      cogs: clamp(1 + cogsVolatility, 0.7, 1.5),
      wages: clamp(1 + wageVolatility, 0.7, 1.5),
      opex: clamp(1 + opexVolatility, 0.7, 1.5),
    }
  })()

  const mitigationCurves = enabledMitigations.reduce((acc, mitigation) => {
    const curveType: ShockCurveType = mitigation.category === 'revenue'
      ? 'recovery'
      : mitigation.category === 'cost_reduction'
      ? 'decay'
      : 'recovery'
    acc[mitigation.id] = buildShockCurve({
      curve: curveType,
      horizonMonths: scenarioKpis.length,
      kpiSeries: scenarioKpis,
    }).values
    return acc
  }, {} as Record<string, number[]>)

  const applyBlend = (ratio: number, monthIdx: number) => {
    if (!mitigationBlend) return ratio
    if (monthIdx < mitigationBlend.startIndex || monthIdx > mitigationBlend.endIndex) return ratio
    const curveIndex = monthIdx - mitigationBlend.startIndex
    const blendToBaseline = mitigationBlend.curveValues[curveIndex] ?? 0
    return ratio * (1 - blendToBaseline) + 1 * blendToBaseline
  }

  return scenarioKpis.map((kpi, monthIdx) => {
    let modifiedKpi = { ...kpi }

    for (const mitigation of enabledMitigations) {
      const curveValue = mitigationCurves[mitigation.id]?.[monthIdx] ?? 1
      for (const mod of mitigation.driver_modifications) {
        // Apply driver modifications based on driver type
        switch (mod.driver) {
          case 'menu_price':
          case 'average_check':
          case 'covers':
            // Revenue drivers
            const revenueChange = mod.modification_type === 'increase' 
              ? 1 + (mod.target_value / 100)
              : mod.modification_type === 'decrease'
              ? 1 - (mod.target_value / 100)
              : mod.target_value / modifiedKpi.total_revenue
            const adjustedRevenueChange = 1 + (revenueChange - 1) * elasticityFactors.revenue
            const revenueRatio = 1 + (adjustedRevenueChange - 1) * curveValue
            modifiedKpi.total_revenue = Math.round(modifiedKpi.total_revenue * applyBlend(revenueRatio, monthIdx))
            break
            
          case 'food_cost':
          case 'supplier_cost':
          case 'portion_size':
            // COGS drivers
            const cogsChange = mod.modification_type === 'decrease'
              ? 1 - (mod.target_value / 100)
              : mod.modification_type === 'increase'
              ? 1 + (mod.target_value / 100)
              : mod.target_value / modifiedKpi.cost_of_goods_sold
            const adjustedCogsChange = 1 + (cogsChange - 1) * elasticityFactors.cogs
            const cogsRatio = 1 + (adjustedCogsChange - 1) * curveValue
            modifiedKpi.cost_of_goods_sold = Math.round(modifiedKpi.cost_of_goods_sold * applyBlend(cogsRatio, monthIdx))
            break
            
          case 'labor_hours':
          case 'hourly_rate':
          case 'staff_count':
            // Wage drivers
            const wageChange = mod.modification_type === 'decrease'
              ? 1 - (mod.target_value / 100)
              : mod.modification_type === 'increase'
              ? 1 + (mod.target_value / 100)
              : mod.target_value / modifiedKpi.wage_costs
            const adjustedWageChange = 1 + (wageChange - 1) * elasticityFactors.wages
            const wageRatio = 1 + (adjustedWageChange - 1) * curveValue
            modifiedKpi.wage_costs = Math.round(modifiedKpi.wage_costs * applyBlend(wageRatio, monthIdx))
            break
            
          case 'rent':
          case 'utilities':
          case 'marketing':
            // Operating expense drivers
            const opexChange = mod.modification_type === 'decrease'
              ? 1 - (mod.target_value / 100)
              : mod.modification_type === 'increase'
              ? 1 + (mod.target_value / 100)
              : mod.target_value / modifiedKpi.operating_expenses
            const adjustedOpexChange = 1 + (opexChange - 1) * elasticityFactors.opex
            const opexRatio = 1 + (adjustedOpexChange - 1) * curveValue
            modifiedKpi.operating_expenses = Math.round(modifiedKpi.operating_expenses * applyBlend(opexRatio, monthIdx))
            break
        }
      }
    }

    // Recompute derived values
    modifiedKpi.gross_profit = modifiedKpi.total_revenue - modifiedKpi.cost_of_goods_sold
    modifiedKpi.net_profit = modifiedKpi.gross_profit - modifiedKpi.wage_costs - 
                            modifiedKpi.operating_expenses - modifiedKpi.non_operating_expenses

    return modifiedKpi
  })
}

// =============================================================================
// COMPUTATION RUNS
// =============================================================================

function computeSurvivalMetrics(
  kpiSeries: KPIDataPoint[],
  options?: {
    consecutiveMonths?: number
    netProfitThreshold?: number
  }
): {
  time_to_event_months: number | null
  event_occurred: boolean
  consecutive_months: number
  threshold: number
} {
  const consecutiveMonths = options?.consecutiveMonths ?? 2
  const netProfitThreshold = options?.netProfitThreshold ?? 0

  let streak = 0
  let eventMonth: number | null = null

  kpiSeries.forEach((kpi, idx) => {
    if (kpi.net_profit < netProfitThreshold) {
      streak += 1
      if (streak >= consecutiveMonths && eventMonth === null) {
        eventMonth = idx + 1
      }
    } else {
      streak = 0
    }
  })

  return {
    time_to_event_months: eventMonth,
    event_occurred: eventMonth !== null,
    consecutive_months: consecutiveMonths,
    threshold: netProfitThreshold,
  }
}

/**
 * Create a baseline computation run.
 */
export function computeBaseline(contextPack: ContextPack): ComputationRun {
  const derived_results = contextPack.kpi_series.map(computeDerivedKpis)
  const survival = computeSurvivalMetrics(contextPack.kpi_series)

  return {
    id: `CR_baseline_${Date.now()}`,
    context_pack_id: contextPack.id,
    computation_type: 'baseline',
    input_assumptions: [],
    kpi_results: contextPack.kpi_series,
    derived_results,
    survival,
    summary: {
      total_revenue_change_pct: 0,
      net_profit_change_pct: 0,
      prime_cost_change_pct: 0,
      gross_margin_change_pct: 0,
    },
    computed_at: new Date().toISOString(),
  }
}

/**
 * Create a scenario computation run.
 */
export function computeScenario(
  contextPack: ContextPack,
  assumptions: Assumption[],
  scenario: Scenario,
  baselineRun: ComputationRun
): ComputationRun {
  const scenarioKpis = applyScenario(contextPack.kpi_series, assumptions, scenario)
  const derived_results = scenarioKpis.map(computeDerivedKpis)
  const survival = computeSurvivalMetrics(scenarioKpis)

  // Compute deltas
  const baseTotal = baselineRun.kpi_results.reduce((sum, k) => sum + k.total_revenue, 0)
  const scenarioTotal = scenarioKpis.reduce((sum, k) => sum + k.total_revenue, 0)
  const baseNetProfit = baselineRun.kpi_results.reduce((sum, k) => sum + k.net_profit, 0)
  const scenarioNetProfit = scenarioKpis.reduce((sum, k) => sum + k.net_profit, 0)
  
  const basePrimeCost = baselineRun.kpi_results.reduce((sum, k) => sum + k.cost_of_goods_sold + k.wage_costs, 0)
  const scenarioPrimeCost = scenarioKpis.reduce((sum, k) => sum + k.cost_of_goods_sold + k.wage_costs, 0)
  
  const baseGrossMargin = baselineRun.derived_results.reduce((sum, d) => sum + d.gross_margin_pct, 0) / baselineRun.derived_results.length
  const scenarioGrossMargin = derived_results.reduce((sum, d) => sum + d.gross_margin_pct, 0) / derived_results.length

  return {
    id: `CR_scenario_${scenario.id}_${Date.now()}`,
    context_pack_id: contextPack.id,
    computation_type: 'scenario',
    scenario_id: scenario.id,
    input_assumptions: assumptions,
    kpi_results: scenarioKpis,
    derived_results,
    survival,
    summary: {
      total_revenue_change_pct: ((scenarioTotal - baseTotal) / baseTotal) * 100,
      net_profit_change_pct: baseNetProfit !== 0 ? ((scenarioNetProfit - baseNetProfit) / Math.abs(baseNetProfit)) * 100 : 0,
      prime_cost_change_pct: ((scenarioPrimeCost - basePrimeCost) / basePrimeCost) * 100,
      gross_margin_change_pct: scenarioGrossMargin - baseGrossMargin,
    },
    computed_at: new Date().toISOString(),
  }
}

/**
 * Create a mitigated computation run.
 */
export function computeMitigated(
  contextPack: ContextPack,
  assumptions: Assumption[],
  scenario: Scenario,
  mitigations: Mitigation[],
  baselineRun: ComputationRun,
  scenarioRun: ComputationRun
): ComputationRun {
  const shockWindows = scenario.assumption_shocks
    .map(shock => {
      const startIndex = resolveShockStartIndex(shock, baselineRun.kpi_results)
      const endIndex = Math.min(
        baselineRun.kpi_results.length - 1,
        resolveShockEndIndex(shock, baselineRun.kpi_results, startIndex)
      )
      return { startIndex, endIndex }
    })
    .filter(window => window.endIndex >= window.startIndex)

  const mitigationBlend = (() => {
    if (shockWindows.length === 0) return undefined
    const startIndex = Math.min(...shockWindows.map(window => window.startIndex))
    const endIndex = Math.max(...shockWindows.map(window => window.endIndex))
    if (endIndex < startIndex) return undefined
    const horizonMonths = Math.max(1, endIndex - startIndex + 1)
    return {
      startIndex,
      endIndex,
      curveValues: buildShockCurve({
        curve: scenario.shock_curve ?? 'flat',
        horizonMonths,
        kpiSeries: baselineRun.kpi_results,
      }).values,
    }
  })()

  const mitigatedKpis = applyMitigations(scenarioRun.kpi_results, mitigations, mitigationBlend)
  const derived_results = mitigatedKpis.map(computeDerivedKpis)
  const survival = computeSurvivalMetrics(mitigatedKpis)

  // Compute deltas from baseline
  const baseTotal = baselineRun.kpi_results.reduce((sum, k) => sum + k.total_revenue, 0)
  const mitigatedTotal = mitigatedKpis.reduce((sum, k) => sum + k.total_revenue, 0)
  const baseNetProfit = baselineRun.kpi_results.reduce((sum, k) => sum + k.net_profit, 0)
  const mitigatedNetProfit = mitigatedKpis.reduce((sum, k) => sum + k.net_profit, 0)
  
  const basePrimeCost = baselineRun.kpi_results.reduce((sum, k) => sum + k.cost_of_goods_sold + k.wage_costs, 0)
  const mitigatedPrimeCost = mitigatedKpis.reduce((sum, k) => sum + k.cost_of_goods_sold + k.wage_costs, 0)
  
  const baseGrossMargin = baselineRun.derived_results.reduce((sum, d) => sum + d.gross_margin_pct, 0) / baselineRun.derived_results.length
  const mitigatedGrossMargin = derived_results.reduce((sum, d) => sum + d.gross_margin_pct, 0) / derived_results.length

  return {
    id: `CR_mitigated_${scenario.id}_${Date.now()}`,
    context_pack_id: contextPack.id,
    computation_type: 'mitigated',
    scenario_id: scenario.id,
    mitigation_ids: mitigations.filter(m => m.enabled).map(m => m.id),
    input_assumptions: assumptions,
    kpi_results: mitigatedKpis,
    derived_results,
    survival,
    summary: {
      total_revenue_change_pct: ((mitigatedTotal - baseTotal) / baseTotal) * 100,
      net_profit_change_pct: baseNetProfit !== 0 ? ((mitigatedNetProfit - baseNetProfit) / Math.abs(baseNetProfit)) * 100 : 0,
      prime_cost_change_pct: ((mitigatedPrimeCost - basePrimeCost) / basePrimeCost) * 100,
      gross_margin_change_pct: mitigatedGrossMargin - baseGrossMargin,
    },
    computed_at: new Date().toISOString(),
  }
}

// =============================================================================
// MONTE CARLO SIMULATION
// =============================================================================

export function runMitigationMonteCarlo({
  contextPack,
  assumptions,
  scenario,
  mitigations,
  baselineRun,
  scenarioRun,
  iterations = 200,
  volatility = 0.2,
}: {
  contextPack: ContextPack
  assumptions: Assumption[]
  scenario: Scenario
  mitigations: Mitigation[]
  baselineRun: ComputationRun
  scenarioRun: ComputationRun
  iterations?: number
  volatility?: number
}): {
  total_revenue_change_pct: { p10: number; p50: number; p90: number }
  net_profit_change_pct: { p10: number; p50: number; p90: number }
  prime_cost_change_pct: { p10: number; p50: number; p90: number }
} {
  const randomNormal = () => {
    let u = 0
    let v = 0
    while (u === 0) u = Math.random()
    while (v === 0) v = Math.random()
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
  }

  const applyRandomness = (value: number) => value * (1 + randomNormal() * volatility)

  const results = Array.from({ length: iterations }, () => {
    const randomizedMitigations = mitigations.map(mitigation => ({
      ...mitigation,
      driver_modifications: mitigation.driver_modifications.map(mod => ({
        ...mod,
        target_value: Math.max(0, applyRandomness(mod.target_value)),
      })),
    }))

    return computeMitigated(
      contextPack,
      assumptions,
      scenario,
      randomizedMitigations,
      baselineRun,
      scenarioRun
    ).summary
  })

  const percentile = (values: number[], p: number) => {
    const sorted = [...values].sort((a, b) => a - b)
    if (sorted.length === 0) return 0
    const idx = Math.min(sorted.length - 1, Math.max(0, Math.round((p / 100) * (sorted.length - 1))))
    return sorted[idx]
  }

  const revenueChanges = results.map(result => result.total_revenue_change_pct)
  const profitChanges = results.map(result => result.net_profit_change_pct)
  const primeCostChanges = results.map(result => result.prime_cost_change_pct)

  return {
    total_revenue_change_pct: {
      p10: percentile(revenueChanges, 10),
      p50: percentile(revenueChanges, 50),
      p90: percentile(revenueChanges, 90),
    },
    net_profit_change_pct: {
      p10: percentile(profitChanges, 10),
      p50: percentile(profitChanges, 50),
      p90: percentile(profitChanges, 90),
    },
    prime_cost_change_pct: {
      p10: percentile(primeCostChanges, 10),
      p50: percentile(primeCostChanges, 50),
      p90: percentile(primeCostChanges, 90),
    },
  }
}

// =============================================================================
// FORMATTING UTILITIES
// =============================================================================

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

export function formatDelta(value: number): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(1)}%`
}
