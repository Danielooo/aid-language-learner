import { getSupabaseServerClient } from "@/lib/supabase/server";

import { VandaagContent } from "./_components/vandaag-content";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Vandaag" };

export const dynamic = "force-dynamic";

// Datum in het Nederlands, bijvoorbeeld "donderdag 2 juli".
function formatToday(): string {
  return new Intl.DateTimeFormat("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Amsterdam",
  }).format(new Date());
}

export default async function VandaagPage() {
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

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-sm font-medium capitalize text-muted-foreground">
          {formatToday()}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          ¡Hola{profile?.username ? `, ${profile.username}` : ""}!
        </h1>
      </header>

      <VandaagContent />
    </div>
  );
}
