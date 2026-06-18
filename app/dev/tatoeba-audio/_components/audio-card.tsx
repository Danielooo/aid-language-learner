"use client";

import { useState } from "react";

import type {
  PerAudioStatus,
  ProbeCandidate,
  ProbeResponse,
  UploadDescriptor,
  UploadResponse,
} from "./types";

// AudioCard rendert één Tatoeba-audio met drie acties:
//
//   1. "Verken download-opties" → roept /api/dev/tatoeba-audio/probe aan,
//      HEAD-probet meerdere kandidaat-URL's en toont per kandidaat een
//      status-badge (HTTP-code, content-type, content-length, eventueel
//      Content-Disposition). Pas na probe weet je welke URL's daadwerkelijk
//      werken.
//
//   2. Per werkende kandidaat:
//       - "▶ Speel af" → laadt de URL in een inline <audio>-element
//       - "⬇ Download" → triggert een browser-download via onze proxy
//         /api/dev/tatoeba-audio/download (same-origin, dus het HTML
//         download-attribuut wordt door de browser geëerbiedigd).
//
//   3. "Upload naar Supabase" (originele functie). Wordt disabled als
//      `license === ""` (geen herbruikbare licentie).

type ProbeState =
  | { status: "idle" }
  | { status: "probing" }
  | { status: "done"; candidates: ProbeCandidate[] }
  | { status: "error"; error: string };

export function AudioCard({
  descriptor,
  audioMeta,
  onUploadComplete,
}: {
  descriptor: UploadDescriptor;
  audioMeta: {
    download_url: string;
    created: string;
    modified: string;
  };
  onUploadComplete?: (
    descriptor: UploadDescriptor,
    response: UploadResponse,
  ) => void;
}) {
  const [uploadState, setUploadState] = useState<PerAudioStatus>({
    status: "idle",
  });
  const [probeState, setProbeState] = useState<ProbeState>({ status: "idle" });
  const [activePlaybackUrl, setActivePlaybackUrl] = useState<string | null>(
    null,
  );

  const isReusable = descriptor.license.trim() !== "";

  async function handleProbe() {
    setProbeState({ status: "probing" });
    const qs = new URLSearchParams({
      audio_id: String(descriptor.audio_id),
      sentence_id: String(descriptor.sentence_id),
      lang: descriptor.lang,
    });
    if (audioMeta.download_url) {
      qs.set("download_url", audioMeta.download_url);
    }

    try {
      const res = await fetch(`/api/dev/tatoeba-audio/probe?${qs}`);
      const json = (await res.json()) as ProbeResponse;
      if (!res.ok || !json.ok) {
        const err = !json.ok ? json.error : `HTTP ${res.status}`;
        setProbeState({ status: "error", error: err });
        return;
      }
      setProbeState({ status: "done", candidates: json.candidates });
    } catch (e) {
      setProbeState({
        status: "error",
        error: e instanceof Error ? e.message : "Onbekende fout",
      });
    }
  }

  async function handleUpload() {
    if (!isReusable) return;
    setUploadState({ status: "uploading" });
    try {
      const res = await fetch("/api/dev/tatoeba-audio/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(descriptor),
      });
      const json = (await res.json()) as UploadResponse;
      if (!res.ok || !json.ok) {
        const err = !json.ok ? json.error : `HTTP ${res.status}`;
        setUploadState({
          status: "error",
          error: err,
          response: !json.ok ? json : undefined,
        });
        onUploadComplete?.(descriptor, json);
        return;
      }
      setUploadState({ status: "success", response: json });
      onUploadComplete?.(descriptor, json);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Onbekende fout";
      setUploadState({ status: "error", error: message });
    }
  }

  const downloadFilename = `tatoeba-${descriptor.lang}-${descriptor.sentence_id}-${descriptor.audio_id}.mp3`;
  const viableCount =
    probeState.status === "done"
      ? probeState.candidates.filter((c) => c.downloadable).length
      : 0;

  return (
    <div className="space-y-2 rounded-md border border-border bg-background p-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm text-foreground">{descriptor.sentence_text}</p>
        <span className="font-mono text-[10px] text-muted-foreground">
          #{descriptor.audio_id} · sent {descriptor.sentence_id}
        </span>
      </div>

      {activePlaybackUrl && (
        <audio
          controls
          autoPlay
          preload="metadata"
          src={activePlaybackUrl}
          onError={(e) => {
            const err = e.currentTarget.error;
            console.warn("[tatoeba-audio] playback error", {
              audio_id: descriptor.audio_id,
              lang: descriptor.lang,
              src: activePlaybackUrl,
              code: err?.code,
              message: err?.message,
            });
          }}
          className="h-8 w-full"
        />
      )}

      <ProbeSection
        state={probeState}
        onProbe={handleProbe}
        onPlay={setActivePlaybackUrl}
        downloadFilename={downloadFilename}
        viableCount={viableCount}
      />

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2 text-[10px] text-muted-foreground">
        <span>
          @{descriptor.author} ·{" "}
          <span className="font-mono">
            {descriptor.license === "" ? "no-reuse" : descriptor.license}
          </span>
        </span>
        <UploadButton
          state={uploadState}
          isReusable={isReusable}
          onClick={handleUpload}
        />
      </div>

      {uploadState.status === "success" && (
        <div className="rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 font-mono text-[10px] text-emerald-700 dark:text-emerald-400">
          ✓ {uploadState.response.path} (
          {formatBytes(uploadState.response.byte_size)})
        </div>
      )}

      {uploadState.status === "error" && (
        <div className="rounded border border-destructive/50 bg-destructive/10 px-2 py-1 text-[10px] text-destructive">
          {uploadState.error}
        </div>
      )}
    </div>
  );
}

