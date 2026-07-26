// Centrale route-constanten voor de productie-app.
export const APP_ROUTES = {
  landing: "/",
  oefenen: "/oefenen",
  flashcards: "/oefenen/flashcards",
  typen: "/oefenen/typen",
  sorteren: "/oefenen/sorteren",
  leerplan: "/leerplan",
  community: "/community",
  generator: "/generator",
  voortgang: "/voortgang",
  profiel: "/profiel",
  admin: "/admin/bijdragen",
  adminBijdragen: "/admin/bijdragen",
  adminGebruikers: "/admin/gebruikers",
  adminAanmaken: "/admin/admin-aanmaken",
  login: "/login",
  register: "/register",
} as const;

export type AppRoute = (typeof APP_ROUTES)[keyof typeof APP_ROUTES];

/** Bewerkpagina van een persoonlijke oefeningengroep. */
export function leerplanGroupPath(groupId: string): string {
  return `${APP_ROUTES.leerplan}/${groupId}`;
}
