"use client";

import { DefaultChatTransport } from "ai";
import { useChat } from "@ai-sdk/react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  useAudioGeneratorDraft,
  type PersistedChatMessage,
} from "@/lib/hooks/use-audio-generator-draft";

import {
  formatQuotaLabel,
  useAiQuota,
} from "./hooks/use-ai-quota";
import { AudioProposalTable } from "./audio-proposal-table";
import {
  mergeAudioProposalBatches,
  type AudioPersistBody,
  type AudioProposalBatch,
  type ProposeAudioExercisesOutput,
} from "./audio-proposal-table-adapter";
import {
  GeneratorSavedGroupModal,
  type SavedGroupMember,
} from "./generator-saved-group-modal";

import type { AudioExerciseProposal } from "@/types/audio-exercise";
import type { UIMessage } from "ai";

type PersistResponse =
  | {
      ok: true;
      inserted: number;
      groupId?: string;
      groupName?: string;
      results?: unknown;
    }
  | {
      ok: false;
      error: string;
      results?: unknown;
    };

type SavedGroupSnapshot = {
  name: string;
  members: SavedGroupMember[];
};

const SUGGESTIONS = [
  "Geef me 8 spraakoefeningen voor in een restaurant",
  "Zoek 10 spraakoefeningen over reizen",
  "5 spraakoefeningen voor op de luchthaven",
];

const APPEND_SUGGESTION = "Zoek nog 5 spraakoefeningen";

