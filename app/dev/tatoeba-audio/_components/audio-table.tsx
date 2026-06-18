"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AudioResultTable } from "@/app/dev/_components/audio-result-table";
import { useAudioListCache } from "@/lib/hooks/use-audio-list-cache";
import { useTranslationCache } from "@/lib/hooks/use-translation-cache";

import type {
  AudioListResponse,
  AudioRow,
} from "@/app/api/dev/tatoeba-audio/list/route";
import type { TranslateResponse } from "@/app/api/dev/tatoeba-audio/translate/route";
import type { TranslateRowState } from "@/app/dev/_components/audio-result-table";
import type { AudioListSnapshot } from "@/lib/hooks/use-audio-list-cache";

// Tabelweergave: één klik laadt audios uit /unstable/audios. De
// limit is onbegrensd: de server-route pagineert intern tot de
// gevraagde hoeveelheid is bereikt of Tatoeba geen volgende pagina
// meer heeft.
//
// De "rich" tabel zelf (sort, license-dropdown, mp3-toggle, FilterBar
// auteur/zin/herbruikbaar, vertaal-kolom) zit in het gedeelde
// [<AudioResultTable>](../../_components/audio-result-table.tsx) — gebruikt
// door zowel deze pagina als /dev/tatoeba-audio-search.
//
// Vertaal-flow: per-rij knop in de tabel of batch-knop in de TranslateBar
// hieronder → POST naar /api/dev/tatoeba-audio/translate (max 50 items/
// batch, parallel chunked vanaf de client). Resultaten worden gecachet
// in localStorage via `useTranslationCache` — overleeft refresh, scoped
// op audio_id.

const LANG_OPTIONS = [
  { value: "spa", label: "Spaans (spa)" },
  { value: "eng", label: "Engels (eng)" },
  { value: "nld", label: "Nederlands (nld)" },
  { value: "fra", label: "Frans (fra)" },
  { value: "deu", label: "Duits (deu)" },
] as const;

// Aantal items per /translate-call. Moet matchen met de cap in de
// route ([app/api/dev/tatoeba-audio/translate/route.ts](app/api/dev/tatoeba-audio/translate/route.ts)).
const TRANSLATE_CHUNK_SIZE = 50;

const TARGET_LANG = "nld";

// Snapshot van de request zoals de browser hem naar onze /api-route
// stuurde — handig voor het debug-panel zodat we precies zien welke
// query-parameters mee gingen.
type RequestSnapshot = {
  url: string;
  params: Record<string, string>;
};

// Snapshot van de laatste translate-batch voor het debug-panel.
type TranslateDebugSnapshot = {
  request: { url: string; body: { items: TranslateBatchItem[] } };
  response: unknown;
  ok: boolean;
};

