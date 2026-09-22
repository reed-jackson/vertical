export type CalendarHoliday = {
  date: string
  name: string
}

function displayName(name: string) {
  return name.replace(/ \(substitute day\)$/i, " (observed)")
}

export async function getUsPublicHolidays(years: Iterable<number>) {
  const { default: Holidays } = await import("date-holidays")
  const usHolidays = new Holidays("US", { types: ["public"] })
  const holidays = new Map<string, CalendarHoliday>()

  for (const year of new Set(years)) {
    for (const holiday of usHolidays.getHolidays(year)) {
      if (holiday.type !== "public") continue
      const date = holiday.date.slice(0, 10)
      const name = displayName(holiday.name)
      holidays.set(`${date}:${name}`, { date, name })
    }
  }

  return [...holidays.values()].sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name))
}
