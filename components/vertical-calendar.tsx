"use client"

import * as React from "react"
import { addMonths, differenceInCalendarMonths, eachDayOfInterval, endOfMonth, format, isWeekend, startOfMonth } from "date-fns"
import { LocateFixed, Maximize2, Mic, Minimize2, Plus, X } from "lucide-react"
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer"
import { EventEditor, type EditorSession } from "@/components/event-editor"
import { useRealtimeAgent } from "@/hooks/use-realtime-agent"
import { dateKey, parseLocalDate, TIMEZONE_COOKIE } from "@/lib/calendar/dates"
import { CalendarEvent, EVENT_COLORS, formatEventTime, matchEvents, occursOn, removeEventRemote, saveEventRemote, sortDayEvents, spanLanes, spanRole, type SpanRole } from "@/lib/calendar/events"

type RepeatRule = CalendarEvent["repeat"]
const WEEKDAYS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"] as const
const COLORS = EVENT_COLORS
const MONTH_WINDOW_BEFORE = 6
const MONTH_WINDOW_AFTER = 18
const MONTH_WINDOW_STEP = 6
const makeId = () => `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
const repeatRules: RepeatRule[] = ["none", "daily", "weekly", "monthly", "yearly"]

type VerticalCalendarProps = {
  initialEvents?: CalendarEvent[]
  initialSyncState?: "synced" | "preview"
  initialTodayKey?: string
  initialTimeZone?: string
  initialHolidays?: Array<{ date: string; name: string }>
}

export function VerticalCalendar({ initialEvents = [], initialSyncState = "preview", initialTodayKey, initialTimeZone, initialHolidays = [] }: VerticalCalendarProps = {}) {
  const [timeZone, setTimeZone] = React.useState(initialTimeZone || "")
  const [todayKey, setTodayKey] = React.useState(initialTodayKey || "")
  const today = React.useMemo(() => parseLocalDate(todayKey || dateKey(new Date())), [todayKey])
  const anchor = React.useMemo(() => startOfMonth(today), [today])
  const [rangeStart, setRangeStart] = React.useState(-MONTH_WINDOW_BEFORE)
  const rangeEnd = rangeStart + MONTH_WINDOW_BEFORE + MONTH_WINDOW_AFTER
  const [events, setEvents] = React.useState<CalendarEvent[]>(initialEvents)
  const [editorSession, setEditorSession] = React.useState<EditorSession | null>(null)
  const [mobileHeader, setMobileHeader] = React.useState({ month: "", year: "", previousMonth: "", previousYear: "", yearChanged: false, index: 0, direction: "forward" as "forward" | "backward", tick: 0 })
  const [syncState, setSyncState] = React.useState<"synced" | "preview">(initialSyncState)
  const [voiceOpen, setVoiceOpen] = React.useState(false)
  const [compactDays, setCompactDays] = React.useState(false)
  const [todayInView, setTodayInView] = React.useState(true)
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const todayRef = React.useRef<HTMLDivElement>(null)
  const extendingRef = React.useRef(false)
  const scrollFrameRef = React.useRef<number | null>(null)
  const readyRef = React.useRef(false)
  const eventsRef = React.useRef(events)
  const syncStateRef = React.useRef(syncState)
  eventsRef.current = events
  syncStateRef.current = syncState
  const lanes = React.useMemo(() => spanLanes(events), [events])
  const months = React.useMemo(
    () => Array.from({ length: rangeEnd - rangeStart + 1 }, (_, i) => addMonths(anchor, rangeStart + i)),
    [anchor, rangeEnd, rangeStart],
  )
  const holidayYears = React.useMemo(() => [...new Set(months.map((month) => month.getFullYear()))], [months])
  const [holidays, setHolidays] = React.useState<Array<{ date: string; name: string }>>(initialHolidays)
  React.useEffect(() => {
    let active = true
    const loadedYears = new Set(holidays.map((holiday) => Number(holiday.date.slice(0, 4))))
    const missingYears = holidayYears.filter((year) => !loadedYears.has(year))
    if (missingYears.length) {
      void fetch(`/api/holidays?years=${missingYears.join(",")}`).then(async (response) => response.ok ? await response.json() as { holidays: Array<{ date: string; name: string }> } : { holidays: [] }).then(({ holidays: next }) => {
        if (active) setHolidays((current) => [...current, ...next].filter((item, index, all) => all.findIndex((candidate) => candidate.date === item.date && candidate.name === item.name) === index))
      })
    }
    return () => { active = false }
  }, [holidayYears, holidays])
  const holidayIndex = React.useMemo(() => {
    const index = new Map<string, string[]>()
    for (const holiday of holidays) {
      const names = index.get(holiday.date) || []
      index.set(holiday.date, [...names, holiday.name])
    }
    return index
  }, [holidays])
  const dayEventIndex = React.useMemo(() => {
    const index = new Map<string, {
      listedEvents: CalendarEvent[]
      spanEvents: Array<{ item: CalendarEvent; role: SpanRole }>
    }>()
    const firstMonth = months[0]
    const lastMonth = months.at(-1)
    if (!firstMonth || !lastMonth) return index

    for (const day of eachDayOfInterval({ start: startOfMonth(firstMonth), end: endOfMonth(lastMonth) })) {
      const matching = events.flatMap((item) => {
        const role = spanRole(item, day)
        return role || occursOn(item, day) ? [{ item, role }] : []
      })
      if (matching.length === 0) continue

      const sorted = sortDayEvents(matching.map(({ item }) => item))
      const roles = new Map(matching.map(({ item, role }) => [item.id, role]))
      index.set(dateKey(day), {
        listedEvents: sorted.filter((item) => roles.get(item.id) !== "mid"),
        spanEvents: sorted.flatMap((item) => {
          const role = roles.get(item.id)
          return role ? [{ item, role }] : []
        }),
      })
    }
    return index
  }, [events, months])
  const yearGroups = React.useMemo(() => {
    return months.reduce<Array<{ year: number; months: Date[] }>>((groups, month) => {
      const year = month.getFullYear()
      const current = groups.at(-1)
      if (current?.year === year) current.months.push(month)
      else groups.push({ year, months: [month] })
      return groups
    }, [])
  }, [months])

  React.useLayoutEffect(() => {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
    const next = dateKey(new Date(), zone)
    setTimeZone(zone)
    setTodayKey(next)
    document.cookie = `${TIMEZONE_COOKIE}=${encodeURIComponent(zone)};path=/;max-age=31536000;SameSite=Lax`
    setMobileHeader((current) => current.month ? current : { ...current, month: format(parseLocalDate(next), "MMMM"), year: format(parseLocalDate(next), "yyyy") })
  }, [])

  React.useEffect(() => {
    if (!todayKey) return
    const syncToday = () => {
      const next = dateKey(new Date(), timeZone || undefined)
      setTodayKey((current) => (current === next ? current : next))
    }
    const id = window.setInterval(syncToday, 30_000)
    return () => window.clearInterval(id)
  }, [timeZone, todayKey])

  React.useEffect(() => {
    if (!todayKey) return
    const frame = requestAnimationFrame(() => {
      scrollToToday(false)
      readyRef.current = true
      updateTodayInView()
    })
    return () => cancelAnimationFrame(frame)
  }, [todayKey])

  React.useEffect(() => {
    const scroller = scrollRef.current
    const day = todayRef.current
    if (!scroller || !day) {
      setTodayInView(false)
      return
    }
    const observer = new IntersectionObserver(
      ([entry]) => setTodayInView(entry.isIntersecting),
      { root: scroller, threshold: 0.05 },
    )
    observer.observe(day)
    return () => observer.disconnect()
  }, [todayKey, compactDays, rangeStart])

  React.useEffect(() => {
    if (!document.modelContext?.registerTool) return
    const lifecycle = new AbortController()
    void Promise.resolve(document.modelContext.registerTool({
      name: "create_calendar_event",
      title: "Create calendar event",
      description: "Create an event in Vertical on a specific ISO date.",
      inputSchema: {
        type: "object",
        properties: {
          date: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
          end_date: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
          title: { type: "string", minLength: 1, maxLength: 160 },
          time: { type: "string", pattern: "^([01]\\d|2[0-3]):[0-5]\\d$" },
          color: { type: "string" },
          repeat: { type: "string", enum: repeatRules },
        },
        required: ["date", "title"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      async execute(input) {
        const value = input as { date?: string; title?: string; time?: string; color?: string; end_date?: string; repeat?: RepeatRule }
        if (!value.date?.match(/^\d{4}-\d{2}-\d{2}$/) || !value.title?.trim()) throw new Error("A valid date and title are required.")
        const created = await applyCreateEvent({ date: value.date, title: value.title.trim(), time: value.time, color: value.color, endDate: value.end_date, repeat: value.repeat })
        return { id: created.id, date: created.date, title: created.title, saved: syncStateRef.current === "synced" }
      },
    }, { signal: lifecycle.signal })).catch(() => undefined)
    return () => lifecycle.abort()
  }, [])

  const chooseDay = React.useCallback((day: Date) => {
    setEditorSession({ key: Date.now(), date: dateKey(day), color: COLORS[Math.floor(Math.random() * COLORS.length)] })
  }, [])
  const editEvent = React.useCallback((item: CalendarEvent) => {
    setEditorSession({ key: Date.now(), date: item.date, event: item, color: item.color })
  }, [])
  async function saveEvent(optimistic: CalendarEvent, editingId?: string) {
    const previous = editingId ? events.find((item) => item.id === editingId) : undefined
    setEvents((current) => editingId ? current.map((item) => item.id === editingId ? optimistic : item) : [...current, optimistic])
    setEditorSession(null)
    if (syncState === "synced") {
      try {
        const saved = await saveEventRemote(optimistic, editingId ? "PUT" : "POST")
        setEvents((current) => current.map((item) => item.id === optimistic.id ? saved : item))
      } catch {
        setEvents((current) => previous ? current.map((item) => item.id === optimistic.id ? previous : item) : current.filter((item) => item.id !== optimistic.id))
        setSyncState("preview")
      }
    }
  }
  function offsetInScroller(element: HTMLElement, scroller: HTMLElement, axis: "left" | "top") {
    const elementBox = element.getBoundingClientRect()
    const scrollerBox = scroller.getBoundingClientRect()
    return axis === "left"
      ? elementBox.left - scrollerBox.left + scroller.scrollLeft
      : elementBox.top - scrollerBox.top + scroller.scrollTop
  }
  function jumpToDate(target: Date) {
    const offset = differenceInCalendarMonths(startOfMonth(target), anchor)
    if (offset < rangeStart || offset > rangeEnd) setRangeStart(offset - MONTH_WINDOW_BEFORE)
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const scroller = scrollRef.current
      const day = scroller?.querySelector<HTMLElement>(`[data-date="${dateKey(target)}"]`)
      const month = day?.closest<HTMLElement>(".month-column")
      if (!scroller || !day || !month) return
      const mobile = window.matchMedia("(max-width: 640px)").matches
      if (mobile) scroller.scrollTo({ top: offsetInScroller(day, scroller, "top") - scroller.clientHeight / 2, behavior: "smooth" })
      else {
        scroller.scrollTo({ left: offsetInScroller(month, scroller, "left") - (scroller.clientWidth - month.offsetWidth) / 2, behavior: "smooth" })
        month.scrollTo({ top: day.offsetTop - month.clientHeight / 2, behavior: "smooth" })
      }
    }))
  }
  async function persistIfSynced(item: CalendarEvent, method: "POST" | "PUT") {
    if (syncStateRef.current !== "synced") return item
    try {
      const saved = await saveEventRemote(item, method)
      setEvents((current) => current.map((entry) => entry.id === item.id ? saved : entry))
      return saved
    } catch {
      setSyncState("preview")
      return item
    }
  }
  async function applyCreateEvent(input: { date: string; title: string; time?: string; color?: string; endDate?: string; repeat?: RepeatRule; repeatInterval?: number; repeatUntil?: string; repeatWeekdays?: number[] }) {
    const item: CalendarEvent = {
      id: makeId(),
      date: input.date,
      title: input.title.trim().slice(0, 160),
      time: input.time || undefined,
      color: input.color || COLORS[Math.floor(Math.random() * COLORS.length)],
      endDate: input.endDate && input.endDate > input.date ? input.endDate : undefined,
      repeat: input.repeat || "none",
      repeatInterval: Math.max(1, input.repeatInterval || 1),
      repeatUntil: input.repeatUntil || undefined,
      repeatWeekdays: input.repeat === "weekly" ? input.repeatWeekdays || [] : [],
    }
    setEvents((current) => [...current, item])
    jumpToDate(parseLocalDate(item.date))
    return persistIfSynced(item, "POST")
  }
  const agentContext = React.useMemo(() => {
    const lines = events.slice(0, 80).map((item) => `${item.id} | ${item.date}${item.endDate ? `–${item.endDate}` : ""} | ${item.title}${item.time ? ` ${item.time}` : ""} | ${item.repeat}`)
    return `Today: ${todayKey}\nTime zone: ${typeof Intl === "undefined" ? "local" : Intl.DateTimeFormat().resolvedOptions().timeZone}\nEvents:\n${lines.join("\n") || "(none)"}`
  }, [events, todayKey])
  const agent = useRealtimeAgent({
    context: agentContext,
    async onTool(name, args) {
      const date = typeof args.date === "string" ? args.date : undefined
      if (name === "list_events") {
        const query = typeof args.query === "string" ? args.query : undefined
        return matchEvents(eventsRef.current, { title_query: query, date }).map((item) => ({ id: item.id, date: item.date, end_date: item.endDate, title: item.title, time: item.time, repeat: item.repeat }))
      }
      if (name === "jump_to_day") {
        if (!date?.match(/^\d{4}-\d{2}-\d{2}$/)) return { error: "A valid YYYY-MM-DD date is required." }
        jumpToDate(parseLocalDate(date))
        return { jumped_to: date }
      }
      if (name === "create_event") {
        const title = typeof args.title === "string" ? args.title : ""
        if (!date?.match(/^\d{4}-\d{2}-\d{2}$/) || !title.trim()) return { error: "A valid date and title are required." }
        const created = await applyCreateEvent({
          date,
          title,
          time: typeof args.time === "string" ? args.time : undefined,
          color: typeof args.color === "string" ? args.color : undefined,
          endDate: typeof args.end_date === "string" ? args.end_date : undefined,
          repeat: repeatRules.includes(args.repeat_rule as RepeatRule) ? args.repeat_rule as RepeatRule : "none",
          repeatInterval: typeof args.repeat_interval === "number" ? args.repeat_interval : 1,
          repeatUntil: typeof args.repeat_until === "string" ? args.repeat_until : undefined,
          repeatWeekdays: Array.isArray(args.repeat_weekdays) ? args.repeat_weekdays.filter((day): day is number => typeof day === "number") : [],
        })
        return { id: created.id, date: created.date, title: created.title }
      }
      if (name === "update_event") {
        const matches = matchEvents(eventsRef.current, { id: typeof args.id === "string" ? args.id : undefined, title_query: typeof args.title_query === "string" ? args.title_query : undefined, date })
        if (matches.length !== 1) return { error: matches.length ? "Several events match. Ask which one." : "No event matched." }
        const existing = matches[0]
        const updated: CalendarEvent = {
          ...existing,
          date: typeof args.new_date === "string" ? args.new_date : existing.date,
          endDate: typeof args.end_date === "string" ? (args.end_date && args.end_date > (typeof args.new_date === "string" ? args.new_date : existing.date) ? args.end_date : undefined) : existing.endDate,
          title: typeof args.new_title === "string" ? args.new_title.trim().slice(0, 160) : existing.title,
          time: args.time === "" ? undefined : typeof args.time === "string" ? args.time : existing.time,
          color: typeof args.color === "string" ? args.color : existing.color,
          repeat: repeatRules.includes(args.repeat_rule as RepeatRule) ? args.repeat_rule as RepeatRule : existing.repeat,
          repeatInterval: typeof args.repeat_interval === "number" ? args.repeat_interval : existing.repeatInterval,
          repeatUntil: typeof args.repeat_until === "string" ? args.repeat_until : existing.repeatUntil,
          repeatWeekdays: Array.isArray(args.repeat_weekdays) ? args.repeat_weekdays.filter((day): day is number => typeof day === "number") : existing.repeatWeekdays,
        }
        setEvents((current) => current.map((item) => item.id === existing.id ? updated : item))
        jumpToDate(parseLocalDate(updated.date))
        const saved = await persistIfSynced(updated, "PUT")
        return { id: saved.id, date: saved.date, title: saved.title }
      }
      if (name === "remove_event") {
        const matches = matchEvents(eventsRef.current, { id: typeof args.id === "string" ? args.id : undefined, title_query: typeof args.title_query === "string" ? args.title_query : undefined, date })
        if (matches.length !== 1) return { error: matches.length ? "Several events match. Ask which one." : "No event matched." }
        const existing = matches[0]
        setEvents((current) => current.filter((item) => item.id !== existing.id))
        if (syncStateRef.current === "synced") {
          try { await removeEventRemote(existing.id) } catch { setSyncState("preview") }
        }
        return { removed: existing.title, id: existing.id }
      }
      return { error: `Unknown tool ${name}` }
    },
  })

  React.useEffect(() => {
    function isTypingTarget(node: EventTarget | null) {
      if (!(node instanceof HTMLElement)) return false
      const tag = node.tagName
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || node.isContentEditable
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (isTypingTarget(event.target)) return
      if (editorSession || voiceOpen) return
      if (event.key === "Enter") {
        event.preventDefault()
        setVoiceOpen(true)
        void agent.start()
        return
      }
      const key = event.key.toLowerCase()
      if (key === "n") {
        event.preventDefault()
        chooseDay(today)
        return
      }
      if (key === "t") {
        event.preventDefault()
        scrollToToday()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [agent, editorSession, today, voiceOpen])

  function updateTodayInView() {
    const scroller = scrollRef.current
    const day = todayRef.current || scroller?.querySelector<HTMLElement>(".is-today")
    if (!scroller || !day) {
      setTodayInView(false)
      return
    }
    const mobile = window.matchMedia("(max-width: 640px)").matches
    const dayBox = day.getBoundingClientRect()
    const scrollerBox = scroller.getBoundingClientRect()
    const month = day.closest<HTMLElement>(".month-column")
    const monthBox = month?.getBoundingClientRect()
    const headingBottom = month?.querySelector<HTMLElement>(".month-heading")?.getBoundingClientRect().bottom
    const topInset = mobile ? 66 : (monthBox && headingBottom ? Math.max(0, headingBottom - monthBox.top) : 0)
    const overlaps = (box: DOMRect, inset = 0) => dayBox.bottom > box.top + inset && dayBox.top < box.bottom && dayBox.right > box.left && dayBox.left < box.right
    setTodayInView(overlaps(scrollerBox, mobile ? topInset : 0) && (!monthBox || overlaps(monthBox, topInset)))
  }
  function scrollToToday(smooth = true) {
    const scroller = scrollRef.current
    const day = todayRef.current || scroller?.querySelector<HTMLElement>(".is-today")
    const month = day?.closest<HTMLElement>(".month-column")
    if (!scroller || !day || !month) return
    const mobile = window.matchMedia("(max-width: 640px)").matches
    if (mobile) {
      const scrollerTop = scroller.getBoundingClientRect().top
      const dayTop = day.getBoundingClientRect().top - scrollerTop + scroller.scrollTop
      scroller.scrollTo({ top: dayTop - scroller.clientHeight / 2 + day.offsetHeight / 2, behavior: smooth ? "smooth" : "auto" })
    } else {
      scroller.scrollTo({ left: offsetInScroller(month, scroller, "left") - (scroller.clientWidth - month.offsetWidth) / 2, behavior: smooth ? "smooth" : "auto" })
      month.scrollTo({ top: day.offsetTop - month.clientHeight / 2, behavior: smooth ? "smooth" : "auto" })
    }
  }
  function extend(direction: "before" | "after") {
    const scroller = scrollRef.current
    if (!scroller || extendingRef.current) return
    extendingRef.current = true
    const mobile = window.matchMedia("(max-width: 640px)").matches
    const scrollerBox = scroller.getBoundingClientRect()
    const anchorElement = document.elementFromPoint(
      scrollerBox.left + scroller.clientWidth / 2,
      scrollerBox.top + 80,
    )?.closest<HTMLElement>(".month-column")
    const anchorIndex = anchorElement?.dataset.monthIndex
    const anchorPosition = anchorElement?.getBoundingClientRect()[mobile ? "top" : "left"]
    setRangeStart((value) => value + (direction === "before" ? -MONTH_WINDOW_STEP : MONTH_WINDOW_STEP))
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (anchorIndex && anchorPosition !== undefined) {
        const nextAnchor = scroller.querySelector<HTMLElement>(`.month-column[data-month-index="${anchorIndex}"]`)
        const nextPosition = nextAnchor?.getBoundingClientRect()[mobile ? "top" : "left"]
        if (nextPosition !== undefined) {
          if (mobile) scroller.scrollTop += nextPosition - anchorPosition
          else scroller.scrollLeft += nextPosition - anchorPosition
        }
      }
      extendingRef.current = false
    }))
  }
  function processCalendarScroll() {
    const scroller = scrollRef.current
    if (!scroller || !readyRef.current) return
    const mobile = window.matchMedia("(max-width: 640px)").matches
    const active = document.elementFromPoint(
      scroller.clientWidth / 2,
      mobile ? 72 : Math.min(80, scroller.clientHeight / 2),
    )?.closest<HTMLElement>(".month-column")
    if (active?.dataset.monthName && active.dataset.monthYear && active.dataset.monthIndex) {
      const nextIndex = Number(active.dataset.monthIndex)
      const nextMonth = active.dataset.monthName
      const nextYear = active.dataset.monthYear
      setMobileHeader((current) => current.month === nextMonth && current.year === nextYear ? current : { month: nextMonth, year: nextYear, previousMonth: current.month, previousYear: current.year, yearChanged: current.year !== nextYear, index: nextIndex, direction: nextIndex > current.index ? "forward" : "backward", tick: current.tick + 1 })
    }
    if (mobile) {
      if (scroller.scrollTop < 500) extend("before")
      else if (scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 900) extend("after")
    } else {
      if (scroller.scrollLeft < 500) extend("before")
      else if (scroller.scrollWidth - scroller.scrollLeft - scroller.clientWidth < 900) extend("after")
    }
  }
  function handleCalendarScroll() {
    if (scrollFrameRef.current !== null) return
    scrollFrameRef.current = requestAnimationFrame(() => {
      scrollFrameRef.current = null
      processCalendarScroll()
    })
  }

  React.useEffect(() => () => {
    if (scrollFrameRef.current !== null) cancelAnimationFrame(scrollFrameRef.current)
  }, [])

  return (
    <main className="app-shell">
      <div className={`mobile-calendar-header ${mobileHeader.direction}`} aria-live="polite">
        <span className="header-part year-part">
          {mobileHeader.yearChanged && mobileHeader.previousYear && <span key={`year-old-${mobileHeader.tick}`} className="header-label outgoing">{mobileHeader.previousYear}</span>}
          <span key={mobileHeader.yearChanged ? `year-new-${mobileHeader.tick}` : `year-${mobileHeader.year}`} className={`header-label ${mobileHeader.yearChanged ? "incoming" : "steady"}`}>{mobileHeader.year}</span>
        </span>
        <span className="header-part month-part">
          {mobileHeader.previousMonth && <span key={`month-old-${mobileHeader.tick}`} className="header-label outgoing">{mobileHeader.previousMonth}</span>}
          <span key={`month-new-${mobileHeader.tick}`} className="header-label incoming">{mobileHeader.month}</span>
        </span>
      </div>
      <div className={`months-scroll ${compactDays ? "compact-days" : ""}`} ref={scrollRef} onScroll={handleCalendarScroll}>
        <div className="months-track">
          {yearGroups.map((group) => (
            <div className="year-group" key={group.year}>
              <div className="year-heading">{group.year}</div>
              <div className="year-months">
                {group.months.map((month) => <MonthColumn key={dateKey(month)} month={month} anchor={anchor} compactDays={compactDays} todayKey={todayKey} timeZone={timeZone} dayEventIndex={dayEventIndex} holidayIndex={holidayIndex} lanes={lanes} todayRef={todayRef} onChooseDay={chooseDay} onEditEvent={editEvent} />)}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="fab-cluster" aria-label="Calendar actions">
        {!todayInView && <button className="fab fab-secondary fab-today" onClick={() => scrollToToday()} aria-label="Jump to today" aria-keyshortcuts="t"><LocateFixed size={20} strokeWidth={1.8} /></button>}
        <button className="fab fab-secondary fab-compact" onClick={() => { setCompactDays((value) => !value); requestAnimationFrame(() => requestAnimationFrame(() => { scrollToToday(false); updateTodayInView() })) }} aria-pressed={compactDays} aria-label={compactDays ? "Show every day" : "Show only days with events"}>{compactDays ? <Maximize2 size={18} strokeWidth={1.9} /> : <Minimize2 size={18} strokeWidth={1.9} />}</button>
        <button className="fab fab-primary" onClick={() => chooseDay(today)} aria-label="Add event today" aria-keyshortcuts="n"><Plus size={24} strokeWidth={1.8} /></button>
        <button className="fab fab-voice" onClick={() => { setVoiceOpen(true); void agent.start() }} aria-label="Open voice assistant" aria-keyshortcuts="Enter"><Mic size={22} strokeWidth={1.9} /></button>
      </div>

      <EventEditor session={editorSession} onClose={() => setEditorSession(null)} onSave={saveEvent} />

      <Drawer open={voiceOpen} onOpenChange={(open) => { setVoiceOpen(open); if (!open) agent.stop() }}>
        <DrawerContent className="voice-drawer">
          <div className="voice-bar">
            <audio ref={agent.audioRef} autoPlay className="sr-only" />
            <DrawerTitle className="sr-only">Voice assistant</DrawerTitle>
            <DrawerDescription className="sr-only">Speak to change the calendar. Tap cancel to stop recording.</DrawerDescription>
            <p className={`voice-line ${agent.caption?.role === "agent" ? "agent" : "user"}`} aria-live="polite">
              {agent.error
                || (agent.caption?.text.trim()
                  ? agent.caption.text
                  : agent.status === "connecting"
                    ? "Connecting…"
                    : agent.status === "thinking"
                      ? "Working…"
                      : "Listening…")}
            </p>
            <span className={`voice-mic ${agent.status}`} aria-hidden="true"><Mic size={18} strokeWidth={1.9} /></span>
            <DrawerClose className="drawer-close" aria-label="Cancel recording"><X size={19} /></DrawerClose>
          </div>
        </DrawerContent>
      </Drawer>
    </main>
  )
}

const MonthColumn = React.memo(function MonthColumn({ month, anchor, compactDays, todayKey, timeZone, dayEventIndex, holidayIndex, lanes, todayRef, onChooseDay, onEditEvent }: {
  month: Date
  anchor: Date
  compactDays: boolean
  todayKey: string
  timeZone: string
  dayEventIndex: Map<string, { listedEvents: CalendarEvent[]; spanEvents: Array<{ item: CalendarEvent; role: SpanRole }> }>
  holidayIndex: Map<string, string[]>
  lanes: Map<string, number>
  todayRef: React.RefObject<HTMLDivElement | null>
  onChooseDay: (day: Date) => void
  onEditEvent: (item: CalendarEvent) => void
}) {
  const monthDays = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) })
  const visibleDays = compactDays
    ? monthDays.filter((day) => (todayKey && dateKey(day) === todayKey) || dayEventIndex.has(dateKey(day)) || holidayIndex.has(dateKey(day)))
    : monthDays
  if (compactDays && visibleDays.length === 0) return null

  return (
    <section className="month-column" data-month-name={format(month, "MMMM")} data-month-year={format(month, "yyyy")} data-month-index={differenceInCalendarMonths(month, anchor)}>
      <div className="month-heading"><h2>{format(month, "MMMM")}</h2><span className="month-year">{format(month, "yyyy")}</span></div>
      <div className="day-list">
        {visibleDays.map((day) => {
          const key = dateKey(day, timeZone || undefined)
          const { listedEvents = [], spanEvents = [] } = dayEventIndex.get(dateKey(day)) || {}
          const dayHolidays = holidayIndex.get(dateKey(day)) || []
          const isToday = Boolean(todayKey && key === todayKey)
          return (
            <div ref={isToday ? todayRef : undefined} data-date={key} key={key} className={`day-row ${isWeekend(day) ? "weekend" : ""} ${isToday ? "is-today" : ""} ${listedEvents.length || spanEvents.length || dayHolidays.length ? "has-events" : ""} ${spanEvents.length ? "has-span" : ""} ${listedEvents.length + dayHolidays.length > 1 ? "has-stack" : ""}`} onClick={() => onChooseDay(day)} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === " ") { event.preventDefault(); onChooseDay(day) } }} aria-label={`Add event on ${format(day, "EEEE, MMMM d")}${dayHolidays.length ? `. ${dayHolidays.join(", ")}` : ""}`}>
              {spanEvents.map(({ item, role }) => <div key={`span-${item.id}`} className={`span-mark span-${role}`} style={{ color: item.color, ["--span-lane" as string]: String(lanes.get(item.id) || 0) }} aria-hidden="true" />)}
              <span className="day-date"><span className="day-number">{format(day, "d")}</span>{compactDays && <span className="day-weekday">{WEEKDAYS[day.getDay()]}</span>}</span>
              <span className="event-stack">
                {dayHolidays.map((holiday) => <span className="event-line holiday-line" key={`holiday-${holiday}`} title="U.S. public holiday"><span className="event-title">{holiday}</span></span>)}
                {listedEvents.map((item) => <button type="button" className="event-line" key={item.id} style={{ color: item.color }} onClick={(event) => { event.stopPropagation(); onEditEvent(item) }} aria-label={`Edit ${item.title}`}><span className="event-title">{item.title}</span>{item.time && <span className="event-time">{formatEventTime(item.time)}</span>}</button>)}
              </span>
            </div>
          )
        })}
      </div>
    </section>
  )
})
