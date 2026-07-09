"use client";

import { Dashboard } from "./dashboard";
import { useDashboardStats } from "./use-dashboard-stats";
import { VoortgangHeader } from "./voortgang-header";

type VoortgangPageContentProps = {
  username: string;
};

export function VoortgangPageContent({ username }: VoortgangPageContentProps) {
  const { stats, loading, error } = useDashboardStats();

  return (
    <div className="space-y-6">
      <VoortgangHeader username={username} stats={stats} loading={loading} />
      <Dashboard stats={stats} loading={loading} error={error} />
    </div>
  );
}
