function pad(value: number) {
  return String(value).padStart(2, "0")
}

export function civilDateKey(date = new Date(), timeZone?: string) {
  if (!timeZone) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  }
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date)
  const year = parts.find((part) => part.type === "year")?.value
  const month = parts.find((part) => part.type === "month")?.value
  const day = parts.find((part) => part.type === "day")?.value
  if (!year || !month || !day) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  }
  return `${year}-${month}-${day}`
}

export function dateKey(date: Date, timeZone?: string) {
  return civilDateKey(date, timeZone)
}

export function parseLocalDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number)
  return new Date(year, (month || 1) - 1, day || 1)
}

export function localToday(timeZone?: string) {
  return parseLocalDate(civilDateKey(new Date(), timeZone))
}

export function localTodayKey(timeZone?: string) {
  return civilDateKey(new Date(), timeZone)
}

export function browserTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

export const TIMEZONE_COOKIE = "vertical_tz"
