import { Container } from "@/app/_components/ui/container";

import type { ReactNode } from "react";

// Layout voor alle /dev/* pagina's. Maakt visueel duidelijk dat dit
// exploratie-tooling is, geen kernfunctionaliteit van de app. Tijdens
// productie-builds zou je dit segment of achter een env-flag zetten,
// of weghalen — nu staat het in de tree als referentie tijdens het
// onderzoek naar de externe API's.
export default function DevLayout({ children }: { children: ReactNode }) {
  return (
    <Container className="flex flex-1 flex-col gap-6 py-8">
      <div className="rounded-md border border-dashed border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
        <strong className="font-semibold text-foreground">/dev</strong> —
        exploratie-pagina&apos;s voor externe API&apos;s. Niet gekoppeld aan
        auth of database. Verwijderbaar zonder impact op de app.
      </div>
      {children}
    </Container>
  );
}
