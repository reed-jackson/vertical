import { createClient } from "@supabase/supabase-js"

export type EventRow = {
  id: string
  event_date: string
  title: string
  event_time: string | null
  color: string
  end_date: string | null
  repeat_rule: "none" | "daily" | "weekly" | "monthly" | "yearly"
  repeat_interval: number
  repeat_until: string | null
  repeat_weekdays: number[]
  created_at?: string
}

export function getSupabase() {
  const url = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return null
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
}

export type EventsLoadResult =
  | { status: "synced"; events: EventRow[] }
  | { status: "preview"; reason: "not-configured" | "load-failed" }

export async function loadEventRows(): Promise<EventsLoadResult> {
  const supabase = getSupabase()
  if (!supabase) return { status: "preview", reason: "not-configured" }

  const columns = "id,event_date,title,event_time,color,end_date,repeat_rule,repeat_interval,repeat_until,repeat_weekdays,created_at"
  const fallback = "id,event_date,title,event_time,color,repeat_rule,repeat_interval,repeat_until,repeat_weekdays,created_at"

  try {
    const first = await supabase.from("events").select(columns).order("event_date").order("event_time")
    const result = first.error
      ? await supabase.from("events").select(fallback).order("event_date").order("event_time")
      : first
    if (result.error) return { status: "preview", reason: "load-failed" }
    return { status: "synced", events: result.data as EventRow[] }
  } catch {
    return { status: "preview", reason: "load-failed" }
  }
}
