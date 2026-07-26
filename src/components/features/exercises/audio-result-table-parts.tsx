"use client";

import { useEffect, useRef, useState } from "react";

import { PauseIcon, SpeakerIcon } from "@/components/ui/audio-icons";
import type { AudioRow } from "@/types/tatoeba";
import type { useTranslationCache } from "@/hooks/use-translation-cache";

import type {
  AudioResultTablePersistMode,
  ColumnKey,
  SortDir,
  SortKey,
  TranslateRowState,
} from "./audio-result-table-types";
import {
  COLUMN_LABELS,
  LICENSE_FILTER_ALL,
  TARGET_LANG,
  licenseDisplay,
  truncate,
} from "./audio-result-table-types";

// ── Sub-components (intern) ───────────────────────────────────────

export function Mp3ColumnHeader({
  compact,
  showMp3Url,
  onToggleUrl,
}: {
  compact: boolean;
  showMp3Url: boolean;
  onToggleUrl: () => void;
}) {
  return (
    <th className="px-3 py-2 font-semibold">
      {compact ? (
        <span>audio</span>
      ) : (
        <div className="flex items-center gap-2">
          <span>mp3</span>
          <button
            type="button"
            onClick={onToggleUrl}
            title={
              showMp3Url
                ? "Toon link-tekst i.p.v. de volledige URL"
                : "Toon de volledige URL i.p.v. de link-tekst"
            }
            className="border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground rounded border px-1.5 py-0.5 text-[9px] font-medium tracking-normal normal-case"
          >
            {showMp3Url ? "link" : "url"}
          </button>
        </div>
      )}
    </th>
  );
}

export function Mp3ColumnCell({
  row,
  playing,
  compact,
  showMp3Url,
  onPlayToggle,
}: {
  row: AudioRow;
  playing: boolean;
  compact: boolean;
  showMp3Url: boolean;
  onPlayToggle: (audioId: number, mp3Url: string) => void;
}) {
  return (
    <td className="px-3 py-2 align-middle">
      {row.mp3_url ? (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onPlayToggle(row.audio_id, row.mp3_url)}
            aria-label={playing ? "Pauzeer audio" : "Speel audio af"}
            title={playing ? "Pauzeer" : "Direct afspelen in de tabel"}
            className="border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground inline-flex size-7 shrink-0 items-center justify-center rounded-md border"
          >
            {playing ? (
              <PauseIcon className="size-3.5" />
            ) : (
              <SpeakerIcon className="size-3.5" />
            )}
          </button>
          {!compact && (
            <a
              href={row.mp3_url}
              target="_blank"
              rel="noreferrer"
              className="text-accent font-mono text-[10px] break-all underline-offset-2 hover:underline"
              title={row.mp3_url}
            >
              {showMp3Url ? row.mp3_url : "open"}
            </a>
          )}
        </div>
      ) : (
        <span className="text-muted-foreground/70 text-[10px]">—</span>
      )}
    </td>
  );
}

// "Filter ▼"-knop met dropdown-paneel met de FilterBar erin. Volgt
// hetzelfde patroon als ColumnVisibilityMenu en LicenseHeader. Toont
// een badge met het aantal actieve filters zodat een verstopte filter
// nooit onopgemerkt blijft. Auto-open zolang er een actief filter is.
export function FilterToggle({
  activeCount,
  authorQuery,
  onAuthorChange,
  textQuery,
  onTextChange,
  reusableOnly,
  onReusableOnlyChange,
}: {
  activeCount: number;
  authorQuery: string;
  onAuthorChange: (v: string) => void;
  textQuery: string;
  onTextChange: (v: string) => void;
  reusableOnly: boolean;
  onReusableOnlyChange: (v: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const hasActive = activeCount > 0;

  return (
    <div ref={wrapperRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`hover:bg-muted inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-medium ${
          hasActive
            ? "border-accent/40 bg-accent/10 text-foreground"
            : "border-border bg-background text-muted-foreground hover:text-foreground"
        }`}
        title={
          hasActive
            ? `${activeCount} actief filter${activeCount === 1 ? "" : "s"} — klik om te bewerken`
            : "Filter op auteur, zin of licentie"
        }
        aria-haspopup="menu"
        aria-expanded={open}
      >
        Filter
        {hasActive && (
          <span className="bg-accent/20 text-accent rounded px-1 py-0.5 font-mono text-[9px]">
            {activeCount}
          </span>
        )}
        <span className="text-[8px]">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div
          role="menu"
          className="border-border bg-card text-card-foreground absolute top-full left-0 z-10 mt-1 w-[420px] max-w-[90vw] rounded-md border p-2 shadow-lg"
        >
          <FilterBar
            authorQuery={authorQuery}
            onAuthorChange={onAuthorChange}
            textQuery={textQuery}
            onTextChange={onTextChange}
            reusableOnly={reusableOnly}
            onReusableOnlyChange={onReusableOnlyChange}
          />
        </div>
      )}
    </div>
  );
}

