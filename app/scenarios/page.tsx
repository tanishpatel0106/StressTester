"use client"

import { useMemo, useState } from "react"
import {
  sampleDriverSeries,
  sampleKpiSeries,
  sampleScenarios,
  sampleDerivedKpis,
} from "@/lib/restaurant/sample-data"
import { applyScenarioToDrivers } from "@/lib/restaurant/scenario"
import { computeKpiSpineFromDrivers } from "@/lib/restaurant/engine"
import { computeDerivedKpis } from "@/lib/restaurant/derived"
import type { Scenario } from "@/lib/restaurant/types"

const formatCurrency = (value: number | null) =>
  value === null ? "n/a" : `$${value.toLocaleString()}`

export default function ScenariosPage() {
  const [approvedScenarioId, setApprovedScenarioId] = useState<string | null>(null)
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null)

  const scenarioKpis = useMemo(() => {
    if (!selectedScenario || approvedScenarioId !== selectedScenario.id) {
      return {
        kpis: sampleKpiSeries,
        derived: sampleDerivedKpis,
      }
    }
    const stressedDrivers = applyScenarioToDrivers(sampleDriverSeries, selectedScenario)
    const stressedKpis = computeKpiSpineFromDrivers(stressedDrivers)
    return {
      kpis: stressedKpis,
      derived: computeDerivedKpis(stressedKpis),
    }
  }, [approvedScenarioId, selectedScenario])

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold">Scenarios</h2>
        <p className="text-sm text-white/70">
          Scenarios shock drivers, then the deterministic engine recomputes KPI outcomes.
        </p>
      </header>
      <div className="grid gap-4 lg:grid-cols-[1fr,1.2fr]">
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
          <h3 className="text-lg font-semibold">Scenario Library</h3>
          <div className="mt-4 space-y-4">
            {sampleScenarios.map((scenario) => (
              <button
                key={scenario.id}
                type="button"
                onClick={() => setSelectedScenario(scenario)}
                className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                  selectedScenario?.id === scenario.id
                    ? "border-emerald-400 bg-emerald-500/10"
                    : "border-white/10 bg-slate-950/60 hover:border-emerald-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-white">{scenario.name}</p>
                  <span className="text-xs uppercase tracking-[0.2em] text-white/50">
                    {scenario.probability.replace("_", " ")}
                  </span>
                </div>
                <p className="mt-2 text-sm text-white/70">{scenario.description}</p>
                <p className="mt-1 text-xs text-white/50">Confidence: {scenario.confidence}</p>
                <p className="mt-2 text-xs text-white/50">Evidence IDs: {scenario.evidence_refs.join(", ")}</p>
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
          <h3 className="text-lg font-semibold">Scenario Comparison</h3>
          {selectedScenario ? (
            <div className="mt-4 space-y-4">
              <div className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
                <p className="text-sm text-white/70">Approval required before applying scenario.</p>
                <div className="mt-3 flex items-center gap-3">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={approvedScenarioId === selectedScenario.id}
                    onChange={(event) =>
                      setApprovedScenarioId(event.target.checked ? selectedScenario.id : null)
                    }
                  />
                  <span className="text-sm text-white/80">Approve {selectedScenario.name}</span>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/50">Baseline</p>
                  <p className="mt-2 text-sm">Latest net profit: {formatCurrency(sampleKpiSeries.at(-1)?.NET_PROFIT ?? null)}</p>
                  <p className="text-sm">Prime cost % avg: {(sampleDerivedKpis.at(-1)?.prime_cost_pct ?? 0).toFixed(2)}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/50">Scenario Applied</p>
                  <p className="mt-2 text-sm">
                    Latest net profit: {formatCurrency(scenarioKpis.kpis.at(-1)?.NET_PROFIT ?? null)}
                  </p>
                  <p className="text-sm">
                    Prime cost % avg: {(scenarioKpis.derived.at(-1)?.prime_cost_pct ?? 0).toFixed(2)}
                  </p>
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
                <p className="text-sm text-white/70">Shocks</p>
                <ul className="mt-2 space-y-1 text-sm text-white/70">
                  {selectedScenario.shocks.map((shock, index) => (
                    <li key={`${shock.driver}-${index}`}>
                      {shock.driver}: {shock.mode} {shock.value} for {shock.duration_months} months
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-white/60">Select a scenario to compare.</p>
          )}
        </div>
      </div>
    </div>
  )
}
