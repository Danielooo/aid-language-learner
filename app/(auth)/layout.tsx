import { SiteHeaderServer } from "@/app/_components/site-header-server";
import { Container } from "@/app/_components/ui/container";

import type { ReactNode } from "react";

// Smalle, gecentreerde layout voor /login en /register.
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeaderServer />
      <Container width="sm" className="flex flex-1 items-start py-12">
        <div className="w-full rounded-lg border border-border bg-card p-6 text-card-foreground shadow-sm">
          {children}
        </div>
      </Container>
    </>
  );
}
