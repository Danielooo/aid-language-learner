"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchJson } from "@/lib/api/fetch-json";
import { queryKeys } from "@/lib/query-keys";

import type { AudioStatsResponse } from "@/app/api/admin/tatoeba/audio-stats/route";

// Klein dashboard-paneel onderaan Tatoeba-import. Telt
// hoeveel exercises-rijen een audio_path hebben, gegroepeerd per
// source_lang. Bron is /api/admin/tatoeba/audio-stats.
type AudioStatsPanelProps = {
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

export function AudioStatsPanel({ refreshKey = 0 }: AudioStatsPanelProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: [...queryKeys.tatoebaAudioStats(), refreshKey],
    queryFn: async () => {
      const json = await fetchJson<AudioStatsResponse>(
        "/api/admin/tatoeba/audio-stats",
      );
      if (!json.ok) {
        throw new Error(json.error);
      }
      return json;
    },
    enabled: open,
  });

  const spaCount = data?.ok ? (data.lang_counts["spa"] ?? 0) : null;
  const total = data?.ok ? data.total_with_audio : null;
  const errorMessage =
    error instanceof Error ? error.message : "Onbekende fout.";

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
        {isPending && (
          <p className="text-xs text-muted-foreground">Tellers ophalen…</p>
        )}

        {isError && (
          <div className="flex items-center justify-between gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            <span>{errorMessage}</span>
            <button
              type="button"
              onClick={() => void refetch()}
              className="rounded border border-destructive/40 px-2 py-0.5 text-[10px] hover:bg-destructive/20"
            >
              Opnieuw
            </button>
          </div>
        )}

        {data?.ok && (
          <>
            <div className="rounded-md border border-accent/40 bg-accent/5 px-3 py-2">
              <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Spaanse oefeningen met audio
              </div>
              <div className="text-2xl font-semibold tabular-nums text-foreground">
                {data.lang_counts["spa"] ?? 0}
              </div>
            </div>

            {Object.keys(data.lang_counts).length > 1 && (
              <div className="rounded-md border border-border bg-background/40 p-2">
                <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Per taal
                </div>
                <ul className="grid grid-cols-2 gap-1 text-xs sm:grid-cols-3">
                  {Object.entries(data.lang_counts)
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
                Totaal: {data.total_with_audio} · laatst opgehaald{" "}
                {new Date(data.fetched_at).toLocaleTimeString("nl-NL")}
              </span>
              <button
                type="button"
                onClick={() => {
                  void queryClient.invalidateQueries({
                    queryKey: queryKeys.tatoebaAudioStats(),
                  });
                }}
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
