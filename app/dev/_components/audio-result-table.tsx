"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { AudioRow } from "@/app/api/dev/tatoeba-audio/list/route";
import type { useTranslationCache } from "@/lib/hooks/use-translation-cache";



// Gedeelde "rich" resultaat-tabel voor audio-rijen — gebruikt door
// zowel /dev/tatoeba-audio (de playground) als
// /dev/tatoeba-audio-search (de semantische zoekmachine).
//
// Het component bezit zelf alle UI-state die intrinsiek aan de tabel-
// weergave hangt (sort, license-filter, mp3 url-toggle, FilterBar-
// inputs). Parents leveren alleen de rijen + translate-handlers
// + optionele search-enrichments (cosine / reden) aan. Zo blijft de
// integratie symmetrisch tussen beide pagina's: rijen erin, tabel eruit.
//
// Bewust geen control-coupling met de parent voor sort/filter — anders
// zou elke pagina hetzelfde state-blok moeten dupliceren.

// ── Public types ──────────────────────────────────────────────────

export type SortKey = "audio_id" | "sentence_id" | "created";
export type SortDir = "asc" | "desc";

// Per-rij vertaal-status. Succesvolle vertalingen leven in de
// `useTranslationCache`-hook (localStorage), niet in deze map —
// hier alleen pending/error zodat de UI feedback kan geven tijdens
// een lopende batch.
export type TranslateRowState =
  | { status: "loading" }
  | { status: "error"; error: string };

export type SearchEnrichments = {
  // Per audio_id de cosine-score uit de laatste search-pipeline.
  cosineById: Record<number, number>;
  // Per audio_id een korte reden-string (alleen aanwezig na rerank).
  reasonsById: Record<number, string>;
};

export type AudioResultTableProps = {
  rows: AudioRow[];
  translation: {
    cache: ReturnType<typeof useTranslationCache>;
    state: Record<number, TranslateRowState>;
    onTranslateRow: (row: AudioRow) => void;
  };
  // Aanwezig op de search-page; afwezig op audio-playground. Wanneer
  // afwezig of leeg → cosine/reden-kolommen worden niet gerenderd.
  searchEnrichments?: SearchEnrichments;
  // Default true. Search-page kan FilterBar uitzetten als de chat
  // al filter-genoeg is. Voor nu staat 'ie overal aan.
  showFilterBar?: boolean;
};

// ── Constants ─────────────────────────────────────────────────────

// Sentinel om "geen filter" te onderscheiden van een lege-string licentie
// (= 'no-reuse').
const LICENSE_FILTER_ALL = "__all__";

// Bron is al de doel-taal van de vertaling → geen knop tonen.
const TARGET_LANG = "nld";

