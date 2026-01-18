"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { PnLRow, CashFlowRow, BalanceSheetRow, KPIRow } from "@/lib/types"
import { formatCurrency, formatPercent } from "@/lib/stress-engine"

interface DataTablesProps {
  pnl: PnLRow[]
  cashFlow: CashFlowRow[]
  balanceSheet: BalanceSheetRow[]
  kpis: KPIRow[]
}

type TableView = "pnl" | "cashflow" | "balance" | "kpis"

export function DataTables({
  pnl,
  cashFlow,
  balanceSheet,
  kpis,
}: DataTablesProps) {
  const [activeView, setActiveView] = useState<TableView>("pnl")

  const formatMonth = (month: string) => {
    const date = new Date(month + "-01")
    return date.toLocaleDateString("en-US", { month: "short" })
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Financial Data</CardTitle>
        <div className="flex gap-2">
          <Button
            variant={activeView === "pnl" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveView("pnl")}
          >
            P&L
          </Button>
          <Button
            variant={activeView === "cashflow" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveView("cashflow")}
          >
            Cash Flow
          </Button>
          <Button
            variant={activeView === "balance" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveView("balance")}
          >
            Balance Sheet
          </Button>
          <Button
            variant={activeView === "kpis" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveView("kpis")}
          >
            KPIs
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          {activeView === "pnl" && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-card">Month</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">COGS</TableHead>
                  <TableHead className="text-right">Gross Profit</TableHead>
                  <TableHead className="text-right">Margin</TableHead>
                  <TableHead className="text-right">Opex</TableHead>
                  <TableHead className="text-right">EBITDA</TableHead>
                  <TableHead className="text-right">Net Income</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pnl.map((row) => (
                  <TableRow key={row.month}>
                    <TableCell className="sticky left-0 bg-card font-medium">
                      {formatMonth(row.month)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatCurrency(row.revenueTotal)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatCurrency(row.cogsTotal)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatCurrency(row.grossProfit)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatPercent(row.grossMargin)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatCurrency(row.opexTotal)}
                    </TableCell>
                    <TableCell
                      className={`text-right font-mono text-sm ${
                        row.ebitda >= 0 ? "text-emerald-500" : "text-rose-500"
                      }`}
                    >
                      {formatCurrency(row.ebitda)}
                    </TableCell>
                    <TableCell
                      className={`text-right font-mono text-sm ${
                        row.netIncome >= 0 ? "text-emerald-500" : "text-rose-500"
                      }`}
                    >
                      {formatCurrency(row.netIncome)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {activeView === "cashflow" && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-card">Month</TableHead>
                  <TableHead className="text-right">Opening Cash</TableHead>
                  <TableHead className="text-right">Operating CF</TableHead>
                  <TableHead className="text-right">Investing CF</TableHead>
                  <TableHead className="text-right">Financing CF</TableHead>
                  <TableHead className="text-right">Net Change</TableHead>
                  <TableHead className="text-right">Ending Cash</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cashFlow.map((row) => (
                  <TableRow key={row.month}>
                    <TableCell className="sticky left-0 bg-card font-medium">
                      {formatMonth(row.month)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatCurrency(row.cashBegin)}
                    </TableCell>
                    <TableCell
                      className={`text-right font-mono text-sm ${
                        row.cashFlowOperating >= 0
                          ? "text-emerald-500"
                          : "text-rose-500"
                      }`}
                    >
                      {formatCurrency(row.cashFlowOperating)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm text-rose-500">
                      {formatCurrency(row.cashFlowInvesting)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatCurrency(row.cashFlowFinancing)}
                    </TableCell>
                    <TableCell
                      className={`text-right font-mono text-sm ${
                        row.netChangeCash >= 0
                          ? "text-emerald-500"
                          : "text-rose-500"
                      }`}
                    >
                      {formatCurrency(row.netChangeCash)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm font-semibold">
                      {formatCurrency(row.cashEnd)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {activeView === "balance" && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-card">Month</TableHead>
                  <TableHead className="text-right">Cash</TableHead>
                  <TableHead className="text-right">AR</TableHead>
                  <TableHead className="text-right">Total Assets</TableHead>
                  <TableHead className="text-right">AP</TableHead>
                  <TableHead className="text-right">Total Liab.</TableHead>
                  <TableHead className="text-right">Equity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {balanceSheet.map((row) => (
                  <TableRow key={row.month}>
                    <TableCell className="sticky left-0 bg-card font-medium">
                      {formatMonth(row.month)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatCurrency(row.cash)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatCurrency(row.accountsReceivable)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatCurrency(row.totalAssets)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatCurrency(row.accountsPayable)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatCurrency(row.totalLiabilities)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm font-semibold">
                      {formatCurrency(row.equity)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {activeView === "kpis" && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-card">Month</TableHead>
                  <TableHead className="text-right">Customers</TableHead>
                  <TableHead className="text-right">New</TableHead>
                  <TableHead className="text-right">Churned</TableHead>
                  <TableHead className="text-right">Churn %</TableHead>
                  <TableHead className="text-right">ARPU</TableHead>
                  <TableHead className="text-right">CAC</TableHead>
                  <TableHead className="text-right">LTV</TableHead>
                  <TableHead className="text-right">Payback</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kpis.map((row) => (
                  <TableRow key={row.month}>
                    <TableCell className="sticky left-0 bg-card font-medium">
                      {formatMonth(row.month)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {row.customersEnd.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm text-emerald-500">
                      +{row.newCustomers.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm text-rose-500">
                      -{row.churnedCustomers.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatPercent(row.churnRate)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatCurrency(row.arpu)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatCurrency(row.cac)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatCurrency(row.ltv)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {row.paybackMonths.toFixed(1)} mo
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
