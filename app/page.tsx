import { VerticalCalendar } from "@/components/vertical-calendar"
import { PREVIEW_EVENTS } from "@/lib/calendar/preview-events"
import { rowToEvent } from "@/lib/calendar/events"
import { loadEventRows } from "@/lib/supabase/server"
import { getChatGPTUser, ALLOWED_EMAIL } from "@/app/chatgpt-auth"
import { SignInGate } from "@/components/sign-in-gate"

export const dynamic = "force-dynamic"

export default async function Home() {
  const user = await getChatGPTUser()
  if (user?.email.trim().toLowerCase() !== ALLOWED_EMAIL) {
    return <SignInGate user={user} />
  }

  const result = await loadEventRows()
  const events = result.status === "synced" ? result.events.map(rowToEvent) : PREVIEW_EVENTS

  return <VerticalCalendar initialEvents={events} initialSyncState={result.status} />
}
