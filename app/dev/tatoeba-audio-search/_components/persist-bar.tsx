"use client";

import type { ApplySuccess } from "@/app/api/dev/tatoeba-audio/persist-batch/route";

// Actie-bar boven de result-tabel op /dev/tatoeba-audio-search met
// twee primaire acties + inline status. Beide knoppen volgen hetzelfde
// "smart"-patroon: selectie heeft prioriteit, anders valt 'ie terug op
// alle zichtbare rijen. Counts zijn in-scope (parent prunet selectie
// zodra de zichtbare lijst verandert) zodat het label nooit liegt.
//
//   1. Slim-verrijk-knop: produceert in één AI-call vertaling + topic
//      + tags voor de selectie, anders voor alle zichtbare nog-niet-
//      verrijkte rijen.
//   2. Slim-opslaan-knop: persist selectie indien aanwezig, anders
//      alle zichtbare die direct opgeslagen kunnen worden (NL-bron of
//      cache-hit). Rijen zonder vertaling triggeren de
//      NoTranslationWarningDialog in de parent.
//
// `persistError` en `persistSummary` worden inline onderaan getoond,
// niet meer als losse stacked div's — bespaart twee verticale rijen.

type ActionMode = "selected" | "visible" | "none";

type PersistBarProps = {
  visibleCount: number;
  selectedCount: number;
  pendingTranslationCount: number;
  pendingSelectedTranslationCount: number;
  // Aantal rijen dat de "Sla op"-knop daadwerkelijk zou opslaan in
  // elk van de twee modi (in-scope, met vertaling beschikbaar).
  persistableSelectedCount: number;
  persistableVisibleCount: number;
  translating: boolean;
  persisting: boolean;
  onTranslate: () => void;
  onPersist: () => void;
  onClearSelection: () => void;
  persistError: string | null;
  persistSummary: ApplySuccess["summary"] | null;
};

export function PersistBar({
  visibleCount,
  selectedCount,
  pendingTranslationCount,
  pendingSelectedTranslationCount,
  persistableSelectedCount,
  persistableVisibleCount,
  translating,
  persisting,
  onTranslate,
  onPersist,
  onClearSelection,
  persistError,
  persistSummary,
}: PersistBarProps) {
  // ── Vertaal-knop ───────────────────────────────────────────────
  const translateMode: ActionMode =
    pendingSelectedTranslationCount > 0
      ? "selected"
      : pendingTranslationCount > 0
        ? "visible"
        : "none";

  const translateDisabled =
    translating || persisting || translateMode === "none";

  const translateLabel = translating
    ? "Verrijken..."
    : translateMode === "selected"
      ? `Verrijk ${pendingSelectedTranslationCount} geselecteerde`
      : translateMode === "visible"
        ? `Verrijk ${pendingTranslationCount} alle`
        : "Alles verrijkt";

  const translateTitle =
    translateMode === "selected"
      ? `Verrijkt ${pendingSelectedTranslationCount} van de ${selectedCount} geselecteerde oefening${selectedCount === 1 ? "" : "en"} (vertaling + topic + tags in één AI-call)`
      : translateMode === "visible"
        ? `Verrijkt alle ${pendingTranslationCount} nog niet-verrijkte rijen in de tabel (vertaling + topic + tags in één AI-call)`
        : "Alle rijen in de tabel zijn al verrijkt";

  // ── Persist-knop (zelfde smart-patroon) ─────────────────────────
  // We kiezen "selected"-modus zodra de user iets heeft aangevinkt —
  // óók als die rijen nog geen vertaling hebben — zodat de warning-
  // dialog 'm netjes kan tegenhouden in plaats van stilletjes naar de
  // visible-modus te switchen.
  const persistMode: ActionMode =
    selectedCount > 0
      ? "selected"
      : persistableVisibleCount > 0
        ? "visible"
        : "none";

  const persistButtonDisabled =
    persisting ||
    translating ||
    persistMode === "none" ||
    (persistMode === "selected" && persistableSelectedCount === 0) ||
    (persistMode === "visible" && persistableVisibleCount === 0);

  const persistLabel = persisting
    ? "Opslaan..."
    : persistMode === "selected"
      ? `Sla ${persistableSelectedCount} geselecteerde op`
      : persistMode === "visible"
        ? `Sla ${persistableVisibleCount} alle op`
        : "Niets om op te slaan";

  const persistTitle =
    persistMode === "selected"
      ? `Slaat ${persistableSelectedCount} van de ${selectedCount} geselecteerde oefening${selectedCount === 1 ? "" : "en"} op in Supabase`
      : persistMode === "visible"
        ? `Slaat alle ${persistableVisibleCount} rijen in de tabel mét vertaling op in Supabase`
        : "Geen rijen om op te slaan — vertaal eerst";

  return (
    <div className="space-y-2 rounded-md border border-border bg-background/40 px-3 py-2">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onTranslate}
          disabled={translateDisabled}
          title={translateTitle}
          className="inline-flex h-9 cursor-pointer items-center justify-center rounded-md bg-card px-3 text-xs font-medium text-card-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        >
          {translateLabel}
        </button>

        <button
          type="button"
          onClick={onPersist}
          disabled={persistButtonDisabled}
          title={persistTitle}
          className="inline-flex h-9 cursor-pointer items-center justify-center rounded-md bg-accent px-3 text-xs font-medium text-accent-foreground transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {persistLabel}
        </button>

        <span className="text-[10px] text-muted-foreground">
          {selectedCount > 0
            ? `${selectedCount} geselecteerd · ${visibleCount} in tabel`
            : `${visibleCount} in tabel`}
        </span>

        {selectedCount > 0 && (
          <button
            type="button"
            onClick={onClearSelection}
            disabled={persisting}
            className="ml-auto text-[10px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline disabled:opacity-50"
          >
            Selectie leegmaken
          </button>
        )}
      </div>

      {persistError && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-1.5 text-xs text-destructive">
          {persistError}
        </div>
      )}

      {persistSummary && (
        <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 px-3 py-1.5 text-xs text-emerald-700 dark:text-emerald-400">
          Klaar — {persistSummary.inserted} nieuw,{" "}
          {persistSummary.replaced} vervangen,{" "}
          {persistSummary.kept_both} naast bestaand,{" "}
          {persistSummary.skipped_conflict} overgeslagen (conflict),{" "}
          {persistSummary.skipped_license} licentie-blok,{" "}
          {persistSummary.errors} fout
          {persistSummary.errors === 1 ? "" : "en"}.
        </div>
      )}
    </div>
  );
}
