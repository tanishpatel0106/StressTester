import type { DriverSeriesRow, Mitigation, MitigationAdjustment } from "./types"

const applyAdjustment = (
  value: number | null,
  adjustment: MitigationAdjustment
): number | null => {
  if (value === null) {
    return null
  }
  switch (adjustment.mode) {
    case "add":
      return value + adjustment.value
    case "multiply":
      return value * adjustment.value
    case "set":
      return adjustment.value
    default:
      return value
  }
}

export function applyMitigationToDrivers(
  driverSeries: DriverSeriesRow[],
  mitigation: Mitigation
): DriverSeriesRow[] {
  return driverSeries.map((row, index) => {
    const updatedDrivers = { ...row.drivers }

    mitigation.adjustments.forEach((adjustment) => {
      if (index < adjustment.duration_months) {
        updatedDrivers[adjustment.driver] = applyAdjustment(
          updatedDrivers[adjustment.driver],
          adjustment
        )
      }
    })

    return {
      period: row.period,
      drivers: updatedDrivers,
    }
  })
}
