import { redirect } from "next/navigation";
import Link from "next/link";

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
  if (!isAdminUser(user)) {
    redirect(APP_ROUTES.oefenen);
  }

  const links = [
    { href: APP_ROUTES.adminOefeningen, label: "Global oefeningen" },
    { href: APP_ROUTES.adminReview, label: "Review-queue" },
    { href: APP_ROUTES.adminGebruikers, label: "Gebruikers" },
    { href: APP_ROUTES.adminTatoebaImport, label: "Tatoeba-import" },
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
