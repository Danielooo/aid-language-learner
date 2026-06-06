-- Translation-metadata-kolommen op `public.exercises`. Aanvullend op
-- de Tatoeba-kolommen uit migration 0008.
--
-- Beide kolommen hebben een NOT NULL DEFAULT zodat bestaande rijen
-- (zowel seed-rijen als user-aangemaakte oefeningen) zonder migratie-
-- backfill geldig blijven. De UI op /dev/tatoeba-audio-search vult ze
-- expliciet wanneer een oefening vanuit de tabel-cache gepersist wordt.

alter table public.exercises
  add column if not exists target_text_manually_edited boolean not null default false,
  add column if not exists alternative_translations    text[]  not null default '{}';
