-- Doorzoekbare tekst van alternative_translations (PostgREST kan geen ::text-cast in .or()).
-- array_to_string is STABLE; wrapper als IMMUTABLE zodat STORED generated column mag.

create or replace function public.exercises_alts_to_text(alts text[])
returns text
language sql
immutable
parallel safe
as $$
  select coalesce(array_to_string(alts, ' '), '');
$$;

alter table public.exercises
  add column if not exists alternatives_search text
  generated always as (public.exercises_alts_to_text(alternative_translations)) stored;

comment on column public.exercises.alternatives_search is
  'Gegenereerd uit alternative_translations voor ilike-zoeken via PostgREST.';
