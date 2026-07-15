"use client";

import { DefaultChatTransport } from "ai";
import { useChat } from "@ai-sdk/react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { useAppProfile } from "@/app/(app)/_components/app-profile-provider";
import { AppPageHeader } from "@/app/_components/ui/app-page-header";
import { useMyExercisesSummary } from "@/lib/exercises/use-my-exercises-summary";

import { ProposalTable } from "./proposal-table";
import type {
  ExercisesPersistBody,
  ProposalBatch,
  ProposeExercisesOutput,
} from "./proposal-table-adapter";
import { mergeProposalBatches } from "./proposal-table-adapter";

import type { UIMessage } from "ai";

// Genereert Spaans→NL vertaaloefeningen via de Vercel AI SDK. De chatbot
// krijgt één tool `proposeExercises` aangereikt; zodra die met output is
// aangeroepen rendert de UI een tabel met een "Opslaan"-knop.

type PersistResponse =
  | {
      ok: true;
      inserted: number;
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

const SUGGESTIONS = [
  "Geef me 10 zinnen die je nodig hebt bij een autogarage",
  "Genereer 8 zinnen voor in een restaurant",
  "5 zinnen voor op de luchthaven, alsjeblieft",
];

const APPEND_SUGGESTION = "Voeg nog 5 zinnen toe";

export function ExerciseGenerator() {
  const { displayLabel } = useAppProfile();
  const { stats: exerciseStats, loading: summaryLoading } = useMyExercisesSummary();
  const [input, setInput] = useState("");
  const [batches, setBatches] = useState<ProposalBatch[]>([]);
  const processedBatchIds = useRef(new Set<string>());
  const mergedProposalRef = useRef<ProposeExercisesOutput | null>(null);
  const [persistState, setPersistState] = useState<{
    status: "idle" | "saving" | "success" | "error";
    requestBody: unknown;
    response: PersistResponse | null;
    error: string | null;
  }>({ status: "idle", requestBody: null, response: null, error: null });

  const mergedProposal = useMemo(
    () => (batches.length > 0 ? mergeProposalBatches(batches) : null),
    [batches],
  );
  useEffect(() => {
    mergedProposalRef.current = mergedProposal;
  }, [mergedProposal]);

  // De `body`-callback wordt pas door de AI SDK aangeroepen bij het
  // versturen van een bericht, dus `.current` lezen is daar veilig.
  // ESLint's `react-hooks/refs` ziet dat verschil niet — vandaar de
  // localized disable (zelfde patroon als exercise-chat.tsx).
  /* eslint-disable react-hooks/refs */
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/exercises/chat",
        body: () => {
          const draft = mergedProposalRef.current;
          if (!draft || draft.exercises.length === 0) return {};
          return {
            draftSummary: {
              topic: draft.topic,
              count: draft.exercises.length,
              existingSourceTexts: draft.exercises.map(
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

  const isBusy = status === "submitted" || status === "streaming";

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
          setBatches((prev) => [
            ...prev,
            { id: batchId, proposal: output },
          ]);
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
    processedBatchIds.current.clear();
    setPersistState({
      status: "idle",
      requestBody: null,
      response: null,
      error: null,
    });
  }

  function handleUndoLastBatch() {
    setBatches((prev) => prev.slice(0, -1));
  }

  function resetGenerator() {
    setMessages([]);
    setBatches([]);
    processedBatchIds.current.clear();
    setPersistState({
      status: "idle",
      requestBody: null,
      response: null,
      error: null,
    });
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
          error: "error" in json ? json.error : `HTTP ${res.status}`,
        });
        return;
      }
      setPersistState({
        status: "success",
        requestBody,
        response: json,
        error: null,
      });
      resetGenerator();
    } catch (err) {
      setPersistState({
        status: "error",
        requestBody,
        response: null,
        error: err instanceof Error ? err.message : "Onbekende fout",
      });
    }
  }

  return (
    <div className="space-y-6">
      <AppPageHeader
        eyebrow="Mijn materiaal"
        title="Generator"
        accountLabel={displayLabel}
        description='Vraag de chatbot om Spaans→Nederlands vertaaloefeningen voor een onderwerp, bijvoorbeeld "10 zinnen voor in een restaurant". Je reviewt het voorstel en klikt "Opslaan" om ze aan je eigen oefeningen toe te voegen.'
        stats={exerciseStats.map((stat) => ({
          ...stat,
          loading: summaryLoading,
        }))}
      />

      {persistState.status === "success" && (
        <p className="rounded-md border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-foreground">
          Opgeslagen. Vink topics aan om ze te oefenen via{" "}
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
          <h2 className="text-sm font-semibold">Chat</h2>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>
              Status:{" "}
              <code className="font-mono text-foreground">{status}</code>
            </span>
            {messages.length > 0 && (
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
          {messages.length === 0 && (
            <div className="space-y-2">
              <p className="text-muted-foreground">
                Nog geen berichten. Probeer:
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
          {messages.length > 0 && batches.length > 0 && (
            <div className="pb-2">
              <button
                type="button"
                onClick={() => setInput(APPEND_SUGGESTION)}
                className="text-left font-mono text-xs text-accent hover:underline"
              >
                &quot;{APPEND_SUGGESTION}&quot;
              </button>
            </div>
          )}
          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))}
        </div>

        {error && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive">
            <p className="font-medium">Fout in chat-request</p>
            <pre className="mt-1 font-mono">{error.message}</pre>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isBusy}
            placeholder={
              batches.length > 0
                ? "Voeg nog zinnen toe, bv. nog 5 zinnen"
                : "bv. Geef me 10 zinnen voor een autogarage"
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
              Genereer
            </button>
          )}
        </form>
      </section>

      {mergedProposal && batches.length > 0 && (
        <ProposalTable
          batches={batches}
          proposal={mergedProposal}
          canUndo={batches.length >= 1}
          onUndo={handleUndoLastBatch}
          persistState={persistState}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

function MessageBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";
  return (
    <div
      className={`rounded-md border px-3 py-2 ${isUser
          ? "border-accent/40 bg-accent/10"
          : "border-border bg-background"
        }`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {message.role}
      </p>
      <div className="mt-1 space-y-1 text-sm text-foreground">
        {message.parts.map((part, i) => {
          if (part.type === "text") {
            return (
              <span key={i} className="whitespace-pre-wrap">
                {part.text}
              </span>
            );
          }
          if (part.type === "tool-proposeExercises") {
            return <ToolPartHint key={i} state={part.state} />;
          }
          return null;
        })}
      </div>
    </div>
  );
}

function ToolPartHint({ state }: { state: string }) {
  const label =
    state === "input-streaming"
      ? "→ proposeExercises: input wordt gegenereerd..."
      : state === "input-available"
        ? "→ proposeExercises: tool aangeroepen, wachten op execute..."
        : state === "output-available"
          ? "✓ proposeExercises: output beschikbaar (zie tabel hieronder)"
          : state === "output-error"
            ? "✗ proposeExercises: error"
            : `→ proposeExercises [${state}]`;
  return (
    <p className="font-mono text-xs text-muted-foreground">{label}</p>
  );
}

// Valideer tool-output voordat we 'm op de batch-stack zetten.
function isProposeOutput(value: unknown): value is ProposeExercisesOutput {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.topic !== "string" || v.topic.trim().length === 0) return false;
  if (!Array.isArray(v.exercises)) return false;
  return v.exercises.every((ex) => {
    if (typeof ex !== "object" || ex === null) return false;
    const row = ex as Record<string, unknown>;
    if (typeof row.source_text !== "string" || typeof row.target_text !== "string") {
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
