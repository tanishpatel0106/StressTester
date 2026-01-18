"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { Assumption, Evidence } from "@/lib/types"
import { calculateRiskScore, categorizeRisk } from "@/lib/ai-agents"

interface AssumptionTableProps {
  assumptions: Assumption[]
  evidenceStore: Evidence[]
  onSelectAssumption?: (assumption: Assumption) => void
}

export function AssumptionTable({
  assumptions,
  evidenceStore,
  onSelectAssumption,
}: AssumptionTableProps) {
  const [selectedEvidence, setSelectedEvidence] = useState<Evidence | null>(null)
  const [sortBy, setSortBy] = useState<"risk" | "category" | "type">("risk")

  const sortedAssumptions = [...assumptions].sort((a, b) => {
    if (sortBy === "risk") {
      // Use AI riskScore if available, otherwise calculate
      const scoreA = a.riskScore !== undefined ? a.riskScore / 100 : calculateRiskScore(a)
      const scoreB = b.riskScore !== undefined ? b.riskScore / 100 : calculateRiskScore(b)
      return scoreB - scoreA
    }
    if (sortBy === "category") {
      return a.category.localeCompare(b.category)
    }
    return (a.type || "implicit").localeCompare(b.type || "implicit")
  })

  const getRiskBadgeColor = (score: number) => {
    const level = categorizeRisk(score)
    switch (level) {
      case "critical":
        return "bg-rose-500/10 text-rose-500 border-rose-500/20"
      case "high":
        return "bg-orange-500/10 text-orange-500 border-orange-500/20"
      case "medium":
        return "bg-amber-500/10 text-amber-500 border-amber-500/20"
      default:
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
    }
  }

  const getTypeBadgeColor = (type: string) => {
    return type === "explicit"
      ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
      : "bg-slate-500/10 text-slate-500 border-slate-500/20"
  }

  const getCategoryBadgeColor = (category: string) => {
    const colors: Record<string, string> = {
      demand: "bg-purple-500/10 text-purple-500 border-purple-500/20",
      acquisition: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
      retention: "bg-pink-500/10 text-pink-500 border-pink-500/20",
      pricing: "bg-teal-500/10 text-teal-500 border-teal-500/20",
      margin: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
      costs: "bg-orange-500/10 text-orange-500 border-orange-500/20",
      execution: "bg-lime-500/10 text-lime-500 border-lime-500/20",
      liquidity: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      working_capital: "bg-amber-500/10 text-amber-500 border-amber-500/20",
      market: "bg-rose-500/10 text-rose-500 border-rose-500/20",
    }
    return colors[category] || "bg-slate-500/10 text-slate-500 border-slate-500/20"
  }

  const handleEvidenceClick = (evidenceId: string) => {
    const evidence = evidenceStore.find((e) => e.id === evidenceId)
    if (evidence) {
      setSelectedEvidence(evidence)
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Assumption Register</CardTitle>
          <div className="flex gap-2">
            <Button
              variant={sortBy === "risk" ? "default" : "outline"}
              size="sm"
              onClick={() => setSortBy("risk")}
            >
              By Risk
            </Button>
            <Button
              variant={sortBy === "category" ? "default" : "outline"}
              size="sm"
              onClick={() => setSortBy("category")}
            >
              By Category
            </Button>
            <Button
              variant={sortBy === "type" ? "default" : "outline"}
              size="sm"
              onClick={() => setSortBy("type")}
            >
              By Type
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sortedAssumptions.map((assumption) => {
              // Use AI riskScore if available, otherwise calculate
              const riskScore = assumption.riskScore !== undefined 
                ? assumption.riskScore / 100 
                : calculateRiskScore(assumption)
              // Get display text - support both old and new formats
              const displayText = assumption.label || assumption.statement || "Unnamed assumption"
              const displayDescription = assumption.description || ""
              const assumptionType = assumption.type || "implicit"
              
              return (
                <div
                  key={assumption.id}
                  className="flex items-start gap-4 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted/50 cursor-pointer"
                  onClick={() => onSelectAssumption?.(assumption)}
                >
                  <div className="flex-shrink-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                      {assumption.id.length > 4 ? assumption.id.slice(0, 4) : assumption.id}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {displayText}
                    </p>
                    {displayDescription && (
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                        {displayDescription}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className={getTypeBadgeColor(assumptionType)}
                      >
                        {assumptionType}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={getCategoryBadgeColor(assumption.category)}
                      >
                        {assumption.category.replace("_", " ")}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={getRiskBadgeColor(riskScore)}
                      >
                        Risk: {(riskScore * 100).toFixed(0)}%
                      </Badge>
                      {assumption.confidence && (
                        <Badge variant="outline" className="bg-card">
                          Confidence: {assumption.confidence}
                        </Badge>
                      )}
                    </div>
                    {/* Support both old baseline format and new baselineValue */}
                    {(assumption.baseline?.value !== null || assumption.baselineValue !== undefined) && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Baseline: {assumption.baseline?.metric || assumption.label} ={" "}
                        {assumption.baseline ? (
                          assumption.baseline.unit === "ratio"
                            ? `${((assumption.baseline.value || 0) * 100).toFixed(1)}%`
                            : assumption.baseline.unit === "USD"
                            ? `$${(assumption.baseline.value || 0).toLocaleString()}`
                            : assumption.baseline.value
                        ) : (
                          assumption.unit === "%" 
                            ? `${assumption.baselineValue}%`
                            : assumption.unit === "$"
                            ? `$${(assumption.baselineValue || 0).toLocaleString()}`
                            : `${assumption.baselineValue} ${assumption.unit || ""}`
                        )}
                      </p>
                    )}
                    {assumption.rationale && (
                      <p className="mt-2 text-xs text-muted-foreground italic">
                        {assumption.rationale}
                      </p>
                    )}
                    {assumption.evidenceIds && assumption.evidenceIds.length > 0 && (
                      <div className="mt-2 flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">
                          Evidence:
                        </span>
                        {assumption.evidenceIds.map((eId) => (
                          <button
                            key={eId}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEvidenceClick(eId)
                            }}
                            className="text-xs text-blue-500 hover:underline"
                          >
                            [{eId}]
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    <div className="flex flex-col items-end gap-1">
                      <div className="text-xs text-muted-foreground">
                        Fragility
                      </div>
                      <div className="h-2 w-20 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-orange-500"
                          style={{ width: `${assumption.fragility * 100}%` }}
                        />
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Impact
                      </div>
                      <div className="h-2 w-20 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-rose-500"
                          style={{ width: `${assumption.impact * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={selectedEvidence !== null}
        onOpenChange={() => setSelectedEvidence(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Evidence: {selectedEvidence?.id}</DialogTitle>
          </DialogHeader>
          {selectedEvidence && (
            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground">
                  Type
                </div>
                <div className="text-sm text-foreground">
                  {selectedEvidence.type.replace("_", " ")}
                </div>
              </div>
              {selectedEvidence.type === "text_span" && (
                <>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">
                      Source File
                    </div>
                    <div className="text-sm text-foreground">
                      {selectedEvidence.file}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">
                      Quoted Text
                    </div>
                    <div className="mt-1 rounded-md bg-muted p-3 text-sm text-foreground italic">
                      &ldquo;{selectedEvidence.quotedText}&rdquo;
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">
                      Location
                    </div>
                    <div className="text-sm text-foreground">
                      Characters {selectedEvidence.startChar} -{" "}
                      {selectedEvidence.endChar}
                    </div>
                  </div>
                </>
              )}
              {selectedEvidence.type === "table_cell" && (
                <>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">
                      Source File
                    </div>
                    <div className="text-sm text-foreground">
                      {selectedEvidence.file}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">
                      Cell Reference
                    </div>
                    <div className="text-sm text-foreground">
                      Row {selectedEvidence.row}, Column {selectedEvidence.column}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">
                      Value
                    </div>
                    <div className="text-sm text-foreground font-mono">
                      {selectedEvidence.value}{" "}
                      {selectedEvidence.unit && `(${selectedEvidence.unit})`}
                    </div>
                  </div>
                  {selectedEvidence.period && (
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">
                        Period
                      </div>
                      <div className="text-sm text-foreground">
                        {selectedEvidence.period}
                      </div>
                    </div>
                  )}
                </>
              )}
              {selectedEvidence.type === "computed" && (
                <>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">
                      Computed Value
                    </div>
                    <div className="text-sm text-foreground font-mono">
                      {selectedEvidence.value}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">
                      Formula
                    </div>
                    <div className="mt-1 rounded-md bg-muted p-3 text-sm font-mono text-foreground">
                      {selectedEvidence.formula}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">
                      Dependencies
                    </div>
                    <div className="text-sm text-foreground">
                      {selectedEvidence.dependencyEvidenceIds.join(", ")}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
