"use client";

const ACCENT_BTN =
  "inline-flex h-9 cursor-pointer items-center justify-center rounded-md bg-accent px-3 text-xs font-medium text-accent-foreground transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50";

const DESTRUCTIVE_BTN =
  "inline-flex h-9 cursor-pointer items-center justify-center rounded-md bg-destructive/90 px-3 text-xs font-medium text-destructive-foreground transition-colors hover:bg-destructive disabled:cursor-not-allowed disabled:opacity-50";

type AdminActionBarProps = {
  selectedCount: number;
  pageCount: number;
  page: number;
  totalPages: number;
  total: number;
  pendingEnrichCount: number;
  pendingSelectedEnrichCount: number;
  enriching: boolean;
  deleting: boolean;
  isRefreshing?: boolean;
  onEnrich: () => void;
  onStopEnrich: () => void;
  onDelete: () => void;
  onClearSelection: () => void;
  actionError: string | null;
  actionMessage: string | null;
};

export function AdminActionBar({
  selectedCount,
  pageCount,
  page,
  totalPages,
  total,
  pendingEnrichCount,
  pendingSelectedEnrichCount,
  enriching,
  deleting,
  isRefreshing = false,
  onEnrich,
  onStopEnrich,
  onDelete,
  onClearSelection,
  actionError,
  actionMessage,
}: AdminActionBarProps) {
  const enrichCount =
    selectedCount > 0 ? pendingSelectedEnrichCount : pendingEnrichCount;

  const enrichLabel = enriching
    ? "Stoppen"
    : selectedCount > 0
      ? `Verrijk ${pendingSelectedEnrichCount} geselecteerde`
      : enrichCount > 0
        ? `Verrijk ${pendingEnrichCount} op pagina`
        : "Alles verrijkt";

  const deleteLabel = deleting
    ? "Verwijderen..."
    : selectedCount > 0
      ? `Verwijder ${selectedCount} geselecteerde`
      : "Verwijder records";

  return (
    <div className="space-y-2 rounded-md border border-border bg-background/40 px-3 py-2">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={enriching ? onStopEnrich : onEnrich}
          disabled={deleting || isRefreshing || (!enriching && enrichCount === 0)}
          className={ACCENT_BTN}
        >
          {enrichLabel}
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={
            enriching || deleting || isRefreshing || selectedCount === 0
          }
          className={DESTRUCTIVE_BTN}
        >
          {deleteLabel}
        </button>
        <span className="text-[10px] text-muted-foreground">
          {selectedCount > 0
            ? `${selectedCount} geselecteerd · pagina ${page}/${totalPages} · ${total} totaal`
            : `pagina ${page}/${totalPages} · ${total} totaal`}
          {isRefreshing ? " · verversen…" : ""}
        </span>
        {selectedCount > 0 && (
          <button
            type="button"
            onClick={onClearSelection}
            disabled={enriching || deleting || isRefreshing}
            className="ml-auto text-[10px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline disabled:opacity-50"
          >
            Selectie leegmaken
          </button>
        )}
      </div>
      {actionError && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-1.5 text-xs text-destructive">
          {actionError}
        </div>
      )}
      {actionMessage && (
        <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 px-3 py-1.5 text-xs text-emerald-700 dark:text-emerald-400">
          {actionMessage}
        </div>
      )}
    </div>
  );
}
