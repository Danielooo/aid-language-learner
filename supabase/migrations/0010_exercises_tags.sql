-- Tags-kolom op `public.exercises`. Aanvullend op de Tatoeba-kolommen
-- uit migration 0008 en de translation-kolommen uit migration 0009.
--
-- Comma-separated text (lowercase NL labels, bv. "eten,bestelling").
-- Bewust géén `text[]` of aparte tabel — de Tatoeba-enrichment-flow
-- heeft op dit moment alleen behoefte aan een dump-veld, niet aan
-- queryable tags. Migratie naar `text[]` later blijft trivial.
--
-- NOT NULL DEFAULT '' zodat bestaande rijen (seed + user-aangemaakt)
-- zonder backfill geldig blijven; de UI op /dev/tatoeba-audio-search
-- vult de kolom expliciet tijdens de Verrijk-flow.

alter table public.exercises
  add column if not exists tags text not null default '';

comment on column public.exercises.tags is
  'Comma-separated lowercase Nederlandse tags (bv. "eten,bestelling,beleefdheid"). Gegenereerd door AI tijdens de Tatoeba-audio enrichment-flow op /dev/tatoeba-audio-search.';
