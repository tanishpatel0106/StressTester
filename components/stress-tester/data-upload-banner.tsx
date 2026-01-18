"use client"

import React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

interface DataUploadBannerProps {
  isUsingSampleData: boolean
  onDataUpload: (data: {
    pnlCsv?: string
    cashflowCsv?: string
    balanceSheetCsv?: string
    kpisCsv?: string
    planText?: string
    assumptionsJson?: string
    scenariosJson?: string
  }) => void
}

export function DataUploadBanner({
  isUsingSampleData,
  onDataUpload,
}: DataUploadBannerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [uploadData, setUploadData] = useState({
    pnlCsv: "",
    cashflowCsv: "",
    balanceSheetCsv: "",
    kpisCsv: "",
    planText: "",
    assumptionsJson: "",
    scenariosJson: "",
  })

  const handleFileUpload = (
    field: keyof typeof uploadData,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        setUploadData((prev) => ({ ...prev, [field]: content }))
      }
      reader.readAsText(file)
    }
  }

  const handleSubmit = () => {
    onDataUpload(uploadData)
    setIsOpen(false)
  }

  if (!isUsingSampleData) {
    return null
  }

  return (
    <Card className="mb-6 border-amber-500/30 bg-amber-500/5">
      <CardContent className="flex items-center justify-between py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10">
            <svg
              className="h-5 w-5 text-amber-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <p className="font-medium text-foreground">
              Using Sample Data
            </p>
            <p className="text-sm text-muted-foreground">
              This analysis is based on a sample SaaS company dataset. Upload your own data for real insights.
            </p>
          </div>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="border-amber-500/30 hover:bg-amber-500/10 bg-transparent">
              <svg
                className="mr-2 h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                />
              </svg>
              Upload Your Data
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Upload Your Financial Data</DialogTitle>
              <DialogDescription>
                Upload your financial statements, KPIs, and business plan to run a customized stress analysis.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-6 py-4">
              {/* Financial Statements */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-foreground">Financial Statements (CSV)</h4>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="pnl">P&L Statement</Label>
                    <Input
                      id="pnl"
                      type="file"
                      accept=".csv"
                      onChange={(e) => handleFileUpload("pnlCsv", e)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cashflow">Cash Flow Statement</Label>
                    <Input
                      id="cashflow"
                      type="file"
                      accept=".csv"
                      onChange={(e) => handleFileUpload("cashflowCsv", e)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="balancesheet">Balance Sheet</Label>
                    <Input
                      id="balancesheet"
                      type="file"
                      accept=".csv"
                      onChange={(e) => handleFileUpload("balanceSheetCsv", e)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="kpis">KPIs</Label>
                    <Input
                      id="kpis"
                      type="file"
                      accept=".csv"
                      onChange={(e) => handleFileUpload("kpisCsv", e)}
                    />
                  </div>
                </div>
              </div>

              {/* Business Plan */}
              <div className="space-y-2">
                <Label htmlFor="plan">Business Plan / Growth Strategy (Optional)</Label>
                <Textarea
                  id="plan"
                  placeholder="Paste your business plan text here, or upload a file..."
                  className="min-h-[120px]"
                  value={uploadData.planText}
                  onChange={(e) =>
                    setUploadData((prev) => ({ ...prev, planText: e.target.value }))
                  }
                />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Or upload:</span>
                  <Input
                    type="file"
                    accept=".txt,.md"
                    className="max-w-[200px]"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        const reader = new FileReader()
                        reader.onload = (ev) => {
                          setUploadData((prev) => ({
                            ...prev,
                            planText: ev.target?.result as string,
                          }))
                        }
                        reader.readAsText(file)
                      }
                    }}
                  />
                </div>
              </div>

              {/* Pre-defined Assumptions & Scenarios */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-foreground">
                  Pre-defined Assumptions & Scenarios (JSON, Optional)
                </h4>
                <p className="text-xs text-muted-foreground">
                  If you have pre-defined assumptions or scenarios, upload them here. Otherwise, the AI will extract them from your data.
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="assumptions">Assumptions JSON</Label>
                    <Input
                      id="assumptions"
                      type="file"
                      accept=".json"
                      onChange={(e) => handleFileUpload("assumptionsJson", e)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="scenarios">Scenarios JSON</Label>
                    <Input
                      id="scenarios"
                      type="file"
                      accept=".json"
                      onChange={(e) => handleFileUpload("scenariosJson", e)}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit}>
                <svg
                  className="mr-2 h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Run Analysis
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
