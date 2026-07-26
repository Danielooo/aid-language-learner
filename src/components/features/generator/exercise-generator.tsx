"use client";

import { DefaultChatTransport } from "ai";
import { useChat } from "@ai-sdk/react";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ChatThread } from "@/components/features/chat/chat-thread";
import { ChatComposer } from "@/components/features/chat/chat-composer";
import type { ExerciseEditValues } from "@/components/features/exercises/exercise-edit-modal";
import { queryKeys } from "@/lib/query-keys";
import { useTextGeneratorDraft } from "@/hooks/use-text-generator-draft";

import { formatQuotaLabel, useAiQuota } from "./hooks/use-ai-quota";
import {
  GeneratorSavedGroupModal,
  type SavedGroupMember,
} from "./generator-saved-group-modal";
import {
  persistedMessagesToUIMessages,
  uiMessagesToPersisted,
} from "./persisted-chat-messages";
import { ProposalTable } from "./proposal-table";
import type { TopicDestinationMode } from "./proposal-topic-destination";
import {
  toUserFacingChatError,
  toUserFacingPersistError,
} from "./user-facing-error";
import type {
  ExercisesPersistBody,
  ProposalBatch,
  ProposeExercisesOutput,
} from "./proposal-table-adapter";
import {
  filterProposalBatchesByAudioIds,
  mergeProposalBatches,
  updateProposalExerciseByAudioId,
} from "./proposal-table-adapter";
import type { UIMessage } from "ai";

// Genereert Spaans→NL vertaaloefeningen via de Vercel AI SDK. De chatbot
// krijgt `listExistingExercises` + `proposeExercises`; zodra propose met
// output is aangeroepen rendert de UI een tabel met een "Topic opslaan"-knop.

type PersistResponse =
  | {
      ok: true;
      inserted: number;
      groupId?: string;
      groupName?: string;
      rows: Array<{
        id: string;
        source_text: string;
        target_text: string;
        topic: string | null;
        created_at: string;
      }>;
      requestBody: unknown;
      supabaseResponse: unknown;
    }
  | {
      ok: false;
      error: string;
      requestBody?: unknown;
      supabaseResponse?: unknown;
      issues?: unknown;
    };

type SavedGroupSnapshot = {
  name: string;
  members: SavedGroupMember[];
};

const SUGGESTIONS = [
  "Geef me 10 zinnen die je nodig hebt bij een autogarage",
  "Genereer 8 zinnen voor in een restaurant",
  "5 zinnen voor op de luchthaven, alsjeblieft",
];

const APPEND_SUGGESTION = "Voeg nog 5 zinnen toe";

