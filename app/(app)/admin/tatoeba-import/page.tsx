import { AudioSearchPage } from "@/app/_components/features/tatoeba/audio-search-page";
import { AppPageHeader } from "@/app/_components/ui/app-page-header";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Tatoeba-import" };

export const dynamic = "force-dynamic";

export default function AdminTatoebaImportPage() {
  return (
    <div className="space-y-4">
      <AppPageHeader
        eyebrow="Admin"
        title="Tatoeba-import"
        description="Audio ophalen, semantisch zoeken, verrijken en als global corpus opslaan."
      />
      <AudioSearchPage />
    </div>
  );
}
