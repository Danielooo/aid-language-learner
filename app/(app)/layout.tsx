import { Container } from "@/app/_components/ui/container";
import { getDisplayLabel } from "@/lib/auth/display-label";
import { getAuthContext } from "@/lib/auth/get-auth-context";

import { AppProfileProvider } from "./_components/app-profile-provider";
import { AppTabBar, AppTopNav } from "./_components/app-shell-nav";

import type { ReactNode } from "react";

// App-shell voor de ingelogde productie-app: top-navigatie op desktop,
// bottom tab-bar op mobiel. De proxy beschermt deze routes; hier lezen
// we alleen het profiel voor de header.
export default async function AppLayout({ children }: { children: ReactNode }) {
  const {
    isAuthenticated,
    username: profileUsername,
    displayName,
  } = await getAuthContext();

  const username = profileUsername ?? (isAuthenticated ? "jij" : "gast");
  const accountLabel = isAuthenticated
    ? getDisplayLabel(displayName, username)
    : null;

  return (
    <AppProfileProvider username={username} displayName={displayName}>
      <AppTopNav accountLabel={accountLabel} />
      {/* pb-24 reserveert ruimte voor de mobiele tab-bar (+ safe area). */}
      <main className="flex flex-1 flex-col pb-24 md:pb-8">
        <Container width="xl" className="flex flex-1 flex-col gap-6 py-6">
          {children}
        </Container>
      </main>
      <AppTabBar />
    </AppProfileProvider>
  );
}
