import { CommunityPageContent } from "@/app/_components/features/community/community-page-content";
import { AppPageHeader } from "@/app/_components/ui/app-page-header";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Community" };

export const dynamic = "force-dynamic";

export default function CommunityPage() {
  return (
    <div className="space-y-6">
      <AppPageHeader
        eyebrow="Bijdragen"
        title="Community"
        description="Bied oefeningengroepen aan en volg de status van je bijdragen. Pending, goedgekeurd en afgekeurd tonen de snapshot die je indiende — niet je actuele leerplan."
      />
      <CommunityPageContent />
    </div>
  );
}
