import { Dashboard } from "@/app/_components/features/dashboard/dashboard";
import { getSupabaseServerClient } from "@/lib/supabase/server";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Voortgang" };

// Server Component wrapper: header + intro hier, zodat alleen de
// daadwerkelijk-interactieve <Dashboard /> in de client-bundle landt.
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

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Voortgang — @{username}
        </h1>
        <p className="text-sm text-muted-foreground">
          Overzicht van je spaced repetition: op welke stap van het
          herhaalschema je oefeningen staan.
        </p>
      </header>

      <Dashboard />
    </div>
  );
}
