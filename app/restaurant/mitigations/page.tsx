"use client"

import { useState, useMemo, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  getComputationRuns,
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

const BUNDLE_OPTIONS = ["A", "B", "C"] as const
const DRIVER_SLIDER_BOUNDS: Record<
  string,
  {
    min: number
    max: number
    step: number
  }
> = {
  menu_price: { min: 0, max: 25, step: 0.5 },
  average_check: { min: 0, max: 25, step: 0.5 },
  covers: { min: 0, max: 25, step: 0.5 },
  food_cost: { min: 0, max: 20, step: 0.5 },
  supplier_cost: { min: 0, max: 20, step: 0.5 },
  portion_size: { min: 0, max: 20, step: 0.5 },
  labor_hours: { min: 0, max: 25, step: 0.5 },
  hourly_rate: { min: 0, max: 25, step: 0.5 },
  staff_count: { min: 0, max: 25, step: 0.5 },
  rent: { min: 0, max: 15, step: 0.5 },
  utilities: { min: 0, max: 15, step: 0.5 },
  marketing: { min: 0, max: 15, step: 0.5 },
  default: { min: 0, max: 25, step: 0.5 },
}

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
  const [comparisonMode, setComparisonMode] = useState<"baseline-scenario" | "scenario-mitigated" | "baseline-mitigated">("baseline-mitigated")
  const [activeBundle, setActiveBundle] = useState<"A" | "B" | "C">("A")
  const [bundleSelections, setBundleSelections] = useState<Record<string, Record<"A" | "B" | "C", string[]>>>({})

  const state = getRestaurantState(contextPackId || '')
  const contextPack = state?.context_pack
  const assumptionSet = state?.assumption_set
  const scenarioSet = state?.scenario_set
  const mitigationSet = state?.mitigation_set
  const baselineRun = contextPackId ? getLatestBaseline(contextPackId) : null

  const scenarioRun = useMemo(() => {
    if (!contextPackId || !selectedScenarioId) return null
    return getLatestScenarioRun(contextPackId, selectedScenarioId)
  }, [contextPackId, selectedScenarioId, state?.scenario_computations])

  const storedMitigatedRun = useMemo(() => {
    if (!contextPackId || !selectedScenarioId) return null
    return getLatestMitigatedRun(contextPackId, selectedScenarioId)
  }, [contextPackId, selectedScenarioId, state?.mitigated_computations])

  const bundleMitigations = useMemo(() => {
    if (!selectedScenarioId) return { A: [], B: [], C: [] }
    const currentMitigations = localMitigations || mitigationSet?.mitigations || []
    const scenarioMitigations = currentMitigations.filter(m => m.scenario_id === selectedScenarioId)
    const defaultEnabledIds = scenarioMitigations.filter(m => m.enabled).map(m => m.id)
    const selection = bundleSelections[selectedScenarioId]
    return BUNDLE_OPTIONS.reduce((acc, bundleId) => {
      const enabledIds = new Set(selection?.[bundleId] ?? defaultEnabledIds)
      acc[bundleId] = scenarioMitigations.map(mitigation => ({
        ...mitigation,
        enabled: enabledIds.has(mitigation.id),
      }))
      return acc
    }, {} as Record<"A" | "B" | "C", Mitigation[]>)
  }, [bundleSelections, localMitigations, mitigationSet?.mitigations, selectedScenarioId])

  // Calculate mitigated results
  const mitigatedResult = useMemo(() => {
    if (!selectedScenarioId || !contextPack || !baselineRun || !scenarioRun) return null
    
    const scenarioMitigations = bundleMitigations[activeBundle]?.filter(m => m.enabled) || []
    const scenario = scenarioSet?.scenarios.find(s => s.id === selectedScenarioId)
    
    if (!scenario || !scenarioRun || scenarioMitigations.length === 0) return null
    
    return computeMitigated(
      contextPack,
      assumptionSet?.assumptions || [],
      scenario,
      scenarioMitigations,
      baselineRun,
      scenarioRun
    )
  }, [activeBundle, assumptionSet?.assumptions, baselineRun, bundleMitigations, contextPack, scenarioRun, scenarioSet?.scenarios, selectedScenarioId])

  const storedBundleRuns = useMemo(() => {
    if (!contextPackId || !selectedScenarioId) return { A: null, B: null, C: null }
    const runs = getComputationRuns(contextPackId, 'mitigated')
      .filter(run => run.scenario_id === selectedScenarioId)
    return BUNDLE_OPTIONS.reduce((acc, bundleId) => {
      const bundleRuns = runs.filter(run => run.mitigation_ids?.includes(`bundle:${bundleId}`))
      if (bundleRuns.length === 0) {
        acc[bundleId] = null
        return acc
      }
      acc[bundleId] = bundleRuns.reduce((latest, current) =>
        new Date(current.computed_at) > new Date(latest.computed_at) ? current : latest
      )
      return acc
    }, {} as Record<"A" | "B" | "C", typeof storedMitigatedRun>)
  }, [contextPackId, selectedScenarioId, state?.mitigated_computations])

  const bundleRuns = useMemo(() => {
    if (!selectedScenarioId || !contextPack || !baselineRun || !scenarioRun) {
      return { A: null, B: null, C: null }
    }
    const scenario = scenarioSet?.scenarios.find(s => s.id === selectedScenarioId)
    if (!scenario) return { A: null, B: null, C: null }

    return BUNDLE_OPTIONS.reduce((acc, bundleId) => {
      const mitigationsForBundle = bundleMitigations[bundleId]?.filter(m => m.enabled) || []
      if (mitigationsForBundle.length === 0) {
        acc[bundleId] = storedBundleRuns[bundleId] || null
        return acc
      }
      const run = computeMitigated(
        contextPack,
        assumptionSet?.assumptions || [],
        scenario,
        mitigationsForBundle,
        baselineRun,
        scenarioRun
      )
      acc[bundleId] = {
        ...run,
        id: `CR_mitigated_${scenario.id}_${bundleId}_${Date.now()}`,
        mitigation_ids: [...(run.mitigation_ids || []), `bundle:${bundleId}`],
        computed_at: new Date().toISOString(),
      }
      return acc
    }, {} as Record<"A" | "B" | "C", typeof storedMitigatedRun>)
  }, [assumptionSet?.assumptions, baselineRun, bundleMitigations, contextPack, scenarioRun, scenarioSet?.scenarios, selectedScenarioId, storedBundleRuns])

  const activeBundleRun = bundleRuns[activeBundle] || storedBundleRuns[activeBundle] || storedMitigatedRun

  useEffect(() => {
    BUNDLE_OPTIONS.forEach(bundleId => {
      const run = bundleRuns[bundleId]
      if (run) {
        saveComputationRun(run)
      }
    })
  }, [bundleRuns])

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
  
  if (!contextPack) {
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

  const scenarios = scenarioSet?.scenarios || []
  const assumptions = assumptionSet?.assumptions || []
  const mitigations = localMitigations || mitigationSet?.mitigations || []
  const status = mitigationSet?.status
  const isCurrentlyApproved = isApproved || status === 'approved'

  // Select first scenario by default
  if (!selectedScenarioId && scenarios.length > 0) {
    setSelectedScenarioId(scenarios[0].id)
  }

  useEffect(() => {
    if (!selectedScenarioId) return
    const scenarioMitigations = mitigations.filter(m => m.scenario_id === selectedScenarioId)
    if (scenarioMitigations.length === 0) return
    const defaultEnabledIds = scenarioMitigations.filter(m => m.enabled).map(m => m.id)
    const scenarioIds = scenarioMitigations.map(m => m.id)

    setBundleSelections(prev => {
      const existing = prev[selectedScenarioId]
      const nextBundles = BUNDLE_OPTIONS.reduce((acc, bundleId) => {
        const current = existing?.[bundleId]
        const currentSet = new Set(current ?? defaultEnabledIds)
        const merged = scenarioIds.filter(id => currentSet.has(id))
        scenarioMitigations.forEach(mit => {
          if (mit.enabled && !currentSet.has(mit.id)) {
            merged.push(mit.id)
          }
        })
        acc[bundleId] = Array.from(new Set(merged))
        return acc
      }, {} as Record<"A" | "B" | "C", string[]>)

      return {
        ...prev,
        [selectedScenarioId]: nextBundles,
      }
    })
  }, [mitigations, selectedScenarioId])

  // Check for approved scenarios
  const hasApprovedScenarios = scenarioSet?.status === 'approved'
  
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
        scenario_set_id: scenarioSet?.id || '',
        mitigations: newMitigations,
        status: 'draft',
        version: (mitigationSet?.version || 0) + 1,
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

  const handleToggleBundleMitigation = (bundleId: "A" | "B" | "C", mitigationId: string) => {
    if (!selectedScenarioId || isCurrentlyApproved) return
    setBundleSelections(prev => {
      const currentScenario = prev[selectedScenarioId] || { A: [], B: [], C: [] }
      const currentBundle = new Set(currentScenario[bundleId] || [])
      if (currentBundle.has(mitigationId)) {
        currentBundle.delete(mitigationId)
      } else {
        currentBundle.add(mitigationId)
      }
      return {
        ...prev,
        [selectedScenarioId]: {
          ...currentScenario,
          [bundleId]: Array.from(currentBundle),
        },
      }
    })
  }

  const handleUpdateDriverModification = (
    mitigationId: string,
    modIndex: number,
    value: number
  ) => {
    setLocalMitigations(prev => {
      const source = prev || mitigations
      return source.map(mitigation => {
        if (mitigation.id !== mitigationId) return mitigation
        const updatedMods = mitigation.driver_modifications.map((mod, idx) =>
          idx === modIndex ? { ...mod, target_value: value } : mod
        )
        return { ...mitigation, driver_modifications: updatedMods }
      })
    })
  }

  const handleApprove = () => {
    const bundleEnabledIds = selectedScenarioId
      ? new Set(bundleSelections[selectedScenarioId]?.[activeBundle] || [])
      : null
    const approvedMitigations = mitigations.map(m => {
      const isScenarioMatch = selectedScenarioId && m.scenario_id === selectedScenarioId
      const nextEnabled = isScenarioMatch && bundleEnabledIds ? bundleEnabledIds.has(m.id) : m.enabled
      return { ...m, enabled: nextEnabled, approved: true, approved_at: new Date().toISOString() }
    })
    
    const approvedSet: MitigationSet = {
      id: mitigationSet?.id || `MS_${Date.now()}`,
      context_pack_id: contextPackId,
      scenario_set_id: scenarioSet?.id || '',
      mitigations: approvedMitigations,
      status: 'approved',
      version: mitigationSet?.version || 1,
      created_at: mitigationSet?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    saveMitigationSet(approvedSet)
    
    setLocalMitigations(approvedMitigations)
    setIsApproved(true)
  }

  const selectedScenario = scenarios.find(s => s.id === selectedScenarioId)
  const scenarioMitigations = mitigations.filter(m => m.scenario_id === selectedScenarioId)
  const activeMitigatedRun = mitigatedResult || activeBundleRun

  const alignedSeries = useMemo(() => {
    if (!baselineRun || !scenarioRun) return null
    return baselineRun.kpi_results.map((baselineKpi, idx) => {
      const baselineDerived = baselineRun.derived_results[idx]
      const scenarioKpi = scenarioRun.kpi_results[idx] || baselineKpi
      const scenarioDerived = scenarioRun.derived_results[idx] || baselineDerived
      const mitigatedKpi = activeMitigatedRun?.kpi_results[idx] || scenarioKpi
      const mitigatedDerived = activeMitigatedRun?.derived_results[idx] || scenarioDerived
      return {
        index: idx,
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
      const getBundleKpi = (bundleId: "A" | "B" | "C") => {
        const run = bundleRuns[bundleId] || storedBundleRuns[bundleId]
        return run?.kpi_results[point.index] || point.mitigatedKpi
      }
      const getBundleDerived = (bundleId: "A" | "B" | "C") => {
        const run = bundleRuns[bundleId] || storedBundleRuns[bundleId]
        return run?.derived_results[point.index] || point.mitigatedDerived
      }

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
        bundleARevenue: applyDiff(getBundleKpi("A").total_revenue, referenceKpi.total_revenue),
        bundleBRevenue: applyDiff(getBundleKpi("B").total_revenue, referenceKpi.total_revenue),
        bundleCRevenue: applyDiff(getBundleKpi("C").total_revenue, referenceKpi.total_revenue),
        bundleANetProfit: applyDiff(getBundleKpi("A").net_profit, referenceKpi.net_profit),
        bundleBNetProfit: applyDiff(getBundleKpi("B").net_profit, referenceKpi.net_profit),
        bundleCNetProfit: applyDiff(getBundleKpi("C").net_profit, referenceKpi.net_profit),
        bundleAPrimeCost: applyDiff(primeCost(getBundleKpi("A")), primeCost(referenceKpi)),
        bundleBPrimeCost: applyDiff(primeCost(getBundleKpi("B")), primeCost(referenceKpi)),
        bundleCPrimeCost: applyDiff(primeCost(getBundleKpi("C")), primeCost(referenceKpi)),
        bundleAGrossMargin: applyDiff(getBundleDerived("A").gross_margin_pct, referenceDerived.gross_margin_pct),
        bundleBGrossMargin: applyDiff(getBundleDerived("B").gross_margin_pct, referenceDerived.gross_margin_pct),
        bundleCGrossMargin: applyDiff(getBundleDerived("C").gross_margin_pct, referenceDerived.gross_margin_pct),
      }
    })
  }, [alignedSeries, bundleRuns, diffMode, diffReference, storedBundleRuns])

  const diffLabel = diffReference === "baseline"
    ? "Baseline"
    : diffReference === "scenario"
      ? "Stressed"
      : "Mitigated"

  const comparisonLabel = comparisonMode === "baseline-scenario"
    ? "Stressed vs Baseline"
    : comparisonMode === "scenario-mitigated"
      ? "Mitigated vs Stressed"
      : "Mitigated vs Baseline"

  const formatCurrencyDelta = (value: number) => {
    const sign = value >= 0 ? "+" : "-"
    return `${sign}${formatCurrency(Math.abs(value))}`
  }

  const buildSurvivalSeries = (run: typeof baselineRun | null, totalMonths: number) => {
    if (!run) {
      return Array.from({ length: totalMonths }, (_, idx) => ({ month: idx + 1, survival: 1 }))
    }

    const netProfits = run.kpi_results.map(point => point.net_profit)
    const netMargins = run.derived_results.map(point => point.net_margin)
    const avg = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0)
    const variance = (values: number[]) => {
      const mean = avg(values)
      return avg(values.map(value => (value - mean) ** 2))
    }
    const stdDev = (values: number[]) => Math.sqrt(variance(values))
    const profitScale = Math.max(stdDev(netProfits), 1)
    const marginScale = Math.max(stdDev(netMargins), 0.5)
    const sigmoid = (value: number) => 1 / (1 + Math.exp(-value))

    let survival = 1

    return netProfits.map((netProfit, idx) => {
      const margin = netMargins[idx] ?? 0
      const profitSignal = -netProfit / profitScale
      const marginSignal = -margin / marginScale
      const hazard = sigmoid((profitSignal + marginSignal) / 2) * 0.25
      survival *= 1 - hazard
      return {
        month: idx + 1,
        survival: Math.max(0.05, Math.min(0.98, survival)),
      }
    })
  }

  const survivalChartData = useMemo(() => {
    if (!baselineRun) return []
    const totalMonths = baselineRun.kpi_results.length
    const baselineSeries = buildSurvivalSeries(baselineRun, totalMonths)
    const scenarioSeries = buildSurvivalSeries(scenarioRun, totalMonths)
    const bundleSeries = BUNDLE_OPTIONS.reduce((acc, bundleId) => {
      const run = bundleRuns[bundleId] || storedBundleRuns[bundleId] || storedMitigatedRun
      acc[bundleId] = buildSurvivalSeries(run, totalMonths)
      return acc
    }, {} as Record<"A" | "B" | "C", { month: number; survival: number }[]>)

    return baselineSeries.map((point, idx) => ({
      month: `M${point.month}`,
      baseline: point.survival,
      scenario: scenarioSeries[idx]?.survival ?? point.survival,
      bundleA: bundleSeries.A[idx]?.survival ?? point.survival,
      bundleB: bundleSeries.B[idx]?.survival ?? point.survival,
      bundleC: bundleSeries.C[idx]?.survival ?? point.survival,
    }))
  }, [baselineRun, bundleRuns, scenarioRun, storedBundleRuns, storedMitigatedRun])

  const computeRunFeatures = (run: typeof baselineRun | null) => {
    if (!run) {
      return {
        revenueTrend: 0,
        netMarginVolatility: 0,
        avgNetMargin: 0,
        primeCostPctAvg: 0,
      }
    }

    const netMargins = run.derived_results.map(point => point.net_margin)
    const primeCostPcts = run.derived_results.map(point => point.prime_cost_pct)
    const revenues = run.kpi_results.map(point => point.total_revenue)

    const avg = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0)
    const variance = (values: number[]) => {
      const mean = avg(values)
      return avg(values.map(value => (value - mean) ** 2))
    }

    const revenueTrend = revenues.length > 1
      ? (revenues[revenues.length - 1] - revenues[0]) / Math.max(revenues[0], 1)
      : 0

    return {
      revenueTrend,
      netMarginVolatility: Math.sqrt(variance(netMargins)),
      avgNetMargin: avg(netMargins),
      primeCostPctAvg: avg(primeCostPcts),
    }
  }

  const coxCoefficients = {
    revenueTrend: -0.8,
    netMarginVolatility: 1.2,
    avgNetMargin: -1.5,
    primeCostPctAvg: 1.1,
  }

  const computeRiskScore = (run: typeof baselineRun | null) => {
    const features = computeRunFeatures(run)
    const score = Object.entries(coxCoefficients).reduce((total, [key, weight]) => {
      return total + features[key as keyof typeof features] * weight
    }, 0)
    return { score, features }
  }

  const riskScores = useMemo(() => {
    const baselineScore = computeRiskScore(baselineRun)
    const scenarioScore = computeRiskScore(scenarioRun)
    const bundleScores = BUNDLE_OPTIONS.reduce((acc, bundleId) => {
      const run = bundleRuns[bundleId] || storedBundleRuns[bundleId] || storedMitigatedRun
      acc[bundleId] = computeRiskScore(run)
      return acc
    }, {} as Record<"A" | "B" | "C", ReturnType<typeof computeRiskScore>>)

    return {
      baseline: baselineScore,
      scenario: scenarioScore,
      bundles: bundleScores,
    }
  }, [baselineRun, bundleRuns, scenarioRun, storedBundleRuns, storedMitigatedRun])

  const getComparisonValues = (baselineValue: number, scenarioValue: number, mitigatedValue?: number) => {
    if (comparisonMode === "baseline-scenario") {
      return { reference: baselineValue, comparison: scenarioValue }
    }
    if (comparisonMode === "scenario-mitigated") {
      return { reference: scenarioValue, comparison: mitigatedValue }
    }
    return { reference: baselineValue, comparison: mitigatedValue }
  }

  const isMitigationEnabled = (bundleId: "A" | "B" | "C", mitigationId: string, fallback = false) => {
    if (!selectedScenarioId) return fallback
    const selection = bundleSelections[selectedScenarioId]?.[bundleId]
    if (!selection) return fallback
    return selection.includes(mitigationId)
  }

  const clampValue = (value: number, min: number, max: number) =>
    Math.min(Math.max(value, min), max)

  const getModificationRange = (driver: string, modificationType: string) => {
    if (modificationType === "replace") {
      return { min: 0, max: 100, step: 5 }
    }
    return DRIVER_SLIDER_BOUNDS[driver] || DRIVER_SLIDER_BOUNDS.default
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
                  <p className={`text-lg font-bold ${(activeMitigatedRun?.summary.total_revenue_change_pct || scenarioRun.summary.total_revenue_change_pct) < 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                    {activeMitigatedRun ? formatDelta(activeMitigatedRun.summary.total_revenue_change_pct) : '-'}
                  </p>
                </div>
                <div className="text-center p-3 rounded-lg bg-background">
                  <p className="text-xs text-muted-foreground">Mitigated Net Profit</p>
                  <p className={`text-lg font-bold ${(activeMitigatedRun?.summary.net_profit_change_pct || scenarioRun.summary.net_profit_change_pct) < 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                    {activeMitigatedRun ? formatDelta(activeMitigatedRun.summary.net_profit_change_pct) : '-'}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {selectedScenario && (
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle className="text-base">Mitigation Bundles</CardTitle>
                <CardDescription>
                  Group mitigations into bundles and compare outcomes side-by-side.
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">Active bundle</span>
                {BUNDLE_OPTIONS.map(bundleId => (
                  <Button
                    key={bundleId}
                    size="sm"
                    variant={activeBundle === bundleId ? "default" : "outline"}
                    onClick={() => setActiveBundle(bundleId)}
                  >
                    Bundle {bundleId}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-3">
              {BUNDLE_OPTIONS.map(bundleId => {
                const run = bundleRuns[bundleId] || storedBundleRuns[bundleId]
                const enabledCount = bundleMitigations[bundleId]?.filter(m => m.enabled).length || 0
                return (
                  <div key={bundleId} className="rounded-lg border border-border/60 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">Bundle {bundleId}</p>
                      {activeBundle === bundleId && (
                        <Badge variant="secondary">Active</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {enabledCount} mitigation{enabledCount === 1 ? "" : "s"} enabled
                    </p>
                    <div className="mt-3 grid gap-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Revenue Δ</span>
                        <span className="font-medium">
                          {run ? formatDelta(run.summary.total_revenue_change_pct) : "-"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Net Profit Δ</span>
                        <span className="font-medium">
                          {run ? formatDelta(run.summary.net_profit_change_pct) : "-"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Prime Cost Δ</span>
                        <span className="font-medium">
                          {run ? formatDelta(run.summary.prime_cost_change_pct) : "-"}
                        </span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={activeBundle === bundleId ? "secondary" : "outline"}
                      className="mt-4 w-full"
                      onClick={() => setActiveBundle(bundleId)}
                    >
                      Focus on Bundle {bundleId}
                    </Button>
                  </div>
                )
              })}
            </div>
            <div className="rounded-lg border border-border/60 p-4">
              <p className="text-sm font-semibold">A/B/C Comparison</p>
              <p className="text-xs text-muted-foreground mb-3">
                Compare bundle deltas vs baseline for the selected scenario.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                      <th className="py-2 pr-4">Bundle</th>
                      <th className="py-2 pr-4">Enabled</th>
                      <th className="py-2 pr-4">Revenue Δ</th>
                      <th className="py-2 pr-4">Net Profit Δ</th>
                      <th className="py-2 pr-4">Prime Cost Δ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {BUNDLE_OPTIONS.map(bundleId => {
                      const run = bundleRuns[bundleId] || storedBundleRuns[bundleId]
                      const enabledCount = bundleMitigations[bundleId]?.filter(m => m.enabled).length || 0
                      return (
                        <tr key={bundleId} className="border-b border-border/50">
                          <td className="py-3 pr-4 font-medium">Bundle {bundleId}</td>
                          <td className="py-3 pr-4">{enabledCount}</td>
                          <td className="py-3 pr-4">
                            {run ? formatDelta(run.summary.total_revenue_change_pct) : "-"}
                          </td>
                          <td className="py-3 pr-4">
                            {run ? formatDelta(run.summary.net_profit_change_pct) : "-"}
                          </td>
                          <td className="py-3 pr-4">
                            {run ? formatDelta(run.summary.prime_cost_change_pct) : "-"}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
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
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>Diff mode</span>
              {[
                { value: "baseline-scenario", label: "Baseline → Stressed" },
                { value: "scenario-mitigated", label: "Stressed → Mitigated" },
                { value: "baseline-mitigated", label: "Baseline → Mitigated" },
              ].map(option => (
                <Button
                  key={option.value}
                  size="sm"
                  variant={comparisonMode === option.value ? "default" : "outline"}
                  onClick={() => setComparisonMode(option.value as typeof comparisonMode)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
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
                    <th className="py-2 pr-4">Δ% ({comparisonLabel})</th>
                  </tr>
                </thead>
                <tbody>
                  {spineKpiMeta.map(meta => {
                    const baselineValue = kpiComparison.baselineTotals.totals[meta.key]
                    const scenarioValue = kpiComparison.scenarioTotals.totals[meta.key]
                    const mitigatedValue = kpiComparison.mitigatedTotals?.totals[meta.key]
                    const comparison = getComparisonValues(baselineValue, scenarioValue, mitigatedValue)
                    const deltaPct = comparison.comparison === undefined || comparison.reference === 0
                      ? null
                      : ((comparison.comparison - comparison.reference) / Math.abs(comparison.reference)) * 100
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
                    const comparison = getComparisonValues(baselineValue, scenarioValue, mitigatedValue)
                    const deltaPct = comparison.comparison === undefined || comparison.reference === 0
                      ? null
                      : ((comparison.comparison - comparison.reference) / Math.abs(comparison.reference)) * 100
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

      {survivalChartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Survival Analysis</CardTitle>
            <CardDescription>
              Modeled probability of staying above the net profit threshold (event defined as net profit below {baselineRun?.survival?.threshold ?? 0} for {baselineRun?.survival?.consecutive_months ?? 2} consecutive months).
            </CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={survivalChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} domain={[0, 1]} tickFormatter={value => `${Math.round(value * 100)}%`} />
                <Tooltip formatter={(value: number) => `${Math.round(value * 100)}%`} />
                <Legend />
                <Line type="stepAfter" dataKey="baseline" name="Baseline" stroke="#2563eb" strokeWidth={2} />
                <Line type="stepAfter" dataKey="scenario" name="Stressed" stroke="#f97316" strokeWidth={2} />
                <Line type="stepAfter" dataKey="bundleA" name="Bundle A" stroke="#10b981" strokeWidth={2} />
                <Line type="stepAfter" dataKey="bundleB" name="Bundle B" stroke="#8b5cf6" strokeWidth={2} />
                <Line type="stepAfter" dataKey="bundleC" name="Bundle C" stroke="#14b8a6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {baselineRun && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cox-Style Risk Scoring</CardTitle>
            <CardDescription>
              Feature-based risk scores derived from revenue trend, margin volatility, and cost mix.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-lg border border-border/60 p-4">
                <p className="text-sm font-semibold">Feature Weights (β)</p>
                <p className="text-xs text-muted-foreground mb-3">
                  Higher scores indicate higher hazard risk (relative comparison).
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span>Revenue trend</span>
                    <span className="font-mono">{coxCoefficients.revenueTrend.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Net margin volatility</span>
                    <span className="font-mono">{coxCoefficients.netMarginVolatility.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Average net margin</span>
                    <span className="font-mono">{coxCoefficients.avgNetMargin.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Prime cost % avg</span>
                    <span className="font-mono">{coxCoefficients.primeCostPctAvg.toFixed(2)}</span>
                  </div>
                </div>
              </div>
              <div className="rounded-lg border border-border/60 p-4">
                <p className="text-sm font-semibold">Risk Score Comparison</p>
                <p className="text-xs text-muted-foreground mb-3">
                  Baseline vs stressed vs bundle outcomes.
                </p>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span>Baseline</span>
                    <span className="font-medium">{riskScores.baseline.score.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Stressed</span>
                    <span className="font-medium">{riskScores.scenario.score.toFixed(2)}</span>
                  </div>
                  {BUNDLE_OPTIONS.map(bundleId => (
                    <div key={bundleId} className="flex items-center justify-between">
                      <span>Bundle {bundleId}</span>
                      <span className="font-medium">{riskScores.bundles[bundleId].score.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                    <th className="py-2 pr-4">Feature</th>
                    <th className="py-2 pr-4">Baseline</th>
                    <th className="py-2 pr-4">Stressed</th>
                    <th className="py-2 pr-4">Bundle A</th>
                    <th className="py-2 pr-4">Bundle B</th>
                    <th className="py-2 pr-4">Bundle C</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { key: "revenueTrend", label: "Revenue trend" },
                    { key: "netMarginVolatility", label: "Net margin volatility" },
                    { key: "avgNetMargin", label: "Average net margin" },
                    { key: "primeCostPctAvg", label: "Prime cost % avg" },
                  ].map(feature => (
                    <tr key={feature.key} className="border-b border-border/50">
                      <td className="py-3 pr-4 font-medium">{feature.label}</td>
                      <td className="py-3 pr-4">{riskScores.baseline.features[feature.key as keyof typeof riskScores.baseline.features].toFixed(2)}</td>
                      <td className="py-3 pr-4">{riskScores.scenario.features[feature.key as keyof typeof riskScores.scenario.features].toFixed(2)}</td>
                      <td className="py-3 pr-4">{riskScores.bundles.A.features[feature.key as keyof typeof riskScores.bundles.A.features].toFixed(2)}</td>
                      <td className="py-3 pr-4">{riskScores.bundles.B.features[feature.key as keyof typeof riskScores.bundles.B.features].toFixed(2)}</td>
                      <td className="py-3 pr-4">{riskScores.bundles.C.features[feature.key as keyof typeof riskScores.bundles.C.features].toFixed(2)}</td>
                    </tr>
                  ))}
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
                  <Line type="monotone" dataKey="bundleARevenue" name={`Bundle A${diffMode ? ` Δ vs ${diffLabel}` : ""}`} stroke="#10b981" strokeWidth={2} />
                  <Line type="monotone" dataKey="bundleBRevenue" name={`Bundle B${diffMode ? ` Δ vs ${diffLabel}` : ""}`} stroke="#8b5cf6" strokeWidth={2} />
                  <Line type="monotone" dataKey="bundleCRevenue" name={`Bundle C${diffMode ? ` Δ vs ${diffLabel}` : ""}`} stroke="#14b8a6" strokeWidth={2} />
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
                  <Line type="monotone" dataKey="bundleANetProfit" name={`Bundle A${diffMode ? ` Δ vs ${diffLabel}` : ""}`} stroke="#10b981" strokeWidth={2} />
                  <Line type="monotone" dataKey="bundleBNetProfit" name={`Bundle B${diffMode ? ` Δ vs ${diffLabel}` : ""}`} stroke="#8b5cf6" strokeWidth={2} />
                  <Line type="monotone" dataKey="bundleCNetProfit" name={`Bundle C${diffMode ? ` Δ vs ${diffLabel}` : ""}`} stroke="#14b8a6" strokeWidth={2} />
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
                  <Line type="monotone" dataKey="bundleAPrimeCost" name={`Bundle A${diffMode ? ` Δ vs ${diffLabel}` : ""}`} stroke="#10b981" strokeWidth={2} />
                  <Line type="monotone" dataKey="bundleBPrimeCost" name={`Bundle B${diffMode ? ` Δ vs ${diffLabel}` : ""}`} stroke="#8b5cf6" strokeWidth={2} />
                  <Line type="monotone" dataKey="bundleCPrimeCost" name={`Bundle C${diffMode ? ` Δ vs ${diffLabel}` : ""}`} stroke="#14b8a6" strokeWidth={2} />
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
                  <Line type="monotone" dataKey="bundleAGrossMargin" name={`Bundle A${diffMode ? ` Δ vs ${diffLabel}` : ""}`} stroke="#10b981" strokeWidth={2} />
                  <Line type="monotone" dataKey="bundleBGrossMargin" name={`Bundle B${diffMode ? ` Δ vs ${diffLabel}` : ""}`} stroke="#8b5cf6" strokeWidth={2} />
                  <Line type="monotone" dataKey="bundleCGrossMargin" name={`Bundle C${diffMode ? ` Δ vs ${diffLabel}` : ""}`} stroke="#14b8a6" strokeWidth={2} />
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
          {scenarioMitigations.map((mitigation) => {
            const isActiveEnabled = isMitigationEnabled(activeBundle, mitigation.id, mitigation.enabled)
            return (
            <Card key={mitigation.id} className={isActiveEnabled ? 'ring-1 ring-primary/30' : 'opacity-70'}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={isActiveEnabled}
                      onCheckedChange={() => handleToggleBundleMitigation(activeBundle, mitigation.id)}
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
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted-foreground">Bundles</span>
                  {BUNDLE_OPTIONS.map(bundleId => {
                    const enabled = isMitigationEnabled(bundleId, mitigation.id, mitigation.enabled)
                    return (
                      <Button
                        key={bundleId}
                        size="sm"
                        variant={enabled ? "default" : "outline"}
                        onClick={() => handleToggleBundleMitigation(bundleId, mitigation.id)}
                        disabled={isCurrentlyApproved}
                      >
                        {bundleId}
                      </Button>
                    )
                  })}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Driver Modifications */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Driver Modifications:</p>
                  <div className="grid gap-2 md:grid-cols-2">
                    {mitigation.driver_modifications.map((mod, idx) => {
                      const range = getModificationRange(mod.driver, mod.modification_type)
                      const clampedValue = clampValue(mod.target_value, range.min, range.max)
                      const inputId = `${mitigation.id}-${mod.driver}-${idx}`
                      return (
                        <div key={idx} className="rounded bg-muted/50 p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
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
                          <div className="mt-3 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <Label htmlFor={inputId} className="text-xs text-muted-foreground">
                                What-if adjustment
                              </Label>
                              <Input
                                id={inputId}
                                type="number"
                                value={clampedValue}
                                min={range.min}
                                max={range.max}
                                step={range.step}
                                onChange={event => handleUpdateDriverModification(
                                  mitigation.id,
                                  idx,
                                  clampValue(Number(event.target.value), range.min, range.max)
                                )}
                                className="w-24 text-right"
                              />
                            </div>
                            <input
                              type="range"
                              min={range.min}
                              max={range.max}
                              step={range.step}
                              value={clampedValue}
                              onChange={event => handleUpdateDriverModification(
                                mitigation.id,
                                idx,
                                clampValue(Number(event.target.value), range.min, range.max)
                              )}
                              className="w-full accent-primary"
                            />
                          </div>
                        </div>
                      )
                    })}
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
          )
        })}
        </div>
      )}
    </div>
  )
}
