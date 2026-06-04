"use client";

import { useState } from "react";

import type { UploadDescriptor, UploadResponse } from "./types";

// Bulk-upload knop: iterereert door alle descriptors van een sectie en
// uploadt ze naar Supabase. We cappen op concurrency=3 om Tatoeba's
// API niet te ramen (er zit een redirect per call op /v1/audios/{id}/file).
//
// Per-item resultaten worden geaggregeerd in een teller en de laatste
// response wordt via `onUpload` naar boven gegeven zodat het debug-panel
// hem kan tonen.

const CONCURRENCY = 3;

type BulkState =
  | { status: "idle" }
  | {
      status: "running";
      completed: number;
      total: number;
      ok: number;
      failed: number;
      skipped: number;
    }
  | {
      status: "done";
      total: number;
      ok: number;
      failed: number;
      skipped: number;
    };

export function BulkUpload({
  descriptors,
  onUpload,
  label,
}: {
  descriptors: UploadDescriptor[];
  onUpload: (descriptor: UploadDescriptor, response: UploadResponse) => void;
  label?: string;
}) {
  const [state, setState] = useState<BulkState>({ status: "idle" });

  const reusable = descriptors.filter((d) => d.license.trim() !== "");
  const total = reusable.length;
  const skippedByLicence = descriptors.length - total;

  async function handleBulk() {
    if (total === 0) return;
    setState({
      status: "running",
      completed: 0,
      total,
      ok: 0,
      failed: 0,
      skipped: skippedByLicence,
    });

    let completed = 0;
    let okCount = 0;
    let failedCount = 0;
    const queue = [...reusable];

    async function worker() {
      while (queue.length > 0) {
        const descriptor = queue.shift();
        if (!descriptor) break;
        try {
          const res = await fetch("/api/dev/tatoeba-audio/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(descriptor),
          });
          const json = (await res.json()) as UploadResponse;
          if (res.ok && json.ok) okCount += 1;
          else failedCount += 1;
          onUpload(descriptor, json);
        } catch {
          failedCount += 1;
        } finally {
          completed += 1;
          setState({
            status: "running",
            completed,
            total,
            ok: okCount,
            failed: failedCount,
            skipped: skippedByLicence,
          });
        }
      }
    }

    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, total) }, worker),
    );

    setState({
      status: "done",
      total,
      ok: okCount,
      failed: failedCount,
      skipped: skippedByLicence,
    });
  }

  const buttonLabel =
    label ??
    (state.status === "running"
      ? `Bezig: ${state.completed}/${state.total}`
      : state.status === "done"
        ? `Klaar (${state.ok} ok, ${state.failed} fout)`
        : `Bulk upload ${total} audio${total === 1 ? "" : "s"}`);

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleBulk}
        disabled={state.status === "running" || total === 0}
        className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-card-foreground transition-colors hover:bg-muted disabled:opacity-50"
      >
        {buttonLabel}
      </button>
      {skippedByLicence > 0 && (
        <span className="text-[10px] text-muted-foreground">
          ({skippedByLicence} overgeslagen wegens licentie)
        </span>
      )}
    </div>
  );
}
