"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Sparkles, Shield, Zap, BarChart3 } from "lucide-react"
import type { Mitigation, Assumption, Scenario } from "@/lib/types"

interface MitigationPanelProps {
  mitigations: Mitigation[]
  assumptions: Assumption[]
  scenarios: Scenario[]
}

export function MitigationPanel({
  mitigations,
  assumptions,
  scenarios,
}: MitigationPanelProps) {
  // Check if mitigations are AI-generated (have the new structure)
  const isAIGenerated = mitigations.length > 0 && 
    mitigations[0].preventiveActions && 
    typeof mitigations[0].preventiveActions[0] === "object"

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            Mitigation Playbook
            {isAIGenerated && (
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                <Sparkles className="mr-1 h-3 w-3" />
                AI Generated
              </Badge>
            )}
          </CardTitle>
          <span className="text-sm text-muted-foreground">
            {mitigations.length} scenario{mitigations.length !== 1 ? "s" : ""} with mitigations
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full" defaultValue={mitigations[0]?.scenarioId}>
          {mitigations.map((mit) => {
            const scenario = scenarios.find((s) => s.id === mit.scenarioId)
            if (!scenario) return null

            return (
              <AccordionItem key={mit.scenarioId} value={mit.scenarioId}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3 text-left">
                    <Badge
                      variant="outline"
                      className={
                        scenario.severity === "critical" || scenario.severity === "high"
                          ? "bg-rose-500/10 text-rose-500 border-rose-500/20"
                          : scenario.severity === "moderate"
                          ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                          : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                      }
                    >
                      {scenario.severity}
                    </Badge>
                    <span className="font-medium">{scenario.name}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-6 pt-4">
                    {/* Scenario Description */}
                    <div className="rounded-lg bg-muted/50 p-4">
                      <p className="text-sm text-muted-foreground">
                        {scenario.description}
                      </p>
                      {scenario.expectedBreakCondition && (
                        <p className="mt-2 text-sm text-rose-600 font-medium">
                          Break condition: {scenario.expectedBreakCondition}
                        </p>
                      )}
                    </div>

                    {/* Preventive Actions */}
                    <div>
                      <h5 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                        <Shield className="h-4 w-4 text-blue-500" />
                        Preventive Actions
                      </h5>
                      <div className="space-y-3">
                        {isAIGenerated && Array.isArray(mit.preventiveActions) ? (
                          (mit.preventiveActions as Array<{
                            action: string
                            timing: string
                            cost: string
                            effectiveness: number
                          }>).map((action, idx) => (
                            <div
                              key={idx}
                              className="rounded-lg border border-border bg-card p-4"
                            >
                              <p className="text-sm font-medium text-foreground">
                                {action.action}
                              </p>
                              <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <span className="font-medium">Timing:</span> {action.timing}
                                </span>
                                <span className="flex items-center gap-1">
                                  <span className="font-medium">Cost:</span> {action.cost}
                                </span>
                                <span className="flex items-center gap-1">
                                  <span className="font-medium">Effectiveness:</span>
                                  <span className={action.effectiveness > 0.7 ? "text-emerald-600" : action.effectiveness > 0.4 ? "text-amber-600" : "text-rose-600"}>
                                    {(action.effectiveness * 100).toFixed(0)}%
                                  </span>
                                </span>
                              </div>
                            </div>
                          ))
                        ) : (
                          // Fallback for old string[] format
                          <ul className="space-y-2">
                            {(mit.preventiveActions as string[]).map((action, idx) => (
                              <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                                <span className="text-blue-500 mt-1">-</span>
                                {action}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>

                    {/* Contingency Actions */}
                    <div>
                      <h5 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                        <Zap className="h-4 w-4 text-amber-500" />
                        Contingency Actions
                      </h5>
                      <div className="space-y-3">
                        {isAIGenerated && Array.isArray(mit.contingencyActions) ? (
                          (mit.contingencyActions as Array<{
                            trigger: string
                            action: string
                            timeline: string
                            impact: string
                          }>).map((action, idx) => (
                            <div
                              key={idx}
                              className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4"
                            >
                              <div className="flex items-start gap-2 mb-2">
                                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs">
                                  Trigger
                                </Badge>
                                <span className="text-sm text-amber-700">{action.trigger}</span>
                              </div>
                              <p className="text-sm font-medium text-foreground">
                                {action.action}
                              </p>
                              <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <span className="font-medium">Timeline:</span> {action.timeline}
                                </span>
                                <span className="flex items-center gap-1">
                                  <span className="font-medium">Impact:</span> {action.impact}
                                </span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <ul className="space-y-2">
                            {(mit.contingencyActions as string[]).map((action, idx) => (
                              <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                                <span className="text-amber-500 mt-1">-</span>
                                {action}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>

                    {/* Monitoring Metrics */}
                    <div>
                      <h5 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-emerald-500" />
                        Monitoring Metrics
                      </h5>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {isAIGenerated && Array.isArray(mit.monitoringMetrics) ? (
                          (mit.monitoringMetrics as Array<{
                            metric: string
                            threshold: string
                            frequency: string
                          }>).map((m, idx) => (
                            <div
                              key={idx}
                              className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3"
                            >
                              <p className="text-sm font-medium text-foreground">
                                {m.metric}
                              </p>
                              <div className="mt-1 space-y-1 text-xs text-muted-foreground">
                                <p>
                                  <span className="font-medium text-rose-600">Threshold:</span> {m.threshold}
                                </p>
                                <p>
                                  <span className="font-medium">Frequency:</span> {m.frequency}
                                </p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="flex flex-wrap gap-2 col-span-full">
                            {(mit.monitoringMetrics as string[]).map((metric, idx) => (
                              <Badge
                                key={idx}
                                variant="outline"
                                className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                              >
                                {metric}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            )
          })}
        </Accordion>
      </CardContent>
    </Card>
  )
}
