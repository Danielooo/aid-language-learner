import { LearningTopicsPage } from "@/app/_components/features/topics/learning-topics-page";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Leerplan" };

export const dynamic = "force-dynamic";

export default function LeerplanPage() {
  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Mijn leerplan
        </h1>
        <p className="text-sm text-muted-foreground">
          Kies welke topics je actief aan het leren bent. Alleen aangevinkte
          topics komen in oefenen en spaced repetition.
        </p>
      </header>

      <LearningTopicsPage />
    </div>
  );
}
