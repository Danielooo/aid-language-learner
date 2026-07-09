"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type {
  ExistingConflictRow,
  PersistItem,
  PersistResolution,
} from "@/app/api/dev/tatoeba-audio/persist-batch/route";

// Modal-dialoog die per audio_id de conflict-rijen toont en de user
// laat kiezen tussen:
//   - "alleen oude bewaren" (skip)        → niet inserten
//   - "alleen nieuwe bewaren" (replace)   → oude verwijderen + nieuwe inserten
//   - "beide bewaren" (both)              → oude blijven + nieuwe erbij
//
// Bovenaan een bulk-shortcut zodat de user niet 30 keer hoeft te klikken
// als alles dezelfde behandeling moet krijgen.
//
// Implementatie: native <dialog> element. Eenvoudig modaal gedrag (Esc
// to close, focus-trap) komt gratis bij showModal().

type ConflictDialogProps = {
  // Items met daadwerkelijke conflicten — items zonder conflict horen
  // hier niet in (parent filtert ze al weg en past direct apply toe).
  items: PersistItem[];
  conflicts: Record<string, ExistingConflictRow[]>;
  open: boolean;
  onCancel: () => void;
  onConfirm: (resolutions: Record<string, PersistResolution>) => void;
};

const RESOLUTION_LABELS: Record<PersistResolution, string> = {
  skip: "Alleen oude bewaren",
  replace: "Alleen nieuwe bewaren",
  both: "Beide bewaren",
};

export function ConflictDialog({
  items,
  conflicts,
  open,
  onCancel,
  onConfirm,
}: ConflictDialogProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  // Default-resolutie = "skip" (veilig: niets aan de DB veranderen tot
  // de user expliciet kiest). Sleutel = audio_id als string.
  const [resolutions, setResolutions] = useState<
    Record<string, PersistResolution>
  >(() => {
    const initial: Record<string, PersistResolution> = {};
    for (const item of items) {
      initial[String(item.audio_id)] = "skip";
    }
    return initial;
  });

  // Sync open/close-state met de native <dialog>-API. close() vóór
  // showModal() geeft anders een "Failed to execute" als de user de
  // dialog twee keer achter elkaar opent.
  useEffect(() => {
    const node = dialogRef.current;
    if (!node) return;
    if (open && !node.open) {
      node.showModal();
    } else if (!open && node.open) {
      node.close();
    }
  }, [open]);

  // Reset resoluties wanneer er een nieuwe set items binnenkomt
  // (bv. user opent de dialog opnieuw met andere selectie).
  useEffect(() => {
    if (!open) return;
    const initial: Record<string, PersistResolution> = {};
    for (const item of items) {
      initial[String(item.audio_id)] = "skip";
    }
    // Bewuste reset bij nieuwe items; begrensd tot dialog-open.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setResolutions(initial);
  }, [open, items]);

  function setOne(audioId: number, value: PersistResolution) {
    setResolutions((prev) => ({ ...prev, [String(audioId)]: value }));
  }

  function setAll(value: PersistResolution) {
    setResolutions(() => {
      const next: Record<string, PersistResolution> = {};
      for (const item of items) next[String(item.audio_id)] = value;
      return next;
    });
  }

  const counts = useMemo(() => {
    const c = { skip: 0, replace: 0, both: 0 };
    for (const item of items) {
      const v = resolutions[String(item.audio_id)] ?? "skip";
      c[v] += 1;
    }
    return c;
  }, [resolutions, items]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onCancel}
      className="fixed inset-0 m-auto h-fit max-h-[85vh] w-[min(720px,90vw)] rounded-lg border border-border bg-card p-0 text-card-foreground backdrop:bg-foreground/40"
    >
      <div className="flex h-full max-h-[85vh] flex-col">
        <header className="space-y-1 border-b border-border px-5 py-3">
          <h2 className="text-base font-semibold">
            Dubbele records — kies wat je wilt bewaren
          </h2>
          <p className="text-xs text-muted-foreground">
            {items.length} van de geselecteerde records bestaan al in de
            database (op audio_id of sentence_id). Beslis per record of je
            de oude versie behoudt, vervangt of beide naast elkaar zet.
          </p>
        </header>

        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/30 px-5 py-2 text-[11px]">
          <span className="font-medium text-muted-foreground">
            Pas op alles toe:
          </span>
          {(Object.keys(RESOLUTION_LABELS) as PersistResolution[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setAll(r)}
              className="rounded border border-border bg-background px-2 py-1 text-[10px] hover:bg-accent hover:text-accent-foreground"
            >
              {RESOLUTION_LABELS[r]}
            </button>
          ))}
          <span className="ml-auto font-mono text-[10px] text-muted-foreground">
            oude {counts.skip} · nieuwe {counts.replace} · beide {counts.both}
          </span>
        </div>

        <div className="flex-1 space-y-3 overflow-auto px-5 py-3">
          {items.map((item) => (
            <ConflictRow
              key={item.audio_id}
              item={item}
              conflictRows={conflicts[String(item.audio_id)] ?? []}
              value={resolutions[String(item.audio_id)] ?? "skip"}
              onChange={(v) => setOne(item.audio_id, v)}
            />
          ))}
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-xs hover:bg-muted"
          >
            Annuleren
          </button>
          <button
            type="button"
            onClick={() => onConfirm(resolutions)}
            className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground hover:bg-accent/90"
          >
            Bevestigen en opslaan
          </button>
        </footer>
      </div>
    </dialog>
  );
}

