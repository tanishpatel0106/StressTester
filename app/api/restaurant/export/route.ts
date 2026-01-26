"use server"

import { NextResponse } from "next/server"
import { getSession } from "@/lib/restaurant/storage"
import type { AnalysisSession } from "@/lib/restaurant/types"

// Generate JSON export
function generateJSONExport(session: AnalysisSession): string {
  return JSON.stringify({
    metadata: {
      sessionId: session.id,
      name: session.name,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      status: session.status,
    },
    baseline: {
      kpis: session.baselineKPIs,
    },
    assumptions: session.assumptions?.map(a => ({
      id: a.id,
      label: a.label,
      category: a.category,
      value: a.value,
      unit: a.unit,
      riskScore: a.riskScore,
      rationale: a.rationale,
    })),
    scenarios: session.scenarios?.map((s, idx) => ({
      id: s.id,
      name: s.name,
      severity: s.severity,
      probability: s.probability,
      breaks: session.scenarioResults?.[idx]?.breaks,
      breakReason: session.scenarioResults?.[idx]?.breakReason,
      kpiDelta: session.scenarioResults?.[idx]?.kpiDelta,
    })),
    mitigations: session.mitigations,
    executiveSummary: session.executiveSummary,
  }, null, 2)
}

// Generate Markdown export
function generateMarkdownExport(session: AnalysisSession): string {
  const lines: string[] = []
  
  lines.push(`# Restaurant Stress Test Report`)
  lines.push(`**Analysis:** ${session.name}`)
  lines.push(`**Date:** ${new Date(session.updatedAt).toLocaleDateString()}`)
  lines.push(`**Status:** ${session.status}`)
  lines.push("")
  
  // Executive Summary
  if (session.executiveSummary) {
    lines.push(`## Executive Summary`)
    lines.push("")
    lines.push(`**Overall Risk Rating:** ${session.executiveSummary.overallRiskRating.toUpperCase()}`)
    lines.push("")
    lines.push(`### Key Findings`)
    session.executiveSummary.keyFindings.forEach(f => {
      lines.push(`- ${f}`)
    })
    lines.push("")
    lines.push(`### Top Risks`)
    session.executiveSummary.topRisks.forEach((r, idx) => {
      lines.push(`${idx + 1}. **${r.risk}** - Likelihood: ${r.likelihood}, Impact: ${r.impact}`)
    })
    lines.push("")
    lines.push(`### Recommendations`)
    session.executiveSummary.recommendations.forEach((r, idx) => {
      lines.push(`${idx + 1}. ${r}`)
    })
    lines.push("")
  }
  
  // Baseline KPIs
  if (session.baselineKPIs) {
    lines.push(`## Baseline KPIs`)
    lines.push("")
    lines.push(`| Metric | Value |`)
    lines.push(`|--------|-------|`)
    lines.push(`| Revenue | $${session.baselineKPIs.revenue.toLocaleString()} |`)
    lines.push(`| Food Cost % | ${(session.baselineKPIs.foodCostPercent * 100).toFixed(1)}% |`)
    lines.push(`| Labor Cost % | ${(session.baselineKPIs.laborCostPercent * 100).toFixed(1)}% |`)
    lines.push(`| Prime Cost % | ${(session.baselineKPIs.primeCostPercent * 100).toFixed(1)}% |`)
    lines.push(`| EBITDA | $${session.baselineKPIs.ebitda.toLocaleString()} |`)
    lines.push(`| EBITDA Margin | ${(session.baselineKPIs.ebitdaMargin * 100).toFixed(1)}% |`)
    lines.push(`| Cash Balance | $${session.baselineKPIs.cashBalance.toLocaleString()} |`)
    lines.push(`| Runway (months) | ${session.baselineKPIs.runwayMonths} |`)
    lines.push("")
  }
  
  // Assumptions
  if (session.assumptions && session.assumptions.length > 0) {
    lines.push(`## Key Assumptions`)
    lines.push("")
    lines.push(`| ID | Label | Category | Value | Risk Score |`)
    lines.push(`|----|-------|----------|-------|------------|`)
    session.assumptions.forEach(a => {
      lines.push(`| ${a.id} | ${a.label} | ${a.category} | ${a.value}${a.unit} | ${a.riskScore}/100 |`)
    })
    lines.push("")
  }
  
  // Scenarios
  if (session.scenarios && session.scenarios.length > 0) {
    lines.push(`## Stress Scenarios`)
    lines.push("")
    session.scenarios.forEach((s, idx) => {
      const result = session.scenarioResults?.[idx]
      lines.push(`### ${s.name}`)
      lines.push(`- **Severity:** ${s.severity}`)
      lines.push(`- **Probability:** ${(s.probability * 100).toFixed(0)}%`)
      lines.push(`- **Status:** ${result?.breaks ? "BREAKS" : "SURVIVES"}`)
      if (result?.breaks && result.breakReason) {
        lines.push(`- **Break Reason:** ${result.breakReason}`)
      }
      lines.push("")
    })
  }
  
  // Mitigations
  if (session.mitigations && session.mitigations.length > 0) {
    lines.push(`## Mitigation Playbook`)
    lines.push("")
    session.mitigations.forEach(m => {
      const scenario = session.scenarios?.find(s => s.id === m.scenarioId)
      lines.push(`### ${scenario?.name || m.scenarioId}`)
      lines.push("")
      lines.push(`**Preventive Actions:**`)
      m.preventiveActions.forEach(a => {
        lines.push(`- ${a.action} (${a.timing}, ${a.cost})`)
      })
      lines.push("")
      lines.push(`**Contingency Actions:**`)
      m.contingencyActions.forEach(a => {
        lines.push(`- **Trigger:** ${a.trigger}`)
        lines.push(`  - Action: ${a.action}`)
        lines.push(`  - Timeline: ${a.timeline}`)
      })
      lines.push("")
      lines.push(`**Monitoring Metrics:**`)
      m.monitoringMetrics.forEach(m => {
        lines.push(`- ${m.metric}: threshold ${m.threshold}, check ${m.frequency}`)
      })
      lines.push("")
    })
  }
  
  lines.push(`---`)
  lines.push(`*Generated by Restaurant Stress-Testing Copilot*`)
  
  return lines.join("\n")
}

