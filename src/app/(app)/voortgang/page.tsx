import { VoortgangPageContent } from "@/app/_components/features/dashboard/voortgang-page-content";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Voortgang" };

export default function VoortgangPage() {
  return <VoortgangPageContent />;
}
