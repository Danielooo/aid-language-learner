import { redirect } from "next/navigation";

import { APP_ROUTES } from "@/lib/routes";

/** Oude URL: corpus-UI is weg; admin keurt alleen via de review-queue. */
export default function AdminOefeningenRedirectPage() {
  redirect(APP_ROUTES.adminReview);
}
