"use server"

import { NextResponse } from "next/server"
import { getSession, updateSession } from "@/lib/restaurant/storage"
import {
  extractAssumptions,
  generateScenarios,
  generateMitigations,
  generateExecutiveSummary,
  runScenario,
  computeBaselineKPIs,
} from "@/lib/restaurant/legacy-analysis"
import type {
  AnalysisAssumption,
  AnalysisScenario,
  AnalysisMitigation,
} from "@/lib/restaurant/types"

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get("id")
  const action = searchParams.get("action")

  if (!sessionId) {
    return NextResponse.json({ error: "Session ID required" }, { status: 400 })
  }

  const session = getSession(sessionId)
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 })
  }

  try {
    switch (action) {
      case "extract-assumptions": {
        if (!session.rawData) {
          return NextResponse.json({ error: "No data uploaded" }, { status: 400 })
        }
        
        // First compute baseline KPIs
        const baselineKPIs = computeBaselineKPIs(session.rawData)
        
        // Then extract assumptions using AI
        const assumptions = await extractAssumptions(session.rawData, baselineKPIs)
        
        updateSession(sessionId, { 
          assumptions,
          baselineKPIs,
          status: "assumptions_ready" 
        })
        
        return NextResponse.json({ assumptions, baselineKPIs })
      }

      case "generate-scenarios": {
        if (!session.assumptions || session.assumptions.length === 0) {
          return NextResponse.json({ error: "No assumptions available" }, { status: 400 })
        }

        const scenarios = await generateScenarios(
          session.assumptions as AnalysisAssumption[],
          session.baselineKPIs!
        )

        updateSession(sessionId, { 
          scenarios,
          status: "scenarios_ready" 
        })

        return NextResponse.json({ scenarios })
      }

      case "run-scenarios": {
        if (!session.scenarios || session.scenarios.length === 0) {
          return NextResponse.json({ error: "No scenarios available" }, { status: 400 })
        }

        const scenarioResults = session.scenarios.map(scenario => {
          const result = runScenario(
            session.rawData!,
            session.baselineKPIs!,
            session.assumptions as AnalysisAssumption[],
            scenario
          )
          return {
            scenarioId: scenario.id,
            ...result,
          }
        })

        updateSession(sessionId, { 
          scenarioResults,
          status: "results_ready" 
        })

        return NextResponse.json({ scenarioResults })
      }

      case "generate-mitigations": {
        if (!session.scenarioResults) {
          return NextResponse.json({ error: "No scenario results available" }, { status: 400 })
        }

        // Find breaking scenarios
        const breakingScenarios = session.scenarios!.filter((s, idx) =>
          session.scenarioResults![idx].breaks
        )

        const mitigations: AnalysisMitigation[] = []
        for (const scenario of breakingScenarios) {
          const mitigation = await generateMitigations(
            scenario,
            session.assumptions as AnalysisAssumption[],
            session.baselineKPIs!
          )
          mitigations.push(mitigation)
        }

        updateSession(sessionId, { 
          mitigations,
          status: "mitigations_ready" 
        })

        return NextResponse.json({ mitigations })
      }

      case "generate-summary": {
        if (!session.scenarioResults) {
          return NextResponse.json({ error: "No results available" }, { status: 400 })
        }

        const summary = await generateExecutiveSummary(
          session.assumptions as AnalysisAssumption[],
          session.scenarios as AnalysisScenario[],
          session.scenarioResults || [],
          session.baselineKPIs!
        )

        updateSession(sessionId, { 
          executiveSummary: summary,
          status: "complete" 
        })

        return NextResponse.json({ summary })
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 })
    }
  } catch (error) {
    console.error("[v0] Analysis error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Analysis failed" },
      { status: 500 }
    )
  }
}
