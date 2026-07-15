-- OAuth-logins (Google/GitHub) hebben geen `user_metadata.username` zoals
-- de username/wachtwoord-flow. Leid daarom een username af uit provider-
-- metadata of het e-mailadres, saneer naar ons username-formaat
-- ([a-z0-9_-], max 32) en maak 'm uniek met een numeriek suffix zodat de
-- unique-constraint op profiles.username nooit de signup laat falen.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_username text;
  candidate text;
  suffix int := 0;
begin
  base_username := coalesce(
    nullif(new.raw_user_meta_data->>'username', ''),
    nullif(new.raw_user_meta_data->>'user_name', ''),
    nullif(new.raw_user_meta_data->>'preferred_username', ''),
    split_part(new.email, '@', 1)
  );

  base_username := left(
    regexp_replace(lower(coalesce(base_username, '')), '[^a-z0-9_-]', '-', 'g'),
    32
  );
  if length(base_username) < 2 then
    base_username := 'leerling';
  end if;

  candidate := base_username;
  while exists (select 1 from public.profiles where username = candidate) loop
    suffix := suffix + 1;
    candidate := left(base_username, 28) || '-' || suffix::text;
  end loop;

  insert into public.profiles (id, username)
  values (new.id, candidate)
  on conflict (id) do nothing;

  return new;
end;
$$;

-- Zelfde defense-in-depth als migration 0006: geen RPC-execute.
revoke execute on function public.handle_new_user()
  from anon, authenticated, public;
