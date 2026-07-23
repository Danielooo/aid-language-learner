"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { fetchJson } from "@/lib/api/fetch-json";
import { queryKeys } from "@/lib/query-keys";

import type {
  ExerciseGroupDetailSuccess,
  ExerciseGroupsListSuccess,
} from "@/types/exercise-groups";

export type TopicDestinationMode = "new" | "existing";

type DestinationActionsContext = {
  mode: TopicDestinationMode;
  topicName: string;
  blocked: boolean;
  existingTopicName: string | null;
};

type ProposalTopicDestinationProps = {
  suggestedTopic: string;
  topic: string;
  onTopicChange: (topic: string) => void;
  /** Gecontroleerde modus (parent/draft); voorkomt stale state na save/clear. */
  mode: TopicDestinationMode;
  onModeChange: (mode: TopicDestinationMode) => void;
  actions: (ctx: DestinationActionsContext) => React.ReactNode;
};

/**
 * Bestemming voor Generator-opslag: nieuw topic of toevoegen aan bestaand.
 * Bij bestaand: dropdown + preview van huidige oefeningen.
 */
export function ProposalTopicDestination({
  suggestedTopic,
  topic,
  onTopicChange,
  mode,
  onModeChange,
  actions,
}: ProposalTopicDestinationProps) {
  const { data: groups = [], isLoading: groupsLoading } = useQuery({
    queryKey: queryKeys.learningTopics(),
    queryFn: async () => {
      const body = await fetchJson<ExerciseGroupsListSuccess>(
        "/api/exercise-groups/mine",
      );
      return body.groups;
    },
  });

  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const autoPrefillKeyRef = useRef<string | null>(null);
  // Naam uit “Nieuw topic” bewaren terwijl je in “bestaand” zit.
  const newTopicDraftRef = useRef(topic);

  const trimmedTopic = topic.trim();
  const nameConflict =
    mode === "new" &&
    trimmedTopic.length > 0 &&
    groups.some((g) => g.name.trim() === trimmedTopic);

  const selectedGroup = useMemo(
    () => groups.find((g) => g.id === selectedGroupId) ?? null,
    [groups, selectedGroupId],
  );

  const blocked =
    !trimmedTopic ||
    (mode === "new" && nameConflict) ||
    (mode === "existing" && !selectedGroup);

  // Na hydrate / mode=existing: selectie koppelen aan topicnaam.
  useEffect(() => {
    if (mode !== "existing" || groups.length === 0 || !trimmedTopic) return;
    const match = groups.find((g) => g.name.trim() === trimmedTopic);
    if (!match) return;
    if (selectedGroupId === match.id) return;
    setSelectedGroupId(match.id);
  }, [mode, groups, trimmedTopic, selectedGroupId]);

  // Reset selectie wanneer parent terug naar “nieuw” gaat (save/clear).
  useEffect(() => {
    if (mode === "new") {
      setSelectedGroupId("");
    }
  }, [mode]);

  useEffect(() => {
    const key = suggestedTopic.trim();
    if (!key || groups.length === 0) return;
    if (autoPrefillKeyRef.current === key) return;
    autoPrefillKeyRef.current = key;
    // In “bestaand” heeft de user de bestemming zelf gekozen.
    if (mode === "existing") return;
    // Alleen auto-switch als topic nog leeg is of gelijk aan de AI-suggestie.
    if (trimmedTopic && trimmedTopic !== key) return;
    const match = groups.find((g) => g.name.trim() === key);
    if (!match) return;
    newTopicDraftRef.current = topic;
    onModeChange("existing");
    setSelectedGroupId(match.id);
    onTopicChange(match.name);
  }, [
    suggestedTopic,
    groups,
    onTopicChange,
    onModeChange,
    mode,
    topic,
    trimmedTopic,
  ]);

  function handleModeChange(next: TopicDestinationMode) {
    if (next === mode) return;

    if (next === "existing") {
      newTopicDraftRef.current = topic;
      onModeChange("existing");
      const match =
        groups.find((g) => g.name.trim() === trimmedTopic) ?? groups[0] ?? null;
      if (match) {
        setSelectedGroupId(match.id);
        onTopicChange(match.name);
      } else {
        setSelectedGroupId("");
      }
      return;
    }

    // Terug naar nieuw: herstel eerdere nieuw-naam (mag leeg zijn).
    onModeChange("new");
    setSelectedGroupId("");
    onTopicChange(newTopicDraftRef.current);
  }

  function handleSelectGroup(groupId: string) {
    setSelectedGroupId(groupId);
    const group = groups.find((g) => g.id === groupId);
    if (group) onTopicChange(group.name);
  }

  return (
    <div className="space-y-3">
      <div
        role="radiogroup"
        aria-label="Bestemming"
        className="flex flex-wrap gap-2"
      >
        <DestinationRadio
          checked={mode === "new"}
          onSelect={() => handleModeChange("new")}
          label="Nieuw topic"
        />
        <DestinationRadio
          checked={mode === "existing"}
          onSelect={() => handleModeChange("existing")}
          label="Toevoegen aan bestaand"
          disabled={groupsLoading || groups.length === 0}
        />
      </div>

      {mode === "existing" &&
        suggestedTopic.trim() &&
        selectedGroup &&
        selectedGroup.name.trim() === suggestedTopic.trim() && (
          <p className="text-xs text-muted-foreground" role="status">
            AI stelde “{selectedGroup.name}” voor — dat topic heb je al (
            {selectedGroup.exerciseCount} oefening
            {selectedGroup.exerciseCount === 1 ? "" : "en"}).
          </p>
        )}

      <div className="flex flex-wrap items-end gap-3">
        {mode === "new" ? (
          <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-sm">
            <span className="text-xs text-muted-foreground">Topic</span>
            <input
              type="text"
              value={topic}
              onChange={(e) => onTopicChange(e.target.value)}
              className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground aria-[invalid=true]:border-destructive"
              aria-label="Naam van het nieuwe topic"
              aria-invalid={nameConflict}
            />
          </label>
        ) : (
          <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-sm">
            <span className="text-xs text-muted-foreground">Bestaand topic</span>
            <select
              value={selectedGroupId}
              onChange={(e) => handleSelectGroup(e.target.value)}
              className="h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground"
              aria-label="Kies een bestaand topic"
              disabled={groups.length === 0}
            >
              {groups.length === 0 ? (
                <option value="">Geen topics in Leerplan</option>
              ) : (
                <>
                  {!selectedGroupId && (
                    <option value="">Kies een topic…</option>
                  )}
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </>
              )}
            </select>
          </label>
        )}
        {actions({
          mode,
          topicName: trimmedTopic,
          blocked,
          existingTopicName:
            mode === "existing" ? (selectedGroup?.name ?? null) : null,
        })}
      </div>

      {mode === "new" && nameConflict && (
        <p className="text-sm text-destructive" role="alert">
          Deze naam bestaat al. Kies “Toevoegen aan bestaand” of een andere
          naam.
        </p>
      )}

      {mode === "existing" && selectedGroupId ? (
        <ExistingTopicPreview groupId={selectedGroupId} />
      ) : null}
    </div>
  );
}

