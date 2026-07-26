"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  AlternativesCell,
  ColumnVisibilityMenu,
  EditedBadgeCell,
  FilterToggle,
  LicenseHeader,
  Mp3ColumnCell,
  Mp3ColumnHeader,
  SelectAllHeader,
  SourceTextCell,
  SortableHeader,
  TagsCell,
  TopicCell,
  TranslationCell,
} from "./audio-result-table-parts";
import type {
  AudioResultTableProps,
  ColumnKey,
  SortDir,
  SortKey,
} from "./audio-result-table-types";
import {
  COLUMN_ORDER,
  LICENSE_FILTER_ALL,
  hiddenColsStorageKey,
  licenseDisplay,
  readHiddenCols,
} from "./audio-result-table-types";

// Re-export public types voor bestaande importers.
export type {
  AudioResultTablePersistMode,
  AudioResultTableProps,
  AudioResultTableSelection,
  ColumnKey,
  SearchEnrichments,
  SortDir,
  SortKey,
  TranslateRowState,
} from "./audio-result-table-types";

// ── Main component ────────────────────────────────────────────────

export function AudioResultTable({
  rows,
  translation,
  searchEnrichments,
  showFilterBar = true,
  showColumnMenu = true,
  selection,
  tableScope,
  defaultHiddenColumns,
  readOnly = false,
  persistMode,
  hideMp3Column = false,
  mp3ColumnPlacement = "end",
  compactMp3Controls = false,
  highlightAudioIds,
  hideEnrichActions = false,
  editableSourceText = false,
  onPatchSourceText,
  excludedColumns,
  sortKey: controlledSortKey,
  sortDir: controlledSortDir,
  onSortChange,
  serverSorted = false,
  onRowDoubleClick,
  density = "compact",
  hideRowCount = false,
  emptyMessage,
}: AudioResultTableProps) {
  const [licenseFilter, setLicenseFilter] =
    useState<string>(LICENSE_FILTER_ALL);
  const [authorQuery, setAuthorQuery] = useState<string>("");
  const [textQuery, setTextQuery] = useState<string>("");
  const [reusableOnly, setReusableOnly] = useState<boolean>(false);
  const [internalSortKey, setInternalSortKey] = useState<SortKey>("audio_id");
  const [internalSortDir, setInternalSortDir] = useState<SortDir>("desc");
  const sortKey = controlledSortKey ?? internalSortKey;
  const sortDir = controlledSortDir ?? internalSortDir;
  const [showMp3Url, setShowMp3Url] = useState<boolean>(false);
  // Modal-edit: geen inline tags/alts/bron-edit; alleen dubbelklik.
  const modalEditMode = Boolean(onRowDoubleClick);
  const effectivePersistMode = modalEditMode ? undefined : persistMode;
  const effectiveEditableSource = !modalEditMode && editableSourceText;
  const alternativesReadOnly = readOnly || modalEditMode;

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
    !!searchEnrichments &&
    Object.keys(searchEnrichments.reasonsById).length > 0;

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
  const showMp3 = !hideMp3Column;
  const showMp3AfterSelection =
    showMp3 && mp3ColumnPlacement === "after-selection";
  const showMp3AtEnd = showMp3 && mp3ColumnPlacement === "end";

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
      {(showFilterBar || showColumnMenu) && (
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
          {showColumnMenu && (
            <ColumnVisibilityMenu
              columns={menuColumns}
              hiddenColumns={hiddenColumns}
              onToggle={toggleColumn}
            />
          )}
        </div>
      )}

      {sortedRows.length === 0 ? (
        <p className="border-border bg-muted/40 text-muted-foreground rounded-md border border-dashed px-3 py-4 text-center text-xs">
          {emptyMessage ??
            (rows.length === 0
              ? "Geen rijen om te tonen."
              : "Geen rijen voor deze filtercombinatie.")}
        </p>
      ) : (
        <div className="border-border overflow-auto rounded-md border">
          <table
            className={`w-full border-collapse text-left ${density === "list" ? "text-sm" : "text-xs"}`}
          >
            <thead
              className={`sticky top-0 ${density === "list" ? "bg-muted/40 border-b text-sm" : "bg-muted/60 text-[10px] tracking-wide uppercase"} text-muted-foreground`}
            >
              <tr>
                {selection && (
                  <SelectAllHeader
                    allChecked={allVisibleSelected}
                    indeterminate={someVisibleSelected}
                    onToggle={() => selection.onToggleAllVisible(visibleIds)}
                    visibleCount={visibleIds.length}
                  />
                )}
                {showMp3AfterSelection && (
                  <Mp3ColumnHeader
                    compact={compactMp3Controls}
                    showMp3Url={showMp3Url}
                    onToggleUrl={() => setShowMp3Url((v) => !v)}
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
                <th className="px-3 py-2 font-semibold">Brontaal (SPA)</th>
                <th
                  className="px-3 py-2 font-semibold"
                  title="Dubbelklik op de tekst om handmatig aan te passen. + om alternatieve vertalingen toe te voegen."
                >
                  Vertaling (NL)
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
                {showMp3AtEnd && (
                  <Mp3ColumnHeader
                    compact={compactMp3Controls}
                    showMp3Url={showMp3Url}
                    onToggleUrl={() => setShowMp3Url((v) => !v)}
                  />
                )}
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row) => {
                const cosine = searchEnrichments?.cosineById[row.audio_id];
                const reason = searchEnrichments?.reasonsById[row.audio_id];
                const isSelected = selection?.selectedIds.has(row.audio_id);
                const isHighlighted = highlightAudioIds?.has(row.audio_id);
                const cellPad = modalEditMode
                  ? "px-3 py-2 align-middle"
                  : "px-3 py-2";
                const cellClasses =
                  density === "list" && modalEditMode ? "px-3 py-2" : cellPad;
                const maxWClasses =
                  density === "list" && modalEditMode ? "" : " max-w-[14rem]";
                return (
                  <tr
                    key={row.audio_id}
                    onDoubleClick={
                      onRowDoubleClick ? () => onRowDoubleClick(row) : undefined
                    }
                    title={
                      onRowDoubleClick ? "Dubbelklik om te bewerken" : undefined
                    }
                    className={`border-border hover:bg-muted/30 border-t ${
                      modalEditMode ? "align-middle" : "align-top"
                    } ${onRowDoubleClick ? "cursor-pointer" : ""} ${
                      isHighlighted
                        ? "bg-accent/15"
                        : isSelected
                          ? "bg-accent/5"
                          : ""
                    }`}
                  >
                    {selection && (
                      <td
                        className="px-3 py-2 align-middle"
                        onClick={(e) => e.stopPropagation()}
                        onDoubleClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={!!isSelected}
                          onChange={() => selection.onToggle(row.audio_id)}
                          className="border-border accent-accent size-4 rounded"
                          aria-label={`Selecteer audio ${row.audio_id}`}
                        />
                      </td>
                    )}
                    {showMp3AfterSelection && (
                      <Mp3ColumnCell
                        row={row}
                        playing={playingAudioId === row.audio_id}
                        compact={compactMp3Controls}
                        showMp3Url={showMp3Url}
                        onPlayToggle={handlePlayToggle}
                      />
                    )}
                    {showAudioId && (
                      <td className={`${cellClasses} font-mono`}>
                        {row.audio_id}
                      </td>
                    )}
                    {showSentenceId && (
                      <td className={`${cellClasses} font-mono`}>
                        {row.sentence_id}
                      </td>
                    )}
                    <td className={`${cellClasses}${maxWClasses}`}>
                      <SourceTextCell
                        row={row}
                        editable={effectiveEditableSource}
                        onPatchSourceText={onPatchSourceText}
                        translationCache={translation.cache}
                        compact={modalEditMode}
                      />
                    </td>
                    <td className={`${cellClasses}${maxWClasses}`}>
                      <TranslationCell
                        row={row}
                        translationCache={translation.cache}
                        state={translation.state[row.audio_id]}
                        onTranslate={translation.onTranslateRow}
                        readOnly={readOnly || modalEditMode}
                        persistMode={effectivePersistMode}
                        hideEnrichActions={hideEnrichActions}
                        compact={modalEditMode}
                      />
                    </td>
                    {showEdited && (
                      <td className={cellClasses}>
                        <EditedBadgeCell
                          row={row}
                          translationCache={translation.cache}
                        />
                      </td>
                    )}
                    {showAlternatives && (
                      <td
                        className={`${cellClasses}${density === "list" && modalEditMode ? "" : modalEditMode ? "max-w-[12rem]" : ""}`}
                      >
                        <AlternativesCell
                          row={row}
                          translationCache={translation.cache}
                          readOnly={alternativesReadOnly}
                          persistMode={effectivePersistMode}
                          compact={modalEditMode}
                        />
                      </td>
                    )}
                    {showTopic && (
                      <td
                        className={`${cellClasses}${density === "list" && modalEditMode ? "" : modalEditMode ? "max-w-[10rem]" : ""}`}
                      >
                        <TopicCell
                          row={row}
                          translationCache={translation.cache}
                          persistMode={effectivePersistMode}
                          compact={modalEditMode}
                        />
                      </td>
                    )}
                    {showTags && (
                      <td
                        className={`${cellClasses}${density === "list" && modalEditMode ? "" : modalEditMode ? "max-w-[12rem]" : ""}`}
                      >
                        <TagsCell
                          row={row}
                          translationCache={translation.cache}
                          persistMode={effectivePersistMode}
                          compact={modalEditMode}
                        />
                      </td>
                    )}
                    {showLang && (
                      <td className={`${cellClasses} font-mono uppercase`}>
                        {row.lang}
                      </td>
                    )}
                    {showAuthor && (
                      <td
                        className={`${cellClasses}${density === "list" && modalEditMode ? "" : modalEditMode ? "max-w-[10rem] truncate" : ""}`}
                        title={modalEditMode ? row.author : undefined}
                      >
                        {row.author}
                      </td>
                    )}
                    {showLicense && (
                      <td className={`${cellClasses} font-mono text-[10px]`}>
                        {licenseDisplay(row.license)}
                      </td>
                    )}
                    {showCreated && (
                      <td
                        className={`${cellClasses} text-muted-foreground font-mono text-[10px]`}
                      >
                        {row.created ?? "—"}
                      </td>
                    )}
                    {showCosine && (
                      <td
                        className={`${cellClasses} text-muted-foreground font-mono text-[10px]`}
                      >
                        {cosine !== undefined ? cosine.toFixed(3) : "—"}
                      </td>
                    )}
                    {showReason && (
                      <td
                        className={`${cellClasses} text-[11px] text-muted-foreground${density === "list" && modalEditMode ? "" : modalEditMode ? "max-w-[12rem] truncate" : ""}`}
                        title={
                          modalEditMode ? (reason ?? undefined) : undefined
                        }
                      >
                        {reason ?? "—"}
                      </td>
                    )}
                    {showMp3AtEnd && (
                      <Mp3ColumnCell
                        row={row}
                        playing={playingAudioId === row.audio_id}
                        compact={compactMp3Controls}
                        showMp3Url={showMp3Url}
                        onPlayToggle={handlePlayToggle}
                      />
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

      {!hideRowCount && rows.length > 0 && (
        <p className="text-muted-foreground text-[10px]">
          Getoond {sortedRows.length} van {rows.length} rijen.
        </p>
      )}
    </div>
  );
}
