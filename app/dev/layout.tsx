import { SiteHeaderServer } from "@/app/_components/site-header-server";
import { Container } from "@/app/_components/ui/container";
import { BackToDevButton } from "@/app/dev/_components/back-to-dev-button";

import type { ReactNode } from "react";

// Layout voor alle /dev/* pagina's. Admin- en workflow-tools; de
// productie-app leeft onder app/(app)/.
export default function DevLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeaderServer />
      <Container className="flex flex-1 flex-col gap-6 py-8">
        <BackToDevButton />
        <div className="rounded-md border border-dashed border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
          <strong className="font-semibold text-foreground">/dev</strong> —
          admin- en workflow-tools. De productie-app leeft op{" "}
          <code className="font-mono">/oefenen</code>,{" "}
          <code className="font-mono">/leerplan</code> en{" "}
          <code className="font-mono">/voortgang</code>.
        </div>
        {children}
      </Container>
    </>
  );
}