function DestinationRadio({
  checked,
  onSelect,
  label,
  disabled = false,
}: {
  checked: boolean;
  onSelect: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      disabled={disabled}
      onClick={onSelect}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${
        checked
          ? "bg-muted text-foreground"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

function ExistingTopicPreview({ groupId }: { groupId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.learningTopic(groupId),
    queryFn: async () => {
      const body = await fetchJson<
        ExerciseGroupDetailSuccess & { error?: string }
      >(`/api/exercise-groups/mine/${groupId}`);
      if (!body.ok) {
        throw new Error(body.error ?? "Kon topic niet laden.");
      }
      return body.group;
    },
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Laden…</p>;
  }

  if (error) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {error instanceof Error ? error.message : "Kon topic niet laden."}
      </p>
    );
  }

  const members = data?.members ?? [];

  // Standaard ingeklapt: voorstel-tabel blijft bereikbaar zonder scrollen.
  return (
    <details className="group space-y-2">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
        <span
          aria-hidden="true"
          className="inline-block transition-transform group-open:rotate-90"
        >
          ▸
        </span>
        Bestaande oefeningen in dit topic ({members.length})
      </summary>
      {members.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Dit topic heeft nog geen oefeningen.
        </p>
      ) : (
        <div className="max-h-48 overflow-y-auto rounded-md border border-border">
          <ul className="divide-y divide-border">
            {members.map((m) => (
              <li key={m.id} className="space-y-0.5 px-3 py-2">
                <p className="text-sm text-foreground">{m.source_text}</p>
                <p className="text-sm text-muted-foreground">{m.target_text}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </details>
  );
}
