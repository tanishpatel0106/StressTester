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
import { computeDerivedKpis, formatCurrency, formatPercent, formatDelta } from "@/lib/restaurant/engine"
import type { Mitigation } from "@/lib/restaurant/types"

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
  }, [state, baselineRun])

  const generateHTMLReport = useCallback(() => {
    if (!state?.context_pack) return null
    const { context_pack, assumption_set, scenario_set, mitigation_set, scenario_computations, mitigated_computations } = state
    const totalRevenue = context_pack.kpi_series.reduce((sum, k) => sum + k.total_revenue, 0)
    const totalNetProfit = context_pack.kpi_series.reduce((sum, k) => sum + k.net_profit, 0)
    const baselineData = baselineRun?.kpi_results || context_pack.kpi_series
    const baselineDerived = baselineRun?.derived_results || baselineData.map(computeDerivedKpis)
    const evidenceById = new Map(context_pack.evidence_registry.map(evidence => [evidence.id, evidence]))

    const escapeHtml = (value: string | number | null | undefined) => {
      if (value === null || value === undefined) return ''
      return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;")
    }

    const formatDateLabel = (date: string) => {
      const parsed = new Date(date)
      if (Number.isNaN(parsed.getTime())) return date
      return parsed.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    }

    const formatChartValue = (value: number, unit?: string) => {
      if (unit === '%') {
        return `${value.toFixed(1)}%`
      }
      return value.toLocaleString('en-US', { maximumFractionDigits: 0 })
    }

    const buildLineChartSVG = ({
      title,
      labels,
      series,
      unit = '',
    }: {
      title: string
      labels: string[]
      series: { name: string; values: number[]; color: string }[]
      unit?: string
    }) => {
      if (labels.length === 0 || series.length === 0) {
        return `<div class="chart"><div class="chart-title">${escapeHtml(title)}</div><p class="muted">No data available.</p></div>`
      }

      const width = 720
      const height = 240
      const padding = { top: 24, right: 24, bottom: 36, left: 52 }
      const chartWidth = width - padding.left - padding.right
      const chartHeight = height - padding.top - padding.bottom

      const allValues = series.flatMap(item => item.values)
      let minValue = Math.min(...allValues)
      let maxValue = Math.max(...allValues)
      if (minValue === maxValue) {
        minValue -= 1
        maxValue += 1
      }
      const valuePadding = (maxValue - minValue) * 0.1
      minValue -= valuePadding
      maxValue += valuePadding

      const getX = (index: number) =>
        padding.left + (chartWidth * index) / Math.max(1, labels.length - 1)
      const getY = (value: number) =>
        padding.top + chartHeight - ((value - minValue) / (maxValue - minValue)) * chartHeight

      const paths = series
        .map(item => {
          const points = item.values
            .map((value, idx) => `${getX(idx)},${getY(value)}`)
            .join(' ')
          return `<polyline fill="none" stroke="${item.color}" stroke-width="2" points="${points}" />`
        })
        .join('')

      const legend = series
        .map(
          item =>
            `<div class="legend-item"><span class="legend-swatch" style="background:${item.color}"></span>${escapeHtml(item.name)}</div>`
        )
        .join('')

      return `
        <div class="chart">
          <div class="chart-title">${escapeHtml(title)}</div>
          <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(title)} chart">
            <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${height - padding.bottom}" stroke="#e5e7eb" />
            <line x1="${padding.left}" y1="${height - padding.bottom}" x2="${width - padding.right}" y2="${height - padding.bottom}" stroke="#e5e7eb" />
            ${paths}
            <text x="${padding.left}" y="${padding.top - 8}" fill="#6b7280" font-size="10">${escapeHtml(
              formatChartValue(maxValue, unit)
            )}</text>
            <text x="${padding.left}" y="${height - 8}" fill="#6b7280" font-size="10">${escapeHtml(
              formatChartValue(minValue, unit)
            )}</text>
            <text x="${padding.left}" y="${height - 12}" fill="#6b7280" font-size="10">${escapeHtml(labels[0])}</text>
            <text x="${width - padding.right - 60}" y="${height - 12}" fill="#6b7280" font-size="10">${escapeHtml(
              labels[labels.length - 1]
            )}</text>
          </svg>
          <div class="legend">${legend}</div>
        </div>
      `
    }

    const buildScatterChartSVG = ({
      title,
      xLabel,
      yLabel,
      points,
    }: {
      title: string
      xLabel: string
      yLabel: string
      points: { label: string; x: number; y: number; color: string }[]
    }) => {
      if (points.length === 0) {
        return `<div class="chart"><div class="chart-title">${escapeHtml(title)}</div><p class="muted">No data available.</p></div>`
      }
      const width = 720
      const height = 240
      const padding = { top: 24, right: 24, bottom: 48, left: 52 }
      const chartWidth = width - padding.left - padding.right
      const chartHeight = height - padding.top - padding.bottom

      const xValues = points.map(point => point.x)
      const yValues = points.map(point => point.y)
      let minX = Math.min(...xValues)
      let maxX = Math.max(...xValues)
      let minY = Math.min(...yValues)
      let maxY = Math.max(...yValues)
      if (minX === maxX) {
        minX -= 1
        maxX += 1
      }
      if (minY === maxY) {
        minY -= 1
        maxY += 1
      }

      const getX = (value: number) =>
        padding.left + ((value - minX) / (maxX - minX)) * chartWidth
      const getY = (value: number) =>
        padding.top + chartHeight - ((value - minY) / (maxY - minY)) * chartHeight

      const circles = points
        .map(
          point =>
            `<circle cx="${getX(point.x)}" cy="${getY(point.y)}" r="5" fill="${point.color}">
              <title>${escapeHtml(point.label)} (${point.x}, ${point.y})</title>
            </circle>`
        )
        .join('')

      const legend = points
        .map(
          point =>
            `<div class="legend-item"><span class="legend-swatch" style="background:${point.color}"></span>${escapeHtml(
              point.label
            )}</div>`
        )
        .join('')

      return `
        <div class="chart">
          <div class="chart-title">${escapeHtml(title)}</div>
          <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(title)} chart">
            <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${height - padding.bottom}" stroke="#e5e7eb" />
            <line x1="${padding.left}" y1="${height - padding.bottom}" x2="${width - padding.right}" y2="${height - padding.bottom}" stroke="#e5e7eb" />
            ${circles}
            <text x="${padding.left}" y="${height - 16}" fill="#6b7280" font-size="10">${escapeHtml(xLabel)}</text>
            <text x="${padding.left}" y="${padding.top - 8}" fill="#6b7280" font-size="10">${escapeHtml(yLabel)}</text>
          </svg>
          <div class="legend">${legend}</div>
        </div>
      `
    }

    const renderEvidenceDetails = (ids: string[]) => {
      if (!ids || ids.length === 0) return '<span class="muted">None</span>'
      return `
        <ul class="list">
          ${ids
            .map(id => {
              const evidence = evidenceById.get(id)
              if (!evidence) return `<li>${escapeHtml(id)} (missing)</li>`
              return `<li>${escapeHtml(id)} • ${escapeHtml(evidence.type)} • ${escapeHtml(
                evidence.source
              )} • ${escapeHtml(evidence.value)}</li>`
            })
            .join('')}
        </ul>
      `
    }

    const scenarioRuns = scenario_computations || []
    const scenarioRunById = scenarioRuns.reduce((acc, run) => {
      if (!run.scenario_id) return acc
      const existing = acc.get(run.scenario_id)
      if (!existing || new Date(run.computed_at) > new Date(existing.computed_at)) {
        acc.set(run.scenario_id, run)
      }
      return acc
    }, new Map<string, (typeof scenarioRuns)[number]>())

    const mitigatedRuns = mitigated_computations || []
    const mitigatedRunsByScenario = mitigatedRuns.reduce((acc, run) => {
      if (!run.scenario_id) return acc
      const list = acc.get(run.scenario_id) || []
      list.push(run)
      acc.set(run.scenario_id, list)
      return acc
    }, new Map<string, (typeof mitigatedRuns)[number][]>())

    const scenarioSections = (scenario_set?.scenarios || [])
      .map(scenario => {
        const run = scenarioRunById.get(scenario.id)
        const labels = baselineData.map(point => formatDateLabel(point.date))
        const scenarioKpis = run?.kpi_results || []
        const scenarioChart = run
          ? buildLineChartSVG({
              title: `Scenario Impact: ${scenario.name}`,
              labels,
              series: [
                {
                  name: 'Baseline Revenue',
                  values: baselineData.map(point => point.total_revenue),
                  color: '#2563eb',
                },
                {
                  name: 'Scenario Revenue',
                  values: scenarioKpis.map(point => point.total_revenue),
                  color: '#f97316',
                },
                {
                  name: 'Baseline Net Profit',
                  values: baselineData.map(point => point.net_profit),
                  color: '#10b981',
                },
                {
                  name: 'Scenario Net Profit',
                  values: scenarioKpis.map(point => point.net_profit),
                  color: '#ef4444',
                },
              ],
            })
          : `<p class="muted">No scenario computation available.</p>`

        return `
          <div class="card">
            <h3>${escapeHtml(scenario.name)} (${escapeHtml(scenario.id)})</h3>
            <p>${escapeHtml(scenario.description)}</p>
            <div class="grid">
              <div class="metric">
                <div>Severity</div>
                <div class="metric-value">${escapeHtml(scenario.severity)}</div>
              </div>
              <div class="metric">
                <div>Probability</div>
                <div class="metric-value">${(scenario.probability * 100).toFixed(0)}%</div>
              </div>
              <div class="metric">
                <div>Shock Curve</div>
                <div class="metric-value">${escapeHtml(scenario.shock_curve || 'flat')}</div>
              </div>
              <div class="metric">
                <div>Status</div>
                <div class="metric-value">${scenario.approved ? 'Approved' : 'Draft'}</div>
              </div>
            </div>
            <div class="section-grid">
              <div>
                <h4>Trigger Conditions</h4>
                ${
                  scenario.trigger_conditions?.length
                    ? `<ul class="list">${scenario.trigger_conditions
                        .map(item => `<li>${escapeHtml(item)}</li>`)
                        .join('')}</ul>`
                    : '<p class="muted">None specified.</p>'
                }
              </div>
              <div>
                <h4>Expected Impact</h4>
                <p>${escapeHtml(scenario.expected_impact || 'N/A')}</p>
              </div>
            </div>
            <h4>Assumption Shocks</h4>
            <table>
              <thead>
                <tr>
                  <th>Assumption</th>
                  <th>Shock Type</th>
                  <th>Shock Value</th>
                  <th>Start Offset</th>
                  <th>Duration</th>
                  <th>Dates</th>
                </tr>
              </thead>
              <tbody>
                ${
                  scenario.assumption_shocks?.length
                    ? scenario.assumption_shocks
                        .map(shock => {
                          const assumption = assumption_set?.assumptions.find(a => a.id === shock.assumption_id)
                          return `
                            <tr>
                              <td>${escapeHtml(assumption?.label || shock.assumption_id)}</td>
                              <td>${escapeHtml(shock.shock_type)}</td>
                              <td>${escapeHtml(shock.shock_value)}</td>
                              <td>${shock.start_month_offset ?? '—'}</td>
                              <td>${shock.duration_months ?? '—'}</td>
                              <td>${shock.start_date || '—'} → ${shock.end_date || '—'}</td>
                            </tr>
                          `
                        })
                        .join('')
                    : '<tr><td colspan="6" class="muted">No shocks defined.</td></tr>'
                }
              </tbody>
            </table>
            <h4>Scenario Impact Summary</h4>
            ${
              run
                ? `<div class="grid">
                    <div class="metric">
                      <div>Total Revenue Δ</div>
                      <div class="metric-value">${formatDelta(run.summary.total_revenue_change_pct)}</div>
                    </div>
                    <div class="metric">
                      <div>Net Profit Δ</div>
                      <div class="metric-value">${formatDelta(run.summary.net_profit_change_pct)}</div>
                    </div>
                    <div class="metric">
                      <div>Prime Cost Δ</div>
                      <div class="metric-value">${formatDelta(run.summary.prime_cost_change_pct)}</div>
                    </div>
                    <div class="metric">
                      <div>Gross Margin Δ</div>
                      <div class="metric-value">${formatDelta(run.summary.gross_margin_change_pct)}</div>
                    </div>
                  </div>`
                : '<p class="muted">No computation summary available.</p>'
            }
            ${scenarioChart}
            <h4>Evidence</h4>
            ${renderEvidenceDetails(scenario.evidence_refs || [])}
          </div>
        `
      })
      .join('')

    const mitigationsByScenario = (mitigation_set?.mitigations || []).reduce((acc, mitigation) => {
      const list = acc.get(mitigation.scenario_id) || []
      list.push(mitigation)
      acc.set(mitigation.scenario_id, list)
      return acc
    }, new Map<string, Mitigation[]>())

    const mitigationSections = Array.from(mitigationsByScenario.entries())
      .map(([scenarioId, mitigations]) => {
        const scenario = scenario_set?.scenarios.find(item => item.id === scenarioId)
        const runs = mitigatedRunsByScenario.get(scenarioId) || []
        const impactScatterPoints = mitigations.map((mitigation, index) => {
          const totalCost = mitigation.driver_modifications.reduce(
            (sum, mod) => sum + (mod.implementation_cost || 0),
            0
          )
          return {
            label: `${mitigation.id} ${mitigation.name}`,
            x: totalCost,
            y: mitigation.expected_impact.net_profit_change,
            color: ['#2563eb', '#f97316', '#10b981', '#8b5cf6', '#f43f5e'][index % 5],
          }
        })

        const runCharts = runs
          .map((run, idx) => {
            const labels = baselineData.map(point => formatDateLabel(point.date))
            const scenarioRun = scenarioRunById.get(run.scenario_id || '')
            const scenarioKpis = scenarioRun?.kpi_results || []
            const titleSuffix = run.mitigation_ids?.find(id => id.startsWith('bundle:'))
              ? ` (${run.mitigation_ids.find(id => id.startsWith('bundle:'))})`
              : ` (${idx + 1})`
            return `
              <div class="card">
                <h4>Mitigated Run${escapeHtml(titleSuffix)}</h4>
                <p><strong>Mitigations:</strong> ${escapeHtml(run.mitigation_ids?.join(', ') || 'None')}</p>
                <div class="grid">
                  <div class="metric">
                    <div>Total Revenue Δ</div>
                    <div class="metric-value">${formatDelta(run.summary.total_revenue_change_pct)}</div>
                  </div>
                  <div class="metric">
                    <div>Net Profit Δ</div>
                    <div class="metric-value">${formatDelta(run.summary.net_profit_change_pct)}</div>
                  </div>
                  <div class="metric">
                    <div>Prime Cost Δ</div>
                    <div class="metric-value">${formatDelta(run.summary.prime_cost_change_pct)}</div>
                  </div>
                  <div class="metric">
                    <div>Gross Margin Δ</div>
                    <div class="metric-value">${formatDelta(run.summary.gross_margin_change_pct)}</div>
                  </div>
                </div>
                ${buildLineChartSVG({
                  title: `Mitigation Impact${titleSuffix}`,
                  labels,
                  series: [
                    {
                      name: 'Baseline Revenue',
                      values: baselineData.map(point => point.total_revenue),
                      color: '#2563eb',
                    },
                    {
                      name: 'Scenario Revenue',
                      values: scenarioKpis.map(point => point.total_revenue),
                      color: '#f97316',
                    },
                    {
                      name: 'Mitigated Revenue',
                      values: run.kpi_results.map(point => point.total_revenue),
                      color: '#10b981',
                    },
                    {
                      name: 'Baseline Net Profit',
                      values: baselineData.map(point => point.net_profit),
                      color: '#8b5cf6',
                    },
                    {
                      name: 'Scenario Net Profit',
                      values: scenarioKpis.map(point => point.net_profit),
                      color: '#ef4444',
                    },
                    {
                      name: 'Mitigated Net Profit',
                      values: run.kpi_results.map(point => point.net_profit),
                      color: '#0ea5e9',
                    },
                  ],
                })}
              </div>
            `
          })
          .join('')

        return `
          <div class="card">
            <h3>Mitigations for ${escapeHtml(scenario?.name || scenarioId)}</h3>
            <p>Scenario ID: ${escapeHtml(scenarioId)}</p>
            ${buildScatterChartSVG({
              title: 'Mitigation Impact vs Implementation Cost',
              xLabel: 'Implementation Cost',
              yLabel: 'Net Profit Impact',
              points: impactScatterPoints,
            })}
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Mitigation</th>
                  <th>Category</th>
                  <th>Expected Impact</th>
                  <th>Drivers</th>
                  <th>Prereqs</th>
                  <th>Risks</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${mitigations
                  .map(mitigation => {
                    const drivers = mitigation.driver_modifications
                      .map(driver => `${driver.driver}: ${driver.modification_type} → ${driver.target_value}${driver.unit}`)
                      .join(', ')
                    return `
                      <tr>
                        <td>${escapeHtml(mitigation.id)}</td>
                        <td>${escapeHtml(mitigation.name)}</td>
                        <td>${escapeHtml(mitigation.category)}</td>
                        <td>
                          NP ${formatDelta(mitigation.expected_impact.net_profit_change)} |
                          GM ${formatDelta(mitigation.expected_impact.gross_margin_change)} |
                          PC ${formatDelta(mitigation.expected_impact.prime_cost_change)}
                        </td>
                        <td>${escapeHtml(drivers || '—')}</td>
                        <td>${escapeHtml(mitigation.prerequisites.join(', ') || '—')}</td>
                        <td>${escapeHtml(mitigation.risks.join(', ') || '—')}</td>
                        <td>${mitigation.enabled ? 'Enabled' : 'Disabled'}${mitigation.approved ? ' • Approved' : ''}</td>
                      </tr>
                    `
                  })
                  .join('')}
              </tbody>
            </table>
            <h4>Evidence</h4>
            ${renderEvidenceDetails(mitigations.flatMap(mitigation => mitigation.evidence_refs || []))}
            ${runCharts || '<p class="muted">No mitigated runs recorded.</p>'}
          </div>
        `
      })
      .join('')
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Restaurant Stress Test Report - ${escapeHtml(context_pack.metadata.name)}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
    h1 { color: #1a1a1a; }
    h2 { color: #333; border-bottom: 2px solid #f59e0b; padding-bottom: 8px; }
    h3 { margin-top: 24px; }
    h4 { margin-top: 16px; }
    .card { background: #f9fafb; border-radius: 8px; padding: 16px; margin: 16px 0; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
    .section-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; }
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
    .muted { color: #6b7280; }
    .list { margin: 0; padding-left: 18px; }
    .chart { margin: 16px 0; }
    .chart-title { font-weight: 600; margin-bottom: 8px; }
    .legend { display: flex; flex-wrap: wrap; gap: 12px; font-size: 12px; color: #6b7280; }
    .legend-item { display: inline-flex; align-items: center; gap: 6px; }
    .legend-swatch { width: 10px; height: 10px; border-radius: 2px; display: inline-block; }
  </style>
</head>
<body>
  <h1>${escapeHtml(state?.context_pack?.metadata.name)} - Stress Test Report</h1>
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

  <h2>Baseline Trends</h2>
  ${buildLineChartSVG({
    title: 'Revenue and Profit (Baseline)',
    labels: baselineData.map(point => formatDateLabel(point.date)),
    series: [
      { name: 'Total Revenue', values: baselineData.map(point => point.total_revenue), color: '#2563eb' },
      { name: 'Gross Profit', values: baselineData.map(point => point.gross_profit), color: '#10b981' },
      { name: 'Net Profit', values: baselineData.map(point => point.net_profit), color: '#f59e0b' },
    ],
  })}
  ${buildLineChartSVG({
    title: 'Margin Trends (Baseline)',
    labels: baselineData.map(point => formatDateLabel(point.date)),
    series: [
      { name: 'Gross Margin %', values: baselineDerived.map(point => point.gross_margin_pct), color: '#10b981' },
      { name: 'Net Margin %', values: baselineDerived.map(point => point.net_margin), color: '#f59e0b' },
      { name: 'Prime Cost %', values: baselineDerived.map(point => point.prime_cost_pct), color: '#ef4444' },
    ],
    unit: '%',
  })}
  
  <h2>Key Assumptions (${state?.assumption_set?.assumptions.length || 0})</h2>
  <div class="card">
    <h3>Assumption Set</h3>
    <div class="grid">
      <div class="metric">
        <div>Status</div>
        <div class="metric-value">${escapeHtml(assumption_set?.status || 'N/A')}</div>
      </div>
      <div class="metric">
        <div>Version</div>
        <div class="metric-value">${assumption_set?.version ?? 'N/A'}</div>
      </div>
      <div class="metric">
        <div>Last Updated</div>
        <div class="metric-value">${assumption_set?.updated_at ? new Date(assumption_set.updated_at).toLocaleString() : 'N/A'}</div>
      </div>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th>ID</th>
        <th>Assumption</th>
        <th>Category</th>
        <th>Description</th>
        <th>Baseline</th>
        <th>Range</th>
        <th>Confidence</th>
        <th>Needs Confirmation</th>
        <th>Rationale</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${(state?.assumption_set?.assumptions || []).map(a => `
        <tr>
          <td>${escapeHtml(a.id)}</td>
          <td>${escapeHtml(a.label)}</td>
          <td>${escapeHtml(a.category)}</td>
          <td>${escapeHtml(a.description)}</td>
          <td>${escapeHtml(a.baseline_value)} ${escapeHtml(a.unit)}</td>
          <td>${a.range_min} - ${a.range_max}</td>
          <td><span class="badge badge-${a.confidence}">${a.confidence}</span></td>
          <td>${a.needs_user_confirmation ? 'Yes' : 'No'}</td>
          <td>${escapeHtml(a.rationale || '—')}</td>
          <td>${a.approved ? 'Approved' : 'Draft'}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  <h3>Assumption Evidence</h3>
  ${renderEvidenceDetails((assumption_set?.assumptions || []).flatMap(a => a.evidence_refs || []))}
  
  <h2>Stress Scenarios (${state?.scenario_set?.scenarios.length || 0})</h2>
  ${scenarioSections || '<p class="muted">No scenarios available.</p>'}
  
  <h2>Mitigations (${state?.mitigation_set?.mitigations.length || 0})</h2>
  <div class="card">
    <h3>Mitigation Set</h3>
    <div class="grid">
      <div class="metric">
        <div>Status</div>
        <div class="metric-value">${escapeHtml(mitigation_set?.status || 'N/A')}</div>
      </div>
      <div class="metric">
        <div>Version</div>
        <div class="metric-value">${mitigation_set?.version ?? 'N/A'}</div>
      </div>
      <div class="metric">
        <div>Last Updated</div>
        <div class="metric-value">${mitigation_set?.updated_at ? new Date(mitigation_set.updated_at).toLocaleString() : 'N/A'}</div>
      </div>
    </div>
  </div>
  ${mitigationSections || '<p class="muted">No mitigations available.</p>'}
  
  <div class="footer">
    <p>Report generated by Restaurant Stress-Testing Copilot</p>
    <p>Dataset ID: ${escapeHtml(state?.context_pack?.metadata.dataset_id || 'N/A')} | Context Pack: ${escapeHtml(
      state?.context_pack?.id || 'N/A'
    )}</p>
    <p>Assumption Set Version: ${escapeHtml(state?.assumption_set?.version || 'N/A')} | Scenario Set Version: ${escapeHtml(
      state?.scenario_set?.version || 'N/A'
    )}</p>
  </div>
</body>
</html>`
  }, [state, baselineRun])

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
