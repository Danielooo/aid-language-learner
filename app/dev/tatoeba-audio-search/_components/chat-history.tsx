"use client";

import type { ChatMessage } from "./types";

// Chat-history viewer. User-berichten links-uitgelijnd, assistant-
// berichten rechts. Klikken op een ouder assistant-bericht "spring't"
// terug naar die selectie (truncates de stack tot dat punt).
//
// Bewust geen avatars / tijdstempels — minimale UI passend bij de
// dev-tool-stijl van de andere /dev pagina's.

export function ChatHistory({
  messages,
  currentSelectionId,
  onJumpTo,
}: {
  messages: ChatMessage[];
  currentSelectionId: string | null;
  onJumpTo: (selectionId: string) => void;
}) {
  if (messages.length === 0) {
    return null;
  }

  return (
    <section className="rounded-lg border border-border bg-card p-5 text-card-foreground">
      <h2 className="mb-3 text-sm font-semibold">Chat-historie</h2>
      <div className="max-h-[300px] space-y-2 overflow-y-auto">
        {messages.map((msg) => {
          if (msg.role === "user") {
            return (
              <div key={msg.id} className="flex justify-end">
                <div className="max-w-[80%] rounded-lg bg-accent px-3 py-1.5 text-xs text-accent-foreground">
                  <span className="font-medium">Jij: </span>
                  {msg.query}
                </div>
              </div>
            );
          }

          if (msg.role === "system-error") {
            return (
              <div key={msg.id} className="flex justify-start">
                <div className="max-w-[80%] rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-1.5 text-xs text-destructive">
                  <span className="font-medium">Fout: </span>
                  {msg.error}
                </div>
              </div>
            );
          }

          // Assistant message
          const isCurrent = msg.selectionId === currentSelectionId;
          return (
            <div key={msg.id} className="flex justify-start">
              <button
                type="button"
                onClick={() => onJumpTo(msg.selectionId)}
                disabled={isCurrent}
                title={
                  isCurrent
                    ? "Dit is de huidige selectie."
                    : "Klik om terug te springen naar deze selectie (latere stappen worden weggegooid)."
                }
                className={`max-w-[80%] rounded-lg border px-3 py-1.5 text-left text-xs transition-colors ${isCurrent ? "border-accent/40 bg-muted/50" : "border-border bg-background hover:border-accent/40 hover:bg-muted/40"} ${isCurrent ? "cursor-default" : "cursor-pointer"}`}
              >
                <div className="flex items-baseline gap-2">
                  <span className="font-medium text-foreground">AI: </span>
                  <span className="text-[9px] uppercase tracking-wide text-muted-foreground">
                    {msg.mode === "rerank" ? "rerank" : "cosine"} · {msg.matchCount} match{msg.matchCount === 1 ? "" : "es"}
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
        })}
      </div>
    </section>
  );
}
