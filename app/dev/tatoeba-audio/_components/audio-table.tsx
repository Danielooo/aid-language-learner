"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type {
  AudioListResponse,
  AudioRow,
} from "@/app/api/dev/tatoeba-audio/list/route";

// Tabelweergave: één klik laadt audios uit /unstable/audios. De
// limit is onbegrensd: de server-route pagineert intern tot de
// gevraagde hoeveelheid is bereikt of Tatoeba geen volgende pagina
// meer heeft. Naast de bestaande kaarten-secties.
//
// Filteren gebeurt volledig client-side. De licentie-kolomheader
// werkt als drop-down: klikken opent een popover met alle distincte
// licenties uit de geladen rijen + 'Alle'.

const LANG_OPTIONS = [
  { value: "spa", label: "Spaans (spa)" },
  { value: "eng", label: "Engels (eng)" },
  { value: "nld", label: "Nederlands (nld)" },
  { value: "fra", label: "Frans (fra)" },
  { value: "deu", label: "Duits (deu)" },
] as const;

// Sentinel om "geen filter" te onderscheiden van een lege-string licentie
// (= 'no-reuse').
const LICENSE_FILTER_ALL = "__all__";

function licenseDisplay(license: string): string {
  return license.trim() === "" ? "no-reuse" : license;
}

type SortKey = "audio_id" | "sentence_id" | "created";
type SortDir = "asc" | "desc";

// Snapshot van de request zoals de browser hem naar onze /api-route
// stuurde — handig voor het debug-panel zodat we precies zien welke
// query-parameters mee gingen.
type RequestSnapshot = {
  url: string;
  params: Record<string, string>;
};

type LoadState =
  | { status: "idle" }
  | { status: "loading" }
  | {
      status: "loaded";
      rows: AudioRow[];
      total: number;
      url: string;
      pagesFetched: number;
      request: RequestSnapshot;
      rawResponse: AudioListResponse;
    }
  | {
      status: "error";
      error: string;
      request?: RequestSnapshot;
      rawResponse?: unknown;
    };