export function ExerciseGenerator() {
  const draft = useTextGeneratorDraft();
  const restoredRef = useRef(false);
  const [draftHydrated, setDraftHydrated] = useState(false);
  const queryClient = useQueryClient();

  const [input, setInput] = useState("");
  const [batches, setBatches] = useState<ProposalBatch[]>([]);
  const [draftSelectedIds, setDraftSelectedIds] = useState<number[]>([]);
  const [draftTopic, setDraftTopic] = useState("");
  const [destinationMode, setDestinationMode] =
    useState<TopicDestinationMode>("new");
  const [emptyToolMessageIds, setEmptyToolMessageIds] = useState(
    () => new Set<string>(),
  );
  const processedBatchIds = useRef(new Set<string>());
  const batchesRef = useRef<ProposalBatch[]>([]);
  const mergedProposalRef = useRef<ProposeExercisesOutput | null>(null);
  const [persistState, setPersistState] = useState<{
    status: "idle" | "saving" | "success" | "error";
    requestBody: unknown;
    response: PersistResponse | null;
    error: string | null;
  }>({ status: "idle", requestBody: null, response: null, error: null });
  const [savedGroup, setSavedGroup] = useState<SavedGroupSnapshot | null>(null);
  const [savedModalOpen, setSavedModalOpen] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const { aiQuota, refreshAiQuota } = useAiQuota();

  const mergedProposal = useMemo(
    () => (batches.length > 0 ? mergeProposalBatches(batches) : null),
    [batches],
  );
  useEffect(() => {
    mergedProposalRef.current = mergedProposal;
  }, [mergedProposal]);

  useEffect(() => {
    batchesRef.current = batches;
  }, [batches]);

  /* eslint-disable react-hooks/refs -- transport-body leest de actuele draft via refs zonder transport te herbouwen */
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/exercises/chat",
        body: () => {
          const current = mergedProposalRef.current;
          if (!current || current.exercises.length === 0) return {};
          return {
            draftSummary: {
              topic: current.topic,
              count: current.exercises.length,
              existingSourceTexts: current.exercises.map(
                (exercise) => exercise.source_text,
              ),
            },
          };
        },
      }),
    [],
  );
  /* eslint-enable react-hooks/refs */

  const { messages, sendMessage, status, error, setMessages, stop } = useChat({
    transport,
  });

  const getAssistantFallbackText = useCallback(
    (message: UIMessage): string | null => {
      if (emptyToolMessageIds.has(message.id)) {
        return "Geen nieuwe oefeningen — alles was al in het voorstel.";
      }
      for (const part of message.parts) {
        if (
          part.type === "tool-proposeExercises" &&
          part.state === "output-available"
        ) {
          const output = part.output;
          if (!isProposeOutput(output)) continue;
          if (output.ok === false || output.exercises.length === 0) {
            return (
              output.error ??
              "Geen nieuwe oefeningen — die stonden al in je Leerplan of voorstel."
            );
          }
          const count = output.exercises.length;
          return count === 1
            ? "1 oefening toegevoegd"
            : `${count} oefeningen toegevoegd`;
        }
      }
      return null;
    },
    [emptyToolMessageIds],
  );

  // Eenmalig draft herstellen na mount (localStorage), na useChat i.v.m. setMessages.
  /* eslint-disable react-hooks/set-state-in-effect -- eenmalige draft-hydratie uit localStorage na useChat-init */
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    const snap = draft.snapshot;
    if (
      snap &&
      (snap.batches.length > 0 || snap.topic.trim() || snap.messages.length > 0)
    ) {
      setBatches(snap.batches);
      setDraftSelectedIds(snap.selectedAudioIds);
      setDraftTopic(snap.topic);
      setDestinationMode(snap.destinationMode);
      batchesRef.current = snap.batches;
      for (const batch of snap.batches) {
        processedBatchIds.current.add(batch.id);
      }
      if (snap.messages.length > 0) {
        setMessages(persistedMessagesToUIMessages(snap.messages));
      }
    }
    setDraftHydrated(true);
  }, [draft.snapshot, setMessages]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Batches + chat + topic/selectie persistent houden.
  useEffect(() => {
    if (!draftHydrated) return;
    const persistedMessages = uiMessagesToPersisted(
      messages,
      getAssistantFallbackText,
    );
    if (
      batches.length === 0 &&
      !draftTopic.trim() &&
      persistedMessages.length === 0
    ) {
      draft.clear();
      return;
    }
    draft.save({
      batches,
      selectedAudioIds: draftSelectedIds,
      topic: draftTopic || mergedProposal?.topic || "",
      messages: persistedMessages,
      destinationMode,
    });
  }, [
    draftHydrated,
    batches,
    draftSelectedIds,
    draftTopic,
    destinationMode,
    draft,
    mergedProposal?.topic,
    messages,
    getAssistantFallbackText,
  ]);

  const isBusy = status === "submitted" || status === "streaming";
  const wasBusyRef = useRef(false);
  const proposeError = useMemo(
    () => findLatestProposeError(messages),
    [messages],
  );
  const chatErrorMessage = error ? toUserFacingChatError(error) : null;

  useEffect(() => {
    if (isBusy) {
      wasBusyRef.current = true;
      return;
    }
    if (wasBusyRef.current && status === "ready") {
      wasBusyRef.current = false;
      void refreshAiQuota();
    }
  }, [isBusy, status, refreshAiQuota]);

  useEffect(() => {
    for (const msg of messages) {
      if (msg.role !== "assistant") continue;
      for (const part of msg.parts) {
        if (
          part.type === "tool-proposeExercises" &&
          part.state === "output-available"
        ) {
          const output = part.output;
          if (!isProposeOutput(output)) continue;
          const batchId = `${msg.id}:proposeExercises`;
          if (processedBatchIds.current.has(batchId)) continue;
          processedBatchIds.current.add(batchId);

          if (output.ok === false || output.exercises.length === 0) {
            setEmptyToolMessageIds((prev) => {
              if (prev.has(msg.id)) return prev;
              const next = new Set(prev);
              next.add(msg.id);
              return next;
            });
            continue;
          }

          const seen = new Set(
            batchesRef.current.flatMap((batch) =>
              batch.proposal.exercises.map((ex) =>
                ex.source_text.trim().toLowerCase(),
              ),
            ),
          );
          const unique = output.exercises.filter((ex) => {
            const key = ex.source_text.trim().toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
          if (unique.length === 0) {
            setEmptyToolMessageIds((prev) => {
              if (prev.has(msg.id)) return prev;
              const next = new Set(prev);
              next.add(msg.id);
              return next;
            });
            continue;
          }

          const nextBatch: ProposalBatch = {
            id: batchId,
            proposal: {
              topic: output.topic,
              exercises: unique,
            },
          };
          batchesRef.current = [...batchesRef.current, nextBatch];
          setBatches(batchesRef.current);
        }
      }
    }
  }, [messages]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = input.trim();
    if (!text) return;
    sendMessage({ text });
    setInput("");
  }

  function handleClearChat() {
    setMessages([]);
    setBatches([]);
    batchesRef.current = [];
    setDraftSelectedIds([]);
    setDraftTopic("");
    setDestinationMode("new");
    setEmptyToolMessageIds(new Set());
    processedBatchIds.current.clear();
    draft.clear();
    setPersistState({
      status: "idle",
      requestBody: null,
      response: null,
      error: null,
    });
    setConfirmClearOpen(false);
  }

  function handleCloseSavedModal() {
    setSavedModalOpen(false);
  }

  function handleDraftMetaChange(meta: {
    selectedAudioIds: number[];
    topic: string;
  }) {
    setDraftSelectedIds((prev) =>
      sameNumberArrays(prev, meta.selectedAudioIds)
        ? prev
        : meta.selectedAudioIds,
    );
    setDraftTopic((prev) => (prev === meta.topic ? prev : meta.topic));
  }

  function handleRemoveAudioIds(audioIds: number[]) {
    const remove = new Set(audioIds);
    const next = filterProposalBatchesByAudioIds(batchesRef.current, remove);
    batchesRef.current = next;
    setBatches(next);
  }

  function handleUpdateExercise(audioId: number, values: ExerciseEditValues) {
    const next = updateProposalExerciseByAudioId(batchesRef.current, audioId, {
      source_text: values.sourceText,
      target_text: values.targetText,
      tags: values.tags,
      alternative_translations: values.alternatives,
    });
    batchesRef.current = next;
    setBatches(next);
  }

  async function handleSave(requestBody: ExercisesPersistBody) {
    setPersistState({
      status: "saving",
      requestBody,
      response: null,
      error: null,
    });

    try {
      const res = await fetch("/api/exercises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      const json = (await res.json()) as PersistResponse;
      if (!res.ok || !json.ok) {
        setPersistState({
          status: "error",
          requestBody,
          response: json,
          error: toUserFacingPersistError(
            "error" in json ? json.error : undefined,
            res.status,
          ),
        });
        return;
      }

      const members: SavedGroupMember[] = requestBody.exercises.map(
        (ex, index) => ({
          key: `${ex.source_text}-${index}`,
          source_text: ex.source_text,
          target_text: ex.target_text,
          tags: ex.tags,
        }),
      );
      setSavedGroup({
        name: json.groupName ?? requestBody.topic,
        members,
      });
      setSavedModalOpen(true);

      setMessages([]);
      setBatches([]);
      batchesRef.current = [];
      setDraftSelectedIds([]);
      setDraftTopic("");
      setDestinationMode("new");
      setEmptyToolMessageIds(new Set());
      processedBatchIds.current.clear();
      draft.clear();
      setPersistState({
        status: "success",
        requestBody,
        response: json,
        error: null,
      });

      // Invalidate learning topics
      await queryClient.invalidateQueries({
        queryKey: queryKeys.learningTopics(),
      });
    } catch (err) {
      setPersistState({
        status: "error",
        requestBody,
        response: null,
        error: toUserFacingPersistError(
          err instanceof Error ? err.message : undefined,
        ),
      });
    }
  }

  const quotaLabel = formatQuotaLabel(aiQuota);
  const canClear = messages.length > 0 || batches.length > 0;

  return (
    <>
      {persistState.status === "success" && (
        <p className="border-accent/30 bg-accent/10 text-foreground rounded-md border px-3 py-2 text-sm">
          Opgeslagen. Vink topics aan om ze te oefenen via{" "}
          <Link
            href="/leerplan"
            className="text-accent font-medium underline-offset-2 hover:underline"
          >
            Leerplan
          </Link>
          .
        </p>
      )}

      <section className="border-border bg-card text-card-foreground space-y-3 rounded-lg border p-5">
        <header className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Chat</h2>
          {canClear && (
            <button
              type="button"
              onClick={() => setConfirmClearOpen(true)}
              className="border-border hover:bg-muted h-9 rounded border px-3 text-xs font-medium"
            >
              Gesprek en oefeningen wissen
            </button>
          )}
        </header>

        <ChatThread
          messages={messages}
          status={status}
          getAssistantFallbackText={getAssistantFallbackText}
          emptyState={
            <div className="text-muted-foreground space-y-2 text-sm">
              <p>Nog geen berichten. Probeer:</p>
              <ul className="space-y-1.5">
                {SUGGESTIONS.map((s) => (
                  <li key={s}>
                    <button
                      type="button"
                      onClick={() => setInput(s)}
                      className="border-border bg-background text-foreground hover:bg-muted inline-flex h-9 max-w-full items-center rounded-md border px-3 text-left text-xs"
                    >
                      {s}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          }
        />

        {(chatErrorMessage || proposeError) && (
          <div
            className="border-destructive/50 bg-destructive/10 text-destructive rounded-md border p-3 text-sm"
            role="alert"
          >
            <p>{chatErrorMessage ?? proposeError}</p>
          </div>
        )}

        {batches.length > 0 && (
          <button
            type="button"
            onClick={() => setInput(APPEND_SUGGESTION)}
            className="border-border bg-background text-foreground hover:bg-muted inline-flex h-9 items-center rounded-md border px-3 text-xs"
          >
            {APPEND_SUGGESTION}
          </button>
        )}

        <ChatComposer
          input={input}
          onInputChange={setInput}
          onSubmit={handleSubmit}
          onStop={() => stop()}
          isBusy={isBusy}
          placeholder={
            batches.length > 0
              ? "Voeg nog zinnen toe, bv. nog 5 zinnen"
              : "bv. Geef me 10 zinnen voor een autogarage"
          }
          submitLabel="Genereer"
        />

        {quotaLabel && (
          <p className="text-muted-foreground text-[11px]">{quotaLabel}</p>
        )}
      </section>

      <ProposalTable
        batches={batches}
        proposal={mergedProposal}
        persistState={persistState}
        onSave={handleSave}
        initialSelectedIds={draftSelectedIds}
        initialTopic={draftTopic || mergedProposal?.topic || ""}
        destinationMode={destinationMode}
        onDestinationModeChange={setDestinationMode}
        onRemoveAudioIds={handleRemoveAudioIds}
        onUpdateExercise={handleUpdateExercise}
        onDraftMetaChange={handleDraftMetaChange}
      />

      <GeneratorSavedGroupModal
        open={savedModalOpen}
        name={savedGroup?.name ?? null}
        members={savedGroup?.members ?? []}
        onClose={handleCloseSavedModal}
      />

      <ConfirmDialog
        open={confirmClearOpen}
        title="Gesprek en oefeningen wissen"
        description="Weet je zeker dat je de chat en alle voorgestelde oefeningen wilt wissen? Deze actie kan niet ongedaan worden gemaakt."
        confirmLabel="Wissen"
        tone="danger"
        onCancel={() => setConfirmClearOpen(false)}
        onConfirm={handleClearChat}
      />
    </>
  );
}

function sameNumberArrays(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

// Valideer tool-output voordat we 'm op de batch-stack zetten.
function isProposeOutput(
  value: unknown,
): value is ProposeExercisesOutput & {
  ok?: boolean;
  error?: string;
  exercises: ProposeExercisesOutput["exercises"];
} {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.topic !== "string" || v.topic.trim().length === 0) return false;
  if (!Array.isArray(v.exercises)) return false;
  if (v.ok === false) return true;
  return v.exercises.every((ex) => {
    if (typeof ex !== "object" || ex === null) return false;
    const row = ex as Record<string, unknown>;
    if (
      typeof row.source_text !== "string" ||
      typeof row.target_text !== "string"
    ) {
      return false;
    }
    if (
      !Array.isArray(row.tags) ||
      row.tags.length < 2 ||
      !row.tags.every((tag) => typeof tag === "string" && tag.length > 0)
    ) {
      return false;
    }
    if (
      row.alternative_translations !== undefined &&
      (!Array.isArray(row.alternative_translations) ||
        !row.alternative_translations.every((alt) => typeof alt === "string"))
    ) {
      return false;
    }
    return true;
  });
}

function findLatestProposeError(messages: UIMessage[]): string | null {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const msg = messages[i];
    if (msg.role !== "assistant") continue;
    for (let j = msg.parts.length - 1; j >= 0; j -= 1) {
      const part = msg.parts[j];
      if (
        part.type !== "tool-proposeExercises" ||
        part.state !== "output-available"
      ) {
        continue;
      }
      const output = part.output;
      if (!isProposeOutput(output)) continue;
      if (output.ok === false || output.exercises.length === 0) {
        return (
          output.error ??
          "Geen nieuwe oefeningen — die stonden al in je Leerplan of voorstel."
        );
      }
      return null;
    }
  }
  return null;
}
