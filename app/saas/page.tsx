"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Header } from "@/components/stress-tester/header"
import { KPIOverview } from "@/components/stress-tester/kpi-overview"
import { AssumptionTable } from "@/components/stress-tester/assumption-table"
import { ScenarioPanel } from "@/components/stress-tester/scenario-panel"
import { TimelineChart } from "@/components/stress-tester/timeline-chart"
import { ExecutiveSummary } from "@/components/stress-tester/executive-summary"
import { MitigationPanel } from "@/components/stress-tester/mitigation-panel"
import { DataTables } from "@/components/stress-tester/data-tables"
import { DataUploadBanner } from "@/components/stress-tester/data-upload-banner"
import { Button } from "@/components/ui/button"
import { Loader2, Sparkles, AlertCircle } from "lucide-react"
import {
  sampleConfig,
  samplePnL,
  sampleCashFlow,
  sampleBalanceSheet,
  sampleKPIs,
  sampleAssumptions,
  sampleScenarios,
  sampleEvidence,
} from "@/lib/sample-data"
import { runStressAnalysis } from "@/lib/stress-engine"
import {
  extractAssumptions,
  generateScenarios,
  generateMitigation,
  generateExecutiveSummary,
} from "@/app/actions/ai-actions"
import type { StressConfig, Scenario, Mitigation, Assumption } from "@/lib/types"

type AnalysisPhase = "idle" | "extracting-assumptions" | "generating-scenarios" | "running-stress-tests" | "generating-mitigations" | "generating-summary" | "complete" | "error"

