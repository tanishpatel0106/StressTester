import type { DerivedKpiRow, KpiSpineRow } from "./types"

const safeDivide = (numerator: number | null, denominator: number | null): number | null => {
  if (numerator === null || denominator === null || denominator === 0) {
    return null
  }
  return numerator / denominator
}

export function computeDerivedKpis(kpiSeries: KpiSpineRow[]): DerivedKpiRow[] {
  return kpiSeries.map((row) => {
    const grossMarginPct = safeDivide(row.GROSS_PROFIT, row.TOTAL_REVENUE)
    const cogsPct = safeDivide(row.COST_OF_GOODS_SOLD, row.TOTAL_REVENUE)
    const wagePct = safeDivide(row.WAGE_COSTS, row.TOTAL_REVENUE)
    const primeCost =
      row.COST_OF_GOODS_SOLD === null || row.WAGE_COSTS === null
        ? null
        : row.COST_OF_GOODS_SOLD + row.WAGE_COSTS
    const primeCostPct = safeDivide(primeCost, row.TOTAL_REVENUE)
    const netMargin = safeDivide(row.NET_PROFIT, row.TOTAL_REVENUE)
    const fixedCosts =
      row.WAGE_COSTS === null ||
      row.OPERATING_EXPENSES === null ||
      row.NON_OPERATING_EXPENSES === null
        ? null
        : row.WAGE_COSTS + row.OPERATING_EXPENSES + row.NON_OPERATING_EXPENSES

    const breakevenRevenue =
      fixedCosts === null || grossMarginPct === null || grossMarginPct <= 0
        ? null
        : fixedCosts / grossMarginPct

    return {
      period: row.period,
      gross_margin_pct: grossMarginPct,
      cogs_pct: cogsPct,
      wage_pct: wagePct,
      prime_cost: primeCost,
      prime_cost_pct: primeCostPct,
      net_margin: netMargin,
      breakeven_revenue: breakevenRevenue,
    }
  })
}
