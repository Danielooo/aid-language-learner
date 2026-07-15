"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { ExercisePatchFields } from "@/lib/exercises/types";
import type { AudioRow } from "@/types/tatoeba";
import type { useTranslationCache } from "@/lib/hooks/use-translation-cache";

// Selection-API: optioneel. Als de parent dit object niet meelevert
// wordt geen checkbox-kolom gerenderd → bestaande pagina's blijven
// pixel-identiek. De parent bezit de Set zelf (controlled state) zodat
// een persist-knop boven de tabel synchroon kan reageren op wijzigingen.
export type AudioResultTableSelection = {
  selectedIds: Set<number>;
  onToggle: (audioId: number) => void;
  // Toggle-all-zichtbare: krijgt de id-lijst zoals deze ná filter +
  // sort op het scherm verschijnt, zodat de parent niet hoeft te
  // dupliceren wat de tabel zelf al heeft uitgerekend.
  onToggleAllVisible: (visibleIds: number[]) => void;
};



// Gedeelde "rich" resultaat-tabel voor audio-rijen — gebruikt door
// Tatoeba-import en oefeningenlijsten.
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

// Identifiers voor de togglebare kolommen. `sentence_text`, `vertaling`,
// `mp3` en de checkbox-kolom zijn structureel en staan niet in deze
// lijst — die kun je niet verbergen zonder de tabel onbruikbaar te
// maken.
export type ColumnKey =
  | "audio_id"
  | "sentence_id"
  | "edited"
  | "alternatives"
  | "topic"
  | "tags"
  | "lang"
  | "author"
  | "license"
  | "created"
  | "cosine"
  | "reason";

// Label dat in het kolommen-menu en (waar van toepassing) in de header
// gebruikt wordt. Bewaar in één plek zodat we niet uit sync raken.
const COLUMN_LABELS: Record<ColumnKey, string> = {
  audio_id: "audio_id",
  sentence_id: "sentence_id",
  edited: "aangepast?",
  alternatives: "alternatieven",
  topic: "onderwerp",
  tags: "tags",
  lang: "lang",
  author: "author",
  license: "license",
  created: "created",
  cosine: "cosine",
  reason: "reden",
};

// Vaste presentatie-volgorde voor het menu (= visuele volgorde van de
// kolommen in de tabel). Pure UI; de feitelijke render-volgorde leeft
// in de JSX hieronder.
const COLUMN_ORDER: ColumnKey[] = [
  "audio_id",
  "sentence_id",
  "edited",
  "alternatives",
  "topic",
  "tags",
  "lang",
  "author",
  "license",
  "created",
  "cosine",
  "reason",
];

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

export type AudioResultTablePersistMode = {
  getExerciseId: (row: AudioRow) => string;
  onPatchRow: (
    exerciseId: string,
    fields: ExercisePatchFields,
  ) => Promise<void>;
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
  // Optioneel: enable per-rij checkboxes. Parent bezit de selectie-set
  // zodat een persist-knop buiten de tabel kan reageren.
  selection?: AudioResultTableSelection;
  // Sleutel voor de localStorage-persistentie van de kolom-zichtbaar-
  // heid. Verschillende pagina's krijgen onafhankelijke voorkeuren.
  // Ontbreekt → geen persistentie (alleen in-memory).
  tableScope?: string;
  // Initiële verborgen kolommen wanneer er nog niets in localStorage
  // staat. Wordt genegeerd zodra de gebruiker zelf iets aanpast.
  defaultHiddenColumns?: ColumnKey[];
  // Read-only modus: geen verrijk-knoppen of handmatige bewerking.
  readOnly?: boolean;
  // Admin: inline edits schrijven naar Supabase via callback.
  persistMode?: AudioResultTablePersistMode;
  // Verberg mp3-kolom (o.a. exercise-generator zonder audio).
  hideMp3Column?: boolean;
  // Verberg Verrijk/↻/＋ in TranslationCell (LLM levert al vertaling).
  hideEnrichActions?: boolean;
  // Inline bewerken van de bron-zin (sentence_text).
  editableSourceText?: boolean;
  onPatchSourceText?: (row: AudioRow, text: string) => void;
  // Kolommen die nooit renderen en niet in het kolommen-menu staan.
  excludedColumns?: ColumnKey[];
  // Server-side sortering: parent bezit sort-state en schakelt client-sort uit.
  sortKey?: SortKey;
  sortDir?: SortDir;
  onSortChange?: (key: SortKey, dir: SortDir) => void;
  serverSorted?: boolean;
};

