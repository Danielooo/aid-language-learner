import { OefeningenPageContent } from "@/app/_components/features/exercises/oefeningen-page-content";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Oefeningen" };

export const dynamic = "force-dynamic";

export default function OefeningenPage() {
  return <OefeningenPageContent />;
}
