import { NextResponse } from "next/server"
import { listVersions, saveVersionedPayload } from "@/lib/restaurant/storage"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const prefix = searchParams.get("prefix") ?? undefined
  const versions = await listVersions(prefix)
  return NextResponse.json({ versions })
}

export async function POST(request: Request) {
  const body = await request.json()
  const name = typeof body.name === "string" ? body.name : "snapshot"
  const payload = body.payload ?? body
  const stored = await saveVersionedPayload(name, payload)
  return NextResponse.json({ stored })
}
