import { NextResponse } from "next/server"
import { sampleContextPack } from "@/lib/restaurant/sample-data"
import { validators, assertValid } from "@/lib/restaurant/ai/validator"

export async function GET() {
  const payload = assertValid(validators.contextPack, sampleContextPack, "context_pack")
  return NextResponse.json(payload)
}
