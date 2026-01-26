import { NextResponse } from "next/server"
import { sampleContextPack, sampleScenarios } from "@/lib/restaurant/sample-data"
import { generateMitigationsFromContext } from "@/lib/restaurant/ai/agents"

export async function POST() {
  const result = generateMitigationsFromContext(sampleContextPack, sampleScenarios)
  return NextResponse.json(result)
}
