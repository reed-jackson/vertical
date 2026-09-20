# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Reed Jackson is the only user. He uses Vertical as a personal calendar for his own days. He signs in with Google so Vertical can show and update his real Google Calendar.

## Product Purpose

Vertical lets one person see and manage personal events as a quiet vertical list of days, without a week-grid calendar. Success is that Reed can sign in with Google, scan his actual upcoming days, add or edit events, and keep those events on his Google Calendar without switching to a conventional calendar.

## Positioning

Vertical is a personal day list, not a scheduling grid. Neighboring products organize time as weeks and hours. Vertical organizes time as a continuous vertical sequence of days, with Google Calendar as the live source of events.

## Operating Context

- Used as a web app in desktop and mobile browsers.
- Local development: `bun install`, then `bun run dev`.
- Reed signs in with Google. After sign-in, Vertical syncs with his Google Calendar.
- Without sign-in, the current app can open in preview mode with sample events that last only for the current session.
- The repo still has a Supabase events table. That store is not the live source of truth once Google Calendar sync exists.
- A drawer creates and edits events. Floating actions jump to today, add an event, or open a voice assistant.
- The voice assistant uses the OpenAI Realtime API. It can jump to a day, create an event, update an event, or remove an event.
- A WebMCP tool (`create_calendar_event`) can create events when a host registers it.

## Capabilities and Constraints

Confirmed:

- Single-user. The only identity is Reed’s Google account. There is no Vertical account system and no sharing.
- Reed can sign in with Google and sync with his actual Google Calendar.
- Sync is the primary Google Calendar only. Other calendars on the account stay out of Vertical.
- After sign-in, create and edit in Vertical write back to that primary calendar.
- An event has a start date, an optional end date for a multi-day span, an optional time, a title (1–160 characters), a color, and a repeat rule (`none`, `daily`, `weekly`, `monthly`, `yearly`) with interval, optional end date, and optional weekdays.
- Months scroll without a fixed end. Desktop shows months as columns. Mobile stacks months.
- The product name is Vertical.
- Future work must not invent customers, reviews, or social proof.

Open:

- Whether unsigned preview mode stays after Google sync ships.
- Whether the incumbent Supabase events table is removed or kept only as a fallback.
- Whether the voice assistant stays a preview or becomes a core capability.
- Whether ChatGPT hosting or sign-in from the starter is a product requirement.
- No accessibility standard was specified.

## Brand Commitments

- Name: Vertical.
- Existing app copy: “Vertical — Personal Calendar” and “A quiet, vertical calendar for your days.”
- No other name, logo, voice, or identity rule was made binding.

## Evidence on Hand

- Preview sample events live in `components/vertical-calendar.tsx` (Dentist, Dinner with Mom, Harry's birthday, Product review). These are demo data, not real user proof.
- There are no testimonials, case studies, press mentions, or customer assets.
- Future work must not fabricate social proof.

## Product Principles

1. One person, one Google calendar. Sign-in is Google only. Do not add Vertical accounts, sharing, or multi-user workflows unless Reed changes this.
2. Days, not grids. The product job is scanning a vertical list of days.
3. Quiet and personal. Do not add marketing claims, invented users, or social proof.
4. Google Calendar is the live store. Preview data is not Reed’s real schedule.
5. Keep the name Vertical.
