import { Container } from "@/app/_components/ui/container";
import { getSupabaseServerClient } from "@/lib/supabase/server";

import { AppTabBar, AppTopNav } from "./_components/app-shell-nav";

import type { ReactNode } from "react";

// App-shell voor de ingelogde productie-app: top-navigatie op desktop,
// bottom tab-bar op mobiel. De proxy beschermt deze routes; hier lezen
// we alleen het profiel voor de header.
export default async function AppLayout({ children }: { children: ReactNode }) {
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
    <>
      <AppTopNav username={profile?.username ?? null} />
      {/* pb-24 reserveert ruimte voor de mobiele tab-bar (+ safe area). */}
      <main className="flex flex-1 flex-col pb-24 md:pb-8">
        <Container width="xl" className="flex flex-1 flex-col gap-6 py-6">
          {children}
        </Container>
      </main>
      <AppTabBar />
    </>
  );
}
