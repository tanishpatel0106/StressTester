"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Table,
  Download,
} from "lucide-react"
import { parseCSV, buildContextPack, computeBaseline } from "@/lib/restaurant/engine"
import { saveContextPack, saveComputationRun, loadSampleData } from "@/lib/restaurant/storage"
import type { CSVParseResult } from "@/lib/restaurant/types"

type SupplementalEvidenceEntry = {
  source: string
  value: string | number
  type?: "csv_cell" | "computed" | "user_input" | "ai_inferred"
  row?: number
  column?: string
}

type UploadSummary = {
  name: string
  entries: SupplementalEvidenceEntry[]
}

export default function RestaurantUploadPage() {
  const router = useRouter()
  const [restaurantName, setRestaurantName] = useState("")
  const [csvText, setCsvText] = useState("")
  const [contextText, setContextText] = useState("")
  const [contextFileName, setContextFileName] = useState<string | null>(null)
  const [additionalUploads, setAdditionalUploads] = useState<UploadSummary[]>([])
  const [parseResult, setParseResult] = useState<CSVParseResult | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const readFileAsText = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(reader.error)
      reader.readAsText(file)
    })

  const buildTabularEvidence = (fileName: string, rows: Array<Array<string | number>>) => {
    if (rows.length === 0) return []
    const headers = rows[0].map((header, index) =>
      String(header || `Column ${index + 1}`)
    )
    const entries: SupplementalEvidenceEntry[] = []

    rows.slice(1).forEach((row, rowIndex) => {
      row.forEach((value, colIndex) => {
        if (value === "" || value == null) return
        entries.push({
          source: fileName,
          type: "csv_cell",
          row: rowIndex + 1,
          column: headers[colIndex] ?? `Column ${colIndex + 1}`,
          value,
        })
      })
    })

    return entries
  }

  const parseTabularFile = async (file: File) => {
    const extension = file.name.split(".").pop()?.toLowerCase()
    if (extension === "csv") {
      const text = await readFileAsText(file)
      const rows = text
        .split(/\r?\n/)
        .map((line) => line.split(",").map((value) => value.trim()))
        .filter((row) => row.some((value) => value !== ""))
      return buildTabularEvidence(file.name, rows)
    }

    return null
  }

  const handleParse = useCallback(() => {
    if (!csvText.trim()) {
      setError("Please paste CSV data first")
      return
    }
    
    const result = parseCSV(csvText)
    setParseResult(result)
    
    if (!result.success) {
      setError(result.errors.join(", "))
    } else {
      setError(null)
    }
  }, [csvText])

  const handleLoadSample = useCallback(() => {
    const sampleCSV = loadSampleData()
    setCsvText(sampleCSV)
    setRestaurantName("Sample Restaurant")
    setContextText("")
    setContextFileName(null)
    setAdditionalUploads([])
    
    const result = parseCSV(sampleCSV)
    setParseResult(result)
    setError(null)
  }, [])

  const handleSave = useCallback(async () => {
    if (!parseResult?.success || !restaurantName.trim()) {
      setError("Please provide restaurant name and valid CSV data")
      return
    }

    setIsProcessing(true)
    try {
      // Generate dataset ID
      const datasetId = `DS_${Date.now()}`
      
      // Build context pack
      const supplementalEvidence = [
        ...(contextText.trim()
          ? [
              {
                source: contextFileName || "restaurant_context.md",
                value: contextText,
              },
            ]
          : []),
        ...additionalUploads.flatMap((upload) => upload.entries),
      ]

      const contextPack = buildContextPack(
        parseResult.data,
        restaurantName,
        datasetId,
        supplementalEvidence
      )
      
      // Save context pack
      saveContextPack(contextPack)
      
      // Compute and save baseline
      const baselineRun = computeBaseline(contextPack)
      saveComputationRun(baselineRun)
      
      // Navigate to baseline view
      router.push(`/restaurant/baseline?id=${contextPack.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to process data")
    } finally {
      setIsProcessing(false)
    }
  }, [parseResult, restaurantName, contextText, contextFileName, additionalUploads, router])

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Upload Financial Data</h2>
        <p className="text-muted-foreground mt-1">
          Import your restaurant's financial data to begin stress testing
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* CSV Input */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-amber-600" />
              CSV Data
            </CardTitle>
            <CardDescription>
              Paste your CSV data with the required columns
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="restaurant-name">Restaurant Name</Label>
              <Input
                id="restaurant-name"
                placeholder="e.g., Downtown Bistro"
                value={restaurantName}
                onChange={(e) => setRestaurantName(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="csv-data">CSV Data</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLoadSample}
                  className="text-xs"
                >
                  <Download className="h-3 w-3 mr-1" />
                  Load Sample
                </Button>
              </div>
              <Textarea
                id="csv-data"
                placeholder="date,total_revenue,cost_of_goods_sold,wage_costs,operating_expenses,non_operating_expenses"
                className="font-mono text-xs h-64"
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="restaurant-context">Restaurant Context (Markdown)</Label>
              <Textarea
                id="restaurant-context"
                placeholder="Paste restaurant context here (menu, pricing approach, location, staffing notes, etc.)"
                className="text-xs"
                value={contextText}
                onChange={(e) => {
                  setContextText(e.target.value)
                  setContextFileName(null)
                }}
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Optional, but improves assumption quality and evidence references.</span>
                <Input
                  type="file"
                  accept=".md,.txt"
                  className="max-w-[220px]"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    try {
                      const content = await readFileAsText(file)
                      setContextText(content)
                      setContextFileName(file.name)
                    } catch (fileError) {
                      setError(fileError instanceof Error ? fileError.message : "Failed to read context file")
                    }
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="additional-uploads">Additional Supporting Documents</Label>
              <Input
                id="additional-uploads"
                type="file"
                accept=".md,.txt,.csv"
                multiple
                onChange={async (e) => {
                  const files = Array.from(e.target.files || [])
                  if (files.length === 0) return
                  try {
                    const uploads = await Promise.all(
                      files.map(async (file) => {
                        const tabularEntries = await parseTabularFile(file)
                        if (tabularEntries) {
                          return {
                            name: file.name,
                            entries: tabularEntries,
                          }
                        }

                        const content = await readFileAsText(file)
                        return {
                          name: file.name,
                          entries: [
                            {
                              source: file.name,
                              type: "user_input",
                              value: content,
                            },
                          ],
                        }
                      })
                    )
                    setAdditionalUploads(uploads)
                  } catch (fileError) {
                    setError(fileError instanceof Error ? fileError.message : "Failed to read additional files")
                  }
                }}
              />
              {additionalUploads.length > 0 && (
                <div className="rounded-md border border-border bg-muted/40 p-2 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground">Files queued for evidence:</p>
                  <ul className="mt-1 space-y-1">
                    {additionalUploads.map((file) => (
                      <li key={file.name} className="font-mono">
                        {file.name} ({file.entries.length} evidence rows)
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button onClick={handleParse} variant="outline" className="flex-1 bg-transparent">
                <Table className="h-4 w-4 mr-2" />
                Parse & Preview
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={!parseResult?.success || isProcessing}
                className="flex-1"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Save & Continue
                  </>
                )}
              </Button>
            </div>
            
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Instructions & Preview */}
        <div className="space-y-6">
          {/* Required Columns */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Required CSV Columns</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[
                  { name: 'date', desc: 'Date (YYYY-MM-DD)' },
                  { name: 'total_revenue', desc: 'Total revenue' },
                  { name: 'cost_of_goods_sold', desc: 'Food & beverage costs' },
                  { name: 'wage_costs', desc: 'Labor costs' },
                  { name: 'operating_expenses', desc: 'Rent, utilities, etc.' },
                  { name: 'non_operating_expenses', desc: 'Interest, depreciation' },
                ].map((col) => (
                  <div key={col.name} className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-xs">
                      {col.name}
                    </Badge>
                    <span className="text-sm text-muted-foreground">{col.desc}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                Computed: GROSS_PROFIT = Revenue - COGS, NET_PROFIT = Gross Profit - Wages - OpEx - NonOpEx
              </p>
            </CardContent>
          </Card>

          {/* Parse Result Preview */}
          {parseResult && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  {parseResult.success ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-destructive" />
                  )}
                  Parse Result
                </CardTitle>
              </CardHeader>
              <CardContent>
                {parseResult.success ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-4">
                      <Badge variant="secondary">{parseResult.data.length} rows</Badge>
                      <span className="text-sm text-muted-foreground">
                        {parseResult.data[0]?.date} to {parseResult.data[parseResult.data.length - 1]?.date}
                      </span>
                    </div>
                    
                    {/* Preview Table */}
                    <div className="rounded border border-border overflow-auto max-h-48">
                      <table className="w-full text-xs">
                        <thead className="bg-muted">
                          <tr>
                            <th className="px-2 py-1 text-left">Date</th>
                            <th className="px-2 py-1 text-right">Revenue</th>
                            <th className="px-2 py-1 text-right">COGS</th>
                            <th className="px-2 py-1 text-right">Wages</th>
                            <th className="px-2 py-1 text-right">OpEx</th>
                          </tr>
                        </thead>
                        <tbody>
                          {parseResult.data.slice(0, 5).map((row, i) => (
                            <tr key={i} className="border-t border-border">
                              <td className="px-2 py-1">{row.date}</td>
                              <td className="px-2 py-1 text-right">${row.total_revenue.toLocaleString()}</td>
                              <td className="px-2 py-1 text-right">${row.cost_of_goods_sold.toLocaleString()}</td>
                              <td className="px-2 py-1 text-right">${row.wage_costs.toLocaleString()}</td>
                              <td className="px-2 py-1 text-right">${row.operating_expenses.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    {parseResult.warnings.length > 0 && (
                      <div className="text-xs text-amber-600">
                        {parseResult.warnings.join(", ")}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-destructive">
                    {parseResult.errors.join(", ")}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
