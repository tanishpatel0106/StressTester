"use client"

import { useState, useCallback, useMemo } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  TrendingDown,
  AlertTriangle,
  Zap,
  ChartLine,
} from "lucide-react"
import { getRestaurantState, saveScenarioSet, saveComputationRun, getLatestBaseline } from "@/lib/restaurant/storage"
import { generateScenarios } from "@/lib/restaurant/ai-client"
import { computeScenario, formatCurrency, formatDelta, formatPercent } from "@/lib/restaurant/engine"
import { KPI_SPINE, DERIVED_KPIS } from "@/lib/restaurant/types"
import type {
  Scenario,
  ScenarioSet,
  KPIName,
  DerivedKPIName,
  KPIDataPoint,
  DerivedKPIs,
  ShockCurveType,
} from "@/lib/restaurant/types"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
} from "recharts"

export default function ScenariosPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const contextPackId = searchParams.get("id")

  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [localScenarios, setLocalScenarios] = useState<Scenario[] | null>(null)
  const [isApproved, setIsApproved] = useState(false)
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null)
  const [selectedMonthIdx, setSelectedMonthIdx] = useState(0)
  const [chartScenarioId, setChartScenarioId] = useState<string | null>(null)

  const state = getRestaurantState(contextPackId)
  
  const hasApprovedAssumptions = state?.assumption_set?.status === 'approved'
  const assumptions = state?.assumption_set?.assumptions || []
  const scenarios = localScenarios || state?.scenario_set?.scenarios || []
  const status = state?.scenario_set?.status
  const isCurrentlyApproved = isApproved || status === 'approved'
  const baselineRun = getLatestBaseline(contextPackId)

  const handleGenerate = useCallback(async () => {
    if (!state?.context_pack) return
    
    setIsGenerating(true)
    setError(null)
    
    try {
      const response = await generateScenarios(state.context_pack, assumptions)
      
      setLocalScenarios(response.scenarios)
      setIsApproved(false)
      
      // Save as draft
      const newSet: ScenarioSet = {
        id: `SS_${Date.now()}`,
        context_pack_id: contextPackId,
        assumption_set_id: state?.assumption_set?.id || '',
        scenarios: response.scenarios,
        status: 'draft',
        version: (state?.scenario_set?.version || 0) + 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      saveScenarioSet(newSet)
      
      // Compute scenario results
      if (baselineRun) {
        for (const scenario of response.scenarios) {
          const scenarioRun = computeScenario(
            state.context_pack,
            assumptions,
            scenario,
            baselineRun
          )
          saveComputationRun(scenarioRun)
        }
      }
      
      if (response.warnings.length > 0) {
        setError(response.warnings.join(", "))
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate scenarios")
    } finally {
      setIsGenerating(false)
    }
  }, [state?.context_pack, contextPackId, assumptions, state?.assumption_set?.id, state?.scenario_set?.version, baselineRun])

  const handleApprove = () => {
    const approvedScenarios = scenarios.map(s => ({ ...s, approved: true, approved_at: new Date().toISOString() }))
    
    const approvedSet: ScenarioSet = {
      id: state?.scenario_set?.id || `SS_${Date.now()}`,
      context_pack_id: contextPackId,
      assumption_set_id: state?.assumption_set?.id || '',
      scenarios: approvedScenarios,
      status: 'approved',
      version: state?.scenario_set?.version || 1,
      created_at: state?.scenario_set?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    saveScenarioSet(approvedSet)
    setLocalScenarios(approvedScenarios)
    setIsApproved(true)
  }

  const monthOptions = useMemo(() => {
    if (!baselineRun) return []
    return baselineRun.kpi_results.map((kpi, idx) => ({
      idx,
      label: `${new Date(kpi.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`,
    }))
  }, [baselineRun])

  const updateScenarioSet = (updatedScenarios: Scenario[]) => {
    const updatedSet: ScenarioSet = {
      id: state?.scenario_set?.id || `SS_${Date.now()}`,
      context_pack_id: contextPackId,
      assumption_set_id: state?.assumption_set?.id || '',
      scenarios: updatedScenarios,
      status: state?.scenario_set?.status || 'draft',
      version: (state?.scenario_set?.version || 0) + 1,
      created_at: state?.scenario_set?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    saveScenarioSet(updatedSet)
  }

  const handleShockTimingChange = (
    scenarioId: string,
    shockIndex: number,
    field: 'start_month_offset' | 'duration_months',
    value: string
  ) => {
    const currentScenarios = localScenarios || state?.scenario_set?.scenarios || []
    const parsedValue = value === "" ? undefined : Math.max(0, Number(value))
    const updatedScenarios = currentScenarios.map(scenario => {
      if (scenario.id !== scenarioId) return scenario
      const updatedShocks = scenario.assumption_shocks.map((shock, idx) => {
        if (idx !== shockIndex) return shock
        return {
          ...shock,
          [field]: Number.isNaN(parsedValue) ? undefined : parsedValue,
        }
      })
      return { ...scenario, assumption_shocks: updatedShocks }
    })

    setLocalScenarios(updatedScenarios)
    updateScenarioSet(updatedScenarios)

    const updatedScenario = updatedScenarios.find(s => s.id === scenarioId)
    if (updatedScenario && baselineRun && state?.context_pack) {
      const scenarioRun = computeScenario(
        state.context_pack,
        assumptions,
        updatedScenario,
        baselineRun
      )
      saveComputationRun(scenarioRun)
    }
  }

  const handleShockCurveChange = (scenarioId: string, curve: ShockCurveType) => {
    const currentScenarios = localScenarios || state?.scenario_set?.scenarios || []
    const updatedScenarios = currentScenarios.map(scenario => {
      if (scenario.id !== scenarioId) return scenario
      return { ...scenario, shock_curve: curve }
    })

    setLocalScenarios(updatedScenarios)
    updateScenarioSet(updatedScenarios)

    const updatedScenario = updatedScenarios.find(s => s.id === scenarioId)
    if (updatedScenario && baselineRun && state?.context_pack) {
      const scenarioRun = computeScenario(
        state.context_pack,
        assumptions,
        updatedScenario,
        baselineRun
      )
      saveComputationRun(scenarioRun)
    }
  }

  const severityColor = (sev: string) => {
    switch (sev) {
      case 'critical': return 'bg-rose-500/10 text-rose-600 border-rose-500/20'
      case 'high': return 'bg-orange-500/10 text-orange-600 border-orange-500/20'
      case 'moderate': return 'bg-amber-500/10 text-amber-600 border-amber-500/20'
      case 'low': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
      default: return ''
    }
  }

  const SeverityIcon = ({ severity }: { severity: string }) => {
    switch (severity) {
      case 'critical': return <Zap className="h-4 w-4 text-rose-600" />
      case 'high': return <AlertTriangle className="h-4 w-4 text-orange-600" />
      default: return <TrendingDown className="h-4 w-4 text-amber-600" />
    }
  }

  // Get scenario computation result
  const getScenarioResult = (scenarioId: string) => {
    return state?.scenario_computations.find(r => r.scenario_id === scenarioId)
  }

  const formatKpiLabel = (name: string) => {
    return name
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase())
  }

  const getKpiValue = (kpi: KPIDataPoint, name: KPIName) => {
    const key = name.toLowerCase() as keyof typeof kpi
    return kpi[key] as number
  }

  const getDerivedValue = (derived: DerivedKPIs, name: DerivedKPIName) => {
    return derived[name]
  }

  const formatMonthLabel = (date: string) =>
    new Date(date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })

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

  if (!hasApprovedAssumptions) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Scenarios</h2>
          <p className="text-muted-foreground mt-1">
            Stress test scenarios based on your assumptions
          </p>
        </div>
        <Alert className="border-amber-500/30 bg-amber-500/5">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-600">
            You must approve your assumptions before generating scenarios.
          </AlertDescription>
        </Alert>
        <Button onClick={() => router.push(`/restaurant/assumptions?id=${contextPackId}`)}>
          Go to Assumptions
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Scenarios</h2>
          <p className="text-muted-foreground mt-1">
            AI-generated stress test scenarios
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={handleGenerate} 
            disabled={isGenerating}
            variant="outline"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                AI Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                {scenarios.length > 0 ? 'Regenerate with AI' : 'Generate with AI'}
              </>
            )}
          </Button>
          {scenarios.length > 0 && !isCurrentlyApproved && (
            <Button onClick={handleApprove}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Approve Scenarios
            </Button>
          )}
          {isCurrentlyApproved && (
            <Button onClick={() => router.push(`/restaurant/mitigations?id=${contextPackId}`)}>
              Continue to Mitigations
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>

      {/* Status Banner */}
      {isCurrentlyApproved && (
        <Alert className="border-emerald-500/30 bg-emerald-500/5">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <AlertDescription className="text-emerald-600">
            Scenarios approved. You can now generate mitigations.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* No Scenarios Yet */}
      {scenarios.length === 0 && !isGenerating && (
        <Card className="p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <AlertTriangle className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">No Scenarios Yet</h3>
          <p className="text-muted-foreground max-w-md mx-auto mb-4">
            Generate stress test scenarios that shock your approved assumptions.
          </p>
          <Button onClick={handleGenerate}>
            <Sparkles className="h-4 w-4 mr-2" />
            Generate Scenarios with AI
          </Button>
        </Card>
      )}

      {/* Scenarios Grid */}
      {scenarios.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          {scenarios.map((scenario) => {
            const result = getScenarioResult(scenario.id)
            const isSelected = selectedScenarioId === scenario.id
            const curveType = scenario.shock_curve ?? "flat"
            
            return (
              <Card 
                key={scenario.id} 
                className={`cursor-pointer transition-colors ${isSelected ? 'ring-2 ring-primary' : 'hover:bg-muted/30'}`}
                onClick={() => setSelectedScenarioId(isSelected ? null : scenario.id)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <SeverityIcon severity={scenario.severity} />
                      <CardTitle className="text-base">{scenario.name}</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={severityColor(scenario.severity)}>
                        {scenario.severity}
                      </Badge>
                      <Badge variant="outline" className="font-mono text-xs">
                        {(scenario.probability * 100).toFixed(0)}% prob
                      </Badge>
                    </div>
                  </div>
                  <CardDescription>{scenario.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Shock curve</p>
                      <Select
                        value={curveType}
                        onValueChange={(value) => handleShockCurveChange(scenario.id, value as ShockCurveType)}
                      >
                        <SelectTrigger
                          size="sm"
                          className="min-w-[140px]"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <SelectValue placeholder="Select curve" />
                        </SelectTrigger>
                        <SelectContent onClick={(event) => event.stopPropagation()}>
                          <SelectItem value="flat">Flat</SelectItem>
                          <SelectItem value="decay">Decay</SelectItem>
                          <SelectItem value="recovery">Recovery</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={(event) => {
                        event.stopPropagation()
                        setChartScenarioId(scenario.id)
                      }}
                    >
                      <ChartLine className="h-4 w-4" />
                      View KPI trends
                    </Button>
                  </div>
                  {/* Shocks Applied */}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Assumption Shocks:</p>
                    <div className="flex flex-wrap gap-1">
                      {scenario.assumption_shocks.map((shock, idx) => {
                        const assumption = assumptions.find(a => a.id === shock.assumption_id)
                        const startLabel = shock.start_month_offset !== undefined
                          ? `M${shock.start_month_offset + 1}`
                          : 'M1'
                        const durationLabel = shock.duration_months ? `${shock.duration_months}mo` : 'open-ended'
                        return (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {assumption?.label || shock.assumption_id}: 
                            {shock.shock_type === 'multiply' && ` x${shock.shock_value}`}
                            {shock.shock_type === 'add' && ` +${shock.shock_value}`}
                            {shock.shock_type === 'set' && ` = ${shock.shock_value}`}
                            <span className="ml-1 text-[10px] text-muted-foreground">
                              ({startLabel}, {durationLabel})
                            </span>
                          </Badge>
                        )
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Shock Timing</p>
                    {scenario.assumption_shocks.map((shock, idx) => {
                      const assumption = assumptions.find(a => a.id === shock.assumption_id)
                      return (
                        <div key={`${scenario.id}-${idx}`} className="grid gap-2 text-xs md:grid-cols-3">
                          <span className="text-muted-foreground md:col-span-1">
                            {assumption?.label || shock.assumption_id}
                          </span>
                          <label
                            className="flex items-center gap-2 text-muted-foreground"
                            onClick={(event) => event.stopPropagation()}
                          >
                            Start month
                            <Input
                              type="number"
                              min={0}
                              placeholder="0"
                              value={shock.start_month_offset ?? ""}
                              onClick={(event) => event.stopPropagation()}
                              onChange={(event) =>
                                handleShockTimingChange(
                                  scenario.id,
                                  idx,
                                  'start_month_offset',
                                  event.target.value
                                )
                              }
                              className="h-7 w-20 text-xs"
                            />
                          </label>
                          <label
                            className="flex items-center gap-2 text-muted-foreground"
                            onClick={(event) => event.stopPropagation()}
                          >
                            Duration (mo)
                            <Input
                              type="number"
                              min={0}
                              placeholder="—"
                              value={shock.duration_months ?? ""}
                              onClick={(event) => event.stopPropagation()}
                              onChange={(event) =>
                                handleShockTimingChange(
                                  scenario.id,
                                  idx,
                                  'duration_months',
                                  event.target.value
                                )
                              }
                              className="h-7 w-20 text-xs"
                            />
                          </label>
                        </div>
                      )
                    })}
                    <p className="text-[11px] text-muted-foreground">
                      Start month uses a zero-based offset (0 = first month).
                    </p>
                  </div>
                  
                  {/* Impact Summary */}
                  {result && (
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Revenue</p>
                        <p className={`text-sm font-medium ${result.summary.total_revenue_change_pct < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                          {formatDelta(result.summary.total_revenue_change_pct)}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Net Profit</p>
                        <p className={`text-sm font-medium ${result.summary.net_profit_change_pct < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                          {formatDelta(result.summary.net_profit_change_pct)}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Prime Cost</p>
                        <p className={`text-sm font-medium ${result.summary.prime_cost_change_pct > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                          {formatDelta(result.summary.prime_cost_change_pct)}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {/* Trigger Conditions */}
                  {scenario.trigger_conditions.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium">Triggers: </span>
                      {scenario.trigger_conditions.join(", ")}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Baseline vs Scenario Comparison */}
      {selectedScenarioId && baselineRun && (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">KPI Matrix (Baseline vs Scenario)</CardTitle>
                <CardDescription>
                  {scenarios.find(s => s.id === selectedScenarioId)?.name}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Month</span>
                <Select
                  value={String(selectedMonthIdx)}
                  onValueChange={(value) => setSelectedMonthIdx(Number(value))}
                >
                  <SelectTrigger size="sm" className="min-w-[140px]">
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map(option => (
                      <SelectItem key={option.idx} value={String(option.idx)}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto">
              {(() => {
                const scenarioRun = getScenarioResult(selectedScenarioId)
                const baseKpi = baselineRun.kpi_results[selectedMonthIdx]
                const scenarioKpi = scenarioRun?.kpi_results[selectedMonthIdx]
                const baseDerived = baselineRun.derived_results[selectedMonthIdx]
                const scenarioDerived = scenarioRun?.derived_results[selectedMonthIdx]

                if (!baseKpi || !scenarioKpi || !baseDerived || !scenarioDerived) {
                  return (
                    <p className="text-sm text-muted-foreground">
                      Select a month to view KPI comparisons.
                    </p>
                  )
                }

                const rows = [
                  ...KPI_SPINE.map((kpiName) => ({
                    name: kpiName,
                    type: 'spine' as const,
                    baseline: getKpiValue(baseKpi, kpiName),
                    scenario: getKpiValue(scenarioKpi, kpiName),
                  })),
                  ...DERIVED_KPIS.map((kpiName) => ({
                    name: kpiName,
                    type: 'derived' as const,
                    baseline: getDerivedValue(baseDerived, kpiName),
                    scenario: getDerivedValue(scenarioDerived, kpiName),
                  })),
                ]

                return (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-3">KPI</th>
                        <th className="text-right py-2 px-3">Baseline</th>
                        <th className="text-right py-2 px-3">Scenario</th>
                        <th className="text-right py-2 px-3">
                          Delta % <span className="text-xs text-muted-foreground">(vs baseline for that month)</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(row => {
                        const deltaPct = row.baseline !== 0
                          ? ((row.scenario - row.baseline) / row.baseline) * 100
                          : 0
                        const isNegative = deltaPct < 0
                        const formatValue = row.type === 'derived' ? formatPercent : formatCurrency
                        return (
                          <tr key={row.name} className="border-b border-border/50">
                            <td className="py-2 px-3">
                              <span className="font-medium">{formatKpiLabel(row.name)}</span>
                              {row.type === 'derived' && (
                                <span className="ml-2 text-[11px] text-muted-foreground">Derived</span>
                              )}
                            </td>
                            <td className="text-right py-2 px-3">{formatValue(row.baseline)}</td>
                            <td className="text-right py-2 px-3">{formatValue(row.scenario)}</td>
                            <td className={`text-right py-2 px-3 ${isNegative ? 'text-rose-500' : 'text-emerald-500'}`}>
                              {formatDelta(deltaPct)}
                              <div className="text-[10px] text-muted-foreground">
                                % vs baseline for that month
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )
              })()}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog
        open={Boolean(chartScenarioId)}
        onOpenChange={(open) => {
          if (!open) setChartScenarioId(null)
        }}
      >
        <DialogContent className="max-h-[85vh] max-w-6xl overflow-y-auto">
          {(() => {
            if (!chartScenarioId || !baselineRun) {
              return (
                <DialogHeader>
                  <DialogTitle>KPI Trend Comparison</DialogTitle>
                  <DialogDescription>Select a scenario to view the KPI trends.</DialogDescription>
                </DialogHeader>
              )
            }

            const scenario = scenarios.find(s => s.id === chartScenarioId)
            const scenarioRun = getScenarioResult(chartScenarioId)

            if (!scenario || !scenarioRun) {
              return (
                <DialogHeader>
                  <DialogTitle>KPI Trend Comparison</DialogTitle>
                  <DialogDescription>Scenario results are not available yet.</DialogDescription>
                </DialogHeader>
              )
            }

            return (
              <div className="space-y-6">
                <DialogHeader>
                  <DialogTitle>KPI Trend Comparison</DialogTitle>
                  <DialogDescription>
                    Baseline vs {scenario.name} for each KPI spine metric.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    KPI Spine (Totals)
                  </p>
                  <div className="grid gap-4 lg:grid-cols-2">
                    {KPI_SPINE.map((kpiName) => {
                      const chartData = baselineRun.kpi_results.map((baselineKpi, idx) => {
                        const scenarioKpi = scenarioRun.kpi_results[idx]
                        return {
                          date: formatMonthLabel(baselineKpi.date),
                          baseline: getKpiValue(baselineKpi, kpiName),
                          scenario: scenarioKpi ? getKpiValue(scenarioKpi, kpiName) : 0,
                        }
                      })

                      return (
                        <Card key={kpiName}>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">{formatKpiLabel(kpiName)}</CardTitle>
                            <CardDescription className="text-xs">Baseline vs scenario</CardDescription>
                          </CardHeader>
                          <CardContent className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" className="opacity-40" />
                                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                                <YAxis tick={{ fontSize: 10 }} />
                                <Tooltip formatter={(value: number) => formatCurrency(Number(value))} />
                                <Legend wrapperStyle={{ fontSize: 10 }} />
                                <Area
                                  type="monotone"
                                  dataKey="baseline"
                                  stroke="#2563eb"
                                  fill="#bfdbfe"
                                  fillOpacity={0.25}
                                  strokeWidth={2}
                                  dot={false}
                                  name="Baseline"
                                />
                                <Line
                                  type="monotone"
                                  dataKey="scenario"
                                  stroke="#f97316"
                                  strokeWidth={2}
                                  dot={false}
                                  name="Scenario"
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Derived KPIs (Margins & Ratios)
                  </p>
                  <div className="grid gap-4 lg:grid-cols-2">
                    {DERIVED_KPIS.map((kpiName) => {
                      const chartData = baselineRun.derived_results.map((baselineDerived, idx) => {
                        const scenarioDerived = scenarioRun.derived_results[idx]
                        return {
                          date: formatMonthLabel(baselineRun.kpi_results[idx].date),
                          baseline: getDerivedValue(baselineDerived, kpiName),
                          scenario: scenarioDerived ? getDerivedValue(scenarioDerived, kpiName) : 0,
                        }
                      })

                      return (
                        <Card key={kpiName}>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">{formatKpiLabel(kpiName)}</CardTitle>
                            <CardDescription className="text-xs">Baseline vs scenario (percent)</CardDescription>
                          </CardHeader>
                          <CardContent className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" className="opacity-40" />
                                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                                <YAxis tick={{ fontSize: 10 }} />
                                <Tooltip formatter={(value: number) => formatPercent(Number(value))} />
                                <Legend wrapperStyle={{ fontSize: 10 }} />
                                <Area
                                  type="monotone"
                                  dataKey="baseline"
                                  stroke="#16a34a"
                                  fill="#bbf7d0"
                                  fillOpacity={0.25}
                                  strokeWidth={2}
                                  dot={false}
                                  name="Baseline"
                                />
                                <Line
                                  type="monotone"
                                  dataKey="scenario"
                                  stroke="#db2777"
                                  strokeWidth={2}
                                  dot={false}
                                  name="Scenario"
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>
    </div>
  )
}
