import type { CalendarEvent } from "@/lib/calendar/events"

export const PREVIEW_EVENTS: CalendarEvent[] = [
  { id: "1", date: "2026-09-22", title: "Dentist", time: "9:30 AM", color: "#3e63dd", repeat: "none", repeatInterval: 1, repeatWeekdays: [] },
  { id: "2", date: "2026-09-25", title: "Dinner with Mom", time: "6:00 PM", color: "#8e4ec6", repeat: "none", repeatInterval: 1, repeatWeekdays: [] },
  { id: "3", date: "2026-10-03", title: "Harry's birthday", color: "#30a46c", repeat: "yearly", repeatInterval: 1, repeatWeekdays: [] },
  { id: "5", date: "2026-10-02", endDate: "2026-10-08", title: "Trip to Atlanta", color: "#12a594", repeat: "none", repeatInterval: 1, repeatWeekdays: [] },
  { id: "4", date: "2026-10-14", title: "Product review", time: "2:00 PM", color: "#e5484d", repeat: "none", repeatInterval: 1, repeatWeekdays: [] },
]
