"use client"

import { useState, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Info,
  Edit2,
  Save,
  X,
} from "lucide-react"
import { getRestaurantState, saveAssumptionSet } from "@/lib/restaurant/storage"
import { generateAssumptions } from "@/lib/restaurant/ai-client"
import type { Assumption, AssumptionSet } from "@/lib/restaurant/types"

export default function AssumptionsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const contextPackId = searchParams.get("id")

  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [localAssumptions, setLocalAssumptions] = useState<Assumption[] | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<{ baseline: string; min: string; max: string }>({ baseline: '', min: '', max: '' })
  const [isApproved, setIsApproved] = useState(false)

  const handleGenerate = useCallback(async () => {
    if (!contextPackId) return
    
    setIsGenerating(true)
    setError(null)
    
    try {
      const state = getRestaurantState(contextPackId)
      if (!state?.context_pack) return
      
      const response = await generateAssumptions(state.context_pack)
      
      setLocalAssumptions(response.assumptions)
      setIsApproved(false)
      
      // Save as draft
      const newSet: AssumptionSet = {
        id: `AS_${Date.now()}`,
        context_pack_id: contextPackId,
        assumptions: response.assumptions,
        status: 'draft',
        version: (state.assumption_set?.version || 0) + 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      saveAssumptionSet(newSet)
      
      if (response.warnings.length > 0) {
        setError(response.warnings.join(", "))
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate assumptions")
    } finally {
      setIsGenerating(false)
    }
  }, [contextPackId])

  const handleStartEdit = (assumption: Assumption) => {
    setEditingId(assumption.id)
    setEditValues({
      baseline: assumption.baseline_value.toString(),
      min: assumption.range_min.toString(),
      max: assumption.range_max.toString(),
    })
  }

  const handleSaveEdit = (id: string) => {
    const state = getRestaurantState(contextPackId)
    const assumptions = localAssumptions || state?.assumption_set?.assumptions || []
    const updated = assumptions.map(a => {
      if (a.id === id) {
        return {
          ...a,
          baseline_value: parseFloat(editValues.baseline) || a.baseline_value,
          range_min: parseFloat(editValues.min) || a.range_min,
          range_max: parseFloat(editValues.max) || a.range_max,
          version: a.version + 1,
        }
      }
      return a
    })
    setLocalAssumptions(updated)
    setEditingId(null)
  }

  const handleApprove = () => {
    const state = getRestaurantState(contextPackId)
    const assumptions = localAssumptions || state?.assumption_set?.assumptions || []
    const approvedAssumptions = assumptions.map(a => ({ ...a, approved: true, approved_at: new Date().toISOString() }))
    
    const approvedSet: AssumptionSet = {
      id: state?.assumption_set?.id || `AS_${Date.now()}`,
      context_pack_id: contextPackId,
      assumptions: approvedAssumptions,
      status: 'approved',
      version: state?.assumption_set?.version || 1,
      created_at: state?.assumption_set?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    saveAssumptionSet(approvedSet)
    setLocalAssumptions(approvedAssumptions)
    setIsApproved(true)
  }

  const confidenceColor = (conf: string) => {
    switch (conf) {
      case 'high': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
      case 'medium': return 'bg-amber-500/10 text-amber-600 border-amber-500/20'
      case 'low': return 'bg-rose-500/10 text-rose-600 border-rose-500/20'
      default: return ''
    }
  }

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

  const state = getRestaurantState(contextPackId)
  
  if (!state?.context_pack) {
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

  const assumptions = localAssumptions || state.assumption_set?.assumptions || []
  const status = state.assumption_set?.status
  const isCurrentlyApproved = isApproved || status === 'approved'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Assumptions</h2>
          <p className="text-muted-foreground mt-1">
            AI-extracted assumptions from your financial data
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={handleGenerate} 
            disabled={isGenerating}
            variant="outline"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                AI Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                {assumptions.length > 0 ? 'Regenerate with AI' : 'Generate with AI'}
              </>
            )}
          </Button>
          {assumptions.length > 0 && !isCurrentlyApproved && (
            <Button onClick={handleApprove}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Approve All
            </Button>
          )}
          {isCurrentlyApproved && (
            <Button onClick={() => router.push(`/restaurant/scenarios?id=${contextPackId}`)}>
              Continue to Scenarios
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>

      {/* Status Banner */}
      {isCurrentlyApproved && (
        <Alert className="border-emerald-500/30 bg-emerald-500/5">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <AlertDescription className="text-emerald-600">
            Assumptions approved. You can now generate scenarios.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* No Assumptions Yet */}
      {assumptions.length === 0 && !isGenerating && (
        <Card className="p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Sparkles className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">No Assumptions Yet</h3>
          <p className="text-muted-foreground max-w-md mx-auto mb-4">
            Generate AI-powered assumptions based on your restaurant's financial data.
          </p>
          <Button onClick={handleGenerate}>
            <Sparkles className="h-4 w-4 mr-2" />
            Generate Assumptions with AI
          </Button>
        </Card>
      )}

      {/* Assumptions List */}
      {assumptions.length > 0 && (
        <div className="grid gap-4">
          {assumptions.map((assumption) => (
            <Card key={assumption.id} className={assumption.needs_user_confirmation ? 'border-amber-500/30' : ''}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-xs">
                      {assumption.id}
                    </Badge>
                    <CardTitle className="text-base">{assumption.label}</CardTitle>
                    {assumption.needs_user_confirmation && (
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Review
                      </Badge>
                    )}
                  </div>
                  <Badge variant="outline" className={confidenceColor(assumption.confidence)}>
                    {assumption.confidence} confidence
                  </Badge>
                </div>
                <CardDescription>{assumption.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Values */}
                  <div className="space-y-2">
                    {editingId === assumption.id ? (
                      <div className="flex items-center gap-2">
                        <div className="space-y-1">
                          <span className="text-xs text-muted-foreground">Baseline</span>
                          <Input
                            type="number"
                            value={editValues.baseline}
                            onChange={(e) => setEditValues(v => ({ ...v, baseline: e.target.value }))}
                            className="h-8 w-20"
                          />
                        </div>
                        <div className="space-y-1">
                          <span className="text-xs text-muted-foreground">Min</span>
                          <Input
                            type="number"
                            value={editValues.min}
                            onChange={(e) => setEditValues(v => ({ ...v, min: e.target.value }))}
                            className="h-8 w-20"
                          />
                        </div>
                        <div className="space-y-1">
                          <span className="text-xs text-muted-foreground">Max</span>
                          <Input
                            type="number"
                            value={editValues.max}
                            onChange={(e) => setEditValues(v => ({ ...v, max: e.target.value }))}
                            className="h-8 w-20"
                          />
                        </div>
                        <div className="flex items-end gap-1 pb-0.5">
                          <Button size="sm" variant="ghost" onClick={() => handleSaveEdit(assumption.id)}>
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-4">
                        <div>
                          <span className="text-xs text-muted-foreground">Baseline</span>
                          <p className="font-medium">
                            {assumption.baseline_value} {assumption.unit}
                          </p>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground">Range</span>
                          <p className="text-sm text-muted-foreground">
                            {assumption.range_min} - {assumption.range_max} {assumption.unit}
                          </p>
                        </div>
                        {!isCurrentlyApproved && (
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => handleStartEdit(assumption)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Metadata */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {assumption.category}
                      </Badge>
                      {assumption.evidence_refs.map(ref => (
                        <Badge key={ref} variant="outline" className="text-xs font-mono">
                          {ref}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground flex items-start gap-1">
                      <Info className="h-3 w-3 mt-0.5 shrink-0" />
                      {assumption.rationale}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
