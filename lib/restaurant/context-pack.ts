import type { ContextPack, KpiSpineRow, DerivedKpiRow, EvidenceItem, RestaurantMetadata, KpiSummaryStats } from "./types"

const summarizeSeries = (values: Array<number | null>): KpiSummaryStats => {
  const filtered = values.filter((value): value is number => value !== null)
  if (filtered.length === 0) {
    return { average: null, trend: null, volatility: null, min: null, max: null }
  }
  const average = filtered.reduce((sum, value) => sum + value, 0) / filtered.length
  const min = Math.min(...filtered)
  const max = Math.max(...filtered)
  const trend = filtered[filtered.length - 1] - filtered[0]
  const variance =
    filtered.reduce((sum, value) => sum + Math.pow(value - average, 2), 0) /
    filtered.length
  const volatility = Math.sqrt(variance)
  return { average, trend, volatility, min, max }
}

export function buildContextPack(
  metadata: RestaurantMetadata,
  kpiSeries: KpiSpineRow[],
  derivedKpis: DerivedKpiRow[],
  evidenceRegistry: EvidenceItem[]
): ContextPack {
  const summary: Record<string, KpiSummaryStats> = {}
  const kpiKeys = Object.keys(kpiSeries[0] ?? {}).filter((key) => key !== "period")

  kpiKeys.forEach((key) => {
    summary[key] = summarizeSeries(
      kpiSeries.map((row) => row[key as keyof KpiSpineRow] as number | null)
    )
  })

  const derivedKeys = Object.keys(derivedKpis[0] ?? {}).filter((key) => key !== "period")
  derivedKeys.forEach((key) => {
    summary[key] = summarizeSeries(
      derivedKpis.map((row) => row[key as keyof DerivedKpiRow] as number | null)
    )
  })

  return {
    metadata,
    kpi_series: kpiSeries,
    derived_kpis: derivedKpis,
    summary,
    evidence_registry: evidenceRegistry,
  }
}