function FilterBar({
  authorQuery,
  onAuthorChange,
  textQuery,
  onTextChange,
  reusableOnly,
  onReusableOnlyChange,
}: {
  authorQuery: string;
  onAuthorChange: (v: string) => void;
  textQuery: string;
  onTextChange: (v: string) => void;
  reusableOnly: boolean;
  onReusableOnlyChange: (v: boolean) => void;
}) {
  return (
    <div className="space-y-2 p-1">
      <label className="flex flex-col gap-1">
        <span className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
          Auteur bevat
        </span>
        <input
          type="text"
          value={authorQuery}
          onChange={(e) => onAuthorChange(e.target.value)}
          placeholder="bv. CK"
          className="border-input bg-background rounded-md border px-2 py-1.5 text-xs"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-muted-foreground flex items-center gap-1.5 text-[10px] font-medium tracking-wide uppercase">
          Zin bevat
          <span
            role="img"
            aria-label="Uitleg zin-filter"
            tabIndex={0}
            title={
              "Standaard: matcht rijen waarin de hele zoektekst als aaneengesloten substring voorkomt.\n\n" +
              "Begin de zoektekst met / om op losse woorden te zoeken (AND-match): bijvoorbeeld\n" +
              "  /auto rijden\n" +
              "matcht rijen waarin zowel 'auto' als 'rijden' voorkomen, ongeacht volgorde of woordafstand."
            }
            className="border-border bg-background text-muted-foreground hover:text-foreground inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full border text-[9px] font-semibold normal-case"
          >
            i
          </span>
        </span>
        <input
          type="text"
          value={textQuery}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder="bv. comer  (of /auto rijden)"
          className="border-input bg-background rounded-md border px-2 py-1.5 text-xs"
        />
      </label>

      <label className="text-muted-foreground flex items-center gap-2 pt-1 text-xs">
        <input
          type="checkbox"
          checked={reusableOnly}
          onChange={(e) => onReusableOnlyChange(e.target.checked)}
          className="border-input h-4 w-4 rounded"
        />
        Alleen herbruikbaar
        <span
          role="img"
          aria-label="Uitleg licentie-filter"
          tabIndex={0}
          title="Verbergt audio-records waarvan de licentie hergebruik buiten Tatoeba verbiedt (lege license-string). Alleen herbruikbare records (CC0 / CC BY) kunnen naar Supabase gepersist worden."
          className="border-border bg-background text-muted-foreground hover:text-foreground inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full border text-[9px] font-semibold"
        >
          i
        </span>
      </label>
    </div>
  );
}

export function SortableHeader({
  label,
  sortKey,
  currentKey,
  dir,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  currentKey: SortKey;
  dir: SortDir;
  onSort: (key: SortKey) => void;
}) {
  const active = sortKey === currentKey;
  const arrow = active ? (dir === "asc" ? " ▲" : " ▼") : "";
  return (
    <th className="px-3 py-2 font-semibold">
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`hover:text-foreground inline-flex items-center gap-1 tracking-wide uppercase ${
          active ? "text-foreground" : ""
        }`}
      >
        {label}
        {arrow}
      </button>
    </th>
  );
}

