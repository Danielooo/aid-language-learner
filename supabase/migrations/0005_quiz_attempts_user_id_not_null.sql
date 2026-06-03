-- Backfill bestaande `quiz_attempts.user_id` naar Danijelooo en
-- maak de kolom NOT NULL. Splitsing met 0004 is bewust: 0004
-- introduceert de kolom als nullable; pas nadat de seed-users
-- bestaan (via `npm run seed:users`) kunnen we dit afmaken.
--
-- We resolven de UUID via een lookup op `profiles.username` zodat de
-- migration draait zonder een hardgecodeerd id (en dus reproduceerbaar
-- is op een schone Supabase). Deze migration faalt expliciet als het
-- profile niet bestaat — dat is een duidelijk signaal dat de seed-
-- script niet (of niet-succesvol) is gedraaid.

do $$
declare
  danijelooo_id uuid;
begin
  select id into danijelooo_id
  from public.profiles
  where username = 'Danijelooo'
  limit 1;

  if danijelooo_id is null then
    raise exception
      'Profile "Danijelooo" niet gevonden — draai eerst `npm run seed:users`.';
  end if;

  update public.quiz_attempts
  set user_id = danijelooo_id
  where user_id is null;
end
$$;

alter table public.quiz_attempts
  alter column user_id set not null;
