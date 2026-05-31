import { SiteHeader } from "@/app/_components/site-header";
import { getSupabaseServerClient } from "@/lib/supabase/server";

// Server-side wrapper rond [SiteHeader](./site-header.tsx). Leest de
// sessie uit cookies en haalt de username uit `public.profiles`. We
// kunnen niet direct uit `claims.user_metadata.username` lezen want
// dat metadata is user-editable en dus onbetrouwbaar voor
// authorization-context. `profiles.username` is daarom de bron.
export async function SiteHeaderServer() {
  const supabase = await getSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <SiteHeader username={null} />;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();

  return <SiteHeader username={profile?.username ?? null} />;
}
