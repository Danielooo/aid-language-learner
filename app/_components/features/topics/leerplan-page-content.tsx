"use client";

import { useEffect, useState } from "react";

import { useAppProfile } from "@/app/(app)/_components/app-profile-provider";
import { AppPageHeader } from "@/app/_components/ui/app-page-header";

import { LearningTopicsPage } from "./learning-topics-page";

import type { LearningTopicsResponse } from "@/app/api/dev/learning-topics/route";

async function fetchLearningTopicsSummary(): Promise<LearningTopicsResponse> {
  const res = await fetch("/api/dev/learning-topics", { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Status ${res.status}`);
  }
  return (await res.json()) as LearningTopicsResponse;
}

export function LeerplanPageContent() {
  const { username } = useAppProfile();
  const [activeCount, setActiveCount] = useState<number | null>(null);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [ownCount, setOwnCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await fetchLearningTopicsSummary();
        if (cancelled) return;
        setActiveCount(data.activeCount);
        setTotalCount(data.topics.length);
        setOwnCount(data.topics.filter((item) => item.isOwn).length);
      } catch {
        if (!cancelled) {
          setActiveCount(null);
          setTotalCount(null);
          setOwnCount(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const formatCount = (value: number | null) =>
    value != null ? value.toLocaleString("nl-NL") : "—";

  return (
    <div className="space-y-6">
      <AppPageHeader
        eyebrow="Leren"
        title="Leerplan"
        username={username}
        description="Kies welke topics je actief aan het leren bent. Alleen aangevinkte topics komen in oefenen en spaced repetition."
        stats={[
          { label: "Actief", value: formatCount(activeCount), loading },
          { label: "Totaal", value: formatCount(totalCount), loading },
          { label: "Eigen", value: formatCount(ownCount), loading },
        ]}
      />

      <LearningTopicsPage />
    </div>
  );
}
