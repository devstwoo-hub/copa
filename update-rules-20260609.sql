alter table public.matches add column if not exists phase text not null default 'Primeira fase';
alter table public.matches add column if not exists result_pick text check (result_pick in ('HOME', 'DRAW', 'AWAY'));

drop policy if exists "predictions_insert_anon" on public.predictions;
create policy "predictions_insert_anon"
on public.predictions for insert
to anon
with check (
  exists (
    select 1 from public.matches
    where matches.id = match_id
      and matches.status = 'scheduled'
      and (matches.kickoff_at is null or matches.kickoff_at > now() + interval '1 hour')
  )
);

drop policy if exists "predictions_update_anon" on public.predictions;
create policy "predictions_update_anon"
on public.predictions for update
to anon
using (false)
with check (false);

grant usage on schema public to anon, authenticated;
grant select, insert, update on public.participants to anon, authenticated;
grant select, insert, update, delete on public.matches to anon, authenticated;
grant select, insert on public.predictions to anon, authenticated;

notify pgrst, 'reload schema';
