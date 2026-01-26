export const KPI_SPINE = [
  "TOTAL_REVENUE",
  "COST_OF_GOODS_SOLD",
  "GROSS_PROFIT",
  "WAGE_COSTS",
  "OPERATING_EXPENSES",
  "NON_OPERATING_EXPENSES",
  "NET_PROFIT",
] as const

export type KpiKey = (typeof KPI_SPINE)[number]

export const DRIVER_CATEGORIES = {
  COVERS: "revenue",
  AVERAGE_CHECK: "revenue",
  DISCOUNT_RATE: "revenue",
  CHANNEL_MIX: "revenue",
  FOOD_COST_PROTEIN: "cogs",
  FOOD_COST_PRODUCE: "cogs",
  WASTE_PCT: "cogs",
  MENU_MIX: "cogs",
  LABOR_HOURS: "labor",
  WAGE_RATE: "labor",
  OVERTIME_PCT: "labor",
  RENT: "opex",
  UTILITIES: "opex",
  MARKETING: "opex",
  DELIVERY_COMMISSION: "opex",
  INTEREST_EXPENSE: "non_operating",
  ONE_TIME_COSTS: "non_operating",
} as const

export const DRIVER_KEYS = Object.keys(DRIVER_CATEGORIES) as Array<
  keyof typeof DRIVER_CATEGORIES
>

export type DriverKey = keyof typeof DRIVER_CATEGORIES

export const PROBABILITY_LEVELS = [
  "rare",
  "possible",
  "likely",
  "almost_certain",
] as const

export type ProbabilityLevel = (typeof PROBABILITY_LEVELS)[number]

export const CONFIDENCE_LEVELS = ["high", "medium", "low"] as const
export type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[number]