type TranslateBatchItem = {
  audio_id: number;
  source_text: string;
  source_lang: string;
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

  const listCache = useAudioListCache(lang);
  const translationCache = useTranslationCache();
  const [translateState, setTranslateState] = useState<
    Record<number, TranslateRowState>
  >({});
  const [translateDebug, setTranslateDebug] =
    useState<TranslateDebugSnapshot | null>(null);
  const [batchRunning, setBatchRunning] = useState(false);

  // Onthoudt welk (lang, snapshot)-paar we voor het laatst hebben
  // gerestored. Identity-compare op de snapshot werkt omdat `writeSnapshot`
  // in `use-audio-list-cache.ts` een write-through cache gebruikt: gelijke
  // data houdt zijn referentie, alleen écht-gewijzigde data krijgt een
  // nieuwe identity. Zonder deze ref zou we óf de hydration-race houden
  // (zie commentblok in restore-effect hieronder) óf een loop riskeren.
  const restoredRef = useRef<{
    lang: string;
    snap: AudioListSnapshot | null;
  } | null>(null);

  // Restore op mount / lang-wissel / late-arriving snapshot. Cache aanwezig
  // → ga direct naar "loaded" met dezelfde shape die `handleLoad` zou
  // produceren. Anders terug naar "idle" zodat de empty-state hint
  // verschijnt.
  //
  // Deps bevatten óók `listCache.snapshot` — niet alleen `lang` — omdat
  // `useSyncExternalStore` tijdens hydration eerst `getServerSnapshot()`
  // (= null) returnt en pas ná de eerste commit naar de echte client-
  // snapshot synchroniseert. Met deps `[lang]` only zou de restore op de
  // allereerste pass `setLoad({status:"idle"})` committen en daarna nooit
  // meer triggeren — net als de "tabel weg na refresh"-bug op
  // /dev/tatoeba-audio-search. De `restoredRef`-guard voorkomt
  // overbodige re-runs als auto-renders met dezelfde snapshot komen.
  useEffect(() => {
    const snap = listCache.snapshot;
    if (
      restoredRef.current &&
      restoredRef.current.lang === lang &&
      restoredRef.current.snap === snap
    ) {
      return;
    }
    restoredRef.current = { lang, snap };

    if (snap) {
      const params: Record<string, string> = {
        lang: snap.lang,
        limit: String(snap.limit),
      };
      const qs = new URLSearchParams(params);
      setLoad({
        status: "loaded",
        rows: snap.response.rows,
        total: snap.response.total,
        url: snap.response.url,
        pagesFetched: snap.response.pages_fetched,
        request: { url: `/api/dev/tatoeba-audio/list?${qs}`, params },
        rawResponse: snap.response,
      });
      setLimit(snap.limit);
    } else {
      setLoad({ status: "idle" });
    }
  }, [lang, listCache.snapshot]);

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
      // Persist zodat een refresh dezelfde rijen + debug-state toont.
      listCache.save({
        lang,
        limit,
        fetched_at: new Date().toISOString(),
        response: json,
      });
    } catch (e) {
      setLoad({
        status: "error",
        error: e instanceof Error ? e.message : "Onbekende fout",
        request,
      });
    }
  }

  // Memoiseer zodat baseRows een stabiele referentie heeft zolang de
  // load-status hetzelfde is — anders triggert een nieuw `[]` literal
  // elke render `batchTargets` opnieuw.
  const baseRows = useMemo(
    () => (load.status === "loaded" ? load.rows : []),
    [load],
  );

  // Stuurt één chunk naar /translate. Apart zodat we 'm vanuit zowel de
  // per-rij knop (met 1 item) als de batch-knop (met 50 items) kunnen
  // hergebruiken. Gooit nooit; returnt altijd een TranslateResponse.
  const callTranslateBatch = useCallback(
    async (items: TranslateBatchItem[]): Promise<TranslateResponse> => {
      const url = "/api/dev/tatoeba-audio/translate";
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items }),
        });
        const json = (await res.json()) as TranslateResponse;
        setTranslateDebug({
          request: { url, body: { items } },
          response: json,
          ok: res.ok && json.ok,
        });
        return json;
      } catch (e) {
        const failure: TranslateResponse = {
          ok: false,
          error: e instanceof Error ? e.message : "Onbekende netwerkfout.",
          reason: "openai_error",
        };
        setTranslateDebug({
          request: { url, body: { items } },
          response: failure,
          ok: false,
        });
        return failure;
      }
    },
    [],
  );

  // Start een vertaling voor een lijst rijen. Filter zelf niet — caller
  // bepaalt welke rijen hier binnenkomen (per-rij = 1, batch = N).
  const translateRows = useCallback(
    async (rows: AudioRow[]) => {
      const items: TranslateBatchItem[] = rows.map((r) => ({
        audio_id: r.audio_id,
        source_text: r.sentence_text,
        source_lang: r.lang,
      }));

      // Markeer alle rijen als loading vóór we netwerk-werk starten —
      // anders flashed de UI tussen idle en loading bij snel klikken.
      setTranslateState((prev) => {
        const next = { ...prev };
        for (const item of items) {
          next[item.audio_id] = { status: "loading" };
        }
        return next;
      });

      // Splits in chunks van TRANSLATE_CHUNK_SIZE en stuur parallel.
      const chunks: TranslateBatchItem[][] = [];
      for (let i = 0; i < items.length; i += TRANSLATE_CHUNK_SIZE) {
        chunks.push(items.slice(i, i + TRANSLATE_CHUNK_SIZE));
      }

      const results = await Promise.all(
        chunks.map((chunk) => callTranslateBatch(chunk)),
      );

      const successEntries: Array<{
        audio_id: number;
        translation: string;
        source_text: string;
        lang: string;
        cached_at: string;
        topic: string;
        tags: string[];
      }> = [];
      const erroredIds = new Map<number, string>();

      // Map elk chunk-resultaat terug naar de rijen die we wilden vertalen
      // voor dat chunk. Bij missing_translations krijgen die specifieke
      // audio_ids een error; de geslaagde gaan alsnog naar de cache.
      results.forEach((result, idx) => {
        const chunk = chunks[idx];
        if (result.ok) {
          const sourceById = new Map(
            chunk.map((c) => [c.audio_id, c.source_text]),
          );
          const langById = new Map(chunk.map((c) => [c.audio_id, c.source_lang]));
          // Sinds de enrich-uitbreiding levert de route ook topic + tags
          // per item. De playground heeft daar (nog) geen UI voor, maar
          // we pluggen 'm wel door naar de cache zodat /search en
          // /playground dezelfde verrijking delen.
          for (const t of result.items) {
            successEntries.push({
              audio_id: t.audio_id,
              translation: t.translation,
              source_text: sourceById.get(t.audio_id) ?? "",
              lang: langById.get(t.audio_id) ?? "",
              cached_at: new Date().toISOString(),
              topic: t.topic,
              tags: t.tags,
            });
          }
        } else {
          // Hele chunk faalde: alle audio_ids in deze chunk krijgen error.
          // Bij "missing_items" specifiek alleen die ID's, anders alles.
          const ids =
            result.reason === "missing_items" && result.missing_audio_ids
              ? result.missing_audio_ids
              : chunk.map((c) => c.audio_id);
          for (const id of ids) {
            erroredIds.set(id, result.error);
          }
        }
      });

      if (successEntries.length > 0) {
        translationCache.bulkSet(successEntries);
      }

      // Update state: success-rows verwijderen uit translateState (cache
      // toont 'm nu), error-rows naar error.
      setTranslateState((prev) => {
        const next = { ...prev };
        for (const e of successEntries) {
          delete next[e.audio_id];
        }
        for (const [id, err] of erroredIds.entries()) {
          next[id] = { status: "error", error: err };
        }
        return next;
      });
    },
    [callTranslateBatch, translationCache],
  );

  const handleTranslateRow = useCallback(
    async (row: AudioRow) => {
      await translateRows([row]);
    },
    [translateRows],
  );

  // Batch-button: alle geladen rijen die nog géén bruikbare cache-hit
  // hebben en niet de target-taal als bron hebben. (Vroeger filterden
  // we op "zichtbaar in de tabel"; sinds de FilterBar is verhuisd naar
  // het gedeelde component bezit deze parent geen filter-state meer.
  // Operate-on-all is ook intuïtiever: je vult de cache in één keer.)
  const batchTargets = useMemo(() => {
    return baseRows.filter((row) => {
      if (row.lang === TARGET_LANG) return false;
      const cached = translationCache.get(row.audio_id, row.sentence_text);
      if (cached) return false;
      const state = translateState[row.audio_id];
      if (state?.status === "loading") return false;
      return true;
    });
  }, [baseRows, translationCache, translateState]);

  const handleBatchTranslate = useCallback(async () => {
    if (batchTargets.length === 0 || batchRunning) return;
    setBatchRunning(true);
    try {
      await translateRows(batchTargets);
    } finally {
      setBatchRunning(false);
    }
  }, [batchTargets, batchRunning, translateRows]);

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

          {translateDebug && (
            <TranslateDebugPanel snapshot={translateDebug} />
          )}

          <TranslateBar
            pendingCount={batchTargets.length}
            onTranslateAll={handleBatchTranslate}
            onClearCache={translationCache.clearAll}
            cacheSize={Object.keys(translationCache.cache).length}
            running={batchRunning}
          />

          <AudioResultTable
            rows={baseRows}
            translation={{
              cache: translationCache,
              state: translateState,
              onTranslateRow: handleTranslateRow,
            }}
            tableScope="playground"
          />
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

