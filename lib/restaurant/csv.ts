import type { KpiSpineRow } from "./types"
import { KPI_SPINE } from "./constants"

const parseNumber = (value: string | undefined): number | null => {
  if (!value) {
    return null
  }
  const normalized = value.replace(/[$,%]/g, "").trim()
  if (!normalized) {
    return null
  }
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

export function parseCsvToKpiSeries(csv: string): KpiSpineRow[] {
  const lines = csv.trim().split(/\r?\n/)
  if (lines.length < 2) {
    return []
  }
  const headers = lines[0].split(",").map((header) => header.trim())

  return lines.slice(1).map((line) => {
    const values = line.split(",")
    const row: Partial<KpiSpineRow> = {}

    headers.forEach((header, index) => {
      if (header.toLowerCase() === "period") {
        row.period = values[index]?.trim() ?? ""
        return
      }
      if (KPI_SPINE.includes(header as (typeof KPI_SPINE)[number])) {
        ;(row as Record<string, number | null>)[header] = parseNumber(values[index])
      }
    })

    return {
      period: row.period ?? "",
      TOTAL_REVENUE: row.TOTAL_REVENUE ?? null,
      COST_OF_GOODS_SOLD: row.COST_OF_GOODS_SOLD ?? null,
      GROSS_PROFIT: row.GROSS_PROFIT ?? null,
      WAGE_COSTS: row.WAGE_COSTS ?? null,
      OPERATING_EXPENSES: row.OPERATING_EXPENSES ?? null,
      NON_OPERATING_EXPENSES: row.NON_OPERATING_EXPENSES ?? null,
      NET_PROFIT: row.NET_PROFIT ?? null,
    }
  })
}
