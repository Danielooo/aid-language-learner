/** Types + pure helpers voor AudioResultTable. */

import type { ExercisePatchFields } from "@/lib/exercises/types";
import type { AudioRow } from "@/types/tatoeba";
import type { useTranslationCache } from "@/hooks/use-translation-cache";

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
export const COLUMN_LABELS: Record<ColumnKey, string> = {
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
export const COLUMN_ORDER: ColumnKey[] = [
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
  /** Kolommen-menu; default true. Generator zet uit. */
  showColumnMenu?: boolean;
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
  /**
   * Plaatsing van de mp3/speaker-kolom.
   * `after-selection` = direct na checkbox, vóór sentence_text.
   */
  mp3ColumnPlacement?: "end" | "after-selection";
  /** Compacte speaker-knop zonder URL-link (generator-audio-tab). */
  compactMp3Controls?: boolean;
  /** Rijen met deze audio_id's krijgen een highlight-achtergrond. */
  highlightAudioIds?: Set<number>;
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
  /** Rij-dubbelklik (o.a. Generator / modal-edit). */
  onRowDoubleClick?: (row: AudioRow) => void;
  /** Density mode: "compact" (default) of "list" (like Leerplan styling) */
  density?: "compact" | "list";
  /** Hide row count display at bottom */
  hideRowCount?: boolean;
  /** Lege-staat tekst (default: “Geen rijen om te tonen.”) */
  emptyMessage?: string;
};

// ── Constants ─────────────────────────────────────────────────────

// Sentinel om "geen filter" te onderscheiden van een lege-string licentie
// (= 'no-reuse').
export const LICENSE_FILTER_ALL = "__all__";

// Bron is al de doel-taal van de vertaling → geen knop tonen.
export const TARGET_LANG = "nld";

// localStorage-prefix voor de kolom-zichtbaarheid-voorkeur. Per
// `tableScope` (search / playground) krijg je een eigen sleutel zodat
// verschillende views elkaar niet overschrijven.
export const HIDDEN_COLS_KEY_PREFIX = "aid:audio-table:cols:";

export function hiddenColsStorageKey(scope: string | undefined): string | null {
  if (!scope) return null;
  return `${HIDDEN_COLS_KEY_PREFIX}${scope}`;
}

// Parse helper: tolereert onbekende/buggy waarden door alleen geldige
// ColumnKey-strings te accepteren. Stille fallback naar lege set.
export function readHiddenCols(key: string): Set<ColumnKey> | null {
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

export function licenseDisplay(license: string): string {
  return license.trim() === "" ? "no-reuse" : license;
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}
