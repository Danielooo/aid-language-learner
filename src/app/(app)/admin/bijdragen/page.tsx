import { AdminReviewQueue } from "@/components/features/admin/admin-review-queue";
import { AppPageHeader } from "@/components/ui/app-page-header";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Bijdragen beoordelen" };

export const dynamic = "force-dynamic";

export default function AdminBijdragenPage() {
  return (
    <div className="space-y-6">
      <AppPageHeader
        title="Bijdragen beoordelen"
        description="Groep-aanbiedingen beoordelen: Pending, Goedgekeurd en Afgekeurd. Status kun je heen-en-weer zetten."
      />
      <AdminReviewQueue />
    </div>
  );
}
