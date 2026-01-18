"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart,
} from "recharts"
import type { CashFlowRow, PnLRow, KPIRow, Scenario } from "@/lib/types"
import {
  simulatePnLUnderStress,
  simulateCashFlowUnderStress,
  simulateKPIsUnderStress,
} from "@/lib/stress-engine"

// Define explicit colors for charts
const COLORS = {
  baseline: "#2563eb", // Blue
  stressed: "#dc2626", // Red
  target: "#16a34a", // Green
  warning: "#f59e0b", // Amber
  gridLine: "#e5e7eb", // Gray
}

interface TimelineChartProps {
  baseCashFlow: CashFlowRow[]
  basePnL: PnLRow[]
  baseKPIs: KPIRow[]
  selectedScenario?: Scenario | null
}

export function TimelineChart({
  baseCashFlow,
  basePnL,
  baseKPIs,
  selectedScenario,
}: TimelineChartProps) {
  // Calculate stressed data if scenario is selected
  const stressedPnL = selectedScenario
    ? simulatePnLUnderStress(basePnL, baseKPIs, selectedScenario)
    : null
  const stressedCashFlow =
    selectedScenario && stressedPnL
      ? simulateCashFlowUnderStress(baseCashFlow, stressedPnL)
      : null
  const stressedKPIs = selectedScenario
    ? simulateKPIsUnderStress(baseKPIs, selectedScenario)
    : null

  // Prepare cash data
  const cashData = baseCashFlow.map((row, idx) => ({
    month: row.month.slice(5), // MM format
    baseline: row.cashEnd / 1000000,
    stressed: stressedCashFlow ? stressedCashFlow[idx].cashEnd / 1000000 : null,
  }))

  // Prepare margin data
  const marginData = basePnL.map((row, idx) => ({
    month: row.month.slice(5),
    baseline: row.grossMargin * 100,
    stressed: stressedPnL ? stressedPnL[idx].grossMargin * 100 : null,
  }))

  // Prepare EBITDA data
  const ebitdaData = basePnL.map((row, idx) => ({
    month: row.month.slice(5),
    baseline: row.ebitda / 1000,
    stressed: stressedPnL ? stressedPnL[idx].ebitda / 1000 : null,
  }))

  // Prepare customer data
  const customerData = baseKPIs.map((row, idx) => ({
    month: row.month.slice(5),
    baseline: row.customersEnd / 1000,
    stressed: stressedKPIs ? stressedKPIs[idx].customersEnd / 1000 : null,
  }))

  const formatCurrency = (value: number) => `$${value.toFixed(1)}M`
  const formatThousands = (value: number) => `$${value.toFixed(0)}K`
  const formatPercent = (value: number) => `${value.toFixed(1)}%`
  const formatCustomers = (value: number) => `${value.toFixed(1)}K`

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Cash Balance */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Cash Balance (Ending)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={cashData}>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.gridLine} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 10, fill: "#6b7280" }}
                />
                <YAxis
                  tickFormatter={formatCurrency}
                  tick={{ fontSize: 10, fill: "#6b7280" }}
                />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <ReferenceLine y={0} stroke={COLORS.stressed} strokeDasharray="3 3" />
                <Line
                  type="monotone"
                  dataKey="baseline"
                  stroke={COLORS.baseline}
                  strokeWidth={3}
                  dot={{ r: 3, fill: COLORS.baseline }}
                  name="Baseline"
                />
                {selectedScenario && (
                  <Line
                    type="monotone"
                    dataKey="stressed"
                    stroke={COLORS.stressed}
                    strokeWidth={3}
                    strokeDasharray="5 5"
                    dot={{ r: 3, fill: COLORS.stressed }}
                    name="Stressed"
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Gross Margin */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Gross Margin</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={marginData}>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.gridLine} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 10, fill: "#6b7280" }}
                />
                <YAxis
                  domain={[60, 80]}
                  tickFormatter={formatPercent}
                  tick={{ fontSize: 10, fill: "#6b7280" }}
                />
                <Tooltip
                  formatter={(value: number) => formatPercent(value)}
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <ReferenceLine
                  y={70}
                  stroke={COLORS.target}
                  strokeDasharray="3 3"
                  label={{ value: "Target", fontSize: 10, fill: COLORS.target }}
                />
                <ReferenceLine
                  y={65}
                  stroke={COLORS.stressed}
                  strokeDasharray="3 3"
                  label={{ value: "Min", fontSize: 10, fill: COLORS.stressed }}
                />
                <Line
                  type="monotone"
                  dataKey="baseline"
                  stroke={COLORS.baseline}
                  strokeWidth={3}
                  dot={{ r: 3, fill: COLORS.baseline }}
                  name="Baseline"
                />
                {selectedScenario && (
                  <Line
                    type="monotone"
                    dataKey="stressed"
                    stroke={COLORS.stressed}
                    strokeWidth={3}
                    strokeDasharray="5 5"
                    dot={{ r: 3, fill: COLORS.stressed }}
                    name="Stressed"
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* EBITDA */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">EBITDA</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={ebitdaData}>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.gridLine} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 10, fill: "#6b7280" }}
                />
                <YAxis
                  tickFormatter={formatThousands}
                  tick={{ fontSize: 10, fill: "#6b7280" }}
                />
                <Tooltip
                  formatter={(value: number) => formatThousands(value)}
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="3 3" />
                <Area
                  type="monotone"
                  dataKey="baseline"
                  fill={COLORS.baseline}
                  fillOpacity={0.15}
                  stroke={COLORS.baseline}
                  strokeWidth={3}
                  name="Baseline"
                />
                {selectedScenario && (
                  <Line
                    type="monotone"
                    dataKey="stressed"
                    stroke={COLORS.stressed}
                    strokeWidth={3}
                    strokeDasharray="5 5"
                    dot={{ r: 3, fill: COLORS.stressed }}
                    name="Stressed"
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Customers */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Customers (Ending)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={customerData}>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.gridLine} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 10, fill: "#6b7280" }}
                />
                <YAxis
                  tickFormatter={formatCustomers}
                  tick={{ fontSize: 10, fill: "#6b7280" }}
                />
                <Tooltip
                  formatter={(value: number) => formatCustomers(value)}
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="baseline"
                  stroke={COLORS.baseline}
                  strokeWidth={3}
                  dot={{ r: 3, fill: COLORS.baseline }}
                  name="Baseline"
                />
                {selectedScenario && (
                  <Line
                    type="monotone"
                    dataKey="stressed"
                    stroke={COLORS.stressed}
                    strokeWidth={3}
                    strokeDasharray="5 5"
                    dot={{ r: 3, fill: COLORS.stressed }}
                    name="Stressed"
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
