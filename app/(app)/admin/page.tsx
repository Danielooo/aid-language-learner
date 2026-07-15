import Link from "next/link";

import { AppPageHeader } from "@/app/_components/ui/app-page-header";
import { APP_ROUTES } from "@/lib/routes";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Beheer" };

export const dynamic = "force-dynamic";

const CARDS = [
  {
    href: APP_ROUTES.adminOefeningen,
    title: "Global oefeningen",
    body: "Bekijk, verrijk en verwijder het gedeelde corpus.",
  },
  {
    href: APP_ROUTES.adminReview,
    title: "Review-queue",
    body: "Keur user-aanbiedingen goed of af (copy-on-approve).",
  },
  {
    href: APP_ROUTES.adminGebruikers,
    title: "Gebruikers",
    body: "Rollen, AI aan/uit, accounts deactiveren.",
  },
  {
    href: "/dev/tatoeba-audio-search",
    title: "Tatoeba-import",
    body: "Audio ophalen en als global corpus opslaan (dev-tool).",
  },
] as const;

export default function AdminHomePage() {
  return (
    <div className="space-y-6">
      <AppPageHeader
        eyebrow="Admin"
        title="Beheer"
        description="Content- en platformbeheer volgens de rollen-requirements."
      />
      <ul className="grid gap-3 sm:grid-cols-2">
        {CARDS.map((card) => (
          <li key={card.href}>
            <Link
              href={card.href}
              className="block rounded-md border border-border bg-card px-4 py-3 transition-colors hover:border-accent/40 hover:bg-muted/40"
            >
              <h2 className="text-sm font-semibold text-foreground">
                {card.title}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">{card.body}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
