"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Assumption, Scenario, Breakpoint, Mitigation } from "@/lib/types"
import { calculateRiskScore, categorizeRisk } from "@/lib/ai-agents"

interface ExecutiveSummaryProps {
  assumptions: Assumption[]
  scenarios: Scenario[]
  breakpoints: Breakpoint[]
  mitigations: Mitigation[]
  aiSummary?: {
    overallRiskRating: "low" | "moderate" | "high" | "critical"
    keyFindings: string[]
    topRisks: { risk: string; likelihood: string; impact: string }[]
    recommendations: string[]
  } | null
}

export function ExecutiveSummary({
  assumptions,
  scenarios,
  breakpoints,
  mitigations,
  aiSummary,
}: ExecutiveSummaryProps) {
  // Get top risky assumptions
  const rankedAssumptions = [...assumptions].sort(
    (a, b) => calculateRiskScore(b) - calculateRiskScore(a)
  )
  const topRiskyAssumptions = rankedAssumptions.slice(0, 5)

  // Get breaking scenarios
  const breakingScenarios = breakpoints
    .filter((b) => b.planFails)
    .map((b) => scenarios.find((s) => s.id === b.scenarioId))
    .filter(Boolean) as Scenario[]

  // Find worst case
  const worstCase =
    breakingScenarios.find((s) => s.severity === "severe") ||
    breakingScenarios[0]

  // Find earliest failure
  const earliestFailure = breakpoints
    .filter((b) => b.planFails && b.firstFailureMonth)
    .sort((a, b) => {
      if (!a.firstFailureMonth || !b.firstFailureMonth) return 0
      return a.firstFailureMonth.localeCompare(b.firstFailureMonth)
    })[0]

  // Generate strategic recommendations (fallback if no AI summary)
  const defaultRecommendations = [
    {
      priority: "high",
      text: "Diversify customer acquisition to reduce CAC volatility",
      category: "acquisition",
    },
    {
      priority: "high",
      text: "Implement proactive churn prevention with early warning signals",
      category: "retention",
    },
    {
      priority: "medium",
      text: "Build infrastructure cost monitoring to protect margins",
      category: "margin",
    },
    {
      priority: "medium",
      text: "Establish contingency credit line before runway pressure",
      category: "liquidity",
    },
    {
      priority: "low",
      text: "Quarterly stress-test reviews with leadership",
      category: "execution",
    },
  ]

  // Use AI recommendations if available
  const recommendations = aiSummary?.recommendations
    ? aiSummary.recommendations.map((text, idx) => ({
        priority: idx < 2 ? "high" : idx < 4 ? "medium" : "low",
        text,
        category: "ai-generated",
      }))
    : defaultRecommendations

  // Determine overall risk rating
  const overallRisk = aiSummary?.overallRiskRating || (
    breakingScenarios.length > 3
      ? "critical"
      : breakingScenarios.length > 1
      ? "high"
      : breakingScenarios.length > 0
      ? "moderate"
      : "low"
  )

  const getRiskLevel = (score: number) => {
    const level = categorizeRisk(score)
    const colors: Record<string, string> = {
      critical: "bg-rose-500/10 text-rose-500 border-rose-500/20",
      high: "bg-orange-500/10 text-orange-500 border-orange-500/20",
      medium: "bg-amber-500/10 text-amber-500 border-amber-500/20",
      low: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    }
    return { level, color: colors[level] }
  }

  return (
    <div className="space-y-4">
      {/* Overall Status */}
      <Card
        className={`border-2 ${
          overallRisk === "critical"
            ? "border-rose-500/50 bg-rose-500/5"
            : overallRisk === "high"
            ? "border-orange-500/50 bg-orange-500/5"
            : overallRisk === "moderate"
            ? "border-amber-500/50 bg-amber-500/5"
            : "border-emerald-500/50 bg-emerald-500/5"
        }`}
      >
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div
              className={`flex h-16 w-16 items-center justify-center rounded-full ${
                overallRisk === "critical"
                  ? "bg-rose-500/10"
                  : overallRisk === "high"
                  ? "bg-orange-500/10"
                  : overallRisk === "moderate"
                  ? "bg-amber-500/10"
                  : "bg-emerald-500/10"
              }`}
            >
              {overallRisk === "critical" ? (
                <svg
                  className="h-8 w-8 text-rose-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              ) : overallRisk === "high" ? (
                <svg
                  className="h-8 w-8 text-orange-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              ) : overallRisk === "moderate" ? (
                <svg
                  className="h-8 w-8 text-amber-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              ) : (
                <svg
                  className="h-8 w-8 text-emerald-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold text-foreground capitalize">
                  {overallRisk} Risk
                </h2>
                {aiSummary && (
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                    AI Analysis
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground">
                {breakingScenarios.length} of {scenarios.length} scenarios break
                the plan
              </p>
            </div>
          </div>

          {/* AI Key Findings */}
          {aiSummary?.keyFindings && aiSummary.keyFindings.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border">
              <h4 className="text-sm font-medium text-foreground mb-2">Key Findings</h4>
              <ul className="space-y-1">
                {aiSummary.keyFindings.map((finding, idx) => (
                  <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-primary mt-1">-</span>
                    {finding}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Top Risks */}
      {aiSummary?.topRisks && aiSummary.topRisks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Top Risks
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                AI Identified
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {aiSummary.topRisks.map((risk, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-4 rounded-lg border border-border p-3"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-500/10 text-sm font-bold text-rose-500">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {risk.risk}
                    </p>
                    <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Likelihood: {risk.likelihood}</span>
                      <span>Impact: {risk.impact}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Assumptions Analyzed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {assumptions.length}
            </div>
            <p className="text-sm text-muted-foreground">
              {assumptions.filter((a) => a.type === "explicit").length} explicit,{" "}
              {assumptions.filter((a) => a.type === "implicit").length} implicit
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Scenarios Tested
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {scenarios.length}
            </div>
            <p className="text-sm text-muted-foreground">
              {breakingScenarios.length} breaking,{" "}
              {scenarios.length - breakingScenarios.length} survivable
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Earliest Failure
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {earliestFailure?.firstFailureMonth || "None"}
            </div>
            <p className="text-sm text-muted-foreground">
              {earliestFailure
                ? scenarios.find((s) => s.id === earliestFailure.scenarioId)
                    ?.name || "Unknown scenario"
                : "Plan survives all scenarios"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Risky Assumptions */}
      <Card>
        <CardHeader>
          <CardTitle>Top 5 Risky Assumptions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topRiskyAssumptions.map((assumption, idx) => {
              const riskScore = calculateRiskScore(assumption)
              const { level, color } = getRiskLevel(riskScore)
              return (
                <div
                  key={assumption.id}
                  className="flex items-center gap-4 rounded-lg border border-border p-3"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-bold text-muted-foreground">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {assumption.statement}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge variant="outline" className={color}>
                        {level} risk
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {assumption.category.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-foreground">
                      {(riskScore * 100).toFixed(0)}%
                    </div>
                    <div className="text-xs text-muted-foreground">
                      risk score
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Worst Case Scenario */}
      {worstCase && (
        <Card className="border-rose-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <svg
                className="h-5 w-5 text-rose-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              Worst Case Scenario
            </CardTitle>
          </CardHeader>
          <CardContent>
            <h4 className="font-semibold text-foreground">{worstCase.name}</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              {worstCase.rationale}
            </p>
            <div className="mt-3 rounded-md bg-rose-500/5 p-3 border border-rose-500/10">
              <p className="text-sm text-rose-600">
                <span className="font-medium">Expected failure:</span>{" "}
                {worstCase.expectedBreakCondition}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Strategic Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Strategic Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recommendations.map((rec, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 rounded-lg border border-border p-3"
              >
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                    rec.priority === "high"
                      ? "bg-rose-500/10 text-rose-500"
                      : rec.priority === "medium"
                      ? "bg-amber-500/10 text-amber-500"
                      : "bg-emerald-500/10 text-emerald-500"
                  }`}
                >
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {rec.text}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={
                        rec.priority === "high"
                          ? "bg-rose-500/10 text-rose-500 border-rose-500/20"
                          : rec.priority === "medium"
                          ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                          : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                      }
                    >
                      {rec.priority} priority
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {rec.category}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
