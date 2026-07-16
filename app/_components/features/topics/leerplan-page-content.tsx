"use client";

import { useCallback, useState } from "react";

import { useAppProfile } from "@/app/(app)/_components/app-profile-provider";
import { AppPageHeader } from "@/app/_components/ui/app-page-header";

import { LeerplanGroupsPage } from "./leerplan-groups-page";

export function LeerplanPageContent() {
  const { displayLabel } = useAppProfile();
  const [personalCount, setPersonalCount] = useState<number | null>(null);
  const [activeCount, setActiveCount] = useState<number | null>(null);
  const [globalCount, setGlobalCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const handleStatsChange = useCallback(
    (stats: {
      personalCount: number;
      activeCount: number;
      globalCount: number;
    }) => {
      setPersonalCount(stats.personalCount);
      setActiveCount(stats.activeCount);
      setGlobalCount(stats.globalCount);
      setLoading(false);
    },
    [],
  );

  const formatCount = (value: number | null) =>
    value != null ? value.toLocaleString("nl-NL") : "—";

  return (
    <div className="space-y-6">
      <AppPageHeader
        eyebrow="Leren"
        title="Leerplan"
        accountLabel={displayLabel}
        description="Beheer je persoonlijke oefeningengroepen en haal community-oefeningengroepen binnen. Alleen actieve groepen komen in oefenen en spaced repetition."
        stats={[
          {
            label: "Persoonlijk",
            value: formatCount(personalCount),
            loading,
          },
          { label: "Actief", value: formatCount(activeCount), loading },
          { label: "Community", value: formatCount(globalCount), loading },
        ]}
      />

      <LeerplanGroupsPage onStatsChange={handleStatsChange} />
    </div>
  );
}
