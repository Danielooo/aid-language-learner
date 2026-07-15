"use client";

import { useCallback, useEffect, useState } from "react";

import type { AudioStatsResponse } from "@/app/api/dev/tatoeba-audio/audio-stats/route";

// Klein dashboard-paneel onderaan /dev/tatoeba-audio-search. Telt
// hoeveel exercises-rijen een audio_path hebben, gegroepeerd per
// source_lang. Bron is /api/dev/tatoeba-audio/audio-stats.
//
// Bewust een client-component met een uitklapbaar <details>: de
// hoofdpagina is verder server-rendered, en we willen niet bij elke
// render een DB-call doen. De parent kan via `refreshKey` een refresh
// triggeren na een succesvolle persist (state-bump → effect re-fetcht).

type AudioStatsPanelProps = {
  // Wijzig deze waarde om een refresh te forceren (bv. na persist).
  refreshKey?: number;
};

const LANG_LABELS: Record<string, string> = {
  spa: "Spaans",
  eng: "Engels",
  nld: "Nederlands",
  fra: "Frans",
  deu: "Duits",
  unknown: "Onbekend",
};

type LoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "loaded"; data: AudioStatsResponse }
  | { status: "error"; error: string };

export function AudioStatsPanel({ refreshKey = 0 }: AudioStatsPanelProps) {
  const [open, setOpen] = useState(false);
  const [load, setLoad] = useState<LoadState>({ status: "idle" });

  const fetchStats = useCallback(async () => {
    setLoad({ status: "loading" });
    try {
      const res = await fetch("/api/dev/tatoeba-audio/audio-stats", {
        cache: "no-store",
      });
      const json = (await res.json()) as AudioStatsResponse;
      if (!res.ok || !json.ok) {
        const err = json.ok ? `HTTP ${res.status}` : json.error;
        setLoad({ status: "error", error: err });
        return;
      }
      setLoad({ status: "loaded", data: json });
    } catch (e) {
      setLoad({
        status: "error",
        error: e instanceof Error ? e.message : "Onbekende fout.",
      });
    }
  }, []);

  // Eerst laden zodra de user de details opent. Daarna re-fetchen bij
  // elke refreshKey-bump (typisch na een succesvolle persist-call).
  useEffect(() => {
    if (!open) return;
    // fetchStats zet synchroon loading-state; acceptabel voor dev-tool.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchStats();
  }, [open, fetchStats, refreshKey]);

  // Highlight-tellers voor de samenvatting (zichtbaar zelfs als de
  // details dichtgeklapt zijn, zodat het dashboard altijd iets toont).
  const spaCount =
    load.status === "loaded" && load.data.ok
      ? (load.data.lang_counts["spa"] ?? 0)
      : null;
  const total =
    load.status === "loaded" && load.data.ok ? load.data.total_with_audio : null;

  return (
    <details
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
      className="rounded-lg border border-border bg-card text-card-foreground"
    >
      <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 px-5 py-3">
        <div className="space-y-0.5">
          <h2 className="text-sm font-semibold">
            Dashboard — oefeningen met audio in Supabase
          </h2>
          <p className="text-[11px] text-muted-foreground">
            {spaCount !== null
              ? `Spaanse oefeningen met audio: ${spaCount}${
                  total !== null && total !== spaCount
                    ? ` · ${total} totaal`
                    : ""
                }`
              : "Klap uit om de tellers te laden."}
          </p>
        </div>
        <span className="text-[10px] text-muted-foreground">
          {open ? "▲ inklappen" : "▼ uitklappen"}
        </span>
      </summary>

      <div className="space-y-3 border-t border-border px-5 py-3">
        {load.status === "loading" && (
          <p className="text-xs text-muted-foreground">Tellers ophalen...</p>
        )}

        {load.status === "error" && (
          <div className="flex items-center justify-between gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            <span>{load.error}</span>
            <button
              type="button"
              onClick={fetchStats}
              className="rounded border border-destructive/40 px-2 py-0.5 text-[10px] hover:bg-destructive/20"
            >
              Opnieuw
            </button>
          </div>
        )}

        {load.status === "loaded" && load.data.ok && (
          <>
            <div className="rounded-md border border-accent/40 bg-accent/5 px-3 py-2">
              <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Spaanse oefeningen met audio
              </div>
              <div className="text-2xl font-semibold tabular-nums text-foreground">
                {load.data.lang_counts["spa"] ?? 0}
              </div>
            </div>

            {Object.keys(load.data.lang_counts).length > 1 && (
              <div className="rounded-md border border-border bg-background/40 p-2">
                <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Per taal
                </div>
                <ul className="grid grid-cols-2 gap-1 text-xs sm:grid-cols-3">
                  {Object.entries(load.data.lang_counts)
                    .sort((a, b) => b[1] - a[1])
                    .map(([lang, count]) => (
                      <li
                        key={lang}
                        className="flex items-center justify-between gap-2 rounded bg-muted/40 px-2 py-1"
                      >
                        <span>
                          <span className="font-mono text-[10px] uppercase">
                            {lang}
                          </span>{" "}
                          <span className="text-muted-foreground">
                            {LANG_LABELS[lang] ?? ""}
                          </span>
                        </span>
                        <span className="font-mono tabular-nums">{count}</span>
                      </li>
                    ))}
                </ul>
              </div>
            )}

            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>
                Totaal: {load.data.total_with_audio} · laatst opgehaald{" "}
                {new Date(load.data.fetched_at).toLocaleTimeString("nl-NL")}
              </span>
              <button
                type="button"
                onClick={fetchStats}
                className="underline hover:text-foreground"
              >
                Verversen
              </button>
            </div>
          </>
        )}
      </div>
    </details>
  );
}
