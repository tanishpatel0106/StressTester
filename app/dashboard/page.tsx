import { sampleKpiSeries, sampleDerivedKpis } from "@/lib/restaurant/sample-data"

const formatCurrency = (value: number | null) =>
  value === null ? "n/a" : `$${value.toLocaleString()}`

const formatPercent = (value: number | null) =>
  value === null ? "n/a" : `${(value * 100).toFixed(1)}%`

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold">Baseline P&amp;L Dashboard</h2>
        <p className="text-sm text-white/70">
          KPI spine metrics are computed deterministically from driver inputs.
        </p>
      </header>
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
        <h3 className="text-lg font-semibold">KPI Spine</h3>
        <div className="mt-4 overflow-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="text-left text-white/70">
              <tr>
                <th className="pb-2 pr-4">Period</th>
                <th className="pb-2 pr-4">Total Revenue</th>
                <th className="pb-2 pr-4">COGS</th>
                <th className="pb-2 pr-4">Gross Profit</th>
                <th className="pb-2 pr-4">Wage Costs</th>
                <th className="pb-2 pr-4">Operating Exp.</th>
                <th className="pb-2 pr-4">Non-Op Exp.</th>
                <th className="pb-2 pr-4">Net Profit</th>
              </tr>
            </thead>
            <tbody>
              {sampleKpiSeries.map((row) => (
                <tr key={row.period} className="border-t border-white/10">
                  <td className="py-2 pr-4 text-white/80">{row.period}</td>
                  <td className="py-2 pr-4">{formatCurrency(row.TOTAL_REVENUE)}</td>
                  <td className="py-2 pr-4">{formatCurrency(row.COST_OF_GOODS_SOLD)}</td>
                  <td className="py-2 pr-4">{formatCurrency(row.GROSS_PROFIT)}</td>
                  <td className="py-2 pr-4">{formatCurrency(row.WAGE_COSTS)}</td>
                  <td className="py-2 pr-4">{formatCurrency(row.OPERATING_EXPENSES)}</td>
                  <td className="py-2 pr-4">{formatCurrency(row.NON_OPERATING_EXPENSES)}</td>
                  <td className="py-2 pr-4">{formatCurrency(row.NET_PROFIT)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
        <h3 className="text-lg font-semibold">Derived KPI Highlights</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {sampleDerivedKpis.map((row) => (
            <div key={row.period} className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/50">{row.period}</p>
              <p className="mt-2 text-sm">Gross margin: {formatPercent(row.gross_margin_pct)}</p>
              <p className="text-sm">Prime cost: {formatCurrency(row.prime_cost)}</p>
              <p className="text-sm">Net margin: {formatPercent(row.net_margin)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
