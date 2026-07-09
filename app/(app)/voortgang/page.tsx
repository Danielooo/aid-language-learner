import { VoortgangPageContent } from "@/app/_components/features/dashboard/voortgang-page-content";
import { getSupabaseServerClient } from "@/lib/supabase/server";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Voortgang" };

// Server Component wrapper: username ophalen, interactieve content in client-bundle.
export default async function VoortgangPage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null as { username: string } | null };

  const username = profile?.username ?? (user ? "jij" : "gast");

  return <VoortgangPageContent username={username} />;
}
