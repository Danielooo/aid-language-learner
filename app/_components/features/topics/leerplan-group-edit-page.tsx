"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";

import { AppPageHeader } from "@/app/_components/ui/app-page-header";
import { ExercisesListPage } from "@/app/_components/features/exercises/exercises-list-page";
import { APP_ROUTES, leerplanGroupPath } from "@/lib/routes";

import type { ExerciseGroupDetailSuccess } from "@/types/exercise-groups";

type LeerplanGroupEditPageProps = {
  groupId: string;
};

/**
 * Bewerkpagina voor één persoonlijke oefeningengroep onder /leerplan/[id].
 */
export function LeerplanGroupEditPage({ groupId }: LeerplanGroupEditPageProps) {
  const [groupName, setGroupName] = useState<string | null>(null);
  const [groupError, setGroupError] = useState<string | null>(null);
  const [groupLoading, setGroupLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setGroupLoading(true);
      setGroupError(null);
      try {
        const res = await fetch(`/api/exercise-groups/mine/${groupId}`, {
          cache: "no-store",
        });
        const body = (await res.json()) as ExerciseGroupDetailSuccess & {
          error?: string;
        };
        if (!res.ok || !body.ok) {
          throw new Error(body.error ?? `Status ${res.status}`);
        }
        if (!cancelled) setGroupName(body.group.name);
      } catch (e) {
        if (!cancelled) {
          setGroupError(
            e instanceof Error ? e.message : "Kon groep niet laden.",
          );
          setGroupName(null);
        }
      } finally {
        if (!cancelled) setGroupLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [groupId]);

  if (groupError) {
    return (
      <div className="space-y-4">
        <Link
          href={APP_ROUTES.leerplan}
          className="text-sm font-medium text-accent underline-offset-2 hover:underline"
        >
          ← Terug naar leerplan
        </Link>
        <p className="text-sm text-destructive" role="alert">
          {groupError}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link
          href={APP_ROUTES.leerplan}
          className="inline-flex text-sm font-medium text-accent underline-offset-2 hover:underline"
        >
          ← Terug naar leerplan
        </Link>
        <AppPageHeader
          eyebrow="Leerplan"
          title="Oefeningengroep bewerken"
          description={
            groupLoading
              ? "Laden…"
              : groupName
                ? `Set: ${groupName}. Klik op een rij om een oefening aan te passen.`
                : "Klik op een rij om een oefening aan te passen."
          }
        />
      </div>

      <Suspense
        fallback={
          <p className="text-sm text-muted-foreground">Oefeningen laden…</p>
        }
      >
        <ExercisesListPage
          apiBase="/api/exercises/mine"
          pagePath={leerplanGroupPath(groupId)}
          groupId={groupId}
          emptyMessage={
            <>
              Deze set heeft nog geen oefeningen.{" "}
              <Link
                href={APP_ROUTES.generator}
                className="font-medium text-accent underline-offset-2 hover:underline"
              >
                Maak er via de generator
              </Link>
              .
            </>
          }
        />
      </Suspense>
    </div>
  );
}
