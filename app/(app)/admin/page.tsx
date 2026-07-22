import { redirect } from "next/navigation";

import { APP_ROUTES } from "@/lib/routes";

/** Hub-pagina is weg; Beheer opent standaard Bijdragen beoordelen. */
export default function AdminHomePage() {
  redirect(APP_ROUTES.adminBijdragen);
}
