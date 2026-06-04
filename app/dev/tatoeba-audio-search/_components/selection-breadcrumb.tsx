"use client";

import type { Selection } from "./types";

// Visuele breadcrumb van de selectie-stack: '500 → 47 → 10' met de
// queries als titels. "Terug"-knop pop't één niveau. Klik op een
// breadcrumb-link doet hetzelfde als klikken op een ouder
// assistant-bericht: truncates de stack tot dat punt.

export function SelectionBreadcrumb({
  stack,
  onBack,
  onJumpTo,
}: {
  stack: Selection[];
  onBack: () => void;
  onJumpTo: (selectionId: string) => void;
}) {
  if (stack.length === 0) return null;

  return (
    <section className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-background/40 px-3 py-2">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
        Selectie:
      </span>
      {stack.map((sel, idx) => {
        const isLast = idx === stack.length - 1;
        const label = sel.query
          ? `"${truncateForBreadcrumb(sel.query)}"`
          : `alle (${sel.audioIds.length})`;
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
              className={`text-xs ${isLast ? "cursor-default font-medium text-foreground" : "text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"}`}
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
    </section>
  );
}

function truncateForBreadcrumb(query: string): string {
  const max = 30;
  if (query.length <= max) return query;
  return `${query.slice(0, max - 1)}…`;
}
