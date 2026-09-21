import { NextResponse } from "next/server"
import { getSupabase, loadEventRows, type EventRow } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function GET() {
  const result = await loadEventRows()
  if (result.status === "preview") {
    const status = result.reason === "not-configured" ? 503 : 500
    return NextResponse.json({ configured: result.reason !== "not-configured", events: [] }, { status })
  }
  return NextResponse.json({ configured: true, events: result.events })
}

export async function POST(request: Request) {
  const supabase = getSupabase()
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 })
  const body = (await request.json()) as Partial<EventRow>
  const repeatRule = body.repeat_rule || "none"
  const repeatInterval = Math.max(1, Math.min(99, Number(body.repeat_interval) || 1))
  const endDate = body.end_date && body.end_date > body.event_date ? body.end_date : null
  if (!body.event_date || !body.title?.trim() || !body.color || !["none", "daily", "weekly", "monthly", "yearly"].includes(repeatRule) || (body.repeat_until && body.repeat_until < body.event_date) || (body.end_date && body.end_date < body.event_date)) return NextResponse.json({ error: "Please provide a valid event schedule." }, { status: 400 })
  const { data, error } = await supabase.from("events").insert({
    event_date: body.event_date,
    title: body.title.trim().slice(0, 160),
    event_time: body.event_time || null,
    color: body.color,
    end_date: endDate,
    repeat_rule: repeatRule,
    repeat_interval: repeatInterval,
    repeat_until: body.repeat_until || null,
    repeat_weekdays: repeatRule === "weekly" ? body.repeat_weekdays || [] : [],
  }).select("id,event_date,title,event_time,color,end_date,repeat_rule,repeat_interval,repeat_until,repeat_weekdays,created_at").single()
  if (error) return NextResponse.json({ error: "Unable to save this event." }, { status: 500 })
  return NextResponse.json({ event: data }, { status: 201 })
}

export async function PUT(request: Request) {
  const supabase = getSupabase()
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 })
  const body = (await request.json()) as Partial<EventRow>
  const repeatRule = body.repeat_rule || "none"
  const repeatInterval = Math.max(1, Math.min(99, Number(body.repeat_interval) || 1))
  const endDate = body.end_date && body.end_date > body.event_date ? body.end_date : null
  if (!body.id || !body.event_date || !body.title?.trim() || !body.color || !["none", "daily", "weekly", "monthly", "yearly"].includes(repeatRule) || (body.repeat_until && body.repeat_until < body.event_date) || (body.end_date && body.end_date < body.event_date)) return NextResponse.json({ error: "Please provide a valid event schedule." }, { status: 400 })
  const { data, error } = await supabase.from("events").update({
    event_date: body.event_date,
    title: body.title.trim().slice(0, 160),
    event_time: body.event_time || null,
    color: body.color,
    end_date: endDate,
    repeat_rule: repeatRule,
    repeat_interval: repeatInterval,
    repeat_until: body.repeat_until || null,
    repeat_weekdays: repeatRule === "weekly" ? body.repeat_weekdays || [] : [],
  }).eq("id", body.id).select("id,event_date,title,event_time,color,end_date,repeat_rule,repeat_interval,repeat_until,repeat_weekdays,created_at").single()
  if (error) return NextResponse.json({ error: "Unable to update this event." }, { status: 500 })
  return NextResponse.json({ event: data })
}

export async function DELETE(request: Request) {
  const supabase = getSupabase()
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 })
  const body = (await request.json()) as { id?: string }
  if (!body.id) return NextResponse.json({ error: "Please provide an event id." }, { status: 400 })
  const { error } = await supabase.from("events").delete().eq("id", body.id)
  if (error) return NextResponse.json({ error: "Unable to remove this event." }, { status: 500 })
  return NextResponse.json({ ok: true })
}
