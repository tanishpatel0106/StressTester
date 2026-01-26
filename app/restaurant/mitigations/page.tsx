"use client"

import { useState, useCallback, useMemo } from "react"
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
} from "@/lib/restaurant/storage"
import { generateMitigations } from "@/lib/restaurant/ai-client"
import { computeMitigated, formatCurrency, formatDelta } from "@/lib/restaurant/engine"
import type { Mitigation, MitigationSet } from "@/lib/restaurant/types"

export default function MitigationsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const contextPackId = searchParams.get("id")

  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [localMitigations, setLocalMitigations] = useState<Mitigation[] | null>(null)
  const [isApproved, setIsApproved] = useState(false)
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null)

  const state = getRestaurantState(contextPackId || '')
  const baselineRun = contextPackId ? getLatestBaseline(contextPackId) : null

  // Calculate mitigated results
  const mitigatedResult = useMemo(() => {
    if (!selectedScenarioId || !state?.context_pack || !baselineRun) return null
    
    const mitigations = localMitigations || state.mitigation_set?.mitigations || []
    const scenarioMitigations = mitigations.filter(m => m.scenario_id === selectedScenarioId && m.enabled)
    const scenario = state.scenario_set?.scenarios.find(s => s.id === selectedScenarioId)
    const scenarioRun = state.scenario_computations.find(r => r.scenario_id === selectedScenarioId)
    
    if (!scenario || !scenarioRun || scenarioMitigations.length === 0) return null
    
    return computeMitigated(
      state.context_pack,
      state.assumption_set?.assumptions || [],
      scenario,
      scenarioMitigations,
      baselineRun,
      scenarioRun
    )
  }, [selectedScenarioId, state, localMitigations, baselineRun])

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
      const response = await generateMitigations(scenario, assumptions, true) // Use mock
      
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
  const scenarioRun = state.scenario_computations.find(r => r.scenario_id === selectedScenarioId)

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Mitigation Studio</h2>
          <p className="text-muted-foreground mt-1">
            Generate and evaluate mitigation strategies
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
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Mitigations
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
            Generate mitigation strategies for the selected scenario.
          </p>
          <Button onClick={handleGenerate}>
            <Sparkles className="h-4 w-4 mr-2" />
            Generate Mitigations
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
