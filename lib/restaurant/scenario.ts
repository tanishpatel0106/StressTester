import type { DriverSeriesRow, Scenario, ScenarioShock } from "./types"

const applyShock = (value: number | null, shock: ScenarioShock): number | null => {
  if (value === null) {
    return null
  }
  switch (shock.mode) {
    case "add":
      return value + shock.value
    case "multiply":
      return value * shock.value
    case "set":
      return shock.value
    default:
      return value
  }
}

export function applyScenarioToDrivers(
  driverSeries: DriverSeriesRow[],
  scenario: Scenario
): DriverSeriesRow[] {
  return driverSeries.map((row, index) => {
    const updatedDrivers = { ...row.drivers }

    scenario.shocks.forEach((shock) => {
      if (index < shock.duration_months) {
        updatedDrivers[shock.driver] = applyShock(updatedDrivers[shock.driver], shock)
      }
    })

    return {
      period: row.period,
      drivers: updatedDrivers,
    }
  })
}
