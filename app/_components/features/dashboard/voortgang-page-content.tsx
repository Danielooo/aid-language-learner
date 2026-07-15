"use client";

import { Dashboard } from "./dashboard";
import { useDashboardStats } from "./use-dashboard-stats";
import { VoortgangHeader } from "./voortgang-header";

export function VoortgangPageContent() {
  const { stats, loading, error } = useDashboardStats();

  return (
    <div className="space-y-6">
      <VoortgangHeader />
      <Dashboard stats={stats} loading={loading} error={error} />
    </div>
  );
}
