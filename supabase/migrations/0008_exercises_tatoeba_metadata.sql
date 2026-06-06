-- Tatoeba metadata-kolommen op `public.exercises`. Bewust nullable
-- zodat bestaande/handmatige oefeningen ongemoeid blijven; alleen
-- rijen die via /dev/tatoeba-audio-search gepersist worden krijgen
-- deze velden gevuld.
--
-- Geen UNIQUE constraint op tatoeba_audio_id of tatoeba_sentence_id:
-- de UI biedt expliciet "beide bewaren" (oude + nieuwe) bij dubbeling.
-- Duplicate-detect gebeurt application-side via een preflight-query
-- in de persist-batch route.

alter table public.exercises
  add column if not exists tatoeba_audio_id        bigint,
  add column if not exists tatoeba_sentence_id     bigint,
  add column if not exists source_lang             text,
  add column if not exists audio_path              text,
  add column if not exists tatoeba_author          text,
  add column if not exists tatoeba_license         text,
  add column if not exists tatoeba_attribution_url text;

-- Partial indexes: alleen rijen met daadwerkelijk Tatoeba-metadata
-- worden geïndexeerd, zodat de bestaande seed-/user-rijen geen
-- index-bloat veroorzaken.

create index if not exists exercises_tatoeba_audio_id_idx
  on public.exercises (tatoeba_audio_id)
  where tatoeba_audio_id is not null;

create index if not exists exercises_tatoeba_sentence_id_idx
  on public.exercises (tatoeba_sentence_id)
  where tatoeba_sentence_id is not null;

-- Index voor het dashboard-aggregaat ("hoeveel oefeningen per taal
-- hebben een audio-bestand"). Partial omdat veruit de meeste rijen
-- géén audio_path zullen hebben.
create index if not exists exercises_audio_path_lang_idx
  on public.exercises (source_lang)
  where audio_path is not null;
