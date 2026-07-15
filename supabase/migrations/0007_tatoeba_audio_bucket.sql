-- Storage-bucket voor Tatoeba audio-opnames die we via /dev/tatoeba-audio
-- ophalen en herhosten. Bucket is publiek: zo krijgen we een stabiele
-- embed-URL voor de <audio>-tag zonder per-request signed URLs te hoeven
-- genereren. Tatoeba's CDN-URLs zijn stabiel maar redirect/expire-gedrag
-- is niet gegarandeerd; herhosten geeft ons controle én laat ons later
-- offline-first features bouwen.
--
-- We slaan alléén audios op die hergebruik toestaan (CC0 of CC BY 2.0 FR).
-- De licentie-gate zit in de upload-route: die haalt het bestand binnen
-- via GET /v1/audios/{id}/file, dat 403 geeft als de auteur hergebruik
-- buiten Tatoeba verbiedt. Attribution leggen we vast als object-metadata
-- (auteur + attribution_url) zodat we het later in de UI kunnen tonen.

insert into storage.buckets (id, name, public, allowed_mime_types, file_size_limit)
values (
  'tatoeba-audio',
  'tatoeba-audio',
  true,
  array['audio/mpeg']::text[],
  -- 10 MB ruim voldoende voor zin-opnames van enkele seconden.
  10 * 1024 * 1024
)
on conflict (id) do nothing;

-- Public-read policy: omdat de bucket `public = true` is, kan iedereen via
-- /storage/v1/object/public/tatoeba-audio/... lezen. We voegen géén INSERT/
-- UPDATE/DELETE-policies toe voor `anon`/`authenticated`: schrijven kan
-- daardoor alléén met de service_role-key, die RLS bypasst. De API-route
-- in /api/admin/tatoeba/upload gebruikt `getSupabaseAdmin()` en is dus
-- de enige weg waarlangs er content in de bucket terechtkomt.
--
-- (Geen expliciete SELECT-policy nodig: de Supabase Storage-laag honoreert
-- `buckets.public = true` los van storage.objects-policies voor publieke
-- read-access.)
