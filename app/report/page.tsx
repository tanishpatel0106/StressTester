import { sampleContextPack, sampleScenarios, sampleMitigations } from "@/lib/restaurant/sample-data"

export default function ReportPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold">Report Export</h2>
        <p className="text-sm text-white/70">
          Compile the locked assumptions, approved scenarios, and mitigation playbooks into a shareable report.
        </p>
      </header>
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
        <h3 className="text-lg font-semibold">Report Summary</h3>
        <ul className="mt-4 space-y-2 text-sm text-white/70">
          <li>Restaurant: {sampleContextPack.metadata.restaurant_name}</li>
          <li>Location: {sampleContextPack.metadata.location}</li>
          <li>Reporting period: {sampleContextPack.metadata.period_start} → {sampleContextPack.metadata.period_end}</li>
          <li>Scenario count: {sampleScenarios.length}</li>
          <li>Mitigation count: {sampleMitigations.length}</li>
        </ul>
      </div>
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
        <h3 className="text-lg font-semibold">Export Options</h3>
        <div className="mt-4 flex flex-wrap gap-3">
          <button className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400">
            Export PDF
          </button>
          <button className="rounded-full border border-white/10 px-5 py-2 text-sm font-semibold text-white/80 transition hover:border-emerald-300 hover:text-emerald-200">
            Export JSON
          </button>
        </div>
        <p className="mt-4 text-xs text-white/50">
          Exports are deterministic and include evidence IDs for AI-derived objects.
        </p>
      </div>
    </div>
  )
}
