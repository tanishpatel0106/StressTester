"use client"

import { useMemo, useState } from "react"
import {
  sampleDriverSeries,
  sampleKpiSeries,
  sampleMitigations,
  sampleDerivedKpis,
} from "@/lib/restaurant/sample-data"
import { applyMitigationToDrivers } from "@/lib/restaurant/mitigation"
import { computeKpiSpineFromDrivers } from "@/lib/restaurant/engine"
import { computeDerivedKpis } from "@/lib/restaurant/derived"
import type { Mitigation } from "@/lib/restaurant/types"

const formatCurrency = (value: number | null) =>
  value === null ? "n/a" : `$${value.toLocaleString()}`

export default function MitigationsPage() {
  const [selectedMitigation, setSelectedMitigation] = useState<Mitigation | null>(null)
  const [approvedMitigationId, setApprovedMitigationId] = useState<string | null>(null)

  const mitigationKpis = useMemo(() => {
    if (!selectedMitigation || approvedMitigationId !== selectedMitigation.id) {
      return {
        kpis: sampleKpiSeries,
        derived: sampleDerivedKpis,
      }
    }
    const adjustedDrivers = applyMitigationToDrivers(sampleDriverSeries, selectedMitigation)
    const adjustedKpis = computeKpiSpineFromDrivers(adjustedDrivers)
    return {
      kpis: adjustedKpis,
      derived: computeDerivedKpis(adjustedKpis),
    }
  }, [approvedMitigationId, selectedMitigation])

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold">Mitigation Studio</h2>
        <p className="text-sm text-white/70">
          Toggle mitigation levers and recompute KPI outcomes after approval.
        </p>
      </header>
      <div className="grid gap-4 lg:grid-cols-[1fr,1.2fr]">
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
          <h3 className="text-lg font-semibold">Mitigation Library</h3>
          <div className="mt-4 space-y-4">
            {sampleMitigations.map((mitigation) => (
              <button
                key={mitigation.id}
                type="button"
                onClick={() => setSelectedMitigation(mitigation)}
                className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                  selectedMitigation?.id === mitigation.id
                    ? "border-emerald-400 bg-emerald-500/10"
                    : "border-white/10 bg-slate-950/60 hover:border-emerald-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-white">{mitigation.name}</p>
                  <span className="text-xs uppercase tracking-[0.2em] text-white/50">{mitigation.id}</span>
                </div>
                <p className="mt-2 text-sm text-white/70">{mitigation.description}</p>
                <p className="mt-1 text-xs text-white/50">Confidence: {mitigation.confidence}</p>
                <p className="mt-2 text-xs text-white/50">Evidence IDs: {mitigation.evidence_refs.join(", ")}</p>
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
          <h3 className="text-lg font-semibold">Mitigation Impact</h3>
          {selectedMitigation ? (
            <div className="mt-4 space-y-4">
              <div className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
                <p className="text-sm text-white/70">Approval required before applying mitigation.</p>
                <div className="mt-3 flex items-center gap-3">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={approvedMitigationId === selectedMitigation.id}
                    onChange={(event) =>
                      setApprovedMitigationId(event.target.checked ? selectedMitigation.id : null)
                    }
                  />
                  <span className="text-sm text-white/80">Approve {selectedMitigation.name}</span>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/50">Baseline</p>
                  <p className="mt-2 text-sm">Latest net profit: {formatCurrency(sampleKpiSeries.at(-1)?.NET_PROFIT ?? null)}</p>
                  <p className="text-sm">Prime cost % avg: {(sampleDerivedKpis.at(-1)?.prime_cost_pct ?? 0).toFixed(2)}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/50">Mitigation Applied</p>
                  <p className="mt-2 text-sm">Latest net profit: {formatCurrency(mitigationKpis.kpis.at(-1)?.NET_PROFIT ?? null)}</p>
                  <p className="text-sm">Prime cost % avg: {(mitigationKpis.derived.at(-1)?.prime_cost_pct ?? 0).toFixed(2)}</p>
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
                <p className="text-sm text-white/70">Implementation Steps</p>
                <ul className="mt-2 space-y-1 text-sm text-white/70">
                  {selectedMitigation.implementation_steps.map((step) => (
                    <li key={step}>• {step}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-white/60">Select a mitigation to view details.</p>
          )}
        </div>
      </div>
    </div>
  )
}
