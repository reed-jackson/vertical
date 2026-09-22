import { addDays, differenceInCalendarDays, differenceInCalendarMonths, differenceInCalendarWeeks, differenceInCalendarYears, isSameDay, subDays } from "date-fns"
import { dateKey, parseLocalDate } from "@/lib/calendar/dates"
import type { EventRow } from "@/lib/supabase/server"

export type CalendarEvent = {
  id: string
  date: string
  title: string
  time?: string
  color: string
  endDate?: string
  repeat: EventRow["repeat_rule"]
  repeatInterval: number
  repeatUntil?: string
  repeatWeekdays: number[]
}

export type SpanRole = "start" | "mid" | "end"

export const EVENT_COLORS = ["#3e63dd", "#30a46c", "#e5484d", "#e5a000", "#8e4ec6", "#12a594"]

export function formatEventTime(time: string) {
  const value = time.trim()
  const match = value.match(/^(\d{1,2}):(\d{2})(?:\s*([AP])M)?$/i)
  if (!match) return value

  let hour = Number(match[1])
  const minutes = Number(match[2])
  if (minutes > 59) return value

  const meridian = match[3]?.toLowerCase()
  if (meridian) {
    if (hour < 1 || hour > 12) return value
    return `${hour}:${match[2]}${meridian}`
  }

  if (hour > 23) return value
  const suffix = hour >= 12 ? "p" : "a"
  hour %= 12
  if (hour === 0) hour = 12
  return `${hour}:${match[2]}${suffix}`
}

export function rowToEvent(row: Partial<EventRow> & Pick<EventRow, "id" | "event_date" | "title" | "color">): CalendarEvent {
  return {
    id: row.id,
    date: row.event_date.slice(0, 10),
    title: row.title,
    time: row.event_time?.slice(0, 5) || undefined,
    color: row.color,
    endDate: row.end_date && row.end_date.slice(0, 10) > row.event_date.slice(0, 10) ? row.end_date.slice(0, 10) : undefined,
    repeat: row.repeat_rule || "none",
    repeatInterval: row.repeat_interval || 1,
    repeatUntil: row.repeat_until || undefined,
    repeatWeekdays: row.repeat_weekdays || [],
  }
}

export function eventToRow(item: CalendarEvent) {
  return {
    id: item.id,
    event_date: item.date,
    title: item.title,
    event_time: item.time ?? null,
    color: item.color,
    end_date: item.endDate && item.endDate > item.date ? item.endDate : null,
    repeat_rule: item.repeat,
    repeat_interval: item.repeatInterval,
    repeat_until: item.repeatUntil ?? null,
    repeat_weekdays: item.repeatWeekdays,
  }
}

function minutesFromClock(time?: string) {
  if (!time) return -1
  const value = time.trim()
  const twelve = value.match(/^(\d{1,2}):(\d{2})\s*([AP]M)$/i)
  if (twelve) {
    let hours = Number(twelve[1])
    const minutes = Number(twelve[2])
    const meridian = twelve[3].toUpperCase()
    if (meridian === "AM" && hours === 12) hours = 0
    if (meridian === "PM" && hours !== 12) hours += 12
    return hours * 60 + minutes
  }
  const twentyFour = value.match(/^(\d{1,2}):(\d{2})$/)
  if (twentyFour) return Number(twentyFour[1]) * 60 + Number(twentyFour[2])
  return Number.MAX_SAFE_INTEGER
}

export function spanLength(item: CalendarEvent) {
  if (!item.endDate || item.endDate <= item.date) return 0
  return differenceInCalendarDays(parseLocalDate(item.endDate), parseLocalDate(item.date))
}

export function startsOn(item: CalendarEvent, day: Date) {
  if (dateKey(day) < item.date || (item.repeatUntil && dateKey(day) > item.repeatUntil)) return false
  const start = parseLocalDate(item.date)
  const interval = Math.max(1, item.repeatInterval || 1)
  if (item.repeat === "daily") return differenceInCalendarDays(day, start) % interval === 0
  if (item.repeat === "weekly") {
    const weekdays = item.repeatWeekdays.length ? item.repeatWeekdays : [start.getDay()]
    return weekdays.includes(day.getDay()) && differenceInCalendarWeeks(day, start, { weekStartsOn: 1 }) % interval === 0
  }
  if (item.repeat === "monthly") return day.getDate() === start.getDate() && differenceInCalendarMonths(day, start) % interval === 0
  if (item.repeat === "yearly") return day.getMonth() === start.getMonth() && day.getDate() === start.getDate() && differenceInCalendarYears(day, start) % interval === 0
  return isSameDay(day, start)
}

export function occursOn(item: CalendarEvent, day: Date) {
  const length = spanLength(item)
  if (length === 0) return startsOn(item, day)
  for (let offset = 0; offset <= length; offset += 1) {
    if (startsOn(item, subDays(day, offset))) return true
  }
  return false
}

export function spanRole(item: CalendarEvent, day: Date): SpanRole | null {
  const length = spanLength(item)
  if (length === 0 || !occursOn(item, day)) return null
  if (startsOn(item, day)) return "start"
  if (startsOn(item, subDays(day, length))) return "end"
  return "mid"
}

export function spanLanes(events: CalendarEvent[]) {
  const spans = events
    .filter((item) => spanLength(item) > 0)
    .map((item) => ({
      id: item.id,
      start: item.date,
      end: dateKey(addDays(parseLocalDate(item.date), spanLength(item))),
    }))
    .sort((a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end))
  const lanes: Array<{ end: string }> = []
  const assigned = new Map<string, number>()
  for (const span of spans) {
    let lane = lanes.findIndex((slot) => slot.end < span.start)
    if (lane === -1) {
      lane = lanes.length
      lanes.push({ end: span.end })
    } else {
      lanes[lane].end = span.end
    }
    assigned.set(span.id, lane)
  }
  return assigned
}

export function sortDayEvents(events: CalendarEvent[]) {
  return [...events].sort((a, b) => {
    const bySpan = Number(spanLength(b) > 0) - Number(spanLength(a) > 0)
    if (bySpan !== 0) return bySpan
    const byTime = minutesFromClock(a.time) - minutesFromClock(b.time)
    if (byTime !== 0) return byTime
    return a.title.localeCompare(b.title)
  })
}

export function matchEvents(events: CalendarEvent[], query: { id?: string; title_query?: string; date?: string }) {
  if (query.id) return events.filter((item) => item.id === query.id)
  const title = query.title_query?.trim().toLowerCase()
  return events.filter((item) => {
    const titleMatch = title ? item.title.toLowerCase().includes(title) || title.includes(item.title.toLowerCase()) : true
    const dateMatch = query.date ? occursOn(item, parseLocalDate(query.date)) : true
    return titleMatch && dateMatch
  })
}

export async function saveEventRemote(item: CalendarEvent, method: "POST" | "PUT") {
  const payload = eventToRow(item)
  const response = await fetch("/api/events", {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(method === "POST" ? { ...payload, id: undefined } : payload),
  })
  if (!response.ok) throw new Error("Unable to save this event.")
  const { event } = await response.json()
  return rowToEvent(event)
}

export async function removeEventRemote(id: string) {
  const response = await fetch("/api/events", {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id }),
  })
  if (!response.ok) throw new Error("Unable to remove this event.")
}
