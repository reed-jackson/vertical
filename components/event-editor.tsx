"use client"

import * as React from "react"
import { ArrowLeft, CalendarDays, Check, ChevronRight, Clock, Repeat2, Trash2, X } from "lucide-react"
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer"
import { parseLocalDate } from "@/lib/calendar/dates"
import { CalendarEvent, EVENT_COLORS } from "@/lib/calendar/events"

type RepeatRule = CalendarEvent["repeat"]

export type EditorSession = {
  key: number
  date: string
  event?: CalendarEvent
  color: string
}

export function EventEditor({ session, open, onClose, onSave, onDelete }: {
  session: EditorSession | null
  open: boolean
  onClose: () => void
  onSave: (event: CalendarEvent, editingId?: string) => void
  onDelete: (event: CalendarEvent) => void
}) {
  return (
    <Drawer open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose() }} dismissible={false}>
      {session && <EditorForm key={session.key} session={session} onClose={onClose} onSave={onSave} onDelete={onDelete} />}
    </Drawer>
  )
}

function EditorForm({ session, onClose, onSave, onDelete }: { session: EditorSession; onClose: () => void; onSave: (event: CalendarEvent, editingId?: string) => void; onDelete: (event: CalendarEvent) => void }) {
  const source = session.event
  const [page, setPage] = React.useState<"event" | "repeat">("event")
  const [title, setTitle] = React.useState(source?.title || "")
  const [startDate, setStartDate] = React.useState(source?.date || session.date)
  const [endDate, setEndDate] = React.useState(source?.endDate || "")
  const [time, setTime] = React.useState(source?.time || "")
  const [color, setColor] = React.useState(source?.color || session.color)
  const [repeat, setRepeat] = React.useState<RepeatRule>(source?.repeat || "none")
  const [repeatInterval, setRepeatInterval] = React.useState(source?.repeatInterval || 1)
  const [repeatUntil, setRepeatUntil] = React.useState(source?.repeatUntil || "")
  const [repeatWeekdays, setRepeatWeekdays] = React.useState<number[]>(source?.repeatWeekdays || [])
  const [colorOpen, setColorOpen] = React.useState(false)
  const [deleteArmed, setDeleteArmed] = React.useState(false)
  const formRef = React.useRef<HTMLFormElement>(null)

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!title.trim()) return
    const selected = parseLocalDate(startDate)
    onSave({
      id: source?.id || `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
      date: startDate,
      endDate: endDate && endDate > startDate ? endDate : undefined,
      title: title.trim().slice(0, 160),
      time: time || undefined,
      color,
      repeat,
      repeatInterval: Math.max(1, repeatInterval),
      repeatUntil: repeatUntil || undefined,
      repeatWeekdays: repeat === "weekly" ? (repeatWeekdays.length ? repeatWeekdays : [selected.getDay()]) : [],
    }, source?.id)
  }

  return (
    <DrawerContent className="event-drawer">
      <div className="drawer-inner">
        <div className="drawer-header-row">
          <div className="drawer-heading-group">
            {page === "repeat" && <button type="button" className="drawer-back" onClick={() => setPage("event")} aria-label="Back to event"><ArrowLeft size={19} /></button>}
            <div><DrawerTitle className="drawer-title">{page === "repeat" ? "Repeat" : source ? "Edit event" : "New event"}</DrawerTitle><DrawerDescription className="sr-only">{page === "repeat" ? "Edit the repeat schedule" : source ? "Edit this calendar event" : "Add an event to your calendar"}</DrawerDescription></div>
          </div>
          <button type="button" className="drawer-close" onClick={onClose} aria-label="Close"><X size={19} /></button>
        </div>
        <form ref={formRef} onSubmit={submit} className="event-form">
          <div className="drawer-viewport">
            <section className={`drawer-panel event-page ${page === "event" ? "active" : "leaving"}`} aria-hidden={page !== "event"}>
              <div className="title-row">
                <input className="title-input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="What’s happening?" autoFocus aria-label="Event title" />
                <div className="color-control">
                  <button type="button" className="color-trigger" style={{ background: color }} onClick={() => setColorOpen((open) => !open)} aria-label="Choose event color" aria-expanded={colorOpen} />
                  {colorOpen && <div className="color-popover" role="group" aria-label="Event color">{EVENT_COLORS.map((swatch) => <button type="button" key={swatch} className={`color-swatch ${color === swatch ? "selected" : ""}`} style={{ background: swatch }} onClick={() => { setColor(swatch); setColorOpen(false) }} aria-label={`Select ${swatch} color`}>{color === swatch && <Check size={12} color="white" strokeWidth={3} />}</button>)}</div>}
                </div>
              </div>
              <div className="event-fields">
                <label className="date-field"><CalendarDays size={17} strokeWidth={1.7} /><input type="date" value={startDate} onChange={(event) => { if (!event.target.value) return; setStartDate(event.target.value); if (endDate && endDate < event.target.value) setEndDate("") }} aria-label="Start date" /></label>
                <label className="date-field"><CalendarDays size={17} strokeWidth={1.7} /><input type="date" min={startDate} value={endDate} onChange={(event) => setEndDate(event.target.value)} aria-label="End date" /></label>
                <label className="time-field"><Clock size={17} strokeWidth={1.7} /><input type="time" value={time} onChange={(event) => setTime(event.target.value)} aria-label="Event time" /></label>
                <button type="button" className={`repeat-trigger ${repeat !== "none" ? "active" : ""}`} onClick={() => setPage("repeat")}><Repeat2 size={17} strokeWidth={1.7} /><span>{repeat === "none" ? "Repeat" : repeat[0].toUpperCase() + repeat.slice(1)}</span><ChevronRight size={16} /></button>
              </div>
              <div className="form-actions">
                {source && <button className={`delete-button ${deleteArmed ? "armed" : ""}`} type="button" onClick={() => { if (deleteArmed) onDelete(source); else setDeleteArmed(true) }} onBlur={() => setDeleteArmed(false)}><Trash2 size={16} strokeWidth={1.8} />{deleteArmed ? "Delete this event?" : "Delete"}</button>}
                <button className="save-button" type="button" onClick={() => formRef.current?.requestSubmit()} disabled={!title.trim()}>{source ? "Save changes" : "Add event"}</button>
              </div>
            </section>
            <section className={`drawer-panel repeat-page ${page === "repeat" ? "active" : "entering"}`} aria-hidden={page !== "repeat"}>
              <label className="repeat-choice"><span>Cadence</span><select value={repeat} onChange={(event) => setRepeat(event.target.value as RepeatRule)} aria-label="Repeat cadence"><option value="none">Does not repeat</option><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="yearly">Yearly</option></select></label>
              {repeat !== "none" && <label className="interval-field"><span>Every</span><input type="number" min="1" max="99" value={repeatInterval} onChange={(event) => setRepeatInterval(Math.max(1, Number(event.target.value)))} aria-label="Repeat interval" /><span>{repeat === "daily" ? "day(s)" : repeat === "weekly" ? "week(s)" : repeat === "monthly" ? "month(s)" : "year(s)"}</span></label>}
              {repeat === "weekly" && <div className="weekday-group"><span>On</span><div className="weekday-picker" aria-label="Repeat on weekdays">{["S", "M", "T", "W", "T", "F", "S"].map((label, index) => <button type="button" key={`${label}-${index}`} className={repeatWeekdays.includes(index) ? "selected" : ""} onClick={() => setRepeatWeekdays((days) => days.includes(index) ? days.filter((day) => day !== index) : [...days, index])} aria-pressed={repeatWeekdays.includes(index)}>{label}</button>)}</div></div>}
              {repeat !== "none" && <label className="until-field"><span>Until</span><input type="date" min={startDate} value={repeatUntil} onChange={(event) => setRepeatUntil(event.target.value)} aria-label="Repeat until" /></label>}
              <button type="button" className="repeat-done" onClick={() => setPage("event")}>Done</button>
            </section>
          </div>
        </form>
      </div>
    </DrawerContent>
  )
}
