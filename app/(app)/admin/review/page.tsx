import { AdminReviewQueue } from "@/app/_components/features/admin/admin-review-queue";
import { AppPageHeader } from "@/app/_components/ui/app-page-header";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Review-queue" };

export const dynamic = "force-dynamic";

export default function AdminReviewPage() {
  return (
    <div className="space-y-6">
      <AppPageHeader
        eyebrow="Admin"
        title="Review-queue"
        description="Pending aanbiedingen van users. Goedkeuren maakt een aparte global-kopie."
      />
      <AdminReviewQueue />
    </div>
  );
}
