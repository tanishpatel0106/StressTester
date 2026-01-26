"use client"

import { useState } from "react"
import { sampleContextPack } from "@/lib/restaurant/sample-data"

export default function UploadPage() {
  const [status, setStatus] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold">Upload Data</h2>
        <p className="text-sm text-white/70">
          Upload KPI spine CSVs, driver assumptions, or evidence logs to build a ContextPack for AI agents.
        </p>
      </header>
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm text-white/80">
            KPI spine CSV
            <input type="file" className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2" />
          </label>
          <label className="flex flex-col gap-2 text-sm text-white/80">
            Evidence registry JSON
            <input type="file" className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2" />
          </label>
        </div>
        <button
          type="button"
          onClick={() => setStatus("Sample ContextPack ready. Use API to persist versioned storage.")}
          className="mt-6 rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400"
        >
          Build ContextPack
        </button>
        {status ? <p className="mt-4 text-sm text-emerald-200">{status}</p> : null}
      </div>
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
        <h3 className="text-lg font-semibold">ContextPack Preview</h3>
        <p className="mt-2 text-sm text-white/70">
          Current sample pack: {sampleContextPack.metadata.restaurant_name} ({sampleContextPack.metadata.period_start} → {sampleContextPack.metadata.period_end})
        </p>
        <div className="mt-4 grid gap-3 text-xs text-white/70 md:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-slate-950/50 p-4">
            <p className="font-semibold text-white">Evidence IDs</p>
            <ul className="mt-2 space-y-1">
              {sampleContextPack.evidence_registry.map((item) => (
                <li key={item.id}>{item.id}: {item.description}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-950/50 p-4">
            <p className="font-semibold text-white">KPI Spine Snapshot</p>
            <ul className="mt-2 space-y-1">
              <li>Total revenue (latest): {sampleContextPack.kpi_series.at(-1)?.TOTAL_REVENUE?.toFixed(0) ?? "n/a"}</li>
              <li>Net profit (latest): {sampleContextPack.kpi_series.at(-1)?.NET_PROFIT?.toFixed(0) ?? "n/a"}</li>
              <li>Prime cost % (avg): {(sampleContextPack.summary.prime_cost_pct?.average ?? 0).toFixed(2)}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