// Bovenste actie-bar boven de tabel: één klik vertaalt alle geladen
// rijen die nog geen cache-hit hebben en niet al NL zijn. Toont ook
// hoeveel vertalingen momenteel gecachet zijn + een knop om die cache
// te wissen (handig tijdens dev / het aanpassen van het system-prompt).
function TranslateBar({
  pendingCount,
  onTranslateAll,
  onClearCache,
  cacheSize,
  running,
}: {
  pendingCount: number;
  onTranslateAll: () => void;
  onClearCache: () => void;
  cacheSize: number;
  running: boolean;
}) {
  const disabled = pendingCount === 0 || running;
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-background/40 px-3 py-2">
      <button
        type="button"
        onClick={onTranslateAll}
        disabled={disabled}
        className="inline-flex h-9 cursor-pointer items-center justify-center rounded-md bg-accent px-3 text-xs font-medium text-accent-foreground transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {running
          ? "Vertalen..."
          : pendingCount === 0
            ? "Alle rijen vertaald"
            : `Vertaal ${pendingCount} rij${pendingCount === 1 ? "" : "en"} naar NL`}
      </button>

      <span className="text-[10px] text-muted-foreground">
        Cache: {cacheSize} vertaling
        {cacheSize === 1 ? "" : "en"} in localStorage
      </span>

      {cacheSize > 0 && (
        <button
          type="button"
          onClick={onClearCache}
          disabled={running}
          className="ml-auto text-[10px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline disabled:opacity-50"
        >
          Wis vertaal-cache
        </button>
      )}
    </div>
  );
}

