import { CommunityPageContent } from "@/app/_components/features/community/community-page-content";
import { AppPageHeader } from "@/app/_components/ui/app-page-header";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Community" };

export const dynamic = "force-dynamic";

export default function CommunityPage() {
  return (
    <div className="space-y-6">
      <AppPageHeader
        title="Community"
        description="Bied oefeningengroepen aan onder Bijdragen, of haal goedgekeurde community-groepen binnen onder Overnemen."
      />
      <CommunityPageContent />
    </div>
  );
}