// ── Constants ─────────────────────────────────────────────────────

// Sentinel om "geen filter" te onderscheiden van een lege-string licentie
// (= 'no-reuse').
const LICENSE_FILTER_ALL = "__all__";

// Bron is al de doel-taal van de vertaling → geen knop tonen.
const TARGET_LANG = "nld";

// localStorage-prefix voor de kolom-zichtbaarheid-voorkeur. Per
// `tableScope` (search / playground) krijg je een eigen sleutel zodat
// verschillende views elkaar niet overschrijven.
const HIDDEN_COLS_KEY_PREFIX = "aid:audio-table:cols:";

function hiddenColsStorageKey(scope: string | undefined): string | null {
  if (!scope) return null;
  return `${HIDDEN_COLS_KEY_PREFIX}${scope}`;
}

// Parse helper: tolereert onbekende/buggy waarden door alleen geldige
// ColumnKey-strings te accepteren. Stille fallback naar lege set.
function readHiddenCols(key: string): Set<ColumnKey> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const set = new Set<ColumnKey>();
    for (const v of parsed) {
      if (typeof v === "string" && (COLUMN_ORDER as string[]).includes(v)) {
        set.add(v as ColumnKey);
      }
    }
    return set;
  } catch {
    return null;
  }
}

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
  selection,
  tableScope,
  defaultHiddenColumns,
  readOnly = false,
  persistMode,
  hideMp3Column = false,
  hideEnrichActions = false,
  editableSourceText = false,
  onPatchSourceText,
  excludedColumns,
  sortKey: controlledSortKey,
  sortDir: controlledSortDir,
  onSortChange,
  serverSorted = false,
}: AudioResultTableProps) {
  const [licenseFilter, setLicenseFilter] = useState<string>(LICENSE_FILTER_ALL);
  const [authorQuery, setAuthorQuery] = useState<string>("");
  const [textQuery, setTextQuery] = useState<string>("");
  const [reusableOnly, setReusableOnly] = useState<boolean>(false);
  const [internalSortKey, setInternalSortKey] = useState<SortKey>("audio_id");
  const [internalSortDir, setInternalSortDir] = useState<SortDir>("desc");
  const sortKey = controlledSortKey ?? internalSortKey;
  const sortDir = controlledSortDir ?? internalSortDir;
  const [showMp3Url, setShowMp3Url] = useState<boolean>(false);

  // Kolom-zichtbaarheid. Init met de defaults om hydration-mismatch
  // te vermijden; in een effect na mount mergen we de localStorage-
  // voorkeur erin (overschrijft de defaults wanneer aanwezig).
  const [hiddenColumns, setHiddenColumns] = useState<Set<ColumnKey>>(
    () => new Set(defaultHiddenColumns ?? []),
  );
  // Pas pas op nadat de localStorage-restore is uitgevoerd. Voorkomt
  // dat we de defaults overschrijven met een lege set zodra een user
  // (zonder voorkeur) de pagina opent.
  const hydratedRef = useRef(false);

  useEffect(() => {
    const key = hiddenColsStorageKey(tableScope);
    if (!key) {
      hydratedRef.current = true;
      return;
    }
    const restored = readHiddenCols(key);
    if (restored !== null) {
      // SSR-hydratie: localStorage-voorkeur kan pas na mount gelezen worden.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHiddenColumns(restored);
    }
    hydratedRef.current = true;
  }, [tableScope]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    const key = hiddenColsStorageKey(tableScope);
    if (!key || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        key,
        JSON.stringify(Array.from(hiddenColumns)),
      );
    } catch {
      // Stil falen: quota / private mode / etc. is niet kritiek voor
      // een admin-tool.
    }
  }, [hiddenColumns, tableScope]);

  const excludedSet = useMemo(
    () => new Set<ColumnKey>(excludedColumns ?? []),
    [excludedColumns],
  );

  const isColumnAvailable = useCallback(
    (key: ColumnKey) => !excludedSet.has(key),
    [excludedSet],
  );

  const isHidden = useCallback(
    (key: ColumnKey) => hiddenColumns.has(key),
    [hiddenColumns],
  );

  const toggleColumn = useCallback((key: ColumnKey) => {
    setHiddenColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // Eén verborgen <audio> voor de hele tabel: maximaal één rij speelt
  // tegelijk. Bij klik op een andere ▶ stoppen we de huidige eerst.
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<number | null>(null);

  const handlePlayToggle = useCallback((audioId: number, mp3Url: string) => {
    const node = audioRef.current;
    if (!node) return;
    setPlayingAudioId((current) => {
      if (current === audioId) {
        node.pause();
        return null;
      }
      // Switch source + start. Bij dezelfde URL niet noodzakelijk
      // herzetten, maar het simpelste blijft één code-pad.
      if (node.src !== mp3Url) node.src = mp3Url;
      void node.play().catch(() => {
        // Browser kan play() weigeren (bv. user-gesture-policy bij
        // page-load). Reset state zodat de ▶-knop weer beschikbaar is.
        setPlayingAudioId(null);
      });
      return audioId;
    });
  }, []);

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

  // Bouw één matcher voor de zin-tekst-filter zodat we 'm in de filter-
  // loop niet opnieuw hoeven uit te rekenen. Twee modes:
  //   - default: substring-match op de hele query (bv. "auto rijden"
  //     matcht alleen rijen waarin die exacte volgorde voorkomt).
  //   - "/"-prefix: tokenized AND-match. "/auto rijden" matcht rijen
  //     waarin zowel "auto" als "rijden" als substring voorkomen,
  //     ongeacht de volgorde of woordafstand. Handig om rond losse
  //     woorden te zoeken zonder de exacte zinsbouw te kennen.
  const textMatcher = useMemo(() => {
    const raw = textQuery.trim();
    if (!raw) return null;
    if (raw.startsWith("/")) {
      const tokens = raw
        .slice(1)
        .toLowerCase()
        .split(/\s+/)
        .filter((t) => t.length > 0);
      if (tokens.length === 0) return null;
      return (sentence: string) => {
        const lower = sentence.toLowerCase();
        return tokens.every((t) => lower.includes(t));
      };
    }
    const lowered = raw.toLowerCase();
    return (sentence: string) => sentence.toLowerCase().includes(lowered);
  }, [textQuery]);

  const filteredRows = useMemo(() => {
    if (rows.length === 0) return rows;
    const author = authorQuery.trim().toLowerCase();
    return rows.filter((row) => {
      if (reusableOnly && row.license.trim() === "") return false;
      if (
        effectiveLicenseFilter !== LICENSE_FILTER_ALL &&
        row.license !== effectiveLicenseFilter
      )
        return false;
      if (author && !row.author.toLowerCase().includes(author)) return false;
      if (textMatcher && !textMatcher(row.sentence_text)) return false;
      return true;
    });
  }, [rows, authorQuery, textMatcher, reusableOnly, effectiveLicenseFilter]);

  const sortedRows = useMemo(() => {
    if (serverSorted) return filteredRows;
    if (filteredRows.length === 0) return filteredRows;
    const dir = sortDir === "asc" ? 1 : -1;
    return [...filteredRows].sort((a, b) => {
      const va = sortKey === "created" ? (a.created ?? "") : a[sortKey];
      const vb = sortKey === "created" ? (b.created ?? "") : b[sortKey];
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
  }, [filteredRows, sortKey, sortDir, serverSorted]);

  function toggleSort(key: SortKey) {
    if (onSortChange) {
      const nextDir =
        key === sortKey ? (sortDir === "asc" ? "desc" : "asc") : "desc";
      onSortChange(key, nextDir);
      return;
    }
    if (key === sortKey) {
      setInternalSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setInternalSortKey(key);
      setInternalSortDir("asc");
    }
  }

  // Conditioneel kolommen tonen: cosine/reden alleen als de search-page
  // ze daadwerkelijk heeft (anders 'staan ze leeg' op audio-playground).
  const hasCosine =
    !!searchEnrichments && Object.keys(searchEnrichments.cosineById).length > 0;
  const hasReason =
    !!searchEnrichments && Object.keys(searchEnrichments.reasonsById).length > 0;

  // Combineer "is de kolom überhaupt leverbaar?" met "heeft de user 'm
  // niet verstopt?". Cosine/reden zonder enrichments worden überhaupt
  // niet getoond (en staan ook niet in het menu).
  const showAudioId = isColumnAvailable("audio_id") && !isHidden("audio_id");
  const showSentenceId =
    isColumnAvailable("sentence_id") && !isHidden("sentence_id");
  const showEdited = isColumnAvailable("edited") && !isHidden("edited");
  const showAlternatives =
    isColumnAvailable("alternatives") && !isHidden("alternatives");
  const showTopic = isColumnAvailable("topic") && !isHidden("topic");
  const showTags = isColumnAvailable("tags") && !isHidden("tags");
  const showLang = isColumnAvailable("lang") && !isHidden("lang");
  const showAuthor = isColumnAvailable("author") && !isHidden("author");
  const showLicense = isColumnAvailable("license") && !isHidden("license");
  const showCreated = isColumnAvailable("created") && !isHidden("created");
  const showCosine =
    isColumnAvailable("cosine") && hasCosine && !isHidden("cosine");
  const showReason =
    isColumnAvailable("reason") && hasReason && !isHidden("reason");

  // Lijst voor het kolommen-menu: alleen kolommen waarvoor het toggle
  // ook zin heeft. Op de playground-pagina verschijnen `cosine`/`reden`
  // niet in het menu (geen data).
  const menuColumns = useMemo<ColumnKey[]>(() => {
    return COLUMN_ORDER.filter((key) => {
      if (!isColumnAvailable(key)) return false;
      if (key === "cosine") return hasCosine;
      if (key === "reason") return hasReason;
      return true;
    });
  }, [hasCosine, hasReason, isColumnAvailable]);

  // Afgeleide selectie-stats voor de header-checkbox. We rekenen alleen
  // over de zichtbare-na-filter rijen (sortedRows): "select all" doet
  // anders rare dingen als de user gefilterd heeft.
  const visibleIds = useMemo(
    () => sortedRows.map((r) => r.audio_id),
    [sortedRows],
  );
  const visibleSelectedCount = useMemo(() => {
    if (!selection) return 0;
    let n = 0;
    for (const id of visibleIds) {
      if (selection.selectedIds.has(id)) n += 1;
    }
    return n;
  }, [selection, visibleIds]);
  const allVisibleSelected =
    selection !== undefined &&
    visibleIds.length > 0 &&
    visibleSelectedCount === visibleIds.length;
  const someVisibleSelected =
    selection !== undefined &&
    visibleSelectedCount > 0 &&
    visibleSelectedCount < visibleIds.length;

  // Aantal actieve filters voor de badge op de Filter-knop.
  const activeFilterCount =
    (authorQuery.trim().length > 0 ? 1 : 0) +
    (textQuery.trim().length > 0 ? 1 : 0) +
    (reusableOnly ? 1 : 0);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {showFilterBar ? (
          <FilterToggle
            activeCount={activeFilterCount}
            authorQuery={authorQuery}
            onAuthorChange={setAuthorQuery}
            textQuery={textQuery}
            onTextChange={setTextQuery}
            reusableOnly={reusableOnly}
            onReusableOnlyChange={setReusableOnly}
          />
        ) : (
          <span />
        )}
        <ColumnVisibilityMenu
          columns={menuColumns}
          hiddenColumns={hiddenColumns}
          onToggle={toggleColumn}
        />
      </div>

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
                {selection && (
                  <SelectAllHeader
                    allChecked={allVisibleSelected}
                    indeterminate={someVisibleSelected}
                    onToggle={() => selection.onToggleAllVisible(visibleIds)}
                    visibleCount={visibleIds.length}
                  />
                )}
                {showAudioId && (
                  <SortableHeader
                    label="audio_id"
                    sortKey="audio_id"
                    currentKey={sortKey}
                    dir={sortDir}
                    onSort={toggleSort}
                  />
                )}
                {showSentenceId && (
                  <SortableHeader
                    label="sentence_id"
                    sortKey="sentence_id"
                    currentKey={sortKey}
                    dir={sortDir}
                    onSort={toggleSort}
                  />
                )}
                <th className="px-3 py-2 font-semibold">sentence_text</th>
                <th
                  className="px-3 py-2 font-semibold"
                  title="Dubbelklik op de tekst om handmatig aan te passen. + om alternatieve vertalingen toe te voegen."
                >
                  vertaling (NL)
                </th>
                {showEdited && (
                  <th
                    className="px-3 py-2 font-semibold"
                    title="Is de auto-vertaling handmatig aangepast door dubbelklik?"
                  >
                    aangepast?
                  </th>
                )}
                {showAlternatives && (
                  <th className="px-3 py-2 font-semibold">alternatieven</th>
                )}
                {showTopic && (
                  <th
                    className="px-3 py-2 font-semibold"
                    title="AI-gegenereerd topic-label (lowercase NL); hergebruikt bestaande topics uit Supabase waar mogelijk."
                  >
                    onderwerp
                  </th>
                )}
                {showTags && (
                  <th
                    className="px-3 py-2 font-semibold"
                    title="AI-gegenereerde tags (2-5, lowercase NL)."
                  >
                    tags
                  </th>
                )}
                {showLang && <th className="px-3 py-2 font-semibold">lang</th>}
                {showAuthor && (
                  <th className="px-3 py-2 font-semibold">author</th>
                )}
                {showLicense && (
                  <LicenseHeader
                    licenseFilter={effectiveLicenseFilter}
                    availableLicenses={availableLicenses}
                    onChange={setLicenseFilter}
                  />
                )}
                {showCreated && (
                  <SortableHeader
                    label="created"
                    sortKey="created"
                    currentKey={sortKey}
                    dir={sortDir}
                    onSort={toggleSort}
                  />
                )}
                {showCosine && (
                  <th className="px-3 py-2 font-semibold">cosine</th>
                )}
                {showReason && (
                  <th className="px-3 py-2 font-semibold">reden</th>
                )}
                {!hideMp3Column && (
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
                )}
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row) => {
                const cosine = searchEnrichments?.cosineById[row.audio_id];
                const reason = searchEnrichments?.reasonsById[row.audio_id];
                const isSelected = selection?.selectedIds.has(row.audio_id);
                return (
                  <tr
                    key={row.audio_id}
                    className={`border-t border-border align-top hover:bg-muted/30 ${
                      isSelected ? "bg-accent/5" : ""
                    }`}
                  >
                    {selection && (
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={!!isSelected}
                          onChange={() => selection.onToggle(row.audio_id)}
                          className="h-4 w-4 rounded border-input"
                          aria-label={`Selecteer audio ${row.audio_id}`}
                        />
                      </td>
                    )}
                    {showAudioId && (
                      <td className="px-3 py-2 font-mono">{row.audio_id}</td>
                    )}
                    {showSentenceId && (
                      <td className="px-3 py-2 font-mono">
                        {row.sentence_id}
                      </td>
                    )}
                    <td className="px-3 py-2">
                      <SourceTextCell
                        row={row}
                        editable={editableSourceText}
                        onPatchSourceText={onPatchSourceText}
                        translationCache={translation.cache}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <TranslationCell
                        row={row}
                        translationCache={translation.cache}
                        state={translation.state[row.audio_id]}
                        onTranslate={translation.onTranslateRow}
                        readOnly={readOnly}
                        persistMode={persistMode}
                        hideEnrichActions={hideEnrichActions}
                      />
                    </td>
                    {showEdited && (
                      <td className="px-3 py-2">
                        <EditedBadgeCell
                          row={row}
                          translationCache={translation.cache}
                        />
                      </td>
                    )}
                    {showAlternatives && (
                      <td className="px-3 py-2">
                        <AlternativesCell
                          row={row}
                          translationCache={translation.cache}
                          readOnly={readOnly}
                          persistMode={persistMode}
                        />
                      </td>
                    )}
                    {showTopic && (
                      <td className="px-3 py-2">
                        <TopicCell
                          row={row}
                          translationCache={translation.cache}
                          persistMode={persistMode}
                        />
                      </td>
                    )}
                    {showTags && (
                      <td className="px-3 py-2">
                        <TagsCell
                          row={row}
                          translationCache={translation.cache}
                          persistMode={persistMode}
                        />
                      </td>
                    )}
                    {showLang && (
                      <td className="px-3 py-2 font-mono uppercase">
                        {row.lang}
                      </td>
                    )}
                    {showAuthor && (
                      <td className="px-3 py-2">{row.author}</td>
                    )}
                    {showLicense && (
                      <td className="px-3 py-2 font-mono text-[10px]">
                        {licenseDisplay(row.license)}
                      </td>
                    )}
                    {showCreated && (
                      <td className="px-3 py-2 font-mono text-[10px] text-muted-foreground">
                        {row.created ?? "—"}
                      </td>
                    )}
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
                    {!hideMp3Column && (
                      <td className="px-3 py-2">
                        {row.mp3_url ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                handlePlayToggle(row.audio_id, row.mp3_url)
                              }
                              aria-label={
                                playingAudioId === row.audio_id
                                  ? "Pauzeer audio"
                                  : "Speel audio af"
                              }
                              title={
                                playingAudioId === row.audio_id
                                  ? "Pauzeer"
                                  : "Direct afspelen in de tabel"
                              }
                              className="shrink-0 rounded border border-border bg-background px-1.5 py-0.5 text-[11px] hover:bg-accent hover:text-accent-foreground"
                            >
                              {playingAudioId === row.audio_id ? "⏸" : "▶"}
                            </button>
                            <a
                              href={row.mp3_url}
                              target="_blank"
                              rel="noreferrer"
                              className="font-mono text-[10px] break-all text-accent underline-offset-2 hover:underline"
                              title={row.mp3_url}
                            >
                              {showMp3Url ? row.mp3_url : "open"}
                            </a>
                          </div>
                        ) : (
                          <span className="text-[10px] text-muted-foreground/70">
                            —
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
          <audio
            ref={audioRef}
            preload="none"
            onEnded={() => setPlayingAudioId(null)}
            onPause={() =>
              setPlayingAudioId((current) => {
                // Alleen resetten als de pauze niet door onze eigen
                // toggle al doorgevoerd is — voorkomt dat een externe
                // pauze (bv. via bron-control) de UI uit sync trekt.
                if (audioRef.current && audioRef.current.paused) return null;
                return current;
              })
            }
            className="hidden"
          />
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

// "Filter ▼"-knop met dropdown-paneel met de FilterBar erin. Volgt
// hetzelfde patroon als ColumnVisibilityMenu en LicenseHeader. Toont
// een badge met het aantal actieve filters zodat een verstopte filter
// nooit onopgemerkt blijft. Auto-open zolang er een actief filter is.
function FilterToggle({
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
        className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-medium hover:bg-muted ${
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
          <span className="rounded bg-accent/20 px-1 py-0.5 font-mono text-[9px] text-accent">
            {activeCount}
          </span>
        )}
        <span className="text-[8px]">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full z-10 mt-1 w-[420px] max-w-[90vw] rounded-md border border-border bg-card p-2 text-card-foreground shadow-lg"
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
        <span className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
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
            className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-border bg-background text-[9px] font-semibold normal-case text-muted-foreground hover:text-foreground"
          >
            i
          </span>
        </span>
        <input
          type="text"
          value={textQuery}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder="bv. comer  (of /auto rijden)"
          className="rounded-md border border-input bg-background px-2 py-1.5 text-xs"
        />
      </label>

      <label className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
        <input
          type="checkbox"
          checked={reusableOnly}
          onChange={(e) => onReusableOnlyChange(e.target.checked)}
          className="h-4 w-4 rounded border-input"
        />
        Alleen herbruikbaar
        <span
          role="img"
          aria-label="Uitleg licentie-filter"
          tabIndex={0}
          title="Verbergt audio-records waarvan de licentie hergebruik buiten Tatoeba verbiedt (lege license-string). Alleen herbruikbare records (CC0 / CC BY) kunnen naar Supabase gepersist worden."
          className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-border bg-background text-[9px] font-semibold text-muted-foreground hover:text-foreground"
        >
          i
        </span>
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

// "Kolommen ▼"-knop met dropdown van checkboxes — laat de user
// kolommen verbergen/tonen. Volgt het outside-click + Escape-patroon
// van LicenseHeader. Toont een teller (zichtbaar/totaal) zodat
// gebruikers snel zien dat er nog kolommen verstopt zijn.
function ColumnVisibilityMenu({
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
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        title="Toon/verberg kolommen"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        Kolommen
        <span className="font-mono text-[10px] text-muted-foreground/70">
          {visibleCount}/{totalCount}
        </span>
        <span className="text-[8px]">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-10 mt-1 min-w-[180px] rounded-md border border-border bg-card py-1 text-card-foreground shadow-lg"
        >
          {columns.map((key) => {
            const checked = !hiddenColumns.has(key);
            return (
              <label
                key={key}
                className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(key)}
                  className="h-3.5 w-3.5 rounded border-input"
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

// Header-checkbox die "alle zichtbare rijen" toggle't. We zetten
// `indeterminate` via een ref omdat HTML/React dat attribuut niet
// declaratief ondersteunt — alleen via de DOM-property.
function SelectAllHeader({
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
    <th className="px-3 py-2 font-semibold">
      <input
        ref={inputRef}
        type="checkbox"
        checked={allChecked}
        onChange={onToggle}
        disabled={visibleCount === 0}
        className="h-4 w-4 rounded border-input disabled:opacity-30"
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
      className={`flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-xs normal-case tracking-normal hover:bg-muted ${isActive ? "font-medium text-foreground" : "text-muted-foreground"
        }`}
    >
      <span className="font-mono">{label}</span>
      {isActive && <span className="text-accent">✓</span>}
    </button>
  );
}

// Bron-zin (sentence_text). Optioneel inline bewerkbaar voor flows
// zonder Tatoeba (bv. exercise-generator).
function SourceTextCell({
  row,
  editable,
  onPatchSourceText,
  translationCache,
}: {
  row: AudioRow;
  editable: boolean;
  onPatchSourceText?: (row: AudioRow, text: string) => void;
  translationCache: ReturnType<typeof useTranslationCache>;
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
    return <span>{row.sentence_text}</span>;
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
          className="w-full resize-y rounded border border-input bg-background px-2 py-1 text-xs text-foreground focus:border-accent focus:outline-none"
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
function TranslationCell({
  row,
  translationCache,
  state,
  onTranslate,
  readOnly = false,
  persistMode,
  hideEnrichActions = false,
}: {
  row: AudioRow;
  translationCache: ReturnType<typeof useTranslationCache>;
  state: TranslateRowState | undefined;
  onTranslate: (row: AudioRow) => void;
  readOnly?: boolean;
  persistMode?: AudioResultTablePersistMode;
  hideEnrichActions?: boolean;
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
        className="text-[10px] text-muted-foreground/70"
        title="Bron is al Nederlands — geen vertaling nodig."
      >
        —
      </span>
    );
  }

  if (state?.status === "loading" || saving) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <span
          aria-hidden
          className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-muted border-t-accent"
        />
        {saving ? "Opslaan…" : "Verrijken…"}
      </span>
    );
  }

  if (cached && readOnly) {
    return <span className="text-xs">{cached.translation}</span>;
  }

  if (saveError) {
    return (
      <span className="text-[10px] text-destructive" title={saveError}>
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
          className="w-full resize-y rounded border border-input bg-background px-2 py-1 text-xs text-foreground focus:border-accent focus:outline-none"
        />
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
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
            className="rounded border border-border bg-background px-1.5 py-0.5 hover:bg-muted"
          >
            ✕
          </button>
          <span className="ml-1">Cmd/Ctrl+Enter = bewaren · Esc = annuleren</span>
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
                className="ml-1 text-[10px] text-muted-foreground/70"
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
                className="rounded border border-border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground"
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
              className="flex-1 rounded border border-input bg-background px-2 py-1 text-[11px]"
            />
            <button
              type="button"
              onClick={commitAlt}
              className="rounded border border-accent/60 bg-accent/10 px-2 py-0.5 text-[10px] text-foreground hover:bg-accent/20"
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
        <span className="text-[10px] text-destructive" title={state.error}>
          Fout — {truncate(state.error, 60)}
        </span>
      );
    }
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

  if (hideEnrichActions) {
    return (
      <span className="text-[10px] text-muted-foreground/70">—</span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onTranslate(row)}
      title="Verrijk deze rij: vertaling + topic + tags in één AI-call"
      className="rounded border border-border bg-background px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-accent hover:text-accent-foreground"
    >
      Verrijk
    </button>
  );
}

// Cel voor het AI-onderwerp. Toont een em-dash zolang er geen
// enrichment-data is voor deze rij (waarschijnlijk omdat de user
// nog geen "Verrijk" heeft gedraaid).
function TopicCell({
  row,
  translationCache,
  persistMode,
}: {
  row: AudioRow;
  translationCache: ReturnType<typeof useTranslationCache>;
  persistMode?: AudioResultTablePersistMode;
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
            className="w-full rounded border border-input bg-background px-2 py-1 text-[10px]"
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
          className="text-[10px] text-muted-foreground underline-offset-2 hover:underline"
        >
          + onderwerp
        </button>
      );
    }
    return <span className="text-[10px] text-muted-foreground/70">—</span>;
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
        className="w-full rounded border border-input bg-background px-2 py-1 text-[10px]"
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
      className={`rounded bg-accent/15 px-1.5 py-0.5 font-mono text-[10px] text-accent ${persistMode ? "cursor-text" : ""}`}
      title={
        persistMode
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
function TagsCell({
  row,
  translationCache,
  persistMode,
}: {
  row: AudioRow;
  translationCache: ReturnType<typeof useTranslationCache>;
  persistMode?: AudioResultTablePersistMode;
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
            className="w-full rounded border border-input bg-background px-2 py-1 text-[10px]"
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
          className="text-[10px] text-muted-foreground underline-offset-2 hover:underline"
        >
          + tags
        </button>
      );
    }
    return <span className="text-[10px] text-muted-foreground/70">—</span>;
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
        className="w-full rounded border border-input bg-background px-2 py-1 text-[10px]"
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
      className={`flex flex-wrap gap-1 ${persistMode ? "cursor-text" : ""}`}
      title={persistMode ? "Dubbelklik om te bewerken" : undefined}
    >
      {cached.tags.map((tag) => (
        <span
          key={tag}
          className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
        >
          {tag}
        </span>
      ))}
    </div>
  );
}

// Kolom-cel die "ja"/"nee" toont voor de manually_edited vlag. NL-bron-
// rijen of niet-gecachete rijen krijgen een em-dash.
function EditedBadgeCell({
  row,
  translationCache,
}: {
  row: AudioRow;
  translationCache: ReturnType<typeof useTranslationCache>;
}) {
  if (row.lang === TARGET_LANG) {
    return <span className="text-[10px] text-muted-foreground/70">—</span>;
  }
  const cached = translationCache.get(row.audio_id, row.sentence_text);
  if (!cached) {
    return <span className="text-[10px] text-muted-foreground/70">—</span>;
  }
  return cached.manually_edited ? (
    <span
      className="rounded bg-accent/20 px-1.5 py-0.5 font-mono text-[9px] text-accent"
      title="De auto-gegenereerde vertaling is handmatig aangepast."
    >
      ja
    </span>
  ) : (
    <span
      className="rounded bg-muted px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground"
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
function AlternativesCell({
  row,
  translationCache,
  readOnly = false,
  persistMode,
}: {
  row: AudioRow;
  translationCache: ReturnType<typeof useTranslationCache>;
  readOnly?: boolean;
  persistMode?: AudioResultTablePersistMode;
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
    return <span className="text-[10px] text-muted-foreground/70">—</span>;
  }
  const cached = translationCache.get(row.audio_id, row.sentence_text);
  if (!cached) {
    return <span className="text-[10px] text-muted-foreground/70">—</span>;
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
      return <span className="text-[10px] text-muted-foreground/70">—</span>;
    }
    return (
      <span className="text-[11px] text-muted-foreground">
        {cached.alternatives.join(" · ")}
      </span>
    );
  }

  return (
    <div ref={wrapperRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[10px] hover:text-foreground ${
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
          className="absolute left-0 top-full z-10 mt-1 w-[280px] rounded-md border border-border bg-card p-2 text-card-foreground shadow-lg"
        >
          {cached.alternatives.length > 0 ? (
            <ul className="space-y-1">
              {cached.alternatives.map((alt, idx) => (
                <li
                  key={`${idx}-${alt}`}
                  className="flex items-start gap-1 rounded bg-muted/30 px-2 py-1 text-[11px]"
                >
                  <span className="flex-1 normal-case">{alt}</span>
                  <button
                    type="button"
                    onClick={() => removeAt(idx)}
                    title="Verwijder deze alternatieve vertaling"
                    className="shrink-0 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-1 py-1 text-[10px] normal-case tracking-normal text-muted-foreground">
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
              className="flex-1 rounded border border-input bg-background px-2 py-1 text-[11px] normal-case"
            />
            <button
              type="button"
              onClick={commit}
              className="rounded border border-accent/60 bg-accent/10 px-2 py-0.5 text-[10px] normal-case text-foreground hover:bg-accent/20"
            >
              +
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
