"use client";

import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { AppPageHeader } from "@/app/_components/ui/app-page-header";
import { ExercisesListPage } from "@/app/_components/features/exercises/exercises-list-page";
import { QuizBackToOverviewButton } from "@/app/_components/features/quiz/quiz-back-to-overview-button";
import { LeerplanGroupDeleteDialog } from "@/app/_components/features/topics/leerplan-group-delete-dialog";
import { fetchJson } from "@/lib/api/fetch-json";
import { queryKeys } from "@/lib/query-keys";
import { APP_ROUTES, leerplanGroupPath } from "@/lib/routes";

import type {
  ExerciseGroupDetailSuccess,
  ExerciseGroupsDeleteSuccess,
} from "@/types/exercise-groups";

type LeerplanGroupEditPageProps = {
  groupId: string;
};

/**
 * Bewerkpagina voor één persoonlijk topic onder /leerplan/[id].
 */
export function LeerplanGroupEditPage({ groupId }: LeerplanGroupEditPageProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

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

  const deleteTopicMutation = useMutation({
    mutationFn: async () => {
      await fetchJson<ExerciseGroupsDeleteSuccess>(
        `/api/exercise-groups/mine/${groupId}`,
        { method: "DELETE" },
      );
    },
    onSuccess: async () => {
      setDeleteConfirmOpen(false);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.learningTopics(),
      });
      queryClient.removeQueries({
        queryKey: queryKeys.learningTopic(groupId),
      });
      router.push(APP_ROUTES.leerplan);
    },
  });

  const groupError = error
    ? error instanceof Error
      ? error.message
      : "Kon topic niet laden."
    : null;

  const goToOverview = () => {
    router.push(APP_ROUTES.leerplan);
  };

  if (groupError) {
    return (
      <div className="space-y-4">
        <AppPageHeader
          title="Topic bewerken"
          actions={
            <QuizBackToOverviewButton
              onClick={goToOverview}
              showEscHint={false}
            />
          }
        />
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

  const deletingTopic = deleteTopicMutation.isPending;
  const deleteTopicError =
    deleteTopicMutation.error instanceof Error
      ? deleteTopicMutation.error.message
      : deleteTopicMutation.error
        ? "Topic verwijderen mislukt."
        : null;

  return (
    <div className="space-y-6">
      <AppPageHeader
        title={title}
        actions={
          <QuizBackToOverviewButton
            onClick={goToOverview}
            showEscHint={false}
          />
        }
      />

      {deleteTopicError ? (
        <p className="text-sm text-destructive" role="alert">
          {deleteTopicError}
        </p>
      ) : null}

      <Suspense
        fallback={
          <p className="text-sm text-muted-foreground">Oefeningen laden…</p>
        }
      >
        <ExercisesListPage
          apiBase="/api/exercises/mine"
          pagePath={leerplanGroupPath(groupId)}
          groupId={groupId}
          topicName={groupName}
          onDeleteTopic={() => deleteTopicMutation.mutateAsync()}
          emptyMessage={
            <>
              Dit topic heeft geen oefeningen.{" "}
              <button
                type="button"
                disabled={deletingTopic}
                onClick={() => setDeleteConfirmOpen(true)}
                className="font-medium text-destructive underline-offset-2 hover:underline disabled:opacity-50"
              >
                Topic verwijderen
              </button>
            </>
          }
        />
      </Suspense>

      <LeerplanGroupDeleteDialog
        open={deleteConfirmOpen}
        groupName={groupName}
        exerciseCount={0}
        deleting={deletingTopic}
        onCancel={() => {
          if (!deletingTopic) setDeleteConfirmOpen(false);
        }}
        onConfirm={() => deleteTopicMutation.mutate()}
      />
    </div>
  );
}
