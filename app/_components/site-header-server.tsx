import { SiteHeader } from "@/app/_components/site-header";
import { getAuthContext } from "@/lib/auth/get-auth-context";

// Server-side wrapper rond [SiteHeader](./site-header.tsx). Leest de
// sessie via Auth0 + Supabase en haalt de username uit `public.profiles`.
export async function SiteHeaderServer() {
  const { isAuthenticated, username } = await getAuthContext();

  if (!isAuthenticated) {
    return <SiteHeader username={null} />;
  }

  return <SiteHeader username={username} />;
}
