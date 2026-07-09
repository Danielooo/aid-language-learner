import Link from "next/link";
import { Suspense } from "react";

import { ExercisesListPage } from "@/app/_components/features/exercises/exercises-list-page";
import { APP_ROUTES } from "@/lib/routes";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mijn oefeningen" };

export const dynamic = "force-dynamic";

export default function OefeningenPage() {
  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Mijn oefeningen
          </h1>
          <p className="text-sm text-muted-foreground">
            Je eigen opgeslagen oefeningen: bekijk, bewerk of verwijder ze.
          </p>
        </div>
        <Link
          href={APP_ROUTES.generator}
          className="inline-flex min-h-10 items-center rounded-md bg-accent px-4 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90"
        >
          + Genereer nieuwe oefeningen
        </Link>
      </header>

      <Suspense
        fallback={
          <p className="text-xs text-muted-foreground">Oefeningen laden...</p>
        }
      >
        <ExercisesListPage
          apiBase="/api/dev/my-exercises"
          pagePath="/oefeningen"
          tableScope="my-exercises"
          topicsUrl="/api/dev/my-exercises/topics"
          emptyMessage={
            <>
              Nog geen oefeningen opgeslagen.{" "}
              <Link
                href={APP_ROUTES.generator}
                className="font-medium text-accent underline-offset-2 hover:underline"
              >
                Ga naar de generator
              </Link>{" "}
              om je eerste set te maken.
            </>
          }
        />
      </Suspense>
    </div>
  );
}
