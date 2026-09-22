import { NextResponse } from "next/server"
import { agentInstructions } from "@/lib/agent/instructions"
import { AGENT_TOOLS } from "@/lib/agent/tools"
import { localTodayKey } from "@/lib/calendar/dates"
import { getAuthorizedUser } from "@/app/chatgpt-auth"

export const dynamic = "force-dynamic"

const MODEL = process.env.OPENAI_REALTIME_MODEL || "gpt-realtime-2.1"

export async function POST(request: Request) {
  if (!(await getAuthorizedUser())) return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "Set OPENAI_API_KEY to connect the calendar agent." }, { status: 503 })
  }

  const body = await request.json().catch(() => ({})) as { timeZone?: string }
  const timeZone = typeof body.timeZone === "string" && body.timeZone ? body.timeZone : undefined
  let today: string
  try {
    today = localTodayKey(timeZone)
  } catch {
    today = localTodayKey()
  }
  const session = {
    type: "realtime",
    model: MODEL,
    instructions: agentInstructions(today, timeZone),
    output_modalities: ["audio"],
    audio: {
      input: { transcription: { model: "gpt-4o-mini-transcribe" } },
      output: { voice: "marin" },
    },
    tools: AGENT_TOOLS,
    tool_choice: "auto",
  }

  try {
    const secret = await mintClientSecret(apiKey, session)
    return NextResponse.json({ clientSecret: secret, model: MODEL })
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Unable to start an OpenAI Realtime session."
    return NextResponse.json({ error: message }, { status: 502 })
  }
}

async function mintClientSecret(apiKey: string, session: Record<string, unknown>) {
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "OpenAI-Safety-Identifier": "vertical-personal-calendar",
  }

  const clientSecrets = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
    method: "POST",
    headers,
    body: JSON.stringify({ session }),
  })
  const payload = (await clientSecrets.json()) as {
    value?: string
    error?: { message?: string }
  }
  if (!clientSecrets.ok) {
    throw new Error(payload.error?.message || "Unable to start an OpenAI Realtime session.")
  }
  if (!payload.value) throw new Error("OpenAI did not return a Realtime client secret.")
  return payload.value
}
