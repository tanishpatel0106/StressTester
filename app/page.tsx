import Link from "next/link"

export default function HomePage() {
  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-white/10 bg-slate-900/60 p-8">
        <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">Restaurant Stress-Testing Copilot</p>
        <h2 className="mt-4 text-3xl font-semibold text-white">
          Deterministic stress testing built for restaurant operators.
        </h2>
        <p className="mt-4 max-w-2xl text-white/70">
          This application turns restaurant data into structured assumptions, applies scenario shocks to
          operational drivers, and recomputes KPI spine metrics through a deterministic engine. AI is used
          only to generate structured reasoning objects with evidence IDs.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/upload"
            className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400"
          >
            Upload Data
          </Link>
          <Link
            href="/dashboard"
            className="rounded-full border border-white/20 px-5 py-2 text-sm font-semibold text-white/80 transition hover:border-emerald-300 hover:text-emerald-200"
          >
            View Baseline P&amp;L
          </Link>
        </div>
      </section>
      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
          <h3 className="text-lg font-semibold">Core workflow</h3>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-white/70">
            <li>Normalize KPI spine from driver inputs and upload data.</li>
            <li>Generate assumptions with evidence requirements.</li>
            <li>Apply scenario shocks and compare KPI outcomes.</li>
            <li>Toggle mitigations with approval before recompute.</li>
          </ol>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
          <h3 className="text-lg font-semibold">Non-negotiables</h3>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-white/70">
            <li>KPI spine is fixed and only computed deterministically.</li>
            <li>AI never performs math or invents KPIs.</li>
            <li>Every AI output cites evidence or is marked low confidence.</li>
          </ul>
        </div>
      </section>
    </div>
  )
}
