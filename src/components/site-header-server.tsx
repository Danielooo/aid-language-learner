import { SiteHeader } from "@/components/site-header";
import { getDisplayLabel } from "@/lib/auth/display-label";
import { getAuthContext } from "@/lib/auth/get-auth-context";

// Server Component: leest sessie + profiel en geeft zichtbare Naam door.
export async function SiteHeaderServer() {
  const { isAuthenticated, username, displayName } = await getAuthContext();

  if (!isAuthenticated || !username) {
    return <SiteHeader accountLabel={null} />;
  }

  return <SiteHeader accountLabel={getDisplayLabel(displayName, username)} />;
}
