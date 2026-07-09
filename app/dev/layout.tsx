import { SiteHeaderServer } from "@/app/_components/site-header-server";
import { Container } from "@/app/_components/ui/container";
import { BackToDevButton } from "@/app/dev/_components/back-to-dev-button";

import type { ReactNode } from "react";

// Layout voor alle /dev/* pagina's. Maakt visueel duidelijk dat dit
// exploratie-tooling is, geen kernfunctionaliteit van de app. Tijdens
// productie-builds zou je dit segment of achter een env-flag zetten,
// of weghalen — nu staat het in de tree als referentie tijdens het
// onderzoek naar de externe API's.
export default function DevLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeaderServer />
      <Container className="flex flex-1 flex-col gap-6 py-8">
        <BackToDevButton />
        <div className="rounded-md border border-dashed border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
          <strong className="font-semibold text-foreground">/dev</strong> —
          exploratie-pagina&apos;s en lab-tooling. De productie-app leeft op{" "}
          <code className="font-mono">/vandaag</code>,{" "}
          <code className="font-mono">/oefenen</code>,{" "}
          <code className="font-mono">/leerplan</code> en{" "}
          <code className="font-mono">/voortgang</code>.
        </div>
        {children}
      </Container>
    </>
  );
}