function licenseDisplay(license: string): string {
  return license.trim() === "" ? "no-reuse" : license;
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

// ── Main component ────────────────────────────────────────────────

export function AudioResultTable({
  rows,
  translation,
  searchEnrichments,
  showFilterBar = true,
}: AudioResultTableProps) {
  const [licenseFilter, setLicenseFilter] = useState<string>(LICENSE_FILTER_ALL);
  const [authorQuery, setAuthorQuery] = useState<string>("");
  const [textQuery, setTextQuery] = useState<string>("");
  const [reusableOnly, setReusableOnly] = useState<boolean>(false);
  const [sortKey, setSortKey] = useState<SortKey>("audio_id");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [showMp3Url, setShowMp3Url] = useState<boolean>(false);

  const availableLicenses = useMemo(() => {
    const set = new Set<string>();
    for (const row of rows) set.add(row.license);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  // Derived ipv. een effect-driven reset: als de gekozen licentie niet
  // in de huidige rows zit (bv. na taalwissel), valt 'ie automatisch
  // terug op "Alle". Voorkomt een lege tabel zonder zichtbare oorzaak,
  // zonder cascading renders.
  const effectiveLicenseFilter = useMemo(() => {
    if (licenseFilter === LICENSE_FILTER_ALL) return LICENSE_FILTER_ALL;
    return availableLicenses.includes(licenseFilter)
      ? licenseFilter
      : LICENSE_FILTER_ALL;
  }, [licenseFilter, availableLicenses]);

  const filteredRows = useMemo(() => {
    if (rows.length === 0) return rows;
    const author = authorQuery.trim().toLowerCase();
    const text = textQuery.trim().toLowerCase();
    return rows.filter((row) => {
      if (reusableOnly && row.license.trim() === "") return false;
      if (
        effectiveLicenseFilter !== LICENSE_FILTER_ALL &&
        row.license !== effectiveLicenseFilter
      )
        return false;
      if (author && !row.author.toLowerCase().includes(author)) return false;
      if (text && !row.sentence_text.toLowerCase().includes(text)) return false;
      return true;
    });
  }, [rows, authorQuery, textQuery, reusableOnly, effectiveLicenseFilter]);

  const sortedRows = useMemo(() => {
    if (filteredRows.length === 0) return filteredRows;
    const dir = sortDir === "asc" ? 1 : -1;
    return [...filteredRows].sort((a, b) => {
      const va = sortKey === "created" ? (a.created ?? "") : a[sortKey];
      const vb = sortKey === "created" ? (b.created ?? "") : b[sortKey];
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
  }, [filteredRows, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  // Conditioneel kolommen tonen: cosine/reden alleen als de search-page
  // ze daadwerkelijk heeft (anders 'staan ze leeg' op audio-playground).
  const showCosine =
    !!searchEnrichments && Object.keys(searchEnrichments.cosineById).length > 0;
  const showReason =
    !!searchEnrichments && Object.keys(searchEnrichments.reasonsById).length > 0;

  return (
    <div className="space-y-3">
      {showFilterBar && (
        <FilterBar
          authorQuery={authorQuery}
          onAuthorChange={setAuthorQuery}
          textQuery={textQuery}
          onTextChange={setTextQuery}
          reusableOnly={reusableOnly}
          onReusableOnlyChange={setReusableOnly}
        />
      )}

      {sortedRows.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-muted/40 px-3 py-4 text-center text-xs text-muted-foreground">
          {rows.length === 0
            ? "Geen rijen om te tonen."
            : "Geen rijen voor deze filtercombinatie."}
        </p>
      ) : (
        <div className="overflow-auto rounded-md border border-border">
          <table className="w-full border-collapse text-left text-xs">
            <thead className="sticky top-0 bg-muted/60 text-[10px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <SortableHeader
                  label="audio_id"
                  sortKey="audio_id"
                  currentKey={sortKey}
                  dir={sortDir}
                  onSort={toggleSort}
                />
                <SortableHeader
                  label="sentence_id"
                  sortKey="sentence_id"
                  currentKey={sortKey}
                  dir={sortDir}
                  onSort={toggleSort}
                />
                <th className="px-3 py-2 font-semibold">sentence_text</th>
                <th className="px-3 py-2 font-semibold">vertaling (NL)</th>
                <th className="px-3 py-2 font-semibold">lang</th>
                <th className="px-3 py-2 font-semibold">author</th>
                <LicenseHeader
                  licenseFilter={effectiveLicenseFilter}
                  availableLicenses={availableLicenses}
                  onChange={setLicenseFilter}
                />
                <SortableHeader
                  label="created"
                  sortKey="created"
                  currentKey={sortKey}
                  dir={sortDir}
                  onSort={toggleSort}
                />
                {showCosine && (
                  <th className="px-3 py-2 font-semibold">cosine</th>
                )}
                {showReason && (
                  <th className="px-3 py-2 font-semibold">reden</th>
                )}
                <th className="px-3 py-2 font-semibold">
                  <div className="flex items-center gap-2">
                    <span>mp3</span>
                    <button
                      type="button"
                      onClick={() => setShowMp3Url((v) => !v)}
                      title={
                        showMp3Url
                          ? "Toon link-tekst i.p.v. de volledige URL"
                          : "Toon de volledige URL i.p.v. de link-tekst"
                      }
                      className="rounded border border-border bg-background px-1.5 py-0.5 text-[9px] font-medium normal-case tracking-normal text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      {showMp3Url ? "link" : "url"}
                    </button>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row) => {
                const cosine = searchEnrichments?.cosineById[row.audio_id];
                const reason = searchEnrichments?.reasonsById[row.audio_id];
                return (
                  <tr
                    key={row.audio_id}
                    className="border-t border-border align-top hover:bg-muted/30"
                  >
                    <td className="px-3 py-2 font-mono">{row.audio_id}</td>
                    <td className="px-3 py-2 font-mono">{row.sentence_id}</td>
                    <td className="px-3 py-2">{row.sentence_text}</td>
                    <td className="px-3 py-2">
                      <TranslationCell
                        row={row}
                        translationCache={translation.cache}
                        state={translation.state[row.audio_id]}
                        onTranslate={translation.onTranslateRow}
                      />
                    </td>
                    <td className="px-3 py-2 font-mono uppercase">{row.lang}</td>
                    <td className="px-3 py-2">{row.author}</td>
                    <td className="px-3 py-2 font-mono text-[10px]">
                      {licenseDisplay(row.license)}
                    </td>
                    <td className="px-3 py-2 font-mono text-[10px] text-muted-foreground">
                      {row.created ?? "—"}
                    </td>
                    {showCosine && (
                      <td className="px-3 py-2 font-mono text-[10px] text-muted-foreground">
                        {cosine !== undefined ? cosine.toFixed(3) : "—"}
                      </td>
                    )}
                    {showReason && (
                      <td className="px-3 py-2 text-[11px] text-muted-foreground">
                        {reason ?? "—"}
                      </td>
                    )}
                    <td className="px-3 py-2">
                      <a
                        href={row.mp3_url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-[10px] break-all text-accent underline-offset-2 hover:underline"
                        title={row.mp3_url}
                      >
                        {showMp3Url ? row.mp3_url : "open mp3"}
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {rows.length > 0 && (
        <p className="text-[10px] text-muted-foreground">
          Getoond {sortedRows.length} van {rows.length} rijen.
        </p>
      )}
    </div>
  );
}

// ── Sub-components (intern) ───────────────────────────────────────

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
    <div className="grid gap-3 rounded-md border border-border bg-background/40 p-3 sm:grid-cols-3">
      <label className="flex flex-col gap-1">
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Auteur bevat
        </span>
        <input
          type="text"
          value={authorQuery}
          onChange={(e) => onAuthorChange(e.target.value)}
          placeholder="bv. CK"
          className="rounded-md border border-input bg-background px-2 py-1.5 text-xs"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Zin bevat
        </span>
        <input
          type="text"
          value={textQuery}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder="bv. comer"
          className="rounded-md border border-input bg-background px-2 py-1.5 text-xs"
        />
      </label>

      <label className="flex items-center gap-2 pt-4 text-xs text-muted-foreground">
        <input
          type="checkbox"
          checked={reusableOnly}
          onChange={(e) => onReusableOnlyChange(e.target.checked)}
          className="h-4 w-4 rounded border-input"
        />
        Alleen herbruikbaar
      </label>
    </div>
  );
}

function SortableHeader({
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
        className={`inline-flex items-center gap-1 uppercase tracking-wide hover:text-foreground ${active ? "text-foreground" : ""
          }`}
      >
        {label}
        {arrow}
      </button>
    </th>
  );
}

// Klikbare kolomheader voor 'license': opent een dropdown met alle
// distincte licentie-waarden in de geladen rijen + "Alle". Sluit
// automatisch bij een klik buiten de header (mousedown-listener op
// document) of met Escape.
function LicenseHeader({
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
          className={`inline-flex items-center gap-1 uppercase tracking-wide hover:text-foreground ${isFiltered ? "text-foreground" : ""
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
            <span className="rounded bg-accent/20 px-1 py-0.5 font-mono text-[9px] normal-case text-accent">
              {licenseDisplay(licenseFilter)}
            </span>
          )}
        </button>

        {open && (
          <div
            role="menu"
            className="absolute left-0 top-full z-10 mt-1 min-w-[200px] rounded-md border border-border bg-card py-1 text-card-foreground shadow-lg"
          >
            <LicenseMenuItem
              label="Alle"
              isActive={!isFiltered}
              onClick={() => pick(LICENSE_FILTER_ALL)}
            />
            {availableLicenses.length > 0 && (
              <div className="my-1 border-t border-border" />
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
              <p className="px-3 py-2 text-[10px] normal-case tracking-normal text-muted-foreground">
                Geen rijen — niets om te filteren.
              </p>
            )}
          </div>
        )}
      </div>
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
      className={`flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-xs normal-case tracking-normal hover:bg-muted ${isActive ? "font-medium text-foreground" : "text-muted-foreground"
        }`}
    >
      <span className="font-mono">{label}</span>
      {isActive && <span className="text-accent">✓</span>}
    </button>
  );
}

// Per-rij cel die de vertaling rendert. Vier statussen:
// 1. Bron is al NL → em-dash (geen knop, niets om te vertalen).
// 2. Loading → spinner.
// 3. Cache-hit → tekst + klein '↻' om opnieuw te vertalen.
// 4. Geen cache → 'Vertaal'-knop (of error-state met Opnieuw).
function TranslationCell({
  row,
  translationCache,
  state,
  onTranslate,
}: {
  row: AudioRow;
  translationCache: ReturnType<typeof useTranslationCache>;
  state: TranslateRowState | undefined;
  onTranslate: (row: AudioRow) => void;
}) {
  if (row.lang === TARGET_LANG) {
    return (
      <span
        className="text-[10px] text-muted-foreground/70"
        title="Bron is al Nederlands — geen vertaling nodig."
      >
        —
      </span>
    );
  }

  if (state?.status === "loading") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <span
          aria-hidden
          className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-muted border-t-accent"
        />
        Vertalen…
      </span>
    );
  }

  const cached = translationCache.get(row.audio_id, row.sentence_text);
  if (cached) {
    return (
      <div className="flex items-start gap-2">
        <span className="flex-1">{cached.translation}</span>
        <button
          type="button"
          onClick={() => onTranslate(row)}
          title="Hervertalen — overschrijft de cache voor deze zin"
          className="shrink-0 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          ↻
        </button>
      </div>
    );
  }

  if (state?.status === "error") {
    return (
      <div className="flex flex-col gap-1">
        <span className="text-[10px] text-destructive" title={state.error}>
          Fout — {truncate(state.error, 60)}
        </span>
        <button
          type="button"
          onClick={() => onTranslate(row)}
          className="self-start rounded border border-border bg-background px-2 py-0.5 text-[10px] hover:bg-muted"
        >
          Opnieuw
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onTranslate(row)}
      className="rounded border border-border bg-background px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-accent hover:text-accent-foreground"
    >
      Vertaal
    </button>
  );
}
