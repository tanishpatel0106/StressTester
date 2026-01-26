"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  DollarSign,
  Percent,
  ArrowRight,
  ChefHat,
} from "lucide-react"
import { getRestaurantState } from "@/lib/restaurant/storage"
import { formatCurrency, formatPercent } from "@/lib/restaurant/engine"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"

export default function BaselinePage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const contextPackId = searchParams.get("id")

  if (!contextPackId) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="p-6 text-center">
          <p className="text-muted-foreground">No dataset selected.</p>
          <Button onClick={() => router.push("/restaurant")} className="mt-4">
            Upload Data
          </Button>
        </Card>
      </div>
    )
  }

  const state = getRestaurantState(contextPackId)

  if (!state || !state.context_pack) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="p-6 text-center">
          <p className="text-muted-foreground">Dataset not found.</p>
          <Button onClick={() => router.push("/restaurant")} className="mt-4">
            Upload Data
          </Button>
        </Card>
      </div>
    )
  }

  const { context_pack, baseline_computation } = state
  const kpiSeries = context_pack.kpi_series
  const derivedSummary = context_pack.derived_summary

  // Prepare chart data
  const chartData = kpiSeries.map((kpi, idx) => {
    const derived = baseline_computation?.derived_results[idx]
    return {
      date: new Date(kpi.date).toLocaleDateString('en-US', { month: 'short' }),
      revenue: kpi.total_revenue,
      grossProfit: kpi.gross_profit,
      netProfit: kpi.net_profit,
      primeCost: kpi.cost_of_goods_sold + kpi.wage_costs,
      grossMargin: derived?.gross_margin_pct || 0,
      netMargin: derived?.net_margin || 0,
    }
  })

  // Calculate totals
  const totalRevenue = kpiSeries.reduce((sum, k) => sum + k.total_revenue, 0)
  const totalNetProfit = kpiSeries.reduce((sum, k) => sum + k.net_profit, 0)
  const avgGrossMargin = derivedSummary.gross_margin_pct.mean
  const avgPrimeCost = derivedSummary.prime_cost_pct.mean
  const avgNetMargin = derivedSummary.net_margin.mean

  const TrendIcon = ({ trend }: { trend: 'increasing' | 'decreasing' | 'stable' }) => {
    if (trend === 'increasing') return <TrendingUp className="h-4 w-4 text-emerald-500" />
    if (trend === 'decreasing') return <TrendingDown className="h-4 w-4 text-rose-500" />
    return <Minus className="h-4 w-4 text-muted-foreground" />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ChefHat className="h-6 w-6 text-amber-600" />
            {context_pack.metadata.name}
          </h2>
          <p className="text-muted-foreground mt-1">
            Baseline Analysis - {kpiSeries.length} periods
          </p>
        </div>
        <Button onClick={() => router.push(`/restaurant/assumptions?id=${contextPackId}`)}>
          Generate Assumptions
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              Total Revenue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold">{formatCurrency(totalRevenue)}</span>
              <TrendIcon trend={derivedSummary.gross_margin_pct.trend} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Avg: {formatCurrency(totalRevenue / kpiSeries.length)}/period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Percent className="h-3 w-3" />
              Gross Margin
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold">{formatPercent(avgGrossMargin)}</span>
              <TrendIcon trend={derivedSummary.gross_margin_pct.trend} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Range: {formatPercent(derivedSummary.gross_margin_pct.min)} - {formatPercent(derivedSummary.gross_margin_pct.max)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Percent className="h-3 w-3" />
              Prime Cost
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold">{formatPercent(avgPrimeCost)}</span>
              <TrendIcon trend={derivedSummary.prime_cost_pct.trend} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              COGS + Wages
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              Net Profit
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <span className={`text-2xl font-bold ${totalNetProfit < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                {formatCurrency(totalNetProfit)}
              </span>
              <Badge variant={avgNetMargin < 0 ? 'destructive' : 'secondary'}>
                {formatPercent(avgNetMargin)} margin
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revenue & Profit Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" name="Revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="grossProfit" name="Gross Profit" stroke="#10b981" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="netProfit" name="Net Profit" stroke="#f59e0b" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Margin Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" tickFormatter={(v) => `${v.toFixed(0)}%`} />
                  <Tooltip 
                    formatter={(value: number) => `${value.toFixed(1)}%`}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="grossMargin" name="Gross Margin %" stroke="#10b981" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="netMargin" name="Net Margin %" stroke="#f59e0b" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* KPI Spine Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">KPI Spine Details</CardTitle>
          <CardDescription>
            Monthly breakdown of the 7 core KPIs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 font-medium">Date</th>
                  <th className="text-right py-2 px-3 font-medium">Revenue</th>
                  <th className="text-right py-2 px-3 font-medium">COGS</th>
                  <th className="text-right py-2 px-3 font-medium text-emerald-600">Gross Profit</th>
                  <th className="text-right py-2 px-3 font-medium">Wages</th>
                  <th className="text-right py-2 px-3 font-medium">OpEx</th>
                  <th className="text-right py-2 px-3 font-medium">Non-OpEx</th>
                  <th className="text-right py-2 px-3 font-medium text-amber-600">Net Profit</th>
                </tr>
              </thead>
              <tbody>
                {kpiSeries.map((kpi) => (
                  <tr key={kpi.date} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-2 px-3">{new Date(kpi.date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}</td>
                    <td className="text-right py-2 px-3">{formatCurrency(kpi.total_revenue)}</td>
                    <td className="text-right py-2 px-3">{formatCurrency(kpi.cost_of_goods_sold)}</td>
                    <td className="text-right py-2 px-3 text-emerald-600">{formatCurrency(kpi.gross_profit)}</td>
                    <td className="text-right py-2 px-3">{formatCurrency(kpi.wage_costs)}</td>
                    <td className="text-right py-2 px-3">{formatCurrency(kpi.operating_expenses)}</td>
                    <td className="text-right py-2 px-3">{formatCurrency(kpi.non_operating_expenses)}</td>
                    <td className={`text-right py-2 px-3 font-medium ${kpi.net_profit < 0 ? 'text-rose-500' : 'text-amber-600'}`}>
                      {formatCurrency(kpi.net_profit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
