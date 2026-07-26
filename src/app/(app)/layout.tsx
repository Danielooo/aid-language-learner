import { redirect } from "next/navigation";

import { Container } from "@/components/ui/container";
import { getDisplayLabel } from "@/lib/auth/display-label";
import { getAuthContext } from "@/lib/auth/get-auth-context";
import { isUserBanned } from "@/lib/auth/is-banned";
import { isAdminUser } from "@/lib/auth/is-admin";
import { APP_ROUTES } from "@/lib/routes";
import { getSupabaseServerClient } from "@/lib/supabase/server";

import { AppProfileProvider } from "./_components/app-profile-provider";
import { AppTabBar, AppTopNav } from "./_components/app-shell-nav";

import type { ReactNode } from "react";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const {
    isAuthenticated,
    username: profileUsername,
    displayName,
  } = await getAuthContext();

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isUserBanned(user)) {
    await supabase.auth.signOut();
    redirect(`${APP_ROUTES.login}?fout=deactivated`);
  }

  const isAdmin = isAdminUser(user);

  const username = profileUsername ?? (isAuthenticated ? "jij" : "gast");
  const accountLabel = isAuthenticated
    ? getDisplayLabel(displayName, username)
    : null;

  return (
    <AppProfileProvider username={username} displayName={displayName}>
      <AppTopNav accountLabel={accountLabel} isAdmin={isAdmin} />
      <main className="flex flex-1 flex-col pb-24 md:pb-8">
        <Container width="xl" className="flex flex-1 flex-col gap-6 py-6">
          {children}
        </Container>
      </main>
      <AppTabBar isAdmin={isAdmin} />
    </AppProfileProvider>
  );
}
