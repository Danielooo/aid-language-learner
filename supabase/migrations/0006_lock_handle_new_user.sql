-- Defense-in-depth: `handle_new_user()` is een SECURITY DEFINER-trigger
-- die in `public` woont, en is daarmee aanroepbaar via PostgREST RPC
-- (`/rest/v1/rpc/handle_new_user`) door zowel `anon` als `authenticated`.
-- In de praktijk faalt zo'n call omdat de functie `NEW` verwacht (alleen
-- beschikbaar binnen trigger-context), maar de Supabase advisor markeert
-- 'm terecht als risico. We trekken EXECUTE in voor beide rollen — de
-- trigger zelf draait nog steeds, want triggers gebruiken het functie-
-- eigenaarschap, niet de EXECUTE-grant van de aanroepende rol.

revoke execute on function public.handle_new_user() from anon, authenticated, public;