function ConflictRow({
  item,
  conflictRows,
  value,
  onChange,
}: {
  item: PersistItem;
  conflictRows: ExistingConflictRow[];
  value: PersistResolution;
  onChange: (v: PersistResolution) => void;
}) {
  return (
    <div className="space-y-2 rounded-md border border-border bg-background/40 p-3">
      <div className="flex items-baseline justify-between gap-2 text-[11px]">
        <span className="font-mono text-muted-foreground">
          audio #{item.audio_id} · sent #{item.sentence_id}
        </span>
        <span className="font-mono text-[10px] text-muted-foreground">
          {item.source_lang}
        </span>
      </div>

      <div className="rounded border border-emerald-500/40 bg-emerald-500/5 p-2 text-xs">
        <div className="text-[10px] font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
          Nieuw
        </div>
        <p className="mt-1 text-foreground">{item.sentence_text}</p>
        <p className="text-muted-foreground">→ {item.target_text}</p>
      </div>

      {conflictRows.map((row) => (
        <div
          key={row.id}
          className="rounded border border-border bg-muted/30 p-2 text-xs"
        >
          <div className="flex items-baseline justify-between gap-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            <span>Bestaand</span>
            <span className="font-mono normal-case">
              {row.created_at.slice(0, 10)} · audio_id{" "}
              {row.tatoeba_audio_id ?? "—"} · sent_id{" "}
              {row.tatoeba_sentence_id ?? "—"}
            </span>
          </div>
          <p className="mt-1 text-foreground">{row.source_text}</p>
          <p className="text-muted-foreground">→ {row.target_text}</p>
          {row.audio_path && (
            <p className="font-mono text-[9px] text-muted-foreground/70">
              {row.audio_path}
            </p>
          )}
        </div>
      ))}

      <div
        role="radiogroup"
        aria-label={`Resolutie voor audio ${item.audio_id}`}
        className="flex flex-wrap gap-2"
      >
        {(Object.keys(RESOLUTION_LABELS) as PersistResolution[]).map((r) => (
          <label
            key={r}
            className={`flex cursor-pointer items-center gap-1.5 rounded border px-2 py-1 text-[11px] ${
              value === r
                ? "border-accent bg-accent/10 text-foreground"
                : "border-border bg-background hover:bg-muted"
            }`}
          >
            <input
              type="radio"
              name={`resolution-${item.audio_id}`}
              value={r}
              checked={value === r}
              onChange={() => onChange(r)}
              className="h-3 w-3"
            />
            {RESOLUTION_LABELS[r]}
          </label>
        ))}
      </div>
    </div>
  );
}
