"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { KPIRow, CashFlowRow, PnLRow } from "@/lib/types"
import { formatCurrency, formatPercent } from "@/lib/stress-engine"

interface KPIOverviewProps {
  kpis: KPIRow[]
  cashFlow: CashFlowRow[]
  pnl: PnLRow[]
}

export function KPIOverview({ kpis, cashFlow, pnl }: KPIOverviewProps) {
  const latestKPI = kpis[kpis.length - 1]
  const firstKPI = kpis[0]
  const latestCF = cashFlow[cashFlow.length - 1]
  const latestPnL = pnl[pnl.length - 1]

  // Calculate runway
  const avgBurn =
    cashFlow.reduce((sum, row) => sum + row.netChangeCash, 0) / cashFlow.length
  const runway = avgBurn >= 0 ? 99 : Math.round(latestCF.cashEnd / Math.abs(avgBurn))

  // Calculate customer growth
  const customerGrowth =
    ((latestKPI.customersEnd - firstKPI.customersEnd) / firstKPI.customersEnd) *
    100

  const metrics = [
    {
      title: "Ending Cash",
      value: formatCurrency(latestCF.cashEnd),
      change: formatCurrency(latestCF.cashEnd - cashFlow[0].cashBegin),
      trend: latestCF.cashEnd >= cashFlow[0].cashBegin ? "up" : "down",
      description: "Current cash position",
    },
    {
      title: "Runway",
      value: `${runway}+ months`,
      change: runway >= 12 ? "Healthy" : "At Risk",
      trend: runway >= 12 ? "up" : "down",
      description: "Months of cash remaining",
    },
    {
      title: "Gross Margin",
      value: formatPercent(latestPnL.grossMargin),
      change: formatPercent(latestPnL.grossMargin - pnl[0].grossMargin),
      trend: latestPnL.grossMargin >= pnl[0].grossMargin ? "up" : "down",
      description: "Revenue retention after COGS",
    },
    {
      title: "EBITDA",
      value: formatCurrency(latestPnL.ebitda),
      change: latestPnL.ebitda >= 0 ? "Profitable" : "Burn Mode",
      trend: latestPnL.ebitda >= 0 ? "up" : "down",
      description: "Operating profitability",
    },
    {
      title: "Customers",
      value: latestKPI.customersEnd.toLocaleString(),
      change: `+${customerGrowth.toFixed(1)}% YTD`,
      trend: "up",
      description: "End of period customers",
    },
    {
      title: "CAC",
      value: formatCurrency(latestKPI.cac),
      change: formatCurrency(latestKPI.cac - firstKPI.cac),
      trend: latestKPI.cac <= firstKPI.cac ? "up" : "down",
      description: "Customer acquisition cost",
    },
    {
      title: "Churn Rate",
      value: formatPercent(latestKPI.churnRate),
      change: formatPercent(latestKPI.churnRate - firstKPI.churnRate),
      trend: latestKPI.churnRate <= firstKPI.churnRate ? "up" : "down",
      description: "Monthly customer churn",
    },
    {
      title: "LTV",
      value: formatCurrency(latestKPI.ltv),
      change: `${(latestKPI.ltv / latestKPI.cac).toFixed(1)}x CAC`,
      trend: latestKPI.ltv / latestKPI.cac >= 3 ? "up" : "down",
      description: "Customer lifetime value",
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {metrics.map((metric) => (
        <Card key={metric.title} className="bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {metric.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {metric.value}
            </div>
            <div className="mt-1 flex items-center gap-1">
              {metric.trend === "up" ? (
                <svg
                  className="h-4 w-4 text-emerald-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 10l7-7m0 0l7 7m-7-7v18"
                  />
                </svg>
              ) : (
                <svg
                  className="h-4 w-4 text-rose-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 14l-7 7m0 0l-7-7m7 7V3"
                  />
                </svg>
              )}
              <span
                className={`text-sm ${
                  metric.trend === "up" ? "text-emerald-500" : "text-rose-500"
                }`}
              >
                {metric.change}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {metric.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
