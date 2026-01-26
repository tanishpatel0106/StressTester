import Link from "next/link"

const navItems = [
  { href: "/upload", label: "Upload Data" },
  { href: "/dashboard", label: "Baseline P&L" },
  { href: "/assumptions", label: "Assumptions" },
  { href: "/scenarios", label: "Scenarios" },
  { href: "/mitigations", label: "Mitigation Studio" },
  { href: "/report", label: "Report Export" },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-white/10 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">Restaurant Stress-Testing Copilot</p>
            <h1 className="text-2xl font-semibold">Data → Assumptions → Scenarios → Mitigation</h1>
          </div>
          <nav className="flex flex-wrap gap-3 text-sm">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full border border-white/10 px-4 py-2 text-white/80 transition hover:border-emerald-300 hover:text-emerald-200"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
    </div>
  )
}