export function AudioExerciseGenerator() {
  const draft = useAudioGeneratorDraft();
  const restoredRef = useRef(false);

  const [input, setInput] = useState("");
  const [batches, setBatches] = useState<AudioProposalBatch[]>([]);
  const [chatLog, setChatLog] = useState<PersistedChatMessage[]>([]);
  const [draftSelectedIds, setDraftSelectedIds] = useState<number[]>([]);
  const [draftTopic, setDraftTopic] = useState("");
  const processedBatchIds = useRef(new Set<string>());
  const batchesRef = useRef<AudioProposalBatch[]>([]);
  const mergedProposalRef = useRef<ProposeAudioExercisesOutput | null>(null);
  const [persistState, setPersistState] = useState<{
    status: "idle" | "saving" | "success" | "error";
    requestBody: unknown;
    response: PersistResponse | null;
    error: string | null;
  }>({ status: "idle", requestBody: null, response: null, error: null });
  const [savedGroup, setSavedGroup] = useState<SavedGroupSnapshot | null>(null);
  const [savedModalOpen, setSavedModalOpen] = useState(false);
  const { aiQuota, refreshAiQuota } = useAiQuota();

  // Eenmalig draft herstellen na mount (localStorage).
  /* eslint-disable react-hooks/set-state-in-effect -- hydrate from localStorage */
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    const snap = draft.snapshot;
    if (!snap) return;
    if (snap.batches.length === 0 && snap.messages.length === 0) return;
    setBatches(snap.batches);
    setChatLog(snap.messages);
    setDraftSelectedIds(snap.selectedAudioIds);
    setDraftTopic(snap.topic);
    batchesRef.current = snap.batches;
    for (const batch of snap.batches) {
      processedBatchIds.current.add(batch.id);
    }
  }, [draft.snapshot]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const mergedProposal = useMemo(
    () => (batches.length > 0 ? mergeAudioProposalBatches(batches) : null),
    [batches],
  );
  useEffect(() => {
    mergedProposalRef.current = mergedProposal;
  }, [mergedProposal]);

  useEffect(() => {
    batchesRef.current = batches;
  }, [batches]);

  // Batches + chat + meta persistent houden.
  useEffect(() => {
    if (!restoredRef.current) return;
    if (batches.length === 0 && chatLog.length === 0) {
      draft.clear();
      return;
    }
    draft.save({
      batches,
      selectedAudioIds: draftSelectedIds,
      topic: draftTopic || mergedProposal?.topic || "",
      messages: chatLog,
    });
  }, [
    batches,
    chatLog,
    draftSelectedIds,
    draftTopic,
    draft,
    mergedProposal?.topic,
  ]);

  /* eslint-disable react-hooks/refs */
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/exercises/audio/chat",
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
              existingAudioIds: current.exercises.map(
                (exercise) => exercise.audio_id,
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

  const searchError = useMemo(
    () => findLatestAudioSearchError(messages),
    [messages],
  );

  const isBusy = status === "submitted" || status === "streaming";
  const wasBusyRef = useRef(false);

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

  /* eslint-disable react-hooks/set-state-in-effect -- tool-output sync naar batch-stack */
  useEffect(() => {
    for (const msg of messages) {
      if (msg.role === "user") {
        const text = msg.parts
          .filter(
            (part): part is { type: "text"; text: string } =>
              part.type === "text",
          )
          .map((part) => part.text)
          .join("")
          .trim();
        if (!text) continue;
        setChatLog((prev) => {
          if (prev.some((entry) => entry.id === msg.id)) return prev;
          return [...prev, { id: msg.id, role: "user", text }];
        });
        continue;
      }

      if (msg.role !== "assistant") continue;
      for (const part of msg.parts) {
        if (
          part.type === "tool-proposeAudioExercises" &&
          part.state === "output-available"
        ) {
          const output = part.output;
          if (!isAudioProposeOutput(output)) continue;
          const batchId = `${msg.id}:proposeAudioExercises`;
          if (processedBatchIds.current.has(batchId)) continue;
          processedBatchIds.current.add(batchId);

          if (output.ok === false || output.exercises.length === 0) {
            continue;
          }

          const seen = new Set(
            batchesRef.current.flatMap((batch) =>
              batch.proposal.exercises.map((ex) => ex.audio_id),
            ),
          );
          const unique = output.exercises.filter((ex) => {
            if (seen.has(ex.audio_id)) return false;
            seen.add(ex.audio_id);
            return true;
          });
          if (unique.length === 0) continue;

          const nextBatch: AudioProposalBatch = {
            id: batchId,
            proposal: {
              topic: output.topic,
              exercises: unique,
            },
          };
          batchesRef.current = [...batchesRef.current, nextBatch];
          setBatches(batchesRef.current);

          const count = unique.length;
          const statusId = `status:${batchId}`;
          const statusText =
            count === 1
              ? "1 oefening toegevoegd"
              : `${count} oefeningen toegevoegd`;
          setChatLog((log) => {
            if (log.some((entry) => entry.id === statusId)) return log;
            return [
              ...log,
              { id: statusId, role: "status", text: statusText },
            ];
          });
        }
      }
    }
  }, [messages]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = input.trim();
    if (!text) return;
    sendMessage({ text });
    setInput("");
  }

  function handleClearChat() {
    setMessages([]);
    setChatLog([]);
    setBatches([]);
    batchesRef.current = [];
    setDraftSelectedIds([]);
    setDraftTopic("");
    processedBatchIds.current.clear();
    draft.clear();
    setPersistState({
      status: "idle",
      requestBody: null,
      response: null,
      error: null,
    });
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

  async function handleSave(requestBody: AudioPersistBody) {
    setPersistState({
      status: "saving",
      requestBody,
      response: null,
      error: null,
    });

    try {
      const res = await fetch("/api/exercises/audio/persist", {
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
          error: "error" in json ? json.error : `HTTP ${res.status}`,
        });
        return;
      }

      const members: SavedGroupMember[] = requestBody.exercises.map(
        (ex, index) => ({
          key: `${ex.audio_id}-${index}`,
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
      setChatLog([]);
      setBatches([]);
      batchesRef.current = [];
      setDraftSelectedIds([]);
      setDraftTopic("");
      processedBatchIds.current.clear();
      draft.clear();
      setPersistState({
        status: "success",
        requestBody,
        response: json,
        error: null,
      });
    } catch (err) {
      setPersistState({
        status: "error",
        requestBody,
        response: null,
        error: err instanceof Error ? err.message : "Onbekende fout",
      });
    }
  }

  const quotaLabel = formatQuotaLabel(aiQuota);
  const canClear = chatLog.length > 0 || messages.length > 0 || batches.length > 0;
  const showEmptyHints = chatLog.length === 0 && batches.length === 0;

  return (
    <div className="space-y-6">
      {persistState.status === "success" && (
        <p className="rounded-md border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-foreground">
          Opgeslagen met audio. Vink topics aan via{" "}
          <Link
            href="/leerplan"
            className="font-medium text-accent underline-offset-2 hover:underline"
          >
            Mijn leerplan
          </Link>
          .
        </p>
      )}

      <section className="space-y-3 rounded-lg border border-border bg-card p-5 text-card-foreground">
        <header className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Audio-chat</h2>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>
              Status:{" "}
              <code className="font-mono text-foreground">{status}</code>
            </span>
            {canClear && (
              <button
                type="button"
                onClick={handleClearChat}
                className="rounded border border-border px-2 py-1 hover:bg-muted"
              >
                Wis chat
              </button>
            )}
          </div>
        </header>

        <div className="min-h-[120px] space-y-3 rounded-md border border-dashed border-border bg-muted/30 p-3 text-sm">
          {showEmptyHints && (
            <div className="space-y-2">
              <p className="text-muted-foreground">
                Zoek echte Tatoeba-opnames. Probeer:
              </p>
              <ul className="space-y-1">
                {SUGGESTIONS.map((s) => (
                  <li key={s}>
                    <button
                      type="button"
                      onClick={() => setInput(s)}
                      className="text-left font-mono text-xs text-accent hover:underline"
                    >
                      &quot;{s}&quot;
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {chatLog.length === 0 && batches.length > 0 && (
            <p className="text-muted-foreground">
              Hersteld voorstel uit je vorige sessie. Zoek verder of sla de
              groep op.
            </p>
          )}
          {chatLog.map((entry) => (
            <ChatLogEntry key={entry.id} entry={entry} />
          ))}
        </div>

        {(error || searchError) && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive">
            <p className="font-medium">
              {error ? "Fout in chat-request" : "Geen resultaten"}
            </p>
            <pre className="mt-1 font-mono">
              {error?.message ?? searchError}
            </pre>
          </div>
        )}

        {batches.length > 0 && (
          <button
            type="button"
            onClick={() => setInput(APPEND_SUGGESTION)}
            className="text-left font-mono text-xs text-accent hover:underline"
          >
            &quot;{APPEND_SUGGESTION}&quot;
          </button>
        )}

        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isBusy}
            placeholder={
              batches.length > 0
                ? "Zoek nog spraakoefeningen, bv. nog 5"
                : "bv. Geef me 8 spraakoefeningen voor een restaurant"
            }
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
          />
          {isBusy ? (
            <button
              type="button"
              onClick={() => stop()}
              className="rounded-md border border-border px-4 text-sm font-medium hover:bg-muted"
            >
              Stop
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="rounded-md bg-accent px-4 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90 disabled:opacity-50"
            >
              Zoek
            </button>
          )}
        </form>

        {quotaLabel && (
          <p className="text-[11px] text-muted-foreground">{quotaLabel}</p>
        )}
      </section>

      {mergedProposal && batches.length > 0 && (
        <AudioProposalTable
          batches={batches}
          proposal={mergedProposal}
          persistState={persistState}
          onSave={handleSave}
          initialSelectedIds={draftSelectedIds}
          initialTopic={draftTopic || mergedProposal.topic}
          onDraftMetaChange={handleDraftMetaChange}
        />
      )}

      <GeneratorSavedGroupModal
        open={savedModalOpen}
        name={savedGroup?.name ?? null}
        members={savedGroup?.members ?? []}
        onClose={handleCloseSavedModal}
      />
    </div>
  );
}

function ChatLogEntry({ entry }: { entry: PersistedChatMessage }) {
  if (entry.role === "status") {
    return (
      <p className="text-xs text-muted-foreground">{entry.text}</p>
    );
  }

  return (
    <div className="rounded-md border border-accent/40 bg-accent/10 px-3 py-2">
      <p className="whitespace-pre-wrap text-sm text-foreground">{entry.text}</p>
    </div>
  );
}

function isAudioProposeOutput(
  value: unknown,
): value is ProposeAudioExercisesOutput & {
  ok?: boolean;
  error?: string;
  exercises: AudioExerciseProposal[];
} {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.topic !== "string") return false;
  if (!Array.isArray(v.exercises)) return false;
  if (v.ok === false) return true;
  return v.exercises.every((ex) => {
    if (typeof ex !== "object" || ex === null) return false;
    const row = ex as Record<string, unknown>;
    return (
      typeof row.source_text === "string" &&
      typeof row.target_text === "string" &&
      typeof row.audio_id === "number" &&
      typeof row.sentence_id === "number" &&
      typeof row.mp3_url === "string" &&
      Array.isArray(row.tags)
    );
  });
}

function findLatestAudioSearchError(messages: UIMessage[]): string | null {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const msg = messages[i];
    if (msg.role !== "assistant") continue;
    for (let j = msg.parts.length - 1; j >= 0; j -= 1) {
      const part = msg.parts[j];
      if (
        part.type !== "tool-proposeAudioExercises" ||
        part.state !== "output-available"
      ) {
        continue;
      }
      const output = part.output;
      if (!isAudioProposeOutput(output)) continue;
      if (output.ok === false || output.exercises.length === 0) {
        return (
          output.error ??
          "Geen audio-oefeningen gevonden voor deze zoekopdracht."
        );
      }
      return null;
    }
  }
  return null;
}

function sameNumberArrays(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
