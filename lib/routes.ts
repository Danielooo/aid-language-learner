// Centrale route-constanten voor de productie-app. Gedeelde feature-
// components linken hiernaartoe zodat /dev-lab en productie dezelfde
// componenten kunnen gebruiken zonder hard-coded paden.
export const APP_ROUTES = {
  landing: "/",
  oefenen: "/oefenen",
  flashcards: "/oefenen/flashcards",
  typen: "/oefenen/typen",
  sorteren: "/oefenen/sorteren",
  leerplan: "/leerplan",
  oefeningen: "/oefeningen",
  generator: "/generator",
  voortgang: "/voortgang",
  profiel: "/profiel",
  login: "/login",
  register: "/register",
} as const;

export type AppRoute = (typeof APP_ROUTES)[keyof typeof APP_ROUTES];
