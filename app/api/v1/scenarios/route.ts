import { NextResponse } from "next/server"
import { sampleContextPack, sampleAssumptions } from "@/lib/restaurant/sample-data"
import { generateScenariosFromContext } from "@/lib/restaurant/ai/agents"

export async function POST() {
  const result = generateScenariosFromContext(sampleContextPack, sampleAssumptions)
  return NextResponse.json(result)
}
