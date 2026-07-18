"use client";

import { AppPageHeader } from "@/app/_components/ui/app-page-header";

import { LeerplanGroupsPage } from "./leerplan-groups-page";

export function LeerplanPageContent() {
  return (
    <div className="space-y-6">
      <AppPageHeader
        eyebrow="Leren"
        title="Leerplan"
        description="Overzicht van je persoonlijke oefeningengroepen. Klik op een groep om oefeningen te bewerken. Alleen actieve groepen komen in oefenen en spaced repetition. Community-groepen haal je binnen via Community → Overnemen."
      />

      <LeerplanGroupsPage />
    </div>
  );
}
