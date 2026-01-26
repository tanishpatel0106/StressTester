import { KPI_SPINE } from "./constants"
import type { DriverSeriesRow, KpiSpineRow } from "./types"

const nullIfMissing = (...values: Array<number | null | undefined>): number | null => {
  if (values.some((value) => value === null || value === undefined)) {
    return null
  }
  return values.reduce((sum, value) => sum + (value as number), 0)
}

const multiplyIfPresent = (...values: Array<number | null | undefined>): number | null => {
  if (values.some((value) => value === null || value === undefined)) {
    return null
  }
  return values.reduce((product, value) => product * (value as number), 1)
}

export function computeKpiSpineFromDrivers(driverSeries: DriverSeriesRow[]): KpiSpineRow[] {
  return driverSeries.map((row) => {
    const covers = row.drivers.COVERS
    const averageCheck = row.drivers.AVERAGE_CHECK
    const discountRate = row.drivers.DISCOUNT_RATE
    const channelMix = row.drivers.CHANNEL_MIX

    const foodProtein = row.drivers.FOOD_COST_PROTEIN
    const foodProduce = row.drivers.FOOD_COST_PRODUCE
    const wastePct = row.drivers.WASTE_PCT
    const menuMix = row.drivers.MENU_MIX

    const laborHours = row.drivers.LABOR_HOURS
    const wageRate = row.drivers.WAGE_RATE
    const overtimePct = row.drivers.OVERTIME_PCT

    const rent = row.drivers.RENT
    const utilities = row.drivers.UTILITIES
    const marketing = row.drivers.MARKETING
    const deliveryCommission = row.drivers.DELIVERY_COMMISSION

    const interestExpense = row.drivers.INTEREST_EXPENSE
    const oneTimeCosts = row.drivers.ONE_TIME_COSTS

    const grossRevenue = multiplyIfPresent(covers, averageCheck)
    const totalRevenue = grossRevenue === null || discountRate === null
      ? null
      : grossRevenue * (1 - discountRate)

    const baseFoodCost = nullIfMissing(foodProtein, foodProduce)
    const cogs =
      baseFoodCost === null
        ? null
        : multiplyIfPresent(
            covers,
            baseFoodCost,
            wastePct === null ? null : 1 + wastePct,
            menuMix === null ? null : 1 + menuMix
          )

    const wageCosts =
      laborHours === null || wageRate === null
        ? null
        : laborHours * wageRate * (1 + (overtimePct ?? 0))

    const deliveryExpense =
      deliveryCommission === null || totalRevenue === null || channelMix === null
        ? null
        : totalRevenue * channelMix * deliveryCommission

    const operatingExpenses = nullIfMissing(rent, utilities, marketing)

    const operatingTotal =
      operatingExpenses === null
        ? null
        : operatingExpenses + (deliveryExpense ?? 0)

    const nonOperatingExpenses = nullIfMissing(interestExpense, oneTimeCosts)

    const grossProfit =
      totalRevenue === null || cogs === null ? null : totalRevenue - cogs

    const netProfit =
      grossProfit === null || wageCosts === null || operatingTotal === null || nonOperatingExpenses === null
        ? null
        : grossProfit - wageCosts - operatingTotal - nonOperatingExpenses

    const baseRow: KpiSpineRow = {
      period: row.period,
      TOTAL_REVENUE: totalRevenue,
      COST_OF_GOODS_SOLD: cogs,
      GROSS_PROFIT: grossProfit,
      WAGE_COSTS: wageCosts,
      OPERATING_EXPENSES: operatingTotal,
      NON_OPERATING_EXPENSES: nonOperatingExpenses,
      NET_PROFIT: netProfit,
    }

    KPI_SPINE.forEach((key) => {
      if (!(key in baseRow)) {
        ;(baseRow as Record<string, number | null>)[key] = null
      }
    })

    return baseRow
  })
}
