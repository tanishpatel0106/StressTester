"use client"

import { useState, useMemo, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Switch } from "@/components/ui/switch"
import { 
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Shield,
  DollarSign,
  Clock,
} from "lucide-react"
import { 
  getRestaurantState, 
  saveMitigationSet, 
  saveComputationRun,
  getLatestBaseline,
  getLatestMitigatedRun,
  getLatestScenarioRun,
} from "@/lib/restaurant/storage"
import { generateMitigations } from "@/lib/restaurant/ai-client"
import { computeMitigated, formatCurrency, formatDelta, formatPercent } from "@/lib/restaurant/engine"
import type { Mitigation, MitigationSet, KPIName, DerivedKPIName } from "@/lib/restaurant/types"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"

export default function MitigationsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const contextPackId = searchParams.get("id")

  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [localMitigations, setLocalMitigations] = useState<Mitigation[] | null>(null)
  const [isApproved, setIsApproved] = useState(false)
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null)
  const [diffMode, setDiffMode] = useState(false)
  const [diffReference, setDiffReference] = useState<"baseline" | "scenario" | "mitigated">("baseline")

  const state = getRestaurantState(contextPackId || '')
  const baselineRun = contextPackId ? getLatestBaseline(contextPackId) : null

  const scenarioRun = useMemo(() => {
    if (!contextPackId || !selectedScenarioId) return null
    return getLatestScenarioRun(contextPackId, selectedScenarioId)
  }, [contextPackId, selectedScenarioId, state?.scenario_computations])

  const storedMitigatedRun = useMemo(() => {
    if (!contextPackId || !selectedScenarioId) return null
    return getLatestMitigatedRun(contextPackId, selectedScenarioId)
  }, [contextPackId, selectedScenarioId, state?.mitigated_computations])

  // Calculate mitigated results
  const mitigatedResult = useMemo(() => {
    if (!selectedScenarioId || !state?.context_pack || !baselineRun || !scenarioRun) return null
    
    const mitigations = localMitigations || state.mitigation_set?.mitigations || []
    const scenarioMitigations = mitigations.filter(m => m.scenario_id === selectedScenarioId && m.enabled)
    const scenario = state.scenario_set?.scenarios.find(s => s.id === selectedScenarioId)
    
    if (!scenario || !scenarioRun || scenarioMitigations.length === 0) return null
    
    return computeMitigated(
      state.context_pack,
      state.assumption_set?.assumptions || [],
      scenario,
      scenarioMitigations,
      baselineRun,
      scenarioRun
    )
  }, [selectedScenarioId, state, localMitigations, baselineRun, scenarioRun])

  useEffect(() => {
    if (mitigatedResult) {
      saveComputationRun(mitigatedResult)
    }
  }, [mitigatedResult])

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
  
  if (!state?.context_pack) {
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

  // Check for approved scenarios
  const hasApprovedScenarios = state.scenario_set?.status === 'approved'
  
  if (!hasApprovedScenarios) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Mitigation Studio</h2>
          <p className="text-muted-foreground mt-1">
            Generate and evaluate mitigation strategies
          </p>
        </div>
        <Alert className="border-amber-500/30 bg-amber-500/5">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-600">
            You must approve your scenarios before generating mitigations.
          </AlertDescription>
        </Alert>
        <Button onClick={() => router.push(`/restaurant/scenarios?id=${contextPackId}`)}>
          Go to Scenarios
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    )
  }

  const scenarios = state.scenario_set?.scenarios || []
  const assumptions = state.assumption_set?.assumptions || []
  const mitigations = localMitigations || state.mitigation_set?.mitigations || []
  const status = state.mitigation_set?.status
  const isCurrentlyApproved = isApproved || status === 'approved'

  // Select first scenario by default
  if (!selectedScenarioId && scenarios.length > 0) {
    setSelectedScenarioId(scenarios[0].id)
  }

  const handleGenerate = async () => {
    if (!selectedScenarioId) return
    
    const scenario = scenarios.find(s => s.id === selectedScenarioId)
    if (!scenario) return
    
    setIsGenerating(true)
    setError(null)
    
    try {
      const response = await generateMitigations(scenario, assumptions)
      
      // Merge with existing mitigations for other scenarios
      const otherMitigations = mitigations.filter(m => m.scenario_id !== selectedScenarioId)
      const newMitigations = [...otherMitigations, ...response.mitigations]
      
      setLocalMitigations(newMitigations)
      setIsApproved(false)
      
      // Save as draft
      const newSet: MitigationSet = {
        id: `MS_${Date.now()}`,
        context_pack_id: contextPackId,
        scenario_set_id: state.scenario_set?.id || '',
        mitigations: newMitigations,
        status: 'draft',
        version: (state.mitigation_set?.version || 0) + 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      saveMitigationSet(newSet)
      
      if (response.warnings.length > 0) {
        setError(response.warnings.join(", "))
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate mitigations")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleToggleMitigation = (mitigationId: string) => {
    const updated = mitigations.map(m => 
      m.id === mitigationId ? { ...m, enabled: !m.enabled } : m
    )
    setLocalMitigations(updated)
  }

  const handleApprove = () => {
    const approvedMitigations = mitigations.map(m => ({ ...m, approved: true, approved_at: new Date().toISOString() }))
    
    const approvedSet: MitigationSet = {
      id: state.mitigation_set?.id || `MS_${Date.now()}`,
      context_pack_id: contextPackId,
      scenario_set_id: state.scenario_set?.id || '',
      mitigations: approvedMitigations,
      status: 'approved',
      version: state.mitigation_set?.version || 1,
      created_at: state.mitigation_set?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    saveMitigationSet(approvedSet)
    
    // Save mitigated computation
    if (mitigatedResult) {
      saveComputationRun(mitigatedResult)
    }
    
    setLocalMitigations(approvedMitigations)
    setIsApproved(true)
  }

  const selectedScenario = scenarios.find(s => s.id === selectedScenarioId)
  const scenarioMitigations = mitigations.filter(m => m.scenario_id === selectedScenarioId)
  const activeMitigatedRun = mitigatedResult || storedMitigatedRun

  const alignedSeries = useMemo(() => {
    if (!baselineRun || !scenarioRun) return null
    return baselineRun.kpi_results.map((baselineKpi, idx) => {
      const baselineDerived = baselineRun.derived_results[idx]
      const scenarioKpi = scenarioRun.kpi_results[idx] || baselineKpi
      const scenarioDerived = scenarioRun.derived_results[idx] || baselineDerived
      const mitigatedKpi = activeMitigatedRun?.kpi_results[idx] || scenarioKpi
      const mitigatedDerived = activeMitigatedRun?.derived_results[idx] || scenarioDerived
      return {
        date: baselineKpi.date,
        baselineKpi,
        scenarioKpi,
        mitigatedKpi,
        baselineDerived,
        scenarioDerived,
        mitigatedDerived,
      }
    })
  }, [baselineRun, scenarioRun, activeMitigatedRun])

  const kpiComparison = useMemo(() => {
    if (!baselineRun || !scenarioRun) return null
    const mitigatedRun = activeMitigatedRun
    const sum = (values: number[]) => values.reduce((total, value) => total + value, 0)
    const average = (values: number[]) => (values.length === 0 ? 0 : sum(values) / values.length)
    const getKpiTotals = (run: typeof baselineRun) => {
      const totals = {
        TOTAL_REVENUE: sum(run.kpi_results.map(kpi => kpi.total_revenue)),
        COST_OF_GOODS_SOLD: sum(run.kpi_results.map(kpi => kpi.cost_of_goods_sold)),
        GROSS_PROFIT: sum(run.kpi_results.map(kpi => kpi.gross_profit)),
        WAGE_COSTS: sum(run.kpi_results.map(kpi => kpi.wage_costs)),
        OPERATING_EXPENSES: sum(run.kpi_results.map(kpi => kpi.operating_expenses)),
        NON_OPERATING_EXPENSES: sum(run.kpi_results.map(kpi => kpi.non_operating_expenses)),
        NET_PROFIT: sum(run.kpi_results.map(kpi => kpi.net_profit)),
      }
      const derived = {
        gross_margin_pct: average(run.derived_results.map(d => d.gross_margin_pct)),
        cogs_pct: average(run.derived_results.map(d => d.cogs_pct)),
        wage_pct: average(run.derived_results.map(d => d.wage_pct)),
        prime_cost: sum(run.derived_results.map(d => d.prime_cost)),
        prime_cost_pct: average(run.derived_results.map(d => d.prime_cost_pct)),
        net_margin: average(run.derived_results.map(d => d.net_margin)),
      }
      return { totals, derived }
    }

    const baselineTotals = getKpiTotals(baselineRun)
    const scenarioTotals = getKpiTotals(scenarioRun)
    const mitigatedTotals = mitigatedRun ? getKpiTotals(mitigatedRun) : null

    return {
      baselineTotals,
      scenarioTotals,
      mitigatedTotals,
    }
  }, [baselineRun, scenarioRun, activeMitigatedRun])

  const chartData = useMemo(() => {
    if (!alignedSeries) return []
    return alignedSeries.map(point => {
      const referenceKpi = diffReference === "mitigated"
        ? point.mitigatedKpi
        : diffReference === "scenario"
          ? point.scenarioKpi
          : point.baselineKpi
      const referenceDerived = diffReference === "mitigated"
        ? point.mitigatedDerived
        : diffReference === "scenario"
          ? point.scenarioDerived
          : point.baselineDerived

      const primeCost = (kpi: typeof point.baselineKpi) => kpi.cost_of_goods_sold + kpi.wage_costs
      const applyDiff = (value: number, referenceValue: number) => (diffMode ? value - referenceValue : value)

      return {
        date: new Date(point.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        baselineRevenue: applyDiff(point.baselineKpi.total_revenue, referenceKpi.total_revenue),
        scenarioRevenue: applyDiff(point.scenarioKpi.total_revenue, referenceKpi.total_revenue),
        mitigatedRevenue: applyDiff(point.mitigatedKpi.total_revenue, referenceKpi.total_revenue),
        baselineNetProfit: applyDiff(point.baselineKpi.net_profit, referenceKpi.net_profit),
        scenarioNetProfit: applyDiff(point.scenarioKpi.net_profit, referenceKpi.net_profit),
        mitigatedNetProfit: applyDiff(point.mitigatedKpi.net_profit, referenceKpi.net_profit),
        baselinePrimeCost: applyDiff(primeCost(point.baselineKpi), primeCost(referenceKpi)),
        scenarioPrimeCost: applyDiff(primeCost(point.scenarioKpi), primeCost(referenceKpi)),
        mitigatedPrimeCost: applyDiff(primeCost(point.mitigatedKpi), primeCost(referenceKpi)),
        baselineGrossMargin: applyDiff(point.baselineDerived.gross_margin_pct, referenceDerived.gross_margin_pct),
        scenarioGrossMargin: applyDiff(point.scenarioDerived.gross_margin_pct, referenceDerived.gross_margin_pct),
        mitigatedGrossMargin: applyDiff(point.mitigatedDerived.gross_margin_pct, referenceDerived.gross_margin_pct),
      }
    })
  }, [alignedSeries, diffMode, diffReference])

  const diffLabel = diffReference === "baseline"
    ? "Baseline"
    : diffReference === "scenario"
      ? "Stressed"
      : "Mitigated"

  const formatCurrencyDelta = (value: number) => {
    const sign = value >= 0 ? "+" : "-"
    return `${sign}${formatCurrency(Math.abs(value))}`
  }

  const categoryColor = (cat: string) => {
    switch (cat) {
      case 'revenue': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
      case 'cost_reduction': return 'bg-blue-500/10 text-blue-600 border-blue-500/20'
      case 'efficiency': return 'bg-violet-500/10 text-violet-600 border-violet-500/20'
      case 'hedging': return 'bg-amber-500/10 text-amber-600 border-amber-500/20'
      case 'contingency': return 'bg-rose-500/10 text-rose-600 border-rose-500/20'
      default: return ''
    }
  }

  const spineKpiMeta: Array<{
    key: KPIName
    label: string
    denominator: string
  }> = [
    { key: 'TOTAL_REVENUE', label: 'Total Revenue', denominator: 'Sum over period' },
    { key: 'COST_OF_GOODS_SOLD', label: 'Cost of Goods Sold', denominator: 'Sum over period' },
    { key: 'GROSS_PROFIT', label: 'Gross Profit', denominator: 'Sum over period' },
    { key: 'WAGE_COSTS', label: 'Wage Costs', denominator: 'Sum over period' },
    { key: 'OPERATING_EXPENSES', label: 'Operating Expenses', denominator: 'Sum over period' },
    { key: 'NON_OPERATING_EXPENSES', label: 'Non-Operating Expenses', denominator: 'Sum over period' },
    { key: 'NET_PROFIT', label: 'Net Profit', denominator: 'Sum over period' },
  ]

  const derivedKpiMeta: Array<{
    key: DerivedKPIName
    label: string
    denominator: string
    isPercent: boolean
  }> = [
    { key: 'gross_margin_pct', label: 'Gross Margin %', denominator: 'Gross profit / revenue', isPercent: true },
    { key: 'cogs_pct', label: 'COGS %', denominator: 'COGS / revenue', isPercent: true },
    { key: 'wage_pct', label: 'Wage %', denominator: 'Wages / revenue', isPercent: true },
    { key: 'prime_cost', label: 'Prime Cost', denominator: 'COGS + wages (sum)', isPercent: false },
    { key: 'prime_cost_pct', label: 'Prime Cost %', denominator: 'Prime cost / revenue', isPercent: true },
    { key: 'net_margin', label: 'Net Margin %', denominator: 'Net profit / revenue', isPercent: true },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Mitigation Studio</h2>
          <p className="text-muted-foreground mt-1">
            AI-powered mitigation strategies for stress scenarios
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isCurrentlyApproved && (
            <Button onClick={() => router.push(`/restaurant/export?id=${contextPackId}`)}>
              Export Report
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>

      {/* Scenario Selector */}
      <div className="flex gap-2 flex-wrap">
        {scenarios.map((scenario) => (
          <Button
            key={scenario.id}
            variant={selectedScenarioId === scenario.id ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedScenarioId(scenario.id)}
          >
            {scenario.name}
          </Button>
        ))}
      </div>

      {/* Selected Scenario Info */}
      {selectedScenario && (
        <Card className="bg-muted/30">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{selectedScenario.name}</CardTitle>
              <div className="flex items-center gap-2">
                <Button 
                  onClick={handleGenerate} 
                  disabled={isGenerating}
                  size="sm"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      AI Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate with AI
                    </>
                  )}
                </Button>
                {scenarioMitigations.length > 0 && !isCurrentlyApproved && (
                  <Button onClick={handleApprove} size="sm" variant="outline">
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                )}
              </div>
            </div>
            <CardDescription>{selectedScenario.description}</CardDescription>
          </CardHeader>
          <CardContent>
            {scenarioRun && (
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center p-3 rounded-lg bg-background">
                  <p className="text-xs text-muted-foreground">Scenario Revenue</p>
                  <p className={`text-lg font-bold ${scenarioRun.summary.total_revenue_change_pct < 0 ? 'text-rose-500' : ''}`}>
                    {formatDelta(scenarioRun.summary.total_revenue_change_pct)}
                  </p>
                </div>
                <div className="text-center p-3 rounded-lg bg-background">
                  <p className="text-xs text-muted-foreground">Scenario Net Profit</p>
                  <p className={`text-lg font-bold ${scenarioRun.summary.net_profit_change_pct < 0 ? 'text-rose-500' : ''}`}>
                    {formatDelta(scenarioRun.summary.net_profit_change_pct)}
                  </p>
                </div>
                <div className="text-center p-3 rounded-lg bg-background">
                  <p className="text-xs text-muted-foreground">Mitigated Revenue</p>
                  <p className={`text-lg font-bold ${(mitigatedResult?.summary.total_revenue_change_pct || scenarioRun.summary.total_revenue_change_pct) < 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                    {mitigatedResult ? formatDelta(mitigatedResult.summary.total_revenue_change_pct) : '-'}
                  </p>
                </div>
                <div className="text-center p-3 rounded-lg bg-background">
                  <p className="text-xs text-muted-foreground">Mitigated Net Profit</p>
                  <p className={`text-lg font-bold ${(mitigatedResult?.summary.net_profit_change_pct || scenarioRun.summary.net_profit_change_pct) < 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                    {mitigatedResult ? formatDelta(mitigatedResult.summary.net_profit_change_pct) : '-'}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {baselineRun && scenarioRun && kpiComparison && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">KPI Comparison</CardTitle>
            <CardDescription>
              Baseline vs stressed vs mitigated outcomes with explicit denominators.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                    <th className="py-2 pr-4">KPI</th>
                    <th className="py-2 pr-4">Baseline</th>
                    <th className="py-2 pr-4">Stressed</th>
                    <th className="py-2 pr-4">Mitigated</th>
                    <th className="py-2 pr-4">Δ% (Mitigated vs Baseline)</th>
                  </tr>
                </thead>
                <tbody>
                  {spineKpiMeta.map(meta => {
                    const baselineValue = kpiComparison.baselineTotals.totals[meta.key]
                    const scenarioValue = kpiComparison.scenarioTotals.totals[meta.key]
                    const mitigatedValue = kpiComparison.mitigatedTotals?.totals[meta.key]
                    const deltaPct = mitigatedValue === undefined || baselineValue === 0
                      ? null
                      : ((mitigatedValue - baselineValue) / Math.abs(baselineValue)) * 100
                    return (
                      <tr key={meta.key} className="border-b border-border/50">
                        <td className="py-3 pr-4">
                          <div className="font-medium text-foreground">{meta.label}</div>
                          <div className="text-xs text-muted-foreground">{meta.denominator}</div>
                        </td>
                        <td className="py-3 pr-4">{formatCurrency(baselineValue)}</td>
                        <td className="py-3 pr-4">{formatCurrency(scenarioValue)}</td>
                        <td className="py-3 pr-4">
                          {mitigatedValue === undefined ? '-' : formatCurrency(mitigatedValue)}
                        </td>
                        <td className="py-3 pr-4">
                          {deltaPct === null ? '-' : formatDelta(deltaPct)}
                        </td>
                      </tr>
                    )
                  })}
                  {derivedKpiMeta.map(meta => {
                    const baselineValue = kpiComparison.baselineTotals.derived[meta.key]
                    const scenarioValue = kpiComparison.scenarioTotals.derived[meta.key]
                    const mitigatedValue = kpiComparison.mitigatedTotals?.derived[meta.key]
                    const deltaPct = mitigatedValue === undefined || baselineValue === 0
                      ? null
                      : ((mitigatedValue - baselineValue) / Math.abs(baselineValue)) * 100
                    const formatter = meta.isPercent ? formatPercent : formatCurrency
                    return (
                      <tr key={meta.key} className="border-b border-border/50">
                        <td className="py-3 pr-4">
                          <div className="font-medium text-foreground">{meta.label}</div>
                          <div className="text-xs text-muted-foreground">{meta.denominator}</div>
                        </td>
                        <td className="py-3 pr-4">{formatter(baselineValue)}</td>
                        <td className="py-3 pr-4">{formatter(scenarioValue)}</td>
                        <td className="py-3 pr-4">
                          {mitigatedValue === undefined ? '-' : formatter(mitigatedValue)}
                        </td>
                        <td className="py-3 pr-4">
                          {deltaPct === null ? '-' : formatDelta(deltaPct)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle className="text-base">Scenario vs Mitigation Trends</CardTitle>
                <CardDescription>
                  Overlayed baseline, stressed, and mitigated KPI trajectories.
                  {diffMode ? ` Showing deltas vs ${diffLabel}.` : ""}
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Switch checked={diffMode} onCheckedChange={setDiffMode} />
                  <span className="text-xs font-medium text-muted-foreground">Diff mode</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted-foreground">Compare vs</span>
                  {[
                    { value: "baseline", label: "Baseline" },
                    { value: "scenario", label: "Stressed" },
                    { value: "mitigated", label: "Mitigated" },
                  ].map(option => (
                    <Button
                      key={option.value}
                      size="sm"
                      variant={diffReference === option.value ? "default" : "outline"}
                      onClick={() => setDiffReference(option.value as typeof diffReference)}
                      disabled={!diffMode}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-6 lg:grid-cols-2">
            <div className="h-64">
              <p className="text-sm font-medium text-foreground mb-2">Total Revenue</p>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={value => (diffMode ? formatCurrencyDelta(value) : formatCurrency(value))}
                  />
                  <Tooltip formatter={(value: number) => (diffMode ? formatCurrencyDelta(value) : formatCurrency(value))} />
                  <Legend />
                  <Line type="monotone" dataKey="baselineRevenue" name={`Baseline${diffMode ? ` Δ vs ${diffLabel}` : ""}`} stroke="#2563eb" strokeWidth={2} />
                  <Line type="monotone" dataKey="scenarioRevenue" name={`Stressed${diffMode ? ` Δ vs ${diffLabel}` : ""}`} stroke="#f97316" strokeWidth={2} />
                  <Line type="monotone" dataKey="mitigatedRevenue" name={`Mitigated${diffMode ? ` Δ vs ${diffLabel}` : ""}`} stroke="#10b981" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="h-64">
              <p className="text-sm font-medium text-foreground mb-2">Net Profit</p>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={value => (diffMode ? formatCurrencyDelta(value) : formatCurrency(value))}
                  />
                  <Tooltip formatter={(value: number) => (diffMode ? formatCurrencyDelta(value) : formatCurrency(value))} />
                  <Legend />
                  <Line type="monotone" dataKey="baselineNetProfit" name={`Baseline${diffMode ? ` Δ vs ${diffLabel}` : ""}`} stroke="#2563eb" strokeWidth={2} />
                  <Line type="monotone" dataKey="scenarioNetProfit" name={`Stressed${diffMode ? ` Δ vs ${diffLabel}` : ""}`} stroke="#f97316" strokeWidth={2} />
                  <Line type="monotone" dataKey="mitigatedNetProfit" name={`Mitigated${diffMode ? ` Δ vs ${diffLabel}` : ""}`} stroke="#10b981" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="h-64">
              <p className="text-sm font-medium text-foreground mb-2">Prime Cost</p>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={value => (diffMode ? formatCurrencyDelta(value) : formatCurrency(value))}
                  />
                  <Tooltip formatter={(value: number) => (diffMode ? formatCurrencyDelta(value) : formatCurrency(value))} />
                  <Legend />
                  <Line type="monotone" dataKey="baselinePrimeCost" name={`Baseline${diffMode ? ` Δ vs ${diffLabel}` : ""}`} stroke="#2563eb" strokeWidth={2} />
                  <Line type="monotone" dataKey="scenarioPrimeCost" name={`Stressed${diffMode ? ` Δ vs ${diffLabel}` : ""}`} stroke="#f97316" strokeWidth={2} />
                  <Line type="monotone" dataKey="mitigatedPrimeCost" name={`Mitigated${diffMode ? ` Δ vs ${diffLabel}` : ""}`} stroke="#10b981" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="h-64">
              <p className="text-sm font-medium text-foreground mb-2">Gross Margin %</p>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={value => (diffMode ? formatDelta(value) : formatPercent(value))}
                  />
                  <Tooltip formatter={(value: number) => (diffMode ? formatDelta(value) : formatPercent(value))} />
                  <Legend />
                  <Line type="monotone" dataKey="baselineGrossMargin" name={`Baseline${diffMode ? ` Δ vs ${diffLabel}` : ""}`} stroke="#2563eb" strokeWidth={2} />
                  <Line type="monotone" dataKey="scenarioGrossMargin" name={`Stressed${diffMode ? ` Δ vs ${diffLabel}` : ""}`} stroke="#f97316" strokeWidth={2} />
                  <Line type="monotone" dataKey="mitigatedGrossMargin" name={`Mitigated${diffMode ? ` Δ vs ${diffLabel}` : ""}`} stroke="#10b981" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Mitigations List */}
      {scenarioMitigations.length === 0 && !isGenerating && (
        <Card className="p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Shield className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">No Mitigations Yet</h3>
          <p className="text-muted-foreground max-w-md mx-auto mb-4">
            Generate AI-powered mitigation strategies for the selected scenario.
          </p>
          <Button onClick={handleGenerate}>
            <Sparkles className="h-4 w-4 mr-2" />
            Generate Mitigations with AI
          </Button>
        </Card>
      )}

      {scenarioMitigations.length > 0 && (
        <div className="grid gap-4">
          {scenarioMitigations.map((mitigation) => (
            <Card key={mitigation.id} className={mitigation.enabled ? 'ring-1 ring-primary/30' : 'opacity-70'}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={mitigation.enabled}
                      onCheckedChange={() => handleToggleMitigation(mitigation.id)}
                      disabled={isCurrentlyApproved}
                    />
                    <Badge variant="outline" className="font-mono text-xs">
                      {mitigation.id}
                    </Badge>
                    <CardTitle className="text-base">{mitigation.name}</CardTitle>
                  </div>
                  <Badge variant="outline" className={categoryColor(mitigation.category)}>
                    {mitigation.category.replace('_', ' ')}
                  </Badge>
                </div>
                <CardDescription>{mitigation.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Driver Modifications */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Driver Modifications:</p>
                  <div className="grid gap-2 md:grid-cols-2">
                    {mitigation.driver_modifications.map((mod, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 rounded bg-muted/50">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {mod.driver}
                          </Badge>
                          <span className="text-sm">
                            {mod.modification_type} {mod.target_value}{mod.unit}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <DollarSign className="h-3 w-3" />
                          {formatCurrency(mod.implementation_cost)}
                          <Clock className="h-3 w-3 ml-2" />
                          {mod.time_to_implement_days}d
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Expected Impact */}
                <div className="grid grid-cols-3 gap-4 pt-2 border-t border-border">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Net Profit Impact</p>
                    <p className={`text-sm font-medium ${mitigation.expected_impact.net_profit_change > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {formatDelta(mitigation.expected_impact.net_profit_change)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Prime Cost Impact</p>
                    <p className={`text-sm font-medium ${mitigation.expected_impact.prime_cost_change < 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {formatDelta(mitigation.expected_impact.prime_cost_change)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Gross Margin Impact</p>
                    <p className={`text-sm font-medium ${mitigation.expected_impact.gross_margin_change > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {formatDelta(mitigation.expected_impact.gross_margin_change)}
                    </p>
                  </div>
                </div>
                
                {/* Risks */}
                {mitigation.risks.length > 0 && (
                  <div className="text-xs">
                    <span className="font-medium text-muted-foreground">Risks: </span>
                    <span className="text-muted-foreground">{mitigation.risks.join(", ")}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
