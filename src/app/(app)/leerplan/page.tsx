import { LeerplanPageContent } from "@/components/features/topics/leerplan-page-content";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Leerplan" };

export const dynamic = "force-dynamic";

export default function LeerplanPage() {
  return <LeerplanPageContent />;
}
