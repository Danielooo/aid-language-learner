import { SiteHeaderServer } from "@/components/site-header-server";
import { Container } from "@/components/ui/container";

import type { ReactNode } from "react";

// Smalle, gecentreerde layout voor /login en /register.
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeaderServer />
      <Container width="sm" className="flex flex-1 items-start py-12">
        <div className="border-border bg-card text-card-foreground w-full rounded-lg border p-6 shadow-sm">
          {children}
        </div>
      </Container>
    </>
  );
}
