import { redirect } from "next/navigation";

import { APP_ROUTES } from "@/lib/routes";

/** Oude URL: Tatoeba-import is weg; oefeningen komen via user + review. */
export default function AdminTatoebaImportRedirectPage() {
  redirect(APP_ROUTES.adminBijdragen);
}
