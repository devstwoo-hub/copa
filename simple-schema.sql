create extension if not exists "pgcrypto";

drop table if exists public.predictions;

create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  match_no integer unique,
  stage text not null,
  kickoff_at timestamptz,
  home_team text not null,
  away_team text not null,
  venue text,
  home_score integer,
  away_score integer,
  status text not null default 'scheduled' check (status in ('scheduled', 'completed')),
  created_at timestamptz not null default now()
);

create table if not exists public.predictions (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  pick text not null check (pick in ('HOME', 'DRAW', 'AWAY')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (participant_id, match_id)
);

alter table public.participants enable row level security;
alter table public.matches enable row level security;
alter table public.predictions enable row level security;

drop policy if exists "participants_select_anon" on public.participants;
create policy "participants_select_anon"
on public.participants for select
to anon
using (true);

drop policy if exists "participants_insert_anon" on public.participants;
create policy "participants_insert_anon"
on public.participants for insert
to anon
with check (true);

drop policy if exists "participants_update_anon" on public.participants;
create policy "participants_update_anon"
on public.participants for update
to anon
using (true)
with check (true);

drop policy if exists "matches_select_anon" on public.matches;
create policy "matches_select_anon"
on public.matches for select
to anon
using (true);

drop policy if exists "matches_write_anon" on public.matches;
create policy "matches_write_anon"
on public.matches for all
to anon
using (true)
with check (true);

drop policy if exists "predictions_select_anon" on public.predictions;
create policy "predictions_select_anon"
on public.predictions for select
to anon
using (true);

drop policy if exists "predictions_insert_anon" on public.predictions;
create policy "predictions_insert_anon"
on public.predictions for insert
to anon
with check (
  exists (
    select 1 from public.matches
    where matches.id = match_id
      and matches.status = 'scheduled'
      and (matches.kickoff_at is null or matches.kickoff_at > now())
  )
);

drop policy if exists "predictions_update_anon" on public.predictions;
create policy "predictions_update_anon"
on public.predictions for update
to anon
using (true)
with check (
  exists (
    select 1 from public.matches
    where matches.id = match_id
      and matches.status = 'scheduled'
      and (matches.kickoff_at is null or matches.kickoff_at > now())
  )
);
