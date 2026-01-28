import type { KPIDataPoint, ShockCurveType } from './types'

export interface ShockCurve {
  curve: ShockCurveType
  horizonMonths: number
  trendStrength: number
  values: number[]
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

const computeTrendStrength = (kpiSeries: KPIDataPoint[]) => {
  if (kpiSeries.length < 2) return 0

  const ys = kpiSeries.map(point => point.total_revenue)
  const xs = ys.map((_, idx) => idx)
  const meanX = xs.reduce((sum, x) => sum + x, 0) / xs.length
  const meanY = ys.reduce((sum, y) => sum + y, 0) / ys.length

  const numerator = xs.reduce((sum, x, idx) => sum + (x - meanX) * (ys[idx] - meanY), 0)
  const denominator = xs.reduce((sum, x) => sum + Math.pow(x - meanX, 2), 0)
  const slope = denominator === 0 ? 0 : numerator / denominator
  const normalizedSlope = meanY === 0 ? 0 : slope / meanY

  return clamp(normalizedSlope, -0.25, 0.25)
}

export const buildShockCurve = ({
  curve,
  horizonMonths,
  kpiSeries,
}: {
  curve: ShockCurveType
  horizonMonths: number
  kpiSeries: KPIDataPoint[]
}): ShockCurve => {
  const safeHorizon = Math.max(1, Math.floor(horizonMonths))
  const trendStrength = computeTrendStrength(kpiSeries)
  const exponent = clamp(1 - trendStrength, 0.7, 1.6)

  const values = Array.from({ length: safeHorizon }, (_, idx) => {
    if (curve === 'flat') return 0
    if (safeHorizon === 1) return 0
    const progress = idx / (safeHorizon - 1)
    if (curve === 'decay') {
      return 1 - Math.pow(1 - progress, exponent)
    }
    return Math.pow(progress, exponent)
  })

  return {
    curve,
    horizonMonths: safeHorizon,
    trendStrength,
    values,
  }
}
