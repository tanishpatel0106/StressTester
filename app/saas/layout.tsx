import React from "react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "SaaS Stress Tester | Stress-Testing Copilot",
  description: "AI-powered stress testing for SaaS and subscription businesses. Analyze MRR, churn, CAC, and runway projections.",
}

export default function SaaSLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