// "Kolommen ▼"-knop met dropdown van checkboxes — laat de user
// kolommen verbergen/tonen. Volgt het outside-click + Escape-patroon
// van LicenseHeader. Toont een teller (zichtbaar/totaal) zodat
// gebruikers snel zien dat er nog kolommen verstopt zijn.
export function ColumnVisibilityMenu({
  columns,
  hiddenColumns,
  onToggle,
}: {
  columns: ColumnKey[];
  hiddenColumns: Set<ColumnKey>;
  onToggle: (key: ColumnKey) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const visibleCount = columns.filter((c) => !hiddenColumns.has(c)).length;
  const totalCount = columns.length;

  return (
    <div ref={wrapperRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-medium"
        title="Toon/verberg kolommen"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        Kolommen
        <span className="text-muted-foreground/70 font-mono text-[10px]">
          {visibleCount}/{totalCount}
        </span>
        <span className="text-[8px]">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div
          role="menu"
          className="border-border bg-card text-card-foreground absolute top-full right-0 z-10 mt-1 min-w-[180px] rounded-md border py-1 shadow-lg"
        >
          {columns.map((key) => {
            const checked = !hiddenColumns.has(key);
            return (
              <label
                key={key}
                className="hover:bg-muted flex cursor-pointer items-center gap-2 px-3 py-1.5 text-xs"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(key)}
                  className="border-input h-3.5 w-3.5 rounded"
                />
                <span className="font-mono normal-case">
                  {COLUMN_LABELS[key]}
                </span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Klikbare kolomheader voor 'license': opent een dropdown met alle
// distincte licentie-waarden in de geladen rijen + "Alle". Sluit
// automatisch bij een klik buiten de header (mousedown-listener op
// document) of met Escape.
export function LicenseHeader({
  licenseFilter,
  availableLicenses,
  onChange,
}: {
  licenseFilter: string;
  availableLicenses: string[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const isFiltered = licenseFilter !== LICENSE_FILTER_ALL;

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  function pick(value: string) {
    onChange(value);
    setOpen(false);
  }

  return (
    <th className="px-3 py-2 font-semibold">
      <div ref={wrapperRef} className="relative inline-block">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={`hover:text-foreground inline-flex items-center gap-1 tracking-wide uppercase ${
            isFiltered ? "text-foreground" : ""
          }`}
          title={
            isFiltered
              ? `Gefilterd op ${licenseDisplay(licenseFilter)} — klik om te wijzigen`
              : "Klik om op licentie te filteren"
          }
        >
          license
          <span className="text-[8px]">{open ? "▲" : "▼"}</span>
          {isFiltered && (
            <span className="bg-accent/20 text-accent rounded px-1 py-0.5 font-mono text-[9px] normal-case">
              {licenseDisplay(licenseFilter)}
            </span>
          )}
        </button>

        {open && (
          <div
            role="menu"
            className="border-border bg-card text-card-foreground absolute top-full left-0 z-10 mt-1 min-w-[200px] rounded-md border py-1 shadow-lg"
          >
            <LicenseMenuItem
              label="Alle"
              isActive={!isFiltered}
              onClick={() => pick(LICENSE_FILTER_ALL)}
            />
            {availableLicenses.length > 0 && (
              <div className="border-border my-1 border-t" />
            )}
            {availableLicenses.map((lic) => (
              <LicenseMenuItem
                key={lic}
                label={licenseDisplay(lic)}
                isActive={licenseFilter === lic}
                onClick={() => pick(lic)}
              />
            ))}
            {availableLicenses.length === 0 && (
              <p className="text-muted-foreground px-3 py-2 text-[10px] tracking-normal normal-case">
                Geen rijen — niets om te filteren.
              </p>
            )}
          </div>
        )}
      </div>
    </th>
  );
}

// Header-checkbox die "alle zichtbare rijen" toggle't. We zetten
// `indeterminate` via een ref omdat HTML/React dat attribuut niet
// declaratief ondersteunt — alleen via de DOM-property.
export function SelectAllHeader({
  allChecked,
  indeterminate,
  onToggle,
  visibleCount,
}: {
  allChecked: boolean;
  indeterminate: boolean;
  onToggle: () => void;
  visibleCount: number;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  return (
    <th className="w-10 px-3 py-2 align-middle font-semibold">
      <input
        ref={inputRef}
        type="checkbox"
        checked={allChecked}
        onChange={onToggle}
        disabled={visibleCount === 0}
        className="border-border accent-accent size-4 rounded disabled:opacity-30"
        aria-label="Selecteer alle zichtbare rijen"
        title={
          allChecked
            ? "Deselecteer alle zichtbare rijen"
            : "Selecteer alle zichtbare rijen"
        }
      />
    </th>
  );
}

function LicenseMenuItem({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={isActive}
      onClick={onClick}
      className={`hover:bg-muted flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-xs tracking-normal normal-case ${
        isActive ? "text-foreground font-medium" : "text-muted-foreground"
      }`}
    >
      <span className="font-mono">{label}</span>
      {isActive && <span className="text-accent">✓</span>}
    </button>
  );
}

// Bron-zin (sentence_text). Optioneel inline bewerkbaar voor flows
// zonder Tatoeba (bv. exercise-generator).
export function SourceTextCell({
  row,
  editable,
  onPatchSourceText,
  translationCache,
  compact = false,
}: {
  row: AudioRow;
  editable: boolean;
  onPatchSourceText?: (row: AudioRow, text: string) => void;
  translationCache: ReturnType<typeof useTranslationCache>;
  compact?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const cancelledRef = useRef(false);

  function startEdit() {
    if (!editable || !onPatchSourceText) return;
    cancelledRef.current = false;
    setDraft(row.sentence_text);
    setEditing(true);
  }

  function commitEdit() {
    if (cancelledRef.current) {
      cancelledRef.current = false;
      setEditing(false);
      return;
    }
    const trimmed = draft.trim();
    if (
      trimmed.length > 0 &&
      trimmed !== row.sentence_text &&
      onPatchSourceText
    ) {
      onPatchSourceText(row, trimmed);
      const cached = translationCache.get(row.audio_id, row.sentence_text);
      if (cached) {
        translationCache.set(row.audio_id, {
          ...cached,
          source_text: trimmed,
        });
      }
    }
    setEditing(false);
  }

  function cancelEdit() {
    cancelledRef.current = true;
    setEditing(false);
  }

  if (!editable) {
    return (
      <span
        className={compact ? "block truncate" : undefined}
        title={compact ? row.sentence_text : undefined}
      >
        {row.sentence_text}
      </span>
    );
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-1.5">
        <textarea
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              cancelEdit();
            } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              commitEdit();
            }
          }}
          rows={2}
          className="border-input bg-background text-foreground focus:border-accent w-full resize-y rounded border px-2 py-1 text-xs focus:outline-none"
        />
      </div>
    );
  }

  return (
    <span
      onDoubleClick={startEdit}
      title="Dubbelklik om handmatig aan te passen"
      className="cursor-text"
    >
      {row.sentence_text}
    </span>
  );
}

// Per-rij cel die de vertaling rendert. Vijf statussen:
// 1. Bron is al NL → em-dash (geen knop, niets om te vertalen).
// 2. Loading → spinner.
// 3. Cache-hit → tekst (dubbelklik = edit-mode) + verticale knop-rij
//    (↻ hervertaal, + alternatieve vertaling toevoegen).
// 4. Geen cache → 'Vertaal'-knop (of error-state met Opnieuw).
// 5. Edit-mode → textarea + ✓/✕ acties (Cmd/Ctrl+Enter = save, Esc =
//    cancel, blur = save).
export function TranslationCell({
  row,
  translationCache,
  state,
  onTranslate,
  readOnly = false,
  persistMode,
  hideEnrichActions = false,
  compact = false,
}: {
  row: AudioRow;
  translationCache: ReturnType<typeof useTranslationCache>;
  state: TranslateRowState | undefined;
  onTranslate: (row: AudioRow) => void;
  readOnly?: boolean;
  persistMode?: AudioResultTablePersistMode;
  hideEnrichActions?: boolean;
  compact?: boolean;
}) {
  const cached = translationCache.get(row.audio_id, row.sentence_text);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [showAddAlt, setShowAddAlt] = useState(false);
  const [altDraft, setAltDraft] = useState("");
  // Tracker voor "Esc cancelt; blur na Esc mag niet alsnog saven".
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const cancelledRef = useRef(false);

  async function persistTranslation(text: string, manuallyEdited: boolean) {
    if (!persistMode) return;
    setSaving(true);
    setSaveError(null);
    try {
      await persistMode.onPatchRow(persistMode.getExerciseId(row), {
        target_text: text,
        target_text_manually_edited: manuallyEdited,
      });
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Opslaan mislukt.");
    } finally {
      setSaving(false);
    }
  }

  function startEdit() {
    if (!cached) return;
    cancelledRef.current = false;
    setDraft(cached.translation);
    setEditing(true);
  }

  function commitEdit() {
    if (cancelledRef.current) {
      cancelledRef.current = false;
      setEditing(false);
      return;
    }
    const trimmed = draft.trim();
    if (trimmed.length > 0 && cached && trimmed !== cached.translation) {
      if (persistMode) {
        void persistTranslation(trimmed, true);
        translationCache.setManualTranslation(row.audio_id, trimmed);
      } else {
        translationCache.setManualTranslation(row.audio_id, trimmed);
      }
    }
    setEditing(false);
  }

  function cancelEdit() {
    cancelledRef.current = true;
    setEditing(false);
  }

  function commitAlt() {
    const trimmed = altDraft.trim();
    if (trimmed.length === 0) {
      setShowAddAlt(false);
      return;
    }
    const next = [...(cached?.alternatives ?? []), trimmed];
    if (persistMode && cached) {
      void (async () => {
        setSaving(true);
        setSaveError(null);
        try {
          await persistMode.onPatchRow(persistMode.getExerciseId(row), {
            alternative_translations: next,
          });
          translationCache.addAlternative(row.audio_id, trimmed);
        } catch (e) {
          setSaveError(e instanceof Error ? e.message : "Opslaan mislukt.");
        } finally {
          setSaving(false);
        }
      })();
    } else {
      translationCache.addAlternative(row.audio_id, trimmed);
    }
    setAltDraft("");
    setShowAddAlt(false);
  }

  if (row.lang === TARGET_LANG) {
    return (
      <span
        className="text-muted-foreground/70 text-[10px]"
        title="Bron is al Nederlands — geen vertaling nodig."
      >
        —
      </span>
    );
  }

  if (state?.status === "loading" || saving) {
    return (
      <span className="text-muted-foreground inline-flex items-center gap-1.5 text-[10px]">
        <span
          aria-hidden
          className="border-muted border-t-accent inline-block h-3 w-3 animate-spin rounded-full border-2"
        />
        {saving ? "Opslaan…" : "Verrijken…"}
      </span>
    );
  }

  if (cached && readOnly) {
    return (
      <span
        className={compact ? "block truncate" : undefined}
        title={compact ? cached.translation : undefined}
      >
        {cached.translation}
      </span>
    );
  }

  if (saveError) {
    return (
      <span className="text-destructive text-[10px]" title={saveError}>
        {saveError}
      </span>
    );
  }

  if (cached && editing) {
    return (
      <div className="flex flex-col gap-1.5">
        <textarea
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              cancelEdit();
            } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              commitEdit();
            }
          }}
          rows={2}
          className="border-input bg-background text-foreground focus:border-accent w-full resize-y rounded border px-2 py-1 text-xs focus:outline-none"
        />
        <div className="text-muted-foreground flex items-center gap-1 text-[10px]">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault() /* voorkom blur-cancel */}
            onClick={commitEdit}
            title="Bewaren (Cmd/Ctrl+Enter)"
            className="rounded border border-emerald-500/40 bg-emerald-500/10 px-1.5 py-0.5 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-400"
          >
            ✓
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={cancelEdit}
            title="Annuleren (Esc)"
            className="border-border bg-background hover:bg-muted rounded border px-1.5 py-0.5"
          >
            ✕
          </button>
          <span className="ml-1">
            Cmd/Ctrl+Enter = bewaren · Esc = annuleren
          </span>
        </div>
      </div>
    );
  }

  if (cached) {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-start gap-2">
          <span
            onDoubleClick={startEdit}
            title="Dubbelklik om handmatig aan te passen"
            className="flex-1 cursor-text"
          >
            {cached.translation}
            {cached.manually_edited && (
              <span
                className="text-muted-foreground/70 ml-1 text-[10px]"
                title="Handmatig aangepast"
              >
                ✎
              </span>
            )}
          </span>
          {!hideEnrichActions && (
            <div className="flex shrink-0 flex-col gap-1">
              <button
                type="button"
                onClick={() => onTranslate(row)}
                title="Opnieuw verrijken — overschrijft vertaling + topic + tags in de cache voor deze zin"
                className="border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground rounded border px-1.5 py-0.5 text-[10px]"
              >
                ↻
              </button>
              <button
                type="button"
                onClick={() => setShowAddAlt((v) => !v)}
                title="Voeg een alternatieve correcte vertaling toe"
                aria-pressed={showAddAlt}
                className={`rounded border px-1.5 py-0.5 text-[10px] ${
                  showAddAlt
                    ? "border-accent bg-accent text-accent-foreground"
                    : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                ＋
              </button>
            </div>
          )}
        </div>

        {!hideEnrichActions && showAddAlt && (
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={altDraft}
              autoFocus
              onChange={(e) => setAltDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitAlt();
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  setAltDraft("");
                  setShowAddAlt(false);
                }
              }}
              placeholder="Alternatieve vertaling"
              className="border-input bg-background flex-1 rounded border px-2 py-1 text-[11px]"
            />
            <button
              type="button"
              onClick={commitAlt}
              className="border-accent/60 bg-accent/10 text-foreground hover:bg-accent/20 rounded border px-2 py-0.5 text-[10px]"
            >
              Toevoegen
            </button>
          </div>
        )}
      </div>
    );
  }

  if (state?.status === "error") {
    if (hideEnrichActions) {
      return (
        <span className="text-destructive text-[10px]" title={state.error}>
          Fout — {truncate(state.error, 60)}
        </span>
      );
    }
    return (
      <div className="flex flex-col gap-1">
        <span className="text-destructive text-[10px]" title={state.error}>
          Fout — {truncate(state.error, 60)}
        </span>
        <button
          type="button"
          onClick={() => onTranslate(row)}
          className="border-border bg-background hover:bg-muted self-start rounded border px-2 py-0.5 text-[10px]"
        >
          Opnieuw
        </button>
      </div>
    );
  }

  if (hideEnrichActions) {
    return <span className="text-muted-foreground/70 text-[10px]">—</span>;
  }

  return (
    <button
      type="button"
      onClick={() => onTranslate(row)}
      title="Verrijk deze rij: vertaling + topic + tags in één AI-call"
      className="border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground rounded border px-2 py-0.5 text-[10px]"
    >
      Verrijk
    </button>
  );
}

// Cel voor het AI-onderwerp. Toont een em-dash zolang er geen
// enrichment-data is voor deze rij (waarschijnlijk omdat de user
// nog geen "Verrijk" heeft gedraaid).
export function TopicCell({
  row,
  translationCache,
  persistMode,
  compact = false,
}: {
  row: AudioRow;
  translationCache: ReturnType<typeof useTranslationCache>;
  persistMode?: AudioResultTablePersistMode;
  compact?: boolean;
}) {
  const cached = translationCache.get(row.audio_id, row.sentence_text);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  async function saveTopic(value: string) {
    const trimmed = value.trim();
    const topic = trimmed.length > 0 ? trimmed : null;
    if (persistMode) {
      await persistMode.onPatchRow(persistMode.getExerciseId(row), { topic });
      if (cached) {
        translationCache.set(row.audio_id, {
          ...cached,
          topic,
        });
      }
    }
    setEditing(false);
  }

  if (!cached || !cached.topic) {
    if (persistMode) {
      if (editing) {
        return (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => void saveTopic(draft)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void saveTopic(draft);
              if (e.key === "Escape") setEditing(false);
            }}
            className="border-input bg-background w-full rounded border px-2 py-1 text-[10px]"
            placeholder="onderwerp"
          />
        );
      }
      return (
        <button
          type="button"
          onClick={() => {
            setDraft("");
            setEditing(true);
          }}
          className="text-muted-foreground text-[10px] underline-offset-2 hover:underline"
        >
          + onderwerp
        </button>
      );
    }
    return <span className="text-muted-foreground/70 text-[10px]">—</span>;
  }

  if (editing && persistMode) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => void saveTopic(draft)}
        onKeyDown={(e) => {
          if (e.key === "Enter") void saveTopic(draft);
          if (e.key === "Escape") setEditing(false);
        }}
        className="border-input bg-background w-full rounded border px-2 py-1 text-[10px]"
      />
    );
  }

  return (
    <span
      onDoubleClick={() => {
        if (!persistMode) return;
        setDraft(cached.topic ?? "");
        setEditing(true);
      }}
      className={`bg-accent/15 text-accent rounded px-1.5 py-0.5 font-mono text-[10px] ${
        persistMode ? "cursor-text" : ""
      }${compact ? "block max-w-full truncate" : ""}`}
      title={
        compact
          ? (cached.topic ?? undefined)
          : persistMode
            ? "Dubbelklik om te bewerken"
            : "AI-gegenereerd onderwerp-label."
      }
    >
      {cached.topic}
    </span>
  );
}

// Cel voor de AI-tags. Toont elke tag als een kleine badge; em-dash
// wanneer er geen enrichment beschikbaar is.
export function TagsCell({
  row,
  translationCache,
  persistMode,
  compact = false,
}: {
  row: AudioRow;
  translationCache: ReturnType<typeof useTranslationCache>;
  persistMode?: AudioResultTablePersistMode;
  compact?: boolean;
}) {
  const cached = translationCache.get(row.audio_id, row.sentence_text);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  async function saveTags(value: string) {
    const tags = value
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    const tagsCsv = tags.join(",");
    if (persistMode) {
      await persistMode.onPatchRow(persistMode.getExerciseId(row), {
        tags: tagsCsv,
      });
      if (cached) {
        translationCache.set(row.audio_id, { ...cached, tags });
      }
    }
    setEditing(false);
  }

  if (!cached || cached.tags.length === 0) {
    if (persistMode) {
      if (editing) {
        return (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => void saveTags(draft)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void saveTags(draft);
              if (e.key === "Escape") setEditing(false);
            }}
            className="border-input bg-background w-full rounded border px-2 py-1 text-[10px]"
            placeholder="tag1, tag2"
          />
        );
      }
      return (
        <button
          type="button"
          onClick={() => {
            setDraft("");
            setEditing(true);
          }}
          className="text-muted-foreground text-[10px] underline-offset-2 hover:underline"
        >
          + tags
        </button>
      );
    }
    return <span className="text-muted-foreground/70 text-[10px]">—</span>;
  }

  if (editing && persistMode) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => void saveTags(draft)}
        onKeyDown={(e) => {
          if (e.key === "Enter") void saveTags(draft);
          if (e.key === "Escape") setEditing(false);
        }}
        className="border-input bg-background w-full rounded border px-2 py-1 text-[10px]"
        placeholder="tag1, tag2"
      />
    );
  }

  return (
    <div
      onDoubleClick={() => {
        if (!persistMode) return;
        setDraft(cached.tags.join(", "));
        setEditing(true);
      }}
      className={
        compact
          ? undefined
          : `flex flex-wrap gap-1 ${persistMode ? "cursor-text" : ""}`
      }
      title={
        compact
          ? cached.tags.join(", ")
          : persistMode
            ? "Dubbelklik om te bewerken"
            : undefined
      }
    >
      {compact ? (
        <span className="text-muted-foreground block truncate font-mono text-[10px]">
          {cached.tags.join(", ")}
        </span>
      ) : (
        cached.tags.map((tag) => (
          <span
            key={tag}
            className="bg-muted text-muted-foreground shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] whitespace-nowrap"
          >
            {tag}
          </span>
        ))
      )}
    </div>
  );
}

// Kolom-cel die "ja"/"nee" toont voor de manually_edited vlag. NL-bron-
// rijen of niet-gecachete rijen krijgen een em-dash.
export function EditedBadgeCell({
  row,
  translationCache,
}: {
  row: AudioRow;
  translationCache: ReturnType<typeof useTranslationCache>;
}) {
  if (row.lang === TARGET_LANG) {
    return <span className="text-muted-foreground/70 text-[10px]">—</span>;
  }
  const cached = translationCache.get(row.audio_id, row.sentence_text);
  if (!cached) {
    return <span className="text-muted-foreground/70 text-[10px]">—</span>;
  }
  return cached.manually_edited ? (
    <span
      className="bg-accent/20 text-accent rounded px-1.5 py-0.5 font-mono text-[9px]"
      title="De auto-gegenereerde vertaling is handmatig aangepast."
    >
      ja
    </span>
  ) : (
    <span
      className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 font-mono text-[9px]"
      title="Niet handmatig aangepast — auto-vertaling staat zoals AI 'm gaf."
    >
      nee
    </span>
  );
}

// Kolom-cel met dropdown: toont count + ▼; klap-open laat de lijst
// zien met ✕-knoppen om te verwijderen en een input om toe te voegen.
// Hergebruikt het patroon van LicenseHeader (mousedown buiten + Esc
// sluiten).
export function AlternativesCell({
  row,
  translationCache,
  readOnly = false,
  persistMode,
  compact = false,
}: {
  row: AudioRow;
  translationCache: ReturnType<typeof useTranslationCache>;
  readOnly?: boolean;
  persistMode?: AudioResultTablePersistMode;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  if (row.lang === TARGET_LANG) {
    return <span className="text-muted-foreground/70 text-[10px]">—</span>;
  }
  const cached = translationCache.get(row.audio_id, row.sentence_text);
  if (!cached) {
    return <span className="text-muted-foreground/70 text-[10px]">—</span>;
  }

  async function patchAlternatives(next: string[]) {
    if (!persistMode || !cached) return;
    await persistMode.onPatchRow(persistMode.getExerciseId(row), {
      alternative_translations: next,
    });
  }

  function commit() {
    if (!cached) return;
    const trimmed = draft.trim();
    if (trimmed.length === 0) return;
    const next = [...cached.alternatives, trimmed];
    if (persistMode) {
      void patchAlternatives(next).then(() => {
        translationCache.addAlternative(row.audio_id, trimmed);
      });
    } else {
      translationCache.addAlternative(row.audio_id, trimmed);
    }
    setDraft("");
  }

  function removeAt(idx: number) {
    if (!cached) return;
    const next = cached.alternatives.filter((_, i) => i !== idx);
    if (persistMode) {
      void patchAlternatives(next).then(() => {
        translationCache.removeAlternative(row.audio_id, idx);
      });
    } else {
      translationCache.removeAlternative(row.audio_id, idx);
    }
  }

  const count = cached.alternatives.length;

  if (readOnly) {
    if (count === 0) {
      return <span className="text-muted-foreground/70 text-[10px]">—</span>;
    }
    const joined = cached.alternatives.join(" · ");
    return (
      <span
        className={
          compact
            ? "text-muted-foreground block truncate text-[11px]"
            : "text-muted-foreground text-[11px]"
        }
        title={compact ? joined : undefined}
      >
        {joined}
      </span>
    );
  }

  return (
    <div ref={wrapperRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`hover:text-foreground inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[10px] ${
          count > 0
            ? "border-accent/40 bg-accent/10 text-accent"
            : "border-border bg-background text-muted-foreground"
        }`}
        title={
          count === 0
            ? "Klap uit om een alternatieve vertaling toe te voegen"
            : `${count} alternatieve vertaling${count === 1 ? "" : "en"} — klap uit om te bekijken/bewerken`
        }
      >
        {count} alt
        <span className="text-[8px]">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Alternatieve vertalingen beheren"
          className="border-border bg-card text-card-foreground absolute top-full left-0 z-10 mt-1 w-[280px] rounded-md border p-2 shadow-lg"
        >
          {cached.alternatives.length > 0 ? (
            <ul className="space-y-1">
              {cached.alternatives.map((alt, idx) => (
                <li
                  key={`${idx}-${alt}`}
                  className="bg-muted/30 flex items-start gap-1 rounded px-2 py-1 text-[11px]"
                >
                  <span className="flex-1 normal-case">{alt}</span>
                  <button
                    type="button"
                    onClick={() => removeAt(idx)}
                    title="Verwijder deze alternatieve vertaling"
                    className="border-border bg-background text-muted-foreground hover:bg-destructive/10 hover:text-destructive shrink-0 rounded border px-1.5 py-0.5 text-[10px]"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground px-1 py-1 text-[10px] tracking-normal normal-case">
              Nog geen alternatieven.
            </p>
          )}

          <div className="mt-2 flex items-center gap-1">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commit();
                }
              }}
              placeholder="Nieuwe alternatieve vertaling"
              className="border-input bg-background flex-1 rounded border px-2 py-1 text-[11px] normal-case"
            />
            <button
              type="button"
              onClick={commit}
              className="border-accent/60 bg-accent/10 text-foreground hover:bg-accent/20 rounded border px-2 py-0.5 text-[10px] normal-case"
            >
              +
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
