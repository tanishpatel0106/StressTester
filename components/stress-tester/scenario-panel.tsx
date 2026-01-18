"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Scenario, Breakpoint, Assumption } from "@/lib/types"

interface ScenarioPanelProps {
  scenarios: Scenario[]
  breakpoints: Breakpoint[]
  assumptions: Assumption[]
  onSelectScenario: (scenario: Scenario) => void
  selectedScenarioId?: string
}

export function ScenarioPanel({
  scenarios,
  breakpoints,
  assumptions,
  onSelectScenario,
  selectedScenarioId,
}: ScenarioPanelProps) {
  const [filter, setFilter] = useState<"all" | "breaking" | "safe">("all")

  const filteredScenarios = scenarios.filter((scenario) => {
    const breakpoint = breakpoints.find((b) => b.scenarioId === scenario.id)
    if (filter === "breaking") return breakpoint?.planFails
    if (filter === "safe") return !breakpoint?.planFails
    return true
  })

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
      case "severe":
        return "bg-rose-500/10 text-rose-500 border-rose-500/20"
      case "high":
        return "bg-orange-500/10 text-orange-500 border-orange-500/20"
      case "moderate":
        return "bg-amber-500/10 text-amber-500 border-amber-500/20"
      default:
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
    }
  }

  const getChangeDescription = (change: Scenario["changes"][0]) => {
    const { metric, mode, value, durationMonths } = change
    let changeText = ""

    if (mode === "multiply") {
      const pct = ((value - 1) * 100).toFixed(0)
      changeText = `${metric} ${Number(pct) >= 0 ? "+" : ""}${pct}%`
    } else if (mode === "add") {
      const sign = value >= 0 ? "+" : ""
      if (metric.includes("Rate") || metric.includes("Margin")) {
        changeText = `${metric} ${sign}${(value * 100).toFixed(1)}pp`
      } else {
        changeText = `${metric} ${sign}${value}`
      }
    } else {
      changeText = `${metric} = ${value}`
    }

    return `${changeText} for ${durationMonths} mo`
  }

  const breakingCount = breakpoints.filter((b) => b.planFails).length
  const safeCount = breakpoints.filter((b) => !b.planFails).length

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Stress Scenarios</CardTitle>
        <div className="flex gap-2">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
          >
            All ({scenarios.length})
          </Button>
          <Button
            variant={filter === "breaking" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("breaking")}
            className={filter === "breaking" ? "" : "text-rose-500"}
          >
            Breaking ({breakingCount})
          </Button>
          <Button
            variant={filter === "safe" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("safe")}
            className={filter === "safe" ? "" : "text-emerald-500"}
          >
            Safe ({safeCount})
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {filteredScenarios.map((scenario) => {
            const breakpoint = breakpoints.find(
              (b) => b.scenarioId === scenario.id
            )
            const isSelected = selectedScenarioId === scenario.id

            return (
              <div
                key={scenario.id}
                className={`rounded-lg border p-4 transition-all cursor-pointer ${
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground/30"
                }`}
                onClick={() => onSelectScenario(scenario)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">
                        {scenario.id}
                      </span>
                      <h4 className="font-medium text-foreground">
                        {scenario.name}
                      </h4>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {scenario.description || scenario.rationale}
                    </p>
                    {scenario.probability !== undefined && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Probability: {(scenario.probability * 100).toFixed(0)}%
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-2">
                      {scenario.changes.map((change, idx) => (
                        <Badge
                          key={idx}
                          variant="outline"
                          className="font-mono text-xs"
                        >
                          {getChangeDescription(change)}
                        </Badge>
                      ))}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className={getSeverityColor(scenario.severity)}
                      >
                        {scenario.severity}
                      </Badge>
                      {scenario.affectedAssumptions.map((aId) => {
                        const assumption = assumptions.find((a) => a.id === aId)
                        return (
                          <Badge
                            key={aId}
                            variant="outline"
                            className="text-xs"
                            title={assumption?.statement}
                          >
                            {aId}
                          </Badge>
                        )
                      })}
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    {breakpoint?.planFails ? (
                      <div className="flex flex-col items-center">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-500/10">
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
                        </div>
                        <span className="mt-1 text-xs font-medium text-rose-500">
                          BREAKS
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
                          <svg
                            className="h-5 w-5 text-emerald-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </div>
                        <span className="mt-1 text-xs font-medium text-emerald-500">
                          SURVIVES
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                {breakpoint?.planFails && breakpoint.failureCondition && (
                  <div className="mt-3 rounded-md bg-rose-500/5 p-2 border border-rose-500/10">
                    <p className="text-xs text-rose-600">
                      <span className="font-medium">Failure:</span>{" "}
                      {breakpoint.failureCondition}
                      {breakpoint.firstFailureMonth && (
                        <span className="ml-2 font-mono">
                          (First: {breakpoint.firstFailureMonth})
                        </span>
                      )}
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
