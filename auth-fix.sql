create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1), 'Participante'),
    new.email
  )
  on conflict (id) do update
  set
    name = excluded.name,
    email = excluded.email;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

insert into public.profiles (id, name, email)
select
  id,
  coalesce(raw_user_meta_data->>'name', split_part(email, '@', 1), 'Participante'),
  email
from auth.users
on conflict (id) do update
set
  name = excluded.name,
  email = excluded.email;

-- Use somente se quiser liberar login de usuarios antigos que ficaram com e-mail sem confirmacao.
-- Para um bolao interno, o caminho mais simples e desativar "Confirm email" em Authentication > Sign In / Providers > Email.
-- update auth.users
-- set email_confirmed_at = coalesce(email_confirmed_at, now()),
--     confirmed_at = coalesce(confirmed_at, now())
-- where email = 'seu-email@exemplo.com';
