"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";

import { AppPageHeader } from "@/app/_components/ui/app-page-header";
import { ExercisesListPage } from "@/app/_components/features/exercises/exercises-list-page";
import { fetchJson } from "@/lib/api/fetch-json";
import { queryKeys } from "@/lib/query-keys";
import { APP_ROUTES, leerplanGroupPath } from "@/lib/routes";

import type { ExerciseGroupDetailSuccess } from "@/types/exercise-groups";

type LeerplanGroupEditPageProps = {
  groupId: string;
};

/**
 * Bewerkpagina voor één persoonlijk topic onder /leerplan/[id].
 */
export function LeerplanGroupEditPage({ groupId }: LeerplanGroupEditPageProps) {
  const {
    data: groupName = null,
    isPending: groupLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.learningTopic(groupId),
    queryFn: async () => {
      const body = await fetchJson<
        ExerciseGroupDetailSuccess & { error?: string }
      >(`/api/exercise-groups/mine/${groupId}`);
      if (!body.ok) {
        throw new Error(body.error ?? "Kon topic niet laden.");
      }
      return body.group.name;
    },
  });

  const groupError = error
    ? error instanceof Error
      ? error.message
      : "Kon topic niet laden."
    : null;

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

  const title =
    groupLoading || !groupName
      ? "Topic bewerken"
      : `Topic bewerken: ${groupName}`;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link
          href={APP_ROUTES.leerplan}
          className="inline-flex text-sm font-medium text-accent underline-offset-2 hover:underline"
        >
          ← Terug naar leerplan
        </Link>
        <AppPageHeader title={title} />
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
              Dit topic heeft nog geen oefeningen.{" "}
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
