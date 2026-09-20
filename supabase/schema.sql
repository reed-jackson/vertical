create extension if not exists "pgcrypto";

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  event_date date not null,
  title text not null check (char_length(title) between 1 and 160),
  event_time time,
  color text not null,
  end_date date,
  repeat_rule text not null default 'none' check (repeat_rule in ('none', 'daily', 'weekly', 'monthly', 'yearly')),
  repeat_interval integer not null default 1 check (repeat_interval between 1 and 99),
  repeat_until date,
  repeat_weekdays smallint[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.events add column if not exists end_date date;
alter table public.events add column if not exists repeat_rule text not null default 'none';
alter table public.events add column if not exists repeat_interval integer not null default 1;
alter table public.events add column if not exists repeat_until date;
alter table public.events add column if not exists repeat_weekdays smallint[] not null default '{}';

create index if not exists events_event_date_idx on public.events (event_date, event_time);

alter table public.events enable row level security;

-- Vertical accesses this table through its server-only service role key.
-- No browser-facing policies are required.
