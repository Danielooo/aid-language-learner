import { redirect } from "next/navigation";

import { SiteHeaderServer } from "@/app/_components/site-header-server";
import { Container } from "@/app/_components/ui/container";
import { BackToDevButton } from "@/app/dev/_components/back-to-dev-button";
import { isAdminUser } from "@/lib/auth/is-admin";
import { APP_ROUTES } from "@/lib/routes";
import { getSupabaseServerClient } from "@/lib/supabase/server";

import type { ReactNode } from "react";

// /dev is lab/admin-tooling: alleen voor admins.
export default async function DevLayout({ children }: { children: ReactNode }) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`${APP_ROUTES.login}?next=/dev`);
  }
  if (!isAdminUser(user)) {
    redirect(APP_ROUTES.oefenen);
  }

  return (
    <>
      <SiteHeaderServer />
      <Container className="flex flex-1 flex-col gap-6 py-8">
        <BackToDevButton />
        <div className="rounded-md border border-dashed border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
          <strong className="font-semibold text-foreground">/dev</strong> —
          admin-labtools. Productiebeheer:{" "}
          <code className="font-mono">{APP_ROUTES.admin}</code>.
        </div>
        {children}
      </Container>
    </>
  );
}
