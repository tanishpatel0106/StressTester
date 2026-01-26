"use client"

import { useState, useCallback, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Download,
  FileJson,
  FileText,
  CheckCircle2,
  AlertCircle,
  ClipboardCopy,
  ExternalLink,
} from "lucide-react"
import { getRestaurantState, getLatestBaseline } from "@/lib/restaurant/storage"
import { formatCurrency, formatPercent, formatDelta } from "@/lib/restaurant/engine"

export default function ExportPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const contextPackId = searchParams.get("id")

  const [copied, setCopied] = useState(false)
  const [state, setState] = useState(null)
  const [baselineRun, setBaselineRun] = useState(null)

  const fetchState = useCallback(() => {
    if (contextPackId) {
      const fetchedState = getRestaurantState(contextPackId)
      const fetchedBaselineRun = getLatestBaseline(contextPackId)
      setState(fetchedState)
      setBaselineRun(fetchedBaselineRun)
    }
  }, [contextPackId])

  // Fetch state on mount and when contextPackId changes
  useEffect(() => {
    fetchState()
  }, [fetchState])

  const generateJSONReport = useCallback(() => {
    if (!state?.context_pack) return null
    const { context_pack, assumption_set, scenario_set, mitigation_set, scenario_computations, mitigated_computations } = state
    const report = {
      metadata: {
        restaurant: context_pack.metadata.name,
        generated_at: new Date().toISOString(),
        dataset_id: context_pack.metadata.dataset_id,
        periods: context_pack.kpi_series.length,
      },
      baseline: {
        total_revenue: context_pack.kpi_series.reduce((sum, k) => sum + k.total_revenue, 0),
        total_net_profit: context_pack.kpi_series.reduce((sum, k) => sum + k.net_profit, 0),
        avg_gross_margin: context_pack.derived_summary.gross_margin_pct.mean,
        avg_prime_cost: context_pack.derived_summary.prime_cost_pct.mean,
      },
      assumptions: assumption_set?.assumptions.map(a => ({
        id: a.id,
        label: a.label,
        baseline_value: a.baseline_value,
        unit: a.unit,
        confidence: a.confidence,
        evidence_refs: a.evidence_refs,
        approved: a.approved,
      })),
      scenarios: scenario_set?.scenarios.map(s => {
        const run = scenario_computations.find(r => r.scenario_id === s.id)
        return {
          id: s.id,
          name: s.name,
          severity: s.severity,
          probability: s.probability,
          impact: run?.summary,
          approved: s.approved,
        }
      }),
      mitigations: mitigation_set?.mitigations.map(m => ({
        id: m.id,
        scenario_id: m.scenario_id,
        name: m.name,
        category: m.category,
        expected_impact: m.expected_impact,
        enabled: m.enabled,
        approved: m.approved,
      })),
      evidence_registry: context_pack.evidence_registry.slice(0, 20),
    }
    
    return JSON.stringify(report, null, 2)
  }, [state])

  const generateHTMLReport = useCallback(() => {
    if (!state?.context_pack) return null
    const { context_pack, assumption_set, scenario_set, mitigation_set, scenario_computations } = state
    const totalRevenue = context_pack.kpi_series.reduce((sum, k) => sum + k.total_revenue, 0)
    const totalNetProfit = context_pack.kpi_series.reduce((sum, k) => sum + k.net_profit, 0)
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Restaurant Stress Test Report - ${context_pack.metadata.name}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
    h1 { color: #1a1a1a; }
    h2 { color: #333; border-bottom: 2px solid #f59e0b; padding-bottom: 8px; }
    .card { background: #f9fafb; border-radius: 8px; padding: 16px; margin: 16px 0; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
    .metric { text-align: center; padding: 16px; background: white; border-radius: 8px; }
    .metric-value { font-size: 24px; font-weight: bold; }
    .positive { color: #10b981; }
    .negative { color: #ef4444; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th, td { padding: 8px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    th { background: #f3f4f6; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; }
    .badge-high { background: #fef3c7; color: #92400e; }
    .badge-medium { background: #e0e7ff; color: #3730a3; }
    .badge-low { background: #d1fae5; color: #065f46; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <h1>${state?.context_pack?.metadata.name} - Stress Test Report</h1>
  <p>Generated: ${new Date().toLocaleString()}</p>
  
  <h2>Baseline Summary</h2>
  <div class="grid">
    <div class="metric">
      <div>Total Revenue</div>
      <div class="metric-value">${formatCurrency(state?.context_pack?.kpi_series.reduce((sum, k) => sum + k.total_revenue, 0) || 0)}</div>
    </div>
    <div class="metric">
      <div>Net Profit</div>
      <div class="metric-value ${state?.context_pack?.kpi_series.reduce((sum, k) => sum + k.net_profit, 0) < 0 ? 'negative' : 'positive'}">${formatCurrency(state?.context_pack?.kpi_series.reduce((sum, k) => sum + k.net_profit, 0) || 0)}</div>
    </div>
    <div class="metric">
      <div>Avg Gross Margin</div>
      <div class="metric-value">${formatPercent(state?.context_pack?.derived_summary.gross_margin_pct.mean || 0)}</div>
    </div>
    <div class="metric">
      <div>Avg Prime Cost</div>
      <div class="metric-value">${formatPercent(state?.context_pack?.derived_summary.prime_cost_pct.mean || 0)}</div>
    </div>
  </div>
  
  <h2>Key Assumptions (${state?.assumption_set?.assumptions.length || 0})</h2>
  <table>
    <thead>
      <tr>
        <th>ID</th>
        <th>Assumption</th>
        <th>Baseline</th>
        <th>Range</th>
        <th>Confidence</th>
        <th>Evidence</th>
      </tr>
    </thead>
    <tbody>
      ${(state?.assumption_set?.assumptions || []).map(a => `
        <tr>
          <td>${a.id}</td>
          <td>${a.label}</td>
          <td>${a.baseline_value} ${a.unit}</td>
          <td>${a.range_min} - ${a.range_max}</td>
          <td><span class="badge badge-${a.confidence}">${a.confidence}</span></td>
          <td>${a.evidence_refs.join(', ')}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  
  <h2>Stress Scenarios (${state?.scenario_set?.scenarios.length || 0})</h2>
  <table>
    <thead>
      <tr>
        <th>ID</th>
        <th>Scenario</th>
        <th>Severity</th>
        <th>Probability</th>
        <th>Revenue Impact</th>
        <th>Net Profit Impact</th>
      </tr>
    </thead>
    <tbody>
      ${(state?.scenario_set?.scenarios || []).map(s => {
        const run = state?.scenario_computations.find(r => r.scenario_id === s.id)
        return `
        <tr>
          <td>${s.id}</td>
          <td>${s.name}</td>
          <td><span class="badge badge-${s.severity === 'critical' || s.severity === 'high' ? 'high' : s.severity}">${s.severity}</span></td>
          <td>${(s.probability * 100).toFixed(0)}%</td>
          <td class="${(run?.summary.total_revenue_change_pct || 0) < 0 ? 'negative' : ''}">${run ? formatDelta(run.summary.total_revenue_change_pct) : '-'}</td>
          <td class="${(run?.summary.net_profit_change_pct || 0) < 0 ? 'negative' : ''}">${run ? formatDelta(run.summary.net_profit_change_pct) : '-'}</td>
        </tr>
      `}).join('')}
    </tbody>
  </table>
  
  <h2>Mitigations (${state?.mitigation_set?.mitigations.length || 0})</h2>
  <table>
    <thead>
      <tr>
        <th>ID</th>
        <th>Mitigation</th>
        <th>For Scenario</th>
        <th>Category</th>
        <th>Net Profit Impact</th>
        <th>Enabled</th>
      </tr>
    </thead>
    <tbody>
      ${(state?.mitigation_set?.mitigations || []).map(m => `
        <tr>
          <td>${m.id}</td>
          <td>${m.name}</td>
          <td>${m.scenario_id}</td>
          <td>${m.category}</td>
          <td class="${m.expected_impact.net_profit_change > 0 ? 'positive' : 'negative'}">${formatDelta(m.expected_impact.net_profit_change)}</td>
          <td>${m.enabled ? 'Yes' : 'No'}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  
  <div class="footer">
    <p>Report generated by Restaurant Stress-Testing Copilot</p>
    <p>Dataset ID: ${state?.context_pack?.metadata.dataset_id || 'N/A'} | Context Pack: ${state?.context_pack?.id || 'N/A'}</p>
    <p>Assumption Set Version: ${state?.assumption_set?.version || 'N/A'} | Scenario Set Version: ${state?.scenario_set?.version || 'N/A'}</p>
  </div>
</body>
</html>`
  }, [state])

  const handleDownloadJSON = () => {
    const json = generateJSONReport()
    if (!json) return
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${state?.context_pack?.metadata.name.replace(/\s+/g, '_') || 'restaurant'}_stress_report.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleDownloadHTML = () => {
    const html = generateHTMLReport()
    if (!html) return
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${state?.context_pack?.metadata.name.replace(/\s+/g, '_') || 'restaurant'}_stress_report.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleCopyJSON = async () => {
    const json = generateJSONReport()
    if (!json) return
    await navigator.clipboard.writeText(json)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleOpenHTML = () => {
    const html = generateHTMLReport()
    if (!html) return
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
  }

  // Summary stats
  const totalRevenue = state?.context_pack?.kpi_series.reduce((sum, k) => sum + k.total_revenue, 0) || 0
  const totalNetProfit = state?.context_pack?.kpi_series.reduce((sum, k) => sum + k.net_profit, 0) || 0
  const numAssumptions = state?.assumption_set?.assumptions.length || 0
  const numScenarios = state?.scenario_set?.scenarios.length || 0
  const numMitigations = state?.mitigation_set?.mitigations.length || 0
  const criticalScenarios = state?.scenario_set?.scenarios.filter(s => s.severity === 'critical' || s.severity === 'high').length || 0

  // Check for no data
  if (!contextPackId) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="p-6 text-center">
          <AlertCircle className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
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
          <AlertCircle className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading data or dataset not found...</p>
          <Button onClick={() => router.push("/restaurant")} className="mt-4">
            Start New Analysis
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Export Report</h2>
        <p className="text-muted-foreground mt-1">
          Download or share your stress test analysis
        </p>
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{state?.context_pack?.metadata.name}</CardTitle>
          <CardDescription>Analysis Summary</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Periods</p>
              <p className="text-lg font-bold">{state?.context_pack?.kpi_series.length}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Total Revenue</p>
              <p className="text-lg font-bold">{formatCurrency(totalRevenue)}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Net Profit</p>
              <p className={`text-lg font-bold ${totalNetProfit < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                {formatCurrency(totalNetProfit)}
              </p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Assumptions</p>
              <p className="text-lg font-bold">{numAssumptions}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Scenarios</p>
              <p className="text-lg font-bold">
                {numScenarios}
                {criticalScenarios > 0 && (
                  <span className="text-xs text-rose-500 ml-1">({criticalScenarios} high risk)</span>
                )}
              </p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Mitigations</p>
              <p className="text-lg font-bold">{numMitigations}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Completion Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Analysis Completeness</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { label: 'Data Upload', complete: !!state?.context_pack },
              { label: 'Baseline Computed', complete: !!baselineRun },
              { label: 'Assumptions Generated', complete: !!state?.assumption_set },
              { label: 'Assumptions Approved', complete: state?.assumption_set?.status === 'approved' },
              { label: 'Scenarios Generated', complete: !!state?.scenario_set },
              { label: 'Scenarios Approved', complete: state?.scenario_set?.status === 'approved' },
              { label: 'Mitigations Generated', complete: !!state?.mitigation_set },
              { label: 'Mitigations Approved', complete: state?.mitigation_set?.status === 'approved' },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                {item.complete ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                )}
                <span className={item.complete ? 'text-foreground' : 'text-muted-foreground'}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Export Options */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileJson className="h-5 w-5 text-blue-500" />
              JSON Export
            </CardTitle>
            <CardDescription>
              Machine-readable format for data integration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={handleDownloadJSON} className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Download JSON
            </Button>
            <Button onClick={handleCopyJSON} variant="outline" className="w-full bg-transparent">
              <ClipboardCopy className="h-4 w-4 mr-2" />
              {copied ? 'Copied!' : 'Copy to Clipboard'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-5 w-5 text-amber-500" />
              HTML Report
            </CardTitle>
            <CardDescription>
              Formatted report for sharing and printing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={handleDownloadHTML} className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Download HTML
            </Button>
            <Button onClick={handleOpenHTML} variant="outline" className="w-full bg-transparent">
              <ExternalLink className="h-4 w-4 mr-2" />
              Preview in New Tab
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Evidence References */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Evidence Registry</CardTitle>
          <CardDescription>
            Data sources and computed values referenced in this analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {state?.context_pack?.evidence_registry.slice(0, 30).map((evidence) => (
              <Badge key={evidence.id} variant="outline" className="font-mono text-xs">
                {evidence.id}: {evidence.type}
              </Badge>
            ))}
            {state?.context_pack?.evidence_registry.length > 30 && (
              <Badge variant="secondary" className="text-xs">
                +{state?.context_pack?.evidence_registry.length - 30} more
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
