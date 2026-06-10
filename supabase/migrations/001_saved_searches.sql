-- supabase/migrations/001_saved_searches.sql
-- ───────────────────────────────────────────────────────────────────────────
-- saved_searches — per-user Market Triggers saved search configs.
-- Migrates the localStorage-only "rde_market_searches_v1" state into Supabase
-- so the weekly cron auto-digest can read across users.
--
-- Run in your Supabase project's SQL editor:
--   Dashboard → SQL Editor → New Query → paste this → Run.
-- ───────────────────────────────────────────────────────────────────────────

create table if not exists saved_searches (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  name            text not null,
  area            text not null,                              -- "Calgary, AB" / "Downtown Edmonton"
  property_type   text default 'any',                         -- "any" | "multifamily" | "land" | ...
  max_price       integer,                                    -- in dollars; nullable
  email_enabled   boolean not null default true,              -- opted into weekly cron digest
  last_scan_at    timestamptz,                                -- when the user last ran this scan in-app
  last_scan_keys  jsonb default '[]'::jsonb,                  -- array of triggerKey strings for "new since" detection
  last_digest_at  timestamptz,                                -- when the cron last emailed a digest
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists saved_searches_user_idx
  on saved_searches(user_id);
create index if not exists saved_searches_digest_idx
  on saved_searches(email_enabled, last_digest_at);

-- Row-level security: users only see / mutate their own searches.
-- The cron uses the service-role key which bypasses RLS.
alter table saved_searches enable row level security;

drop policy if exists "saved_searches_select_own" on saved_searches;
create policy "saved_searches_select_own"
  on saved_searches for select
  using (auth.uid() = user_id);

drop policy if exists "saved_searches_insert_own" on saved_searches;
create policy "saved_searches_insert_own"
  on saved_searches for insert
  with check (auth.uid() = user_id);

drop policy if exists "saved_searches_update_own" on saved_searches;
create policy "saved_searches_update_own"
  on saved_searches for update
  using (auth.uid() = user_id);

drop policy if exists "saved_searches_delete_own" on saved_searches;
create policy "saved_searches_delete_own"
  on saved_searches for delete
  using (auth.uid() = user_id);

-- Auto-bump updated_at on every update.
create or replace function tg_saved_searches_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_saved_searches_updated_at on saved_searches;
create trigger trg_saved_searches_updated_at
  before update on saved_searches
  for each row execute function tg_saved_searches_updated_at();
