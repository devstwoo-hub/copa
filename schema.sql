create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text,
  role text not null default 'player' check (role in ('player', 'admin')),
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
  user_id uuid not null references public.profiles(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  pick text not null check (pick in ('HOME', 'DRAW', 'AWAY')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, match_id)
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

alter table public.profiles enable row level security;
alter table public.matches enable row level security;
alter table public.predictions enable row level security;

drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated"
on public.profiles for select
to authenticated
using (true);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin"
on public.profiles for update
to authenticated
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

drop policy if exists "matches_select_authenticated" on public.matches;
create policy "matches_select_authenticated"
on public.matches for select
to authenticated
using (true);

drop policy if exists "matches_write_admin" on public.matches;
create policy "matches_write_admin"
on public.matches for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "predictions_select_authenticated" on public.predictions;
create policy "predictions_select_authenticated"
on public.predictions for select
to authenticated
using (true);

drop policy if exists "predictions_insert_own_before_match" on public.predictions;
create policy "predictions_insert_own_before_match"
on public.predictions for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.matches
    where matches.id = match_id
      and matches.status = 'scheduled'
      and (matches.kickoff_at is null or matches.kickoff_at > now())
  )
);

drop policy if exists "predictions_update_own_before_match" on public.predictions;
create policy "predictions_update_own_before_match"
on public.predictions for update
to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.matches
    where matches.id = match_id
      and matches.status = 'scheduled'
      and (matches.kickoff_at is null or matches.kickoff_at > now())
  )
);