export function AudioTable() {
  const [lang, setLang] = useState<string>("spa");
  const [limit, setLimit] = useState<number>(100);
  const [load, setLoad] = useState<LoadState>({ status: "idle" });

  const [licenseFilter, setLicenseFilter] = useState<string>(LICENSE_FILTER_ALL);
  const [authorQuery, setAuthorQuery] = useState<string>("");
  const [textQuery, setTextQuery] = useState<string>("");
  const [reusableOnly, setReusableOnly] = useState<boolean>(false);

  const [sortKey, setSortKey] = useState<SortKey>("audio_id");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const [showMp3Url, setShowMp3Url] = useState<boolean>(false);

  async function handleLoad() {
    setLoad({ status: "loading" });
    const params: Record<string, string> = {
      lang,
      limit: String(limit),
    };
    const qs = new URLSearchParams(params);
    const requestUrl = `/api/dev/tatoeba-audio/list?${qs}`;
    const request: RequestSnapshot = { url: requestUrl, params };

    try {
      const res = await fetch(requestUrl);
      const json = (await res.json()) as AudioListResponse;
      if (!res.ok || !json.ok) {
        const err = !json.ok ? json.error : `HTTP ${res.status}`;
        setLoad({ status: "error", error: err, request, rawResponse: json });
        return;
      }
      setLoad({
        status: "loaded",
        rows: json.rows,
        total: json.total,
        url: json.url,
        pagesFetched: json.pages_fetched,
        request,
        rawResponse: json,
      });
      // Reset op "Alle" zodat een stale selectie (bv. na taalwissel)
      // niet onbedoeld alle rijen wegfiltert.
      setLicenseFilter(LICENSE_FILTER_ALL);
    } catch (e) {
      setLoad({
        status: "error",
        error: e instanceof Error ? e.message : "Onbekende fout",
        request,
      });
    }
  }

  const baseRows = load.status === "loaded" ? load.rows : [];

  const availableLicenses = useMemo(() => {
    const set = new Set<string>();
    for (const row of baseRows) set.add(row.license);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [baseRows]);

  const filteredRows = useMemo(() => {
    if (baseRows.length === 0) return baseRows;
    const author = authorQuery.trim().toLowerCase();
    const text = textQuery.trim().toLowerCase();
    return baseRows.filter((row) => {
      if (reusableOnly && row.license.trim() === "") return false;
      if (licenseFilter !== LICENSE_FILTER_ALL && row.license !== licenseFilter)
        return false;
      if (author && !row.author.toLowerCase().includes(author)) return false;
      if (text && !row.sentence_text.toLowerCase().includes(text)) return false;
      return true;
    });
  }, [baseRows, authorQuery, textQuery, reusableOnly, licenseFilter]);

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

  return (
    <section className="space-y-3 rounded-lg border border-border bg-card p-5 text-card-foreground">
      <header className="space-y-1">
        <h2 className="text-sm font-semibold">
          Tabelweergave — /unstable/audios (server-side gepagineerd)
        </h2>
        <p className="text-xs text-muted-foreground">
          Eén klik laadt audio-records, daarna client-side filteren en
          sorteren. Limit is onbegrensd: hogere waarden triggeren extra
          paginas (Tatoeba serveert er max 100 per request).
        </p>
      </header>

      <div className="flex flex-wrap items-end gap-3 border-b border-border pb-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            Brontaal
          </span>
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            disabled={load.status === "loading"}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {LANG_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            Limit (≥ 1)
          </span>
          <input
            type="number"
            min={1}
            step={100}
            value={limit}
            onChange={(e) =>
              setLimit(Math.max(1, Number(e.target.value) || 1))
            }
            disabled={load.status === "loading"}
            className="w-32 rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </label>

        <button
          type="button"
          onClick={handleLoad}
          disabled={load.status === "loading"}
          className="inline-flex h-10 cursor-pointer items-center justify-center rounded-md bg-accent px-4 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90 disabled:opacity-50"
        >
          {load.status === "loading"
            ? "Laden..."
            : load.status === "loaded"
              ? "Opnieuw laden"
              : "Laad audios"}
        </button>

        {load.status === "loaded" && (
          <span className="ml-auto text-[10px] text-muted-foreground">
            Totaal in Tatoeba: {load.total.toLocaleString("nl-NL")} ·
            opgehaald: {load.rows.length} · {load.pagesFetched} pagina
            {load.pagesFetched === 1 ? "" : "'s"}
          </span>
        )}
      </div>

      {load.status === "error" && (
        <>
          <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {load.error}
          </div>
          {load.request && (
            <RequestDebugPanel
              request={load.request}
              response={load.rawResponse}
            />
          )}
        </>
      )}

      {load.status === "loaded" && (
        <>
          <RequestDebugPanel
            request={load.request}
            response={load.rawResponse}
          />

          <FilterBar
            authorQuery={authorQuery}
            onAuthorChange={setAuthorQuery}
            textQuery={textQuery}
            onTextChange={setTextQuery}
            reusableOnly={reusableOnly}
            onReusableOnlyChange={setReusableOnly}
          />

          <ResultTable
            rows={sortedRows}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={toggleSort}
            showMp3Url={showMp3Url}
            onToggleMp3Url={() => setShowMp3Url((v) => !v)}
            licenseFilter={licenseFilter}
            availableLicenses={availableLicenses}
            onLicenseFilterChange={setLicenseFilter}
          />

          <p className="text-[10px] text-muted-foreground">
            Getoond {sortedRows.length} van {load.rows.length} rijen.
          </p>
        </>
      )}

      {load.status === "idle" && (
        <p className="rounded-md border border-dashed border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          Klik &quot;Laad audios&quot; om de tabel te vullen.
        </p>
      )}
    </section>
  );
}

function RequestDebugPanel({
  request,
  response,
}: {
  request: RequestSnapshot;
  response: unknown;
}) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold text-muted-foreground">
        Debug — request &amp; response
      </h3>

      <details className="rounded-md border border-border bg-card text-card-foreground">
        <summary className="cursor-pointer px-4 py-2 text-xs font-medium text-muted-foreground">
          Request — /api/dev/tatoeba-audio/list
        </summary>
        <div className="space-y-2 px-4 pb-4">
          <div className="rounded-md border border-border bg-muted/30 p-2 text-xs">
            <span className="font-medium text-foreground">URL: </span>
            <code className="font-mono break-all">{request.url}</code>
          </div>
          <pre className="max-h-[400px] overflow-auto rounded bg-muted/40 p-3 font-mono text-xs">
            {JSON.stringify(request.params, null, 2)}
          </pre>
        </div>
      </details>

      <details className="rounded-md border border-border bg-card text-card-foreground">
        <summary className="cursor-pointer px-4 py-2 text-xs font-medium text-muted-foreground">
          Response — JSON
        </summary>
        <div className="px-4 pb-4">
          <pre className="max-h-[400px] overflow-auto rounded bg-muted/40 p-3 font-mono text-xs">
            {JSON.stringify(response, null, 2)}
          </pre>
        </div>
      </details>
    </section>
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

function ResultTable({
  rows,
  sortKey,
  sortDir,
  onSort,
  showMp3Url,
  onToggleMp3Url,
  licenseFilter,
  availableLicenses,
  onLicenseFilterChange,
}: {
  rows: AudioRow[];
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
  showMp3Url: boolean;
  onToggleMp3Url: () => void;
  licenseFilter: string;
  availableLicenses: string[];
  onLicenseFilterChange: (v: string) => void;
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border bg-muted/40 px-3 py-4 text-center text-xs text-muted-foreground">
        Geen rijen voor deze filtercombinatie.
      </p>
    );
  }

  return (
    <div className="overflow-auto rounded-md border border-border">
      <table className="w-full border-collapse text-left text-xs">
        <thead className="sticky top-0 bg-muted/60 text-[10px] uppercase tracking-wide text-muted-foreground">
          <tr>
            <SortableHeader
              label="audio_id"
              sortKey="audio_id"
              currentKey={sortKey}
              dir={sortDir}
              onSort={onSort}
            />
            <SortableHeader
              label="sentence_id"
              sortKey="sentence_id"
              currentKey={sortKey}
              dir={sortDir}
              onSort={onSort}
            />
            <th className="px-3 py-2 font-semibold">sentence_text</th>
            <th className="px-3 py-2 font-semibold">lang</th>
            <th className="px-3 py-2 font-semibold">author</th>
            <LicenseHeader
              licenseFilter={licenseFilter}
              availableLicenses={availableLicenses}
              onChange={onLicenseFilterChange}
            />
            <SortableHeader
              label="created"
              sortKey="created"
              currentKey={sortKey}
              dir={sortDir}
              onSort={onSort}
            />
            <th className="px-3 py-2 font-semibold">
              <div className="flex items-center gap-2">
                <span>mp3</span>
                <button
                  type="button"
                  onClick={onToggleMp3Url}
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
          {rows.map((row) => (
            <tr
              key={row.audio_id}
              className="border-t border-border align-top hover:bg-muted/30"
            >
              <td className="px-3 py-2 font-mono">{row.audio_id}</td>
              <td className="px-3 py-2 font-mono">{row.sentence_id}</td>
              <td className="px-3 py-2">{row.sentence_text}</td>
              <td className="px-3 py-2 font-mono uppercase">{row.lang}</td>
              <td className="px-3 py-2">{row.author}</td>
              <td className="px-3 py-2 font-mono text-[10px]">
                {licenseDisplay(row.license)}
              </td>
              <td className="px-3 py-2 font-mono text-[10px] text-muted-foreground">
                {row.created ?? "—"}
              </td>
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
          ))}
        </tbody>
      </table>
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

