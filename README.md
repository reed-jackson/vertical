# Vertical

A minimalist personal calendar built with Next.js, React, Radix Themes, and Supabase.

## Local setup

1. Install Bun (1.3 or later).
2. Install dependencies with `bun install`.
3. Copy `.env.example` to `.env.local`.
4. Create a Supabase project and run `supabase/schema.sql` in its SQL editor.
5. Add your Supabase URL and service role key to `.env.local`.
6. Add `OPENAI_API_KEY` so the voice agent can use the Realtime API.
7. Run `bun run dev`.

The service role key is used only by the server route and is never exposed to the browser. Without Supabase credentials, Vertical opens in preview mode with sample events; events created in preview mode last only for the current session.

## Voice agent

The mic drawer talks to OpenAI Realtime over WebRTC. Your server calls `POST /v1/realtime/client_secrets` with `OPENAI_API_KEY`, then the browser uses the returned `ek_...` token. Tools run in the app: jump to a day, create, update, and remove events.

Create a key at https://platform.openai.com/api-keys and enable Realtime models for that project.

## Data model

Events are stored in the `public.events` table with a date, optional time, title, Radix-aligned color, and creation timestamp.
