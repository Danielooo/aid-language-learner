// Centrale route-constanten voor de productie-app.
export const APP_ROUTES = {
  landing: "/",
  oefenen: "/oefenen",
  flashcards: "/oefenen/flashcards",
  typen: "/oefenen/typen",
  sorteren: "/oefenen/sorteren",
  leerplan: "/leerplan",
  community: "/community",
  oefeningen: "/oefeningen",
  generator: "/generator",
  voortgang: "/voortgang",
  profiel: "/profiel",
  admin: "/admin",
  adminOefeningen: "/admin/oefeningen",
  adminReview: "/admin/review",
  adminGebruikers: "/admin/gebruikers",
  adminTatoebaImport: "/admin/tatoeba-import",
  login: "/login",
  register: "/register",
} as const;

export type AppRoute = (typeof APP_ROUTES)[keyof typeof APP_ROUTES];
