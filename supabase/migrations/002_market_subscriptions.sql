-- supabase/migrations/002_market_subscriptions.sql
-- ───────────────────────────────────────────────────────────────────────────
-- market_subscriptions — per-user opt-ins for the daily 8am Pacific market
-- brief. Users pick which Canadian markets they want headlines for; the
-- cron walks this table and sends one email per subscriber.
--
-- Run after 001_saved_searches.sql via Supabase SQL editor.
-- ───────────────────────────────────────────────────────────────────────────

create table if not exists market_subscriptions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  -- One of: 'all', 'calgary', 'vancouver', 'edmonton', 'toronto'. Multiple
  -- rows per user to subscribe to multiple markets.
  market          text not null,
  -- Master on/off so the user can pause without deleting their picks.
  enabled         boolean not null default true,
  last_sent_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  -- One subscription row per (user, market). Prevents accidental dupes.
  unique (user_id, market)
);

create index if not exists market_subscriptions_market_idx
  on market_subscriptions(market, enabled);
create index if not exists market_subscriptions_user_idx
  on market_subscriptions(user_id);

alter table market_subscriptions enable row level security;

drop policy if exists "market_subscriptions_select_own" on market_subscriptions;
create policy "market_subscriptions_select_own"
  on market_subscriptions for select
  using (auth.uid() = user_id);

drop policy if exists "market_subscriptions_insert_own" on market_subscriptions;
create policy "market_subscriptions_insert_own"
  on market_subscriptions for insert
  with check (auth.uid() = user_id);

drop policy if exists "market_subscriptions_update_own" on market_subscriptions;
create policy "market_subscriptions_update_own"
  on market_subscriptions for update
  using (auth.uid() = user_id);

drop policy if exists "market_subscriptions_delete_own" on market_subscriptions;
create policy "market_subscriptions_delete_own"
  on market_subscriptions for delete
  using (auth.uid() = user_id);

create or replace function tg_market_subscriptions_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at := now(); return new; end;
$$;

drop trigger if exists trg_market_subscriptions_updated_at on market_subscriptions;
create trigger trg_market_subscriptions_updated_at
  before update on market_subscriptions
  for each row execute function tg_market_subscriptions_updated_at();
