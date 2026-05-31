-- Dev-only tabel voor de /dev/exercise-generator playground.
-- Bewust geen RLS, geen user_id, geen FKs: deze tabel is een
-- speeltuin voor het experimenteren met AI-generated content.
-- Wanneer de echte app-feature wordt gebouwd komt er een aparte
-- `exercises`-tabel met user_id + RLS (zie plan).

create table if not exists public.dev_exercises (
  id          uuid        primary key default gen_random_uuid(),
  source_text text        not null,
  target_text text        not null,
  topic       text,
  created_at  timestamptz not null default now()
);

-- Index op created_at voor snelle "recente eerst" listings.
create index if not exists dev_exercises_created_at_idx
  on public.dev_exercises (created_at desc);
