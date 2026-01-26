"use server"

import { NextResponse } from "next/server"
import {
  createSession,
  getSession,
  updateSession,
  listSessions,
} from "@/lib/restaurant/storage"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get("id")

  if (sessionId) {
    const session = getSession(sessionId)
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }
    return NextResponse.json(session)
  }

  // List all sessions
  const sessions = listSessions()
  return NextResponse.json(sessions)
}

export async function POST(request: Request) {
  const data = await request.json()
  const session = createSession(data.name || "New Analysis")
  return NextResponse.json(session)
}

export async function PUT(request: Request) {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get("id")

  if (!sessionId) {
    return NextResponse.json({ error: "Session ID required" }, { status: 400 })
  }

  const updates = await request.json()
  const session = updateSession(sessionId, updates)

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 })
  }

  return NextResponse.json(session)
}