export default function StressTesterPage() {
  const [config, setConfig] = useState<StressConfig>(sampleConfig)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisPhase, setAnalysisPhase] = useState<AnalysisPhase>("idle")
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null)
  const [activeTab, setActiveTab] = useState("overview")
  const [isUsingSampleData, setIsUsingSampleData] = useState(true)
  const [useAI, setUseAI] = useState(false)

  // AI-generated content
  const [aiAssumptions, setAiAssumptions] = useState<Assumption[] | null>(null)
  const [aiScenarios, setAiScenarios] = useState<Scenario[] | null>(null)
  const [aiMitigations, setAiMitigations] = useState<Mitigation[] | null>(null)
  const [aiSummary, setAiSummary] = useState<{
    overallRiskRating: "low" | "moderate" | "high" | "critical"
    keyFindings: string[]
    topRisks: { risk: string; likelihood: string; impact: string }[]
    recommendations: string[]
  } | null>(null)

  // Current data state (sample or uploaded)
  const [currentData, setCurrentData] = useState({
    pnl: samplePnL,
    cashFlow: sampleCashFlow,
    balanceSheet: sampleBalanceSheet,
    kpis: sampleKPIs,
    assumptions: sampleAssumptions,
    scenarios: sampleScenarios,
    evidence: sampleEvidence,
  })

  // Effective data (AI-generated or sample)
  const effectiveAssumptions = aiAssumptions || currentData.assumptions
  const effectiveScenarios = aiScenarios || currentData.scenarios

  // Run stress analysis (deterministic part)
  const analysisResults = useMemo(() => {
    const { breakpoints, computedEvidence } = runStressAnalysis(
      effectiveScenarios,
      currentData.pnl,
      currentData.kpis,
      currentData.cashFlow,
      currentData.evidence
    )

    return {
      breakpoints,
      computedEvidence,
      mitigations: aiMitigations || [],
    }
  }, [currentData, effectiveScenarios, aiMitigations])

  // Run full AI analysis
  const runAIAnalysis = useCallback(async () => {
    setIsAnalyzing(true)
    setAnalysisError(null)
    setUseAI(true)

    try {
      // Phase 1: Extract assumptions from financial data
      setAnalysisPhase("extracting-assumptions")
      const assumptions = await extractAssumptions(
        currentData.pnl,
        currentData.kpis,
        currentData.cashFlow,
        currentData.balanceSheet
      )
      setAiAssumptions(assumptions)

      // Phase 2: Generate stress scenarios based on assumptions
      setAnalysisPhase("generating-scenarios")
      const scenarios = await generateScenarios(
        assumptions,
        currentData.pnl,
        currentData.kpis
      )
      setAiScenarios(scenarios)

      // Phase 3: Run deterministic stress tests
      setAnalysisPhase("running-stress-tests")
      const { breakpoints } = runStressAnalysis(
        scenarios,
        currentData.pnl,
        currentData.kpis,
        currentData.cashFlow,
        currentData.evidence
      )

      // Phase 4: Generate mitigations for breaking/high-risk scenarios
      setAnalysisPhase("generating-mitigations")
      const breakingScenarioIds = breakpoints
        .filter((b) => b.planFails)
        .map((b) => b.scenarioId)

      const highRiskScenarios = scenarios.filter(
        (s) =>
          breakingScenarioIds.includes(s.id) ||
          s.severity === "high" ||
          s.severity === "critical"
      )

      const mitigations: Mitigation[] = []
      for (const scenario of highRiskScenarios.slice(0, 5)) {
        const breakpoint = breakpoints.find((b) => b.scenarioId === scenario.id)
        const mitigation = await generateMitigation(scenario, assumptions, {
          planFails: breakpoint?.planFails || false,
          failureCondition: breakpoint?.failureCondition || null,
        })
        mitigations.push(mitigation)
      }
      setAiMitigations(mitigations)

      // Phase 5: Generate executive summary
      setAnalysisPhase("generating-summary")
      const summary = await generateExecutiveSummary(
        assumptions,
        scenarios,
        breakingScenarioIds,
        currentData.pnl,
        currentData.cashFlow
      )
      setAiSummary(summary)

      setAnalysisPhase("complete")
    } catch (error) {
      console.error(" AI Analysis error:", error)
      setAnalysisError(error instanceof Error ? error.message : "An error occurred during analysis")
      setAnalysisPhase("error")
    } finally {
      setIsAnalyzing(false)
    }
  }, [currentData])

  const handleRunAnalysis = () => {
    if (useAI || !isUsingSampleData) {
      runAIAnalysis()
    } else {
      // Just run deterministic analysis with sample data
      setIsAnalyzing(true)
      setTimeout(() => {
        setIsAnalyzing(false)
      }, 1000)
    }
  }

  const handleSelectScenario = (scenario: Scenario) => {
    setSelectedScenario(
      selectedScenario?.id === scenario.id ? null : scenario
    )
  }

  const handleDataUpload = (data: {
    pnlCsv?: string
    cashflowCsv?: string
    balanceSheetCsv?: string
    kpisCsv?: string
    planText?: string
    assumptionsJson?: string
    scenariosJson?: string
  }) => {
    if (data.pnlCsv || data.cashflowCsv || data.kpisCsv || data.assumptionsJson) {
      setIsUsingSampleData(false)
      // Trigger AI analysis with uploaded data
      runAIAnalysis()
    }
  }

  const breakingCount = analysisResults.breakpoints.filter((b) => b.planFails).length
  const passingCount = analysisResults.breakpoints.filter((b) => !b.planFails).length

  const phaseMessages: Record<AnalysisPhase, string> = {
    idle: "",
    "extracting-assumptions": "AI is analyzing your financial data to extract key assumptions...",
    "generating-scenarios": "AI is generating stress test scenarios based on identified risks...",
    "running-stress-tests": "Running deterministic stress simulations...",
    "generating-mitigations": "AI is creating mitigation playbooks for high-risk scenarios...",
    "generating-summary": "AI is preparing executive summary and recommendations...",
    complete: "Analysis complete!",
    error: "Analysis encountered an error.",
  }

  return (
    <div className="min-h-screen bg-background">
      <Header
        config={config}
        onConfigChange={setConfig}
        onRunAnalysis={handleRunAnalysis}
        isAnalyzing={isAnalyzing}
      />

      <main className="container mx-auto px-4 py-6">
        {/* Sample Data Banner */}
        <DataUploadBanner
          isUsingSampleData={isUsingSampleData}
          onDataUpload={handleDataUpload}
        />

        {/* AI Analysis Progress */}
        {isAnalyzing && analysisPhase !== "idle" && (
          <div className="mb-6 rounded-lg border border-primary/30 bg-primary/5 p-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <Sparkles className="absolute -right-1 -top-1 h-3 w-3 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  AI Analysis in Progress
                </p>
                <p className="text-xs text-muted-foreground">
                  {phaseMessages[analysisPhase]}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {["extracting-assumptions", "generating-scenarios", "running-stress-tests", "generating-mitigations", "generating-summary"].map((phase, idx) => (
                  <div
                    key={phase}
                    className={`h-2 w-8 rounded-full transition-colors ${
                      ["extracting-assumptions", "generating-scenarios", "running-stress-tests", "generating-mitigations", "generating-summary"].indexOf(analysisPhase) >= idx
                        ? "bg-primary"
                        : "bg-primary/20"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {analysisError && (
          <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <div className="flex-1">
                <p className="text-sm font-medium text-destructive">
                  Analysis Error
                </p>
                <p className="text-xs text-muted-foreground">
                  {analysisError}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setAnalysisError(null)
                  setAnalysisPhase("idle")
                }}
              >
                Dismiss
              </Button>
            </div>
          </div>
        )}

        {/* AI Toggle for Sample Data */}
        {isUsingSampleData && !isAnalyzing && (
          <div className="mb-6 flex items-center justify-end gap-2">
            <span className="text-sm text-muted-foreground">
              {useAI ? "Using AI-generated analysis" : "Using pre-built sample analysis"}
            </span>
            <Button
              variant={useAI ? "default" : "outline"}
              size="sm"
              onClick={() => {
                if (!useAI) {
                  runAIAnalysis()
                } else {
                  setUseAI(false)
                  setAiAssumptions(null)
                  setAiScenarios(null)
                  setAiMitigations(null)
                  setAiSummary(null)
                }
              }}
              disabled={isAnalyzing}
            >
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              {useAI ? "AI Active" : "Run AI Analysis"}
            </Button>
          </div>
        )}

        {/* Selected Scenario Banner */}
        {selectedScenario && (
          <div className="mb-6 rounded-lg border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                  <svg
                    className="h-4 w-4 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Viewing Scenario: {selectedScenario.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Charts show baseline vs stressed projections
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedScenario(null)}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Clear selection
              </button>
            </div>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="assumptions">
              Assumptions
              {useAI && aiAssumptions && (
                <Sparkles className="ml-1.5 h-3 w-3 text-primary" />
              )}
            </TabsTrigger>
            <TabsTrigger value="scenarios">
              Scenarios
              {useAI && aiScenarios && (
                <Sparkles className="ml-1.5 h-3 w-3 text-primary" />
              )}
            </TabsTrigger>
            <TabsTrigger value="mitigations">
              Mitigations
              {analysisResults.mitigations.length > 0 && (
                <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                  {analysisResults.mitigations.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="data">Data</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <KPIOverview
              kpis={currentData.kpis}
              cashFlow={currentData.cashFlow}
              pnl={currentData.pnl}
            />
            <ExecutiveSummary
              assumptions={effectiveAssumptions}
              scenarios={effectiveScenarios}
              breakpoints={analysisResults.breakpoints}
              mitigations={analysisResults.mitigations}
              aiSummary={aiSummary}
            />
            <TimelineChart
              baseCashFlow={currentData.cashFlow}
              basePnL={currentData.pnl}
              baseKPIs={currentData.kpis}
              selectedScenario={selectedScenario}
            />
          </TabsContent>

          <TabsContent value="assumptions" className="space-y-6">
            <AssumptionTable
              assumptions={effectiveAssumptions}
              evidenceStore={currentData.evidence}
            />
          </TabsContent>

          <TabsContent value="scenarios" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <ScenarioPanel
                scenarios={effectiveScenarios}
                breakpoints={analysisResults.breakpoints}
                assumptions={effectiveAssumptions}
                onSelectScenario={handleSelectScenario}
                selectedScenarioId={selectedScenario?.id}
              />
              <div className="space-y-6">
                <TimelineChart
                  baseCashFlow={currentData.cashFlow}
                  basePnL={currentData.pnl}
                  baseKPIs={currentData.kpis}
                  selectedScenario={selectedScenario}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="mitigations" className="space-y-6">
            {analysisResults.mitigations.length > 0 ? (
              <MitigationPanel
                mitigations={analysisResults.mitigations}
                assumptions={effectiveAssumptions}
                scenarios={effectiveScenarios}
              />
            ) : (
              <div className="rounded-lg border border-border bg-card p-12 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <Sparkles className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-2">
                  No AI-Generated Mitigations Yet
                </h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
                  Run AI analysis to generate detailed mitigation playbooks for your high-risk scenarios.
                </p>
                <Button onClick={runAIAnalysis} disabled={isAnalyzing}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Run AI Analysis
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="data" className="space-y-6">
            <DataTables
              pnl={currentData.pnl}
              cashFlow={currentData.cashFlow}
              balanceSheet={currentData.balanceSheet}
              kpis={currentData.kpis}
            />
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card mt-12">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>AI Assumption Stress-Tester</span>
              <span className="text-muted-foreground/50">|</span>
              <span>Production-Grade Financial Analysis</span>
              {isUsingSampleData && (
                <>
                  <span className="text-muted-foreground/50">|</span>
                  <span className="text-amber-600 font-medium">Sample Data Mode</span>
                </>
              )}
              {useAI && (
                <>
                  <span className="text-muted-foreground/50">|</span>
                  <span className="text-primary font-medium flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    AI-Powered
                  </span>
                </>
              )}
            </div>
            <div className="flex items-center gap-4">
              <span>
                {effectiveAssumptions.length} assumptions analyzed
              </span>
              <span className="text-muted-foreground/50">|</span>
              <span>
                {effectiveScenarios.length} scenarios tested
              </span>
              <span className="text-muted-foreground/50">|</span>
              <span className={breakingCount > 0 ? "text-rose-500 font-medium" : "text-emerald-500"}>
                {breakingCount} breaking / {passingCount} passing
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
