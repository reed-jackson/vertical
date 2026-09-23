import { NextRequest, NextResponse } from "next/server"
import { getUsPublicHolidays } from "@/lib/calendar/holidays"

export async function GET(request: NextRequest) {
  const currentYear = new Date().getUTCFullYear()
  const years = (request.nextUrl.searchParams.get("years") || "")
    .split(",")
    .map(Number)
    .filter((year) => Number.isInteger(year) && year >= currentYear - 20 && year <= currentYear + 20)
    .slice(0, 8)
  return NextResponse.json({ holidays: await getUsPublicHolidays(years) }, {
    headers: { "cache-control": "public, max-age=86400, s-maxage=2592000" },
  })
}
