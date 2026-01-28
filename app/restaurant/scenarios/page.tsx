"use client"

import { useState, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  TrendingDown,
  AlertTriangle,
  Zap,
} from "lucide-react"
import { getRestaurantState, saveScenarioSet, saveComputationRun, getLatestBaseline } from "@/lib/restaurant/storage"
import { generateScenarios } from "@/lib/restaurant/ai-client"
import { computeScenario, formatCurrency, formatDelta } from "@/lib/restaurant/engine"
import type { Scenario, ScenarioSet } from "@/lib/restaurant/types"

export default function ScenariosPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const contextPackId = searchParams.get("id")

  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [localScenarios, setLocalScenarios] = useState<Scenario[] | null>(null)
  const [isApproved, setIsApproved] = useState(false)
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null)

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

  const getDeltaDisplay = (value: number) => {
    const isValid = Number.isFinite(value)
    return {
      isValid,
      text: isValid ? formatDelta(value) : "N/A",
      title: isValid ? undefined : "Baseline value is 0 or undefined.",
    }
  }

  // Get scenario computation result
  const getScenarioResult = (scenarioId: string) => {
    return state?.scenario_computations.find(r => r.scenario_id === scenarioId)
  }

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
                  {/* Shocks Applied */}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Assumption Shocks:</p>
                    <div className="flex flex-wrap gap-1">
                      {scenario.assumption_shocks.map((shock, idx) => {
                        const assumption = assumptions.find(a => a.id === shock.assumption_id)
                        return (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {assumption?.label || shock.assumption_id}: 
                            {shock.shock_type === 'multiply' && ` x${shock.shock_value}`}
                            {shock.shock_type === 'add' && ` +${shock.shock_value}`}
                            {shock.shock_type === 'set' && ` = ${shock.shock_value}`}
                          </Badge>
                        )
                      })}
                    </div>
                  </div>
                  
                  {/* Impact Summary */}
                  {result && (
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Revenue</p>
                        {(() => {
                          const delta = getDeltaDisplay(result.summary.total_revenue_change_pct)
                          return (
                            <p
                              className={`text-sm font-medium ${delta.isValid ? (result.summary.total_revenue_change_pct < 0 ? 'text-rose-500' : 'text-emerald-500') : 'text-muted-foreground'}`}
                              title={delta.title}
                            >
                              {delta.text}
                            </p>
                          )
                        })()}
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Net Profit</p>
                        {(() => {
                          const delta = getDeltaDisplay(result.summary.net_profit_change_pct)
                          return (
                            <p
                              className={`text-sm font-medium ${delta.isValid ? (result.summary.net_profit_change_pct < 0 ? 'text-rose-500' : 'text-emerald-500') : 'text-muted-foreground'}`}
                              title={delta.title}
                            >
                              {delta.text}
                            </p>
                          )
                        })()}
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Prime Cost</p>
                        {(() => {
                          const delta = getDeltaDisplay(result.summary.prime_cost_change_pct)
                          return (
                            <p
                              className={`text-sm font-medium ${delta.isValid ? (result.summary.prime_cost_change_pct > 0 ? 'text-rose-500' : 'text-emerald-500') : 'text-muted-foreground'}`}
                              title={delta.title}
                            >
                              {delta.text}
                            </p>
                          )
                        })()}
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
            <CardTitle className="text-base">Baseline vs Scenario Comparison</CardTitle>
            <CardDescription>
              {scenarios.find(s => s.id === selectedScenarioId)?.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3">Month</th>
                    <th className="text-right py-2 px-3">Baseline Revenue</th>
                    <th className="text-right py-2 px-3">Scenario Revenue</th>
                    <th className="text-right py-2 px-3">Delta</th>
                    <th className="text-right py-2 px-3">Baseline Net Profit</th>
                    <th className="text-right py-2 px-3">Scenario Net Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {baselineRun.kpi_results.slice(0, 6).map((baseKpi, idx) => {
                    const scenarioRun = getScenarioResult(selectedScenarioId)
                    const scenarioKpi = scenarioRun?.kpi_results[idx]
                    const revenueDelta = scenarioKpi && baseKpi.total_revenue !== 0
                      ? ((scenarioKpi.total_revenue - baseKpi.total_revenue) / baseKpi.total_revenue) * 100
                      : Number.NaN
                    const revenueDeltaDisplay = getDeltaDisplay(revenueDelta)
                    
                    return (
                      <tr key={baseKpi.date} className="border-b border-border/50">
                        <td className="py-2 px-3">
                          {new Date(baseKpi.date).toLocaleDateString('en-US', { month: 'short' })}
                        </td>
                        <td className="text-right py-2 px-3">{formatCurrency(baseKpi.total_revenue)}</td>
                        <td className="text-right py-2 px-3">
                          {scenarioKpi ? formatCurrency(scenarioKpi.total_revenue) : '-'}
                        </td>
                        <td
                          className={`text-right py-2 px-3 ${revenueDeltaDisplay.isValid ? (revenueDelta < 0 ? 'text-rose-500' : 'text-emerald-500') : 'text-muted-foreground'}`}
                          title={revenueDeltaDisplay.title}
                        >
                          {revenueDeltaDisplay.text}
                        </td>
                        <td className="text-right py-2 px-3">{formatCurrency(baseKpi.net_profit)}</td>
                        <td className={`text-right py-2 px-3 ${(scenarioKpi?.net_profit || 0) < 0 ? 'text-rose-500' : ''}`}>
                          {scenarioKpi ? formatCurrency(scenarioKpi.net_profit) : '-'}
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
    </div>
  )
}
