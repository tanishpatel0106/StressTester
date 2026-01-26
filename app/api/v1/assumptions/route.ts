import { NextResponse } from "next/server"
import { sampleContextPack } from "@/lib/restaurant/sample-data"
import { generateAssumptionsFromContext } from "@/lib/restaurant/ai/agents"

export async function POST() {
  const result = generateAssumptionsFromContext(sampleContextPack)
  return NextResponse.json(result)
}
