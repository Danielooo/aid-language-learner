import { redirect } from "next/navigation";
import Link from "next/link";

import { isUserBanned } from "@/lib/auth/is-banned";
import { isAdminUser } from "@/lib/auth/is-admin";
import { APP_ROUTES } from "@/lib/routes";
import { getSupabaseServerClient } from "@/lib/supabase/server";

import type { ReactNode } from "react";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`${APP_ROUTES.login}?next=${APP_ROUTES.admin}`);
  }
  if (isUserBanned(user)) {
    await supabase.auth.signOut();
    redirect(`${APP_ROUTES.login}?fout=deactivated`);
  }
  if (!isAdminUser(user)) {
    redirect(APP_ROUTES.oefenen);
  }

  const links = [
    { href: APP_ROUTES.adminBijdragen, label: "Bijdragen beoordelen" },
    { href: APP_ROUTES.adminGebruikers, label: "Gebruikers beheren" },
    { href: APP_ROUTES.adminAanmaken, label: "Admin aanmaken" },
  ] as const;

  return (
    <div className="space-y-6">
      <nav
        aria-label="Admin-navigatie"
        className="flex flex-wrap gap-2 border-b border-border pb-3"
      >
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {link.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
