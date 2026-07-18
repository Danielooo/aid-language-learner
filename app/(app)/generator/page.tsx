import { GeneratorPageContent } from "@/app/_components/features/generator/generator-page-content";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Generator" };

export default function GeneratorPage() {
  return <GeneratorPageContent />;
}
