import type { ReactNode } from "react"
import Link from "next/link"
import { UtensilsCrossed, ChevronRight } from "lucide-react"

export default function RestaurantLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/restaurant" className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10">
                  <UtensilsCrossed className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-foreground">
                    Restaurant Stress Copilot
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    Financial Planning & Analysis
                  </p>
                </div>
              </Link>
            </div>
            
            <nav className="flex items-center gap-1 text-sm">
              <Link
                href="/restaurant"
                className="rounded-md px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                Upload
              </Link>
              <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
              <Link
                href="/restaurant/baseline"
                className="rounded-md px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                Baseline
              </Link>
              <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
              <Link
                href="/restaurant/assumptions"
                className="rounded-md px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                Assumptions
              </Link>
              <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
              <Link
                href="/restaurant/scenarios"
                className="rounded-md px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                Scenarios
              </Link>
              <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
              <Link
                href="/restaurant/mitigations"
                className="rounded-md px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                Mitigations
              </Link>
              <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
              <Link
                href="/restaurant/export"
                className="rounded-md px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                Export
              </Link>
            </nav>
            
            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                Back to SaaS Tester
              </Link>
            </div>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
      
      {/* Footer */}
      <footer className="border-t border-border bg-card mt-auto">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Restaurant Stress-Testing Copilot v1.0</span>
            <span>KPI Spine: Revenue - COGS - Gross Profit - Wages - OpEx - Non-OpEx - Net Profit</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