// Toont de laatste /translate-batch in collapsible details — consistent
// met RequestDebugPanel hierboven.
function TranslateDebugPanel({
  snapshot,
}: {
  snapshot: TranslateDebugSnapshot;
}) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold text-muted-foreground">
        Debug — laatste vertaal-batch{" "}
        <span
          className={`ml-2 rounded px-1.5 py-0.5 text-[9px] font-medium ${snapshot.ok ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-destructive/10 text-destructive"}`}
        >
          {snapshot.ok ? "OK" : "FOUT"}
        </span>
      </h3>

      <details className="rounded-md border border-border bg-card text-card-foreground">
        <summary className="cursor-pointer px-4 py-2 text-xs font-medium text-muted-foreground">
          Request — POST {snapshot.request.url} (
          {snapshot.request.body.items.length} item
          {snapshot.request.body.items.length === 1 ? "" : "s"})
        </summary>
        <div className="px-4 pb-4">
          <pre className="max-h-[400px] overflow-auto rounded bg-muted/40 p-3 font-mono text-xs">
            {JSON.stringify(snapshot.request.body, null, 2)}
          </pre>
        </div>
      </details>

      <details className="rounded-md border border-border bg-card text-card-foreground">
        <summary className="cursor-pointer px-4 py-2 text-xs font-medium text-muted-foreground">
          Response — JSON
        </summary>
        <div className="px-4 pb-4">
          <pre className="max-h-[400px] overflow-auto rounded bg-muted/40 p-3 font-mono text-xs">
            {JSON.stringify(snapshot.response, null, 2)}
          </pre>
        </div>
      </details>
    </section>
  );
}
