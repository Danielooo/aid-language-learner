import type { User } from "@supabase/supabase-js";

import { isAdminUser } from "@/lib/auth/is-admin";
import { APP_ROUTES } from "@/lib/routes";

/** Startroute per rol: admins → Beheer, overige users → Oefenen. */
export function getHomeRoute(user: User | null | undefined): string {
  return isAdminUser(user) ? APP_ROUTES.admin : APP_ROUTES.oefenen;
}
