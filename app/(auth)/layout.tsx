import { Container } from "@/app/_components/ui/container";

import type { ReactNode } from "react";

// Smalle, gecentreerde layout voor /login en /register. Geen extra
// chrome — de site-header zit al in de root-layout.
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <Container width="sm" className="flex flex-1 items-start py-12">
      <div className="w-full rounded-lg border border-border bg-card p-6 text-card-foreground shadow-sm">
        {children}
      </div>
    </Container>
  );
}
