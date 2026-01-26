"use client"

import { useState } from "react"
import { sampleAssumptions, sampleEvidence } from "@/lib/restaurant/sample-data"
import type { DriverAssumption } from "@/lib/restaurant/types"

export default function AssumptionsPage() {
  const [assumptions, setAssumptions] = useState<DriverAssumption[]>([])
  const [locked, setLocked] = useState(false)

  const handleGenerate = () => {
    setAssumptions(sampleAssumptions)
    setLocked(false)
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold">Assumptions</h2>
        <p className="text-sm text-white/70">
          Generate structured driver assumptions with evidence IDs before locking them for scenarios.
        </p>
      </header>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleGenerate}
          className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400"
        >
          Generate Assumptions
        </button>
        <button
          type="button"
          disabled={assumptions.length === 0}
          onClick={() => setLocked(true)}
          className="rounded-full border border-white/10 px-5 py-2 text-sm font-semibold text-white/80 transition hover:border-emerald-300 hover:text-emerald-200 disabled:opacity-50"
        >
          Lock Assumptions
        </button>
      </div>
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
        <h3 className="text-lg font-semibold">Assumption Register</h3>
        {assumptions.length === 0 ? (
          <p className="mt-4 text-sm text-white/60">No assumptions generated yet.</p>
        ) : (
          <div className="mt-4 space-y-4">
            {assumptions.map((assumption) => (
              <div key={assumption.id} className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">{assumption.driver}</p>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-white/60">
                    {assumption.confidence} confidence
                  </span>
                </div>
                <p className="mt-2 text-sm text-white/70">
                  Baseline {assumption.baseline} {assumption.unit} (range {assumption.range.min}–{assumption.range.max}).
                </p>
                <p className="mt-3 text-xs text-white/60">Evidence IDs: {assumption.evidence_refs.join(", ")}</p>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
        <h3 className="text-lg font-semibold">Evidence Registry</h3>
        <ul className="mt-3 space-y-2 text-sm text-white/70">
          {sampleEvidence.map((item) => (
            <li key={item.id}>
              <span className="font-semibold text-white">{item.id}</span>: {item.description}
            </li>
          ))}
        </ul>
        {locked && <p className="mt-4 text-sm text-emerald-200">Assumptions locked for scenario planning.</p>}
      </div>
    </div>
  )
}
