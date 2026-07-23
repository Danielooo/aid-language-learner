import { redirect } from "next/navigation";

import { APP_ROUTES } from "@/lib/routes";

/** Oude URL: doorverwijzen naar /admin/bijdragen. */
export default function AdminReviewRedirectPage() {
  redirect(APP_ROUTES.adminBijdragen);
}
