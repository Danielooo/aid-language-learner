-- Weergavenaam en bio op het gebruikersprofiel (profielpagina).

alter table public.profiles
  add column if not exists display_name text,
  add column if not exists bio text;

alter table public.profiles
  drop constraint if exists profiles_display_name_length,
  drop constraint if exists profiles_bio_length;

alter table public.profiles
  add constraint profiles_display_name_length
    check (display_name is null or char_length(display_name) <= 80),
  add constraint profiles_bio_length
    check (bio is null or char_length(bio) <= 500);
