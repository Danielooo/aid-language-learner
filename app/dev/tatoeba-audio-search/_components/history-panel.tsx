"use client";

import { useMemo } from "react";

import type { ChatMessage, Selection } from "./types";

// Combineert wat eerder drie afzonderlijke sectie's waren:
//   - SelectionBreadcrumb (compact pad "alle → 'q1' → 'q2'")
//   - ChatHistory (chat-bubbels met klikbare jump-to)
//   - <p>Voor: "current query"</p> (herhaling van de top van de stack)
//
// Layout:
//   - Altijd zichtbaar: breadcrumb-regel met klikbare jump-to per
//     selectie, error-badge, en "← Terug"-knop rechts.
//   - Uitklapbaar via <details> "Toon chat-historie" — bevat de
//     bestaande user/assistant/error-bubbels. Default dicht zodra er
//     meer dan één assistant-bericht is; bij een verse corpus (alleen
//     root-bericht) klappen we 'm wel open zodat de user de eerste
//     feedback ziet.

export function HistoryPanel({
  stack,
  messages,
  currentSelectionId,
  onBack,
  onJumpTo,
}: {
  stack: Selection[];
  messages: ChatMessage[];
  currentSelectionId: string | null;
  onBack: () => void;
  onJumpTo: (selectionId: string) => void;
}) {
  const errorCount = useMemo(
    () => messages.filter((m) => m.role === "system-error").length,
    [messages],
  );

  if (stack.length === 0 && messages.length === 0) return null;

  // Default open zolang we nog geen 'echte' zoekstappen hebben (alleen
  // de root-message of helemaal niets); zodra de user een tweede stap
  // zet, klapt 'ie standaard dicht. Errors forceren 'm open.
  const assistantCount = messages.filter(
    (m) => m.role === "assistant",
  ).length;
  const defaultOpen = assistantCount <= 1 || errorCount > 0;

  return (
    <section className="rounded-md border border-border bg-card text-card-foreground">
      <BreadcrumbRow
        stack={stack}
        errorCount={errorCount}
        onBack={onBack}
        onJumpTo={onJumpTo}
      />

      {messages.length > 0 && (
        <details open={defaultOpen} className="border-t border-border">
          <summary className="cursor-pointer px-3 py-2 text-[11px] font-medium text-muted-foreground hover:text-foreground">
            <span className="select-none">
              Chat-historie
              <span className="ml-1 text-[10px] text-muted-foreground/70">
                · {messages.length} bericht
                {messages.length === 1 ? "" : "en"}
                {errorCount > 0
                  ? ` · ${errorCount} fout${errorCount === 1 ? "" : "en"}`
                  : ""}
              </span>
            </span>
          </summary>

          <div className="max-h-[280px] space-y-2 overflow-y-auto border-t border-border px-3 py-3">
            {messages.map((msg) => (
              <ChatBubble
                key={msg.id}
                msg={msg}
                currentSelectionId={currentSelectionId}
                onJumpTo={onJumpTo}
              />
            ))}
          </div>
        </details>
      )}
    </section>
  );
}

// ── Sub-components ────────────────────────────────────────────────

function BreadcrumbRow({
  stack,
  errorCount,
  onBack,
  onJumpTo,
}: {
  stack: Selection[];
  errorCount: number;
  onBack: () => void;
  onJumpTo: (selectionId: string) => void;
}) {
  if (stack.length === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-2">
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
          Selectie:
        </span>
        <span className="text-xs text-muted-foreground">leeg</span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 px-3 py-2">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
        Selectie:
      </span>

      {stack.map((sel, idx) => {
        const isLast = idx === stack.length - 1;
        const label = sel.query
          ? `"${truncateForBreadcrumb(sel.query)}"`
          : "alle";
        return (
          <span key={sel.id} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onJumpTo(sel.id)}
              disabled={isLast}
              title={
                isLast
                  ? `Huidige selectie · ${sel.audioIds.length} records`
                  : `Spring naar deze selectie · ${sel.audioIds.length} records`
              }
              className={`text-xs ${
                isLast
                  ? "cursor-default font-medium text-foreground"
                  : "text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              }`}
            >
              {label}
              <span className="ml-1 font-mono text-[10px] text-muted-foreground/70">
                ({sel.audioIds.length})
              </span>
            </button>
            {!isLast && (
              <span className="text-muted-foreground/50" aria-hidden>
                →
              </span>
            )}
          </span>
        );
      })}

      {errorCount > 0 && (
        <span
          className="rounded bg-destructive/15 px-1.5 py-0.5 font-mono text-[10px] text-destructive"
          title={`${errorCount} fout${errorCount === 1 ? "" : "en"} in chat-historie — klap uit om te lezen`}
        >
          {errorCount} fout{errorCount === 1 ? "" : "en"}
        </span>
      )}

      <button
        type="button"
        onClick={onBack}
        disabled={stack.length <= 1}
        className="ml-auto inline-flex items-center gap-1 rounded border border-border bg-background px-2 py-1 text-[10px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
        title={
          stack.length <= 1
            ? "Geen vorige selectie om naar terug te keren."
            : "Pop't de bovenste selectie van de stack."
        }
      >
        ← Terug
      </button>
    </div>
  );
}

function ChatBubble({
  msg,
  currentSelectionId,
  onJumpTo,
}: {
  msg: ChatMessage;
  currentSelectionId: string | null;
  onJumpTo: (selectionId: string) => void;
}) {
  if (msg.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-lg bg-accent px-3 py-1.5 text-xs text-accent-foreground">
          <span className="font-medium">Jij: </span>
          {msg.query}
        </div>
      </div>
    );
  }

  if (msg.role === "system-error") {
    return (
      <div className="flex justify-start">
        <div className="max-w-[80%] rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-1.5 text-xs text-destructive">
          <span className="font-medium">Fout: </span>
          {msg.error}
        </div>
      </div>
    );
  }

  const isCurrent = msg.selectionId === currentSelectionId;
  return (
    <div className="flex justify-start">
      <button
        type="button"
        onClick={() => onJumpTo(msg.selectionId)}
        disabled={isCurrent}
        title={
          isCurrent
            ? "Dit is de huidige selectie."
            : "Klik om terug te springen naar deze selectie (latere stappen worden weggegooid)."
        }
        className={`max-w-[80%] rounded-lg border px-3 py-1.5 text-left text-xs transition-colors ${
          isCurrent
            ? "border-accent/40 bg-muted/50 cursor-default"
            : "border-border bg-background hover:border-accent/40 hover:bg-muted/40 cursor-pointer"
        }`}
      >
        <div className="flex items-baseline gap-2">
          <span className="font-medium text-foreground">AI: </span>
          <span className="text-[9px] uppercase tracking-wide text-muted-foreground">
            {msg.mode === "search" ? (
              <>
                zoeken · {msg.matchCount} match
                {msg.matchCount === 1 ? "" : "es"}
              </>
            ) : (
              <>
                {msg.matchCount} record{msg.matchCount === 1 ? "" : "s"}
              </>
            )}
          </span>
          {isCurrent && (
            <span className="rounded bg-accent/20 px-1 py-0.5 text-[8px] font-medium text-accent">
              huidig
            </span>
          )}
        </div>
        <p className="mt-0.5 text-muted-foreground">{msg.summary}</p>
      </button>
    </div>
  );
}

function truncateForBreadcrumb(query: string): string {
  const max = 30;
  if (query.length <= max) return query;
  return `${query.slice(0, max - 1)}…`;
}
