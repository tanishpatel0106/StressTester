import type {
  DriverSeriesRow,
  EvidenceItem,
  DriverAssumption,
  Scenario,
  Mitigation,
  RestaurantMetadata,
  ContextPack,
} from "./types"
import { computeKpiSpineFromDrivers } from "./engine"
import { computeDerivedKpis } from "./derived"
import { buildContextPack } from "./context-pack"

export const sampleMetadata: RestaurantMetadata = {
  restaurant_name: "Harbor & Hearth",
  location: "Seattle, WA",
  currency: "USD",
  period_start: "2024-01",
  period_end: "2024-06",
  timezone: "America/Los_Angeles",
}

export const sampleDriverSeries: DriverSeriesRow[] = [
  {
    period: "2024-01",
    drivers: {
      COVERS: 5200,
      AVERAGE_CHECK: 42,
      DISCOUNT_RATE: 0.04,
      CHANNEL_MIX: 0.28,
      FOOD_COST_PROTEIN: 9.8,
      FOOD_COST_PRODUCE: 3.4,
      WASTE_PCT: 0.05,
      MENU_MIX: 0.02,
      LABOR_HOURS: 1950,
      WAGE_RATE: 21.5,
      OVERTIME_PCT: 0.06,
      RENT: 28000,
      UTILITIES: 6200,
      MARKETING: 4800,
      DELIVERY_COMMISSION: 0.18,
      INTEREST_EXPENSE: 2100,
      ONE_TIME_COSTS: 1200,
    },
  },
  {
    period: "2024-02",
    drivers: {
      COVERS: 5050,
      AVERAGE_CHECK: 41.5,
      DISCOUNT_RATE: 0.05,
      CHANNEL_MIX: 0.3,
      FOOD_COST_PROTEIN: 10.1,
      FOOD_COST_PRODUCE: 3.5,
      WASTE_PCT: 0.055,
      MENU_MIX: 0.015,
      LABOR_HOURS: 1920,
      WAGE_RATE: 21.75,
      OVERTIME_PCT: 0.065,
      RENT: 28000,
      UTILITIES: 6400,
      MARKETING: 5200,
      DELIVERY_COMMISSION: 0.18,
      INTEREST_EXPENSE: 2100,
      ONE_TIME_COSTS: 900,
    },
  },
  {
    period: "2024-03",
    drivers: {
      COVERS: 5480,
      AVERAGE_CHECK: 43,
      DISCOUNT_RATE: 0.045,
      CHANNEL_MIX: 0.27,
      FOOD_COST_PROTEIN: 9.6,
      FOOD_COST_PRODUCE: 3.3,
      WASTE_PCT: 0.045,
      MENU_MIX: 0.02,
      LABOR_HOURS: 2005,
      WAGE_RATE: 21.6,
      OVERTIME_PCT: 0.055,
      RENT: 28000,
      UTILITIES: 6000,
      MARKETING: 5100,
      DELIVERY_COMMISSION: 0.18,
      INTEREST_EXPENSE: 2100,
      ONE_TIME_COSTS: 1500,
    },
  },
  {
    period: "2024-04",
    drivers: {
      COVERS: 5750,
      AVERAGE_CHECK: 44.2,
      DISCOUNT_RATE: 0.04,
      CHANNEL_MIX: 0.26,
      FOOD_COST_PROTEIN: 9.9,
      FOOD_COST_PRODUCE: 3.4,
      WASTE_PCT: 0.05,
      MENU_MIX: 0.018,
      LABOR_HOURS: 2050,
      WAGE_RATE: 22,
      OVERTIME_PCT: 0.06,
      RENT: 28000,
      UTILITIES: 6100,
      MARKETING: 5600,
      DELIVERY_COMMISSION: 0.18,
      INTEREST_EXPENSE: 2100,
      ONE_TIME_COSTS: 800,
    },
  },
  {
    period: "2024-05",
    drivers: {
      COVERS: 5980,
      AVERAGE_CHECK: 44.5,
      DISCOUNT_RATE: 0.035,
      CHANNEL_MIX: 0.25,
      FOOD_COST_PROTEIN: 10.2,
      FOOD_COST_PRODUCE: 3.6,
      WASTE_PCT: 0.05,
      MENU_MIX: 0.02,
      LABOR_HOURS: 2100,
      WAGE_RATE: 22.2,
      OVERTIME_PCT: 0.055,
      RENT: 28000,
      UTILITIES: 6200,
      MARKETING: 6200,
      DELIVERY_COMMISSION: 0.18,
      INTEREST_EXPENSE: 2100,
      ONE_TIME_COSTS: 1000,
    },
  },
  {
    period: "2024-06",
    drivers: {
      COVERS: 6200,
      AVERAGE_CHECK: 45.1,
      DISCOUNT_RATE: 0.03,
      CHANNEL_MIX: 0.24,
      FOOD_COST_PROTEIN: 10.4,
      FOOD_COST_PRODUCE: 3.7,
      WASTE_PCT: 0.052,
      MENU_MIX: 0.018,
      LABOR_HOURS: 2140,
      WAGE_RATE: 22.5,
      OVERTIME_PCT: 0.05,
      RENT: 28000,
      UTILITIES: 6300,
      MARKETING: 6400,
      DELIVERY_COMMISSION: 0.18,
      INTEREST_EXPENSE: 2100,
      ONE_TIME_COSTS: 700,
    },
  },
]

