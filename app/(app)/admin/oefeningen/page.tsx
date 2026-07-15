import { Suspense } from "react";

import { ExercisesListPage } from "@/app/_components/features/exercises/exercises-list-page";
import { AppPageHeader } from "@/app/_components/ui/app-page-header";
import { APP_ROUTES } from "@/lib/routes";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Global oefeningen" };

export const dynamic = "force-dynamic";

export default function AdminOefeningenPage() {
  return (
    <div className="space-y-6">
      <AppPageHeader
        eyebrow="Admin"
        title="Global oefeningen"
        description="Alleen corpus-rijen zonder eigenaar (owner_id null)."
      />
      <Suspense
        fallback={
          <p className="text-xs text-muted-foreground">Oefeningen laden...</p>
        }
      >
        <ExercisesListPage
          apiBase="/api/admin/exercises"
          pagePath={APP_ROUTES.adminOefeningen}
          tableScope="admin-globals"
          topicsUrl="/api/admin/tatoeba/existing-topics"
          emptyMessage="Nog geen globale oefeningen in het corpus."
        />
      </Suspense>
    </div>
  );
}