// Generate CSV export
function generateCSVExport(session: AnalysisSession): string {
  const rows: string[][] = []
  
  // Header
  rows.push(["Type", "ID", "Name", "Category", "Value", "Unit", "Risk", "Status", "Details"])
  
  // Assumptions
  session.assumptions?.forEach(a => {
    rows.push([
      "Assumption",
      a.id,
      a.label,
      a.category,
      String(a.value),
      a.unit,
      String(a.riskScore),
      "",
      a.rationale,
    ])
  })
  
  // Scenarios
  session.scenarios?.forEach((s, idx) => {
    const result = session.scenarioResults?.[idx]
    rows.push([
      "Scenario",
      s.id,
      s.name,
      s.severity,
      String(s.probability),
      "",
      "",
      result?.breaks ? "BREAKS" : "SURVIVES",
      result?.breakReason || "",
    ])
  })
  
  return rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n")
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get("id")
  const format = searchParams.get("format") || "json"

  if (!sessionId) {
    return NextResponse.json({ error: "Session ID required" }, { status: 400 })
  }

  const session = getSession(sessionId)
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 })
  }

  let content: string
  let contentType: string
  let filename: string

  switch (format) {
    case "markdown":
    case "md":
      content = generateMarkdownExport(session)
      contentType = "text/markdown"
      filename = `stress-test-${session.id}.md`
      break
    case "csv":
      content = generateCSVExport(session)
      contentType = "text/csv"
      filename = `stress-test-${session.id}.csv`
      break
    case "json":
    default:
      content = generateJSONExport(session)
      contentType = "application/json"
      filename = `stress-test-${session.id}.json`
      break
  }

  return new NextResponse(content, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}
