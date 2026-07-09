import { APP_ROUTES } from "@/lib/routes";

import type { ReactNode } from "react";

export type AppNavItem = {
  href: string;
  label: string;
  icon: ReactNode;
};

// Gedeelde iconenset voor top-nav (desktop) en tab-bar (mobiel).
// Inline SVG's — het project gebruikt bewust geen icon-library.
function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-5">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function CardsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-5">
      <rect x="3" y="6" width="14" height="12" rx="2" />
      <path d="M7 6V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-1" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-5">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

function CompassIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-5">
      <circle cx="12" cy="12" r="10" />
      <path d="m16.24 7.76-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-5">
      <path d="M3 3v18h18" />
      <path d="M7 15v3m4-7v7m4-11v11m4-5v5" />
    </svg>
  );
}

export const APP_NAV_ITEMS: AppNavItem[] = [
  { href: APP_ROUTES.vandaag, label: "Vandaag", icon: <SunIcon /> },
  { href: APP_ROUTES.oefenen, label: "Oefenen", icon: <CardsIcon /> },
  { href: APP_ROUTES.oefeningen, label: "Oefeningen", icon: <BookIcon /> },
  { href: APP_ROUTES.leerplan, label: "Leerplan", icon: <CompassIcon /> },
  { href: APP_ROUTES.voortgang, label: "Voortgang", icon: <ChartIcon /> },
];
