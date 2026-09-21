import { VerticalCalendar } from "@/components/vertical-calendar"
import { PREVIEW_EVENTS } from "@/lib/calendar/preview-events"
import { rowToEvent } from "@/lib/calendar/events"
import { loadEventRows } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export default async function Home() {
  const result = await loadEventRows()
  const events = result.status === "synced" ? result.events.map(rowToEvent) : PREVIEW_EVENTS

  return <VerticalCalendar initialEvents={events} initialSyncState={result.status} />
}