export const sampleEvidence: EvidenceItem[] = [
  {
    id: "E-REV-001",
    type: "table_cell",
    source: "POS_Export_Q2.csv",
    description: "Daily covers and average check by service period.",
    confidence: "high",
  },
  {
    id: "E-COGS-002",
    type: "table_cell",
    source: "Invoice_Summary_Q2.xlsx",
    description: "Protein and produce costs per cover.",
    confidence: "high",
  },
  {
    id: "E-LAB-003",
    type: "table_cell",
    source: "Labor_Report_Q2.csv",
    description: "Labor hours and overtime usage.",
    confidence: "high",
  },
  {
    id: "E-OPEX-004",
    type: "document",
    source: "Lease_and_Utilities.pdf",
    description: "Fixed rent and utilities obligations.",
    confidence: "medium",
  },
  {
    id: "E-NONOP-005",
    type: "document",
    source: "Debt_Covenant.pdf",
    description: "Interest expense schedule and one-time fees.",
    confidence: "medium",
  },
]

export const sampleAssumptions: DriverAssumption[] = [
  {
    id: "A-001",
    driver: "COVERS",
    baseline: 5600,
    range: { min: 5000, max: 6400 },
    unit: "covers/month",
    confidence: "high",
    evidence_refs: ["E-REV-001"],
  },
  {
    id: "A-002",
    driver: "AVERAGE_CHECK",
    baseline: 43.5,
    range: { min: 41, max: 46 },
    unit: "USD",
    confidence: "high",
    evidence_refs: ["E-REV-001"],
  },
  {
    id: "A-003",
    driver: "WASTE_PCT",
    baseline: 0.05,
    range: { min: 0.04, max: 0.07 },
    unit: "ratio",
    confidence: "medium",
    evidence_refs: ["E-COGS-002"],
  },
  {
    id: "A-004",
    driver: "LABOR_HOURS",
    baseline: 2040,
    range: { min: 1900, max: 2250 },
    unit: "hours/month",
    confidence: "medium",
    evidence_refs: ["E-LAB-003"],
  },
]

export const sampleScenarios: Scenario[] = [
  {
    id: "S-001",
    name: "Rainy season demand dip",
    description: "Covers fall for two months while discounts rise to move inventory.",
    shocks: [
      { driver: "COVERS", mode: "multiply", value: 0.88, duration_months: 2 },
      { driver: "DISCOUNT_RATE", mode: "add", value: 0.02, duration_months: 2 },
    ],
    probability: "possible",
    confidence: "medium",
    evidence_refs: ["E-REV-001"],
  },
  {
    id: "S-002",
    name: "Protein inflation spike",
    description: "Protein costs rise for three months due to supplier disruption.",
    shocks: [
      { driver: "FOOD_COST_PROTEIN", mode: "multiply", value: 1.12, duration_months: 3 },
    ],
    probability: "likely",
    confidence: "high",
    evidence_refs: ["E-COGS-002"],
  },
]

export const sampleMitigations: Mitigation[] = [
  {
    id: "M-001",
    name: "Labor schedule optimization",
    description: "Shift labor hours down during low-cover weeks and cap overtime.",
    adjustments: [
      { driver: "LABOR_HOURS", mode: "multiply", value: 0.94, duration_months: 2 },
      { driver: "OVERTIME_PCT", mode: "set", value: 0.03, duration_months: 2 },
    ],
    constraints: ["Maintain service levels during peak dinner hours."],
    implementation_steps: [
      "Update weekly labor forecast using reservation data.",
      "Cross-train servers to cover bar shifts.",
      "Enforce overtime approval from the GM.",
    ],
    confidence: "medium",
    evidence_refs: ["E-LAB-003"],
  },
  {
    id: "M-002",
    name: "Menu engineering refresh",
    description: "Shift menu mix toward higher-margin items and reduce waste.",
    adjustments: [
      { driver: "MENU_MIX", mode: "add", value: 0.03, duration_months: 3 },
      { driver: "WASTE_PCT", mode: "add", value: -0.01, duration_months: 3 },
    ],
    constraints: ["Do not remove top-5 guest favorites."],
    implementation_steps: [
      "Highlight high-margin dishes in server training.",
      "Introduce limited-time specials to move inventory.",
      "Tighten prep pars for slow-moving items.",
    ],
    confidence: "medium",
    evidence_refs: ["E-COGS-002"],
  },
]

export const sampleKpiSeries = computeKpiSpineFromDrivers(sampleDriverSeries)
export const sampleDerivedKpis = computeDerivedKpis(sampleKpiSeries)

export const sampleContextPack: ContextPack = buildContextPack(
  sampleMetadata,
  sampleKpiSeries,
  sampleDerivedKpis,
  sampleEvidence
)
