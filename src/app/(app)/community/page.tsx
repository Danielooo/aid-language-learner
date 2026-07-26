import { CommunityPageContent } from "@/components/features/community/community-page-content";
import { AppPageHeader } from "@/components/ui/app-page-header";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Community" };

export const dynamic = "force-dynamic";

export default function CommunityPage() {
  return (
    <div className="space-y-6">
      <AppPageHeader
        title="Community"
        description="Haal onder Overnemen een goedgekeurd community-topic binnen als bewerkbare kopie in je leerplan, of bied eigen topics aan onder Bijdragen."
      />
      <CommunityPageContent />
    </div>
  );
}
