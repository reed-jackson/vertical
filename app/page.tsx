import { VerticalCalendar } from "@/components/vertical-calendar"
import { PREVIEW_EVENTS } from "@/lib/calendar/preview-events"
import { rowToEvent } from "@/lib/calendar/events"
import { loadEventRows } from "@/lib/supabase/server"
import { getSupabaseUser, ALLOWED_EMAIL } from "@/lib/supabase/auth"
import { SignInGate } from "@/components/sign-in-gate"
import { getUsPublicHolidays } from "@/lib/calendar/holidays"

export const dynamic = "force-dynamic"

export default async function Home({ searchParams }: { searchParams: Promise<{ auth_error?: string }> }) {
  const user = await getSupabaseUser()
  if (user?.email.trim().toLowerCase() !== ALLOWED_EMAIL) {
    const { auth_error: error } = await searchParams
    return <SignInGate user={user} error={error} />
  }

  const result = await loadEventRows()
  const events = result.status === "synced" ? result.events.map(rowToEvent) : PREVIEW_EVENTS
  const year = new Date().getUTCFullYear()
  const holidays = await getUsPublicHolidays([year - 1, year, year + 1, year + 2])

  return <VerticalCalendar initialEvents={events} initialSyncState={result.status} initialHolidays={holidays} />
}
