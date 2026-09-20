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
