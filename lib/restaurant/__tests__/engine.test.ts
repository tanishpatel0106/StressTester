import { describe, expect, it } from "vitest"
import { computeKpiSpineFromDrivers } from "../engine"
import { computeDerivedKpis } from "../derived"
import { applyScenarioToDrivers } from "../scenario"
import { applyMitigationToDrivers } from "../mitigation"
import type { DriverSeriesRow, Scenario, Mitigation } from "../types"

const driverSeries: DriverSeriesRow[] = [
  {
    period: "2024-01",
    drivers: {
      COVERS: 1000,
      AVERAGE_CHECK: 40,
      DISCOUNT_RATE: 0.05,
      CHANNEL_MIX: 0.2,
      FOOD_COST_PROTEIN: 8,
      FOOD_COST_PRODUCE: 3,
      WASTE_PCT: 0.04,
      MENU_MIX: 0.01,
      LABOR_HOURS: 400,
      WAGE_RATE: 20,
      OVERTIME_PCT: 0.05,
      RENT: 12000,
      UTILITIES: 2000,
      MARKETING: 1500,
      DELIVERY_COMMISSION: 0.18,
      INTEREST_EXPENSE: 800,
      ONE_TIME_COSTS: 0,
    },
  },
]

const scenario: Scenario = {
  id: "S-TEST",
  name: "Demand dip",
  description: "Covers down",
  shocks: [{ driver: "COVERS", mode: "multiply", value: 0.9, duration_months: 1 }],
  probability: "possible",
  confidence: "medium",
  evidence_refs: ["E-TEST"],
}

const mitigation: Mitigation = {
  id: "M-TEST",
  name: "Trim labor",
  description: "Reduce labor hours",
  adjustments: [{ driver: "LABOR_HOURS", mode: "multiply", value: 0.95, duration_months: 1 }],
  constraints: ["Maintain service"],
  implementation_steps: ["Adjust schedule"],
  confidence: "medium",
  evidence_refs: ["E-TEST"],
}

describe("deterministic restaurant engine", () => {
  it("computes KPI spine and derived KPIs deterministically", () => {
    const kpiSeries = computeKpiSpineFromDrivers(driverSeries)
    const derived = computeDerivedKpis(kpiSeries)

    expect(kpiSeries[0].TOTAL_REVENUE).toBeCloseTo(38000)
    expect(kpiSeries[0].GROSS_PROFIT).toBeGreaterThan(0)
    expect(derived[0].gross_margin_pct).not.toBeNull()
    expect(derived[0].prime_cost).toBeGreaterThan(0)
  })

  it("applies scenarios to drivers before recomputing KPIs", () => {
    const stressedDrivers = applyScenarioToDrivers(driverSeries, scenario)
    const stressedKpis = computeKpiSpineFromDrivers(stressedDrivers)

    expect(stressedDrivers[0].drivers.COVERS).toBeCloseTo(900)
    expect(stressedKpis[0].TOTAL_REVENUE).toBeLessThan(
      computeKpiSpineFromDrivers(driverSeries)[0].TOTAL_REVENUE ?? 0
    )
  })

  it("applies mitigations to drivers before recomputing KPIs", () => {
    const adjustedDrivers = applyMitigationToDrivers(driverSeries, mitigation)
    const adjustedKpis = computeKpiSpineFromDrivers(adjustedDrivers)

    expect(adjustedDrivers[0].drivers.LABOR_HOURS).toBeCloseTo(380)
    expect(adjustedKpis[0].WAGE_COSTS).toBeLessThan(
      computeKpiSpineFromDrivers(driverSeries)[0].WAGE_COSTS ?? 0
    )
  })
})