function ProbeSection({
  state,
  onProbe,
  onPlay,
  downloadFilename,
  viableCount,
}: {
  state: ProbeState;
  onProbe: () => void;
  onPlay: (url: string) => void;
  downloadFilename: string;
  viableCount: number;
}) {
  if (state.status === "idle") {
    return (
      <button
        type="button"
        onClick={onProbe}
        className="w-full rounded-md border border-border bg-card px-3 py-1.5 text-[11px] font-medium text-card-foreground transition-colors hover:bg-muted"
      >
        Verken download-opties
      </button>
    );
  }

  if (state.status === "probing") {
    return (
      <div className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-1.5 text-[10px] text-muted-foreground">
        Bezig met HEAD-probes op {3}+ kandidaat-URL&apos;s...
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="flex items-center justify-between gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-1.5 text-[10px] text-destructive">
        <span>Probe faalde: {state.error}</span>
        <button
          type="button"
          onClick={onProbe}
          className="rounded border border-destructive/40 px-2 py-0.5 text-[10px] hover:bg-destructive/20"
        >
          Opnieuw
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>
          {viableCount} van {state.candidates.length} URL&apos;s zijn werkend.
        </span>
        <button
          type="button"
          onClick={onProbe}
          className="underline hover:text-foreground"
        >
          Opnieuw probieren
        </button>
      </div>
      <ul className="space-y-1">
        {state.candidates.map((c) => (
          <CandidateRow
            key={c.url}
            candidate={c}
            onPlay={onPlay}
            downloadFilename={downloadFilename}
          />
        ))}
      </ul>
    </div>
  );
}

function CandidateRow({
  candidate,
  onPlay,
  downloadFilename,
}: {
  candidate: ProbeCandidate;
  onPlay: (url: string) => void;
  downloadFilename: string;
}) {
  const viable = candidate.downloadable;
  const proxyHref = `/api/dev/tatoeba-audio/download?url=${encodeURIComponent(candidate.url)}&filename=${encodeURIComponent(downloadFilename)}`;

  return (
    <li
      className={`rounded border px-2 py-1 ${
        viable
          ? "border-emerald-500/40 bg-emerald-500/5"
          : "border-border bg-muted/20"
      }`}
    >
      <div className="flex items-center justify-between gap-2 text-[10px]">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <StatusBadge candidate={candidate} />
            <span className="font-medium text-foreground">
              {candidate.label}
            </span>
          </div>
          <code className="block truncate font-mono text-[9px] text-muted-foreground">
            {candidate.url}
          </code>
          {candidate.content_type && (
            <span className="font-mono text-[9px] text-muted-foreground/70">
              {candidate.content_type}
              {candidate.content_length !== null
                ? ` · ${formatBytes(candidate.content_length)}`
                : ""}
              {candidate.content_disposition
                ? " · attachment"
                : ""}
            </span>
          )}
          {candidate.reason && !viable && (
            <span className="text-[9px] text-destructive">
              {candidate.reason}
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            disabled={!viable}
            onClick={() => onPlay(candidate.url)}
            title="Afspelen in deze pagina"
            className="rounded border border-border px-2 py-0.5 text-[10px] hover:bg-muted disabled:opacity-30 disabled:hover:bg-transparent"
          >
            ▶
          </button>
          <a
            href={viable ? proxyHref : undefined}
            download={downloadFilename}
            aria-disabled={!viable}
            className={`rounded border px-2 py-0.5 text-[10px] ${
              viable
                ? "border-accent/60 bg-accent/10 text-foreground hover:bg-accent/20"
                : "pointer-events-none border-border text-muted-foreground opacity-30"
            }`}
          >
            ⬇ Download
          </a>
        </div>
      </div>
    </li>
  );
}

function StatusBadge({ candidate }: { candidate: ProbeCandidate }) {
  const { status, downloadable } = candidate;
  const display =
    status === -1 ? "TMO" : status === 0 ? "ERR" : String(status);
  const color = downloadable
    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
    : "border-destructive/40 bg-destructive/10 text-destructive";

  return (
    <span
      className={`rounded border px-1 py-0.5 font-mono text-[9px] font-semibold ${color}`}
    >
      {display}
    </span>
  );
}

function UploadButton({
  state,
  isReusable,
  onClick,
}: {
  state: PerAudioStatus;
  isReusable: boolean;
  onClick: () => void;
}) {
  if (!isReusable) {
    return (
      <span className="rounded border border-dashed border-border px-2 py-1 text-[10px] text-muted-foreground">
        Licentie verbiedt hergebruik
      </span>
    );
  }

  const label =
    state.status === "uploading"
      ? "Uploaden..."
      : state.status === "success"
        ? "Opnieuw uploaden"
        : state.status === "error"
          ? "Opnieuw proberen"
          : "Upload naar Supabase";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={state.status === "uploading"}
      className="rounded-md bg-accent px-2.5 py-1 text-[10px] font-medium text-accent-foreground transition-colors hover:bg-accent/90 disabled:opacity-50"
    >
      {label}
    </button>
  );
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} kB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}
