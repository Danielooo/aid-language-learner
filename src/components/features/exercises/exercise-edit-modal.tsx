"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

import { InlineAudioPlayButton } from "@/components/features/exercises/inline-audio-play-button";
import { ChipListField } from "@/components/ui/chip-list-field";

export type ExerciseEditValues = {
  sourceText: string;
  targetText: string;
  tags: string[];
  alternatives: string[];
};

type ExerciseEditModalProps = {
  open: boolean;
  initial: ExerciseEditValues | null;
  /** Publieke mp3-URL; null/leeg = geen audio. */
  mp3Url?: string | null;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (values: ExerciseEditValues) => Promise<void>;
};

/** Split CSV-tags; lege stukken en witruimte worden weggelaten. */
export function parseTagsCsv(raw: string): string[] {
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

/**
 * Modal om één oefening te bewerken (bron, vertaling, tags, alts).
 * Optioneel audio afluisteren vóór je tekst aanpast.
 */
export function ExerciseEditModal({
  open,
  initial,
  mp3Url = null,
  saving,
  error,
  onClose,
  onSave,
}: ExerciseEditModalProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const node = dialogRef.current;
    if (!node) return;
    if (open && !node.open) node.showModal();
    else if (!open && node.open) node.close();
  }, [open]);

  if (!open || !initial) return null;

  return (
    <ExerciseEditModalContent
      key={`${initial.sourceText}\u0000${initial.targetText}`}
      dialogRef={dialogRef}
      initial={initial}
      mp3Url={mp3Url}
      saving={saving}
      error={error}
      onClose={onClose}
      onSave={onSave}
    />
  );
}

function ExerciseEditModalContent({
  dialogRef,
  initial,
  mp3Url,
  saving,
  error,
  onClose,
  onSave,
}: {
  dialogRef: RefObject<HTMLDialogElement | null>;
  initial: ExerciseEditValues;
  mp3Url: string | null;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (values: ExerciseEditValues) => Promise<void>;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [sourceText, setSourceText] = useState(() => initial.sourceText);
  const [targetText, setTargetText] = useState(() => initial.targetText);
  const [tags, setTags] = useState<string[]>(() => [...initial.tags]);
  const [alternatives, setAlternatives] = useState<string[]>(() => [
    ...initial.alternatives,
  ]);
  const [playing, setPlaying] = useState(false);

  const hasAudio = Boolean(mp3Url?.trim());

  useEffect(() => {
    const node = audioRef.current;
    return () => {
      node?.pause();
    };
  }, []);

  async function handleSave() {
    const source = sourceText.trim();
    const target = targetText.trim();
    if (!source || !target) return;
    await onSave({
      sourceText: source,
      targetText: target,
      tags,
      alternatives,
    });
  }

  function handleAudioToggle() {
    const url = mp3Url?.trim();
    const node = audioRef.current;
    if (!url || !node) return;
    if (playing) {
      node.pause();
      setPlaying(false);
      return;
    }
    if (node.src !== url) node.src = url;
    void node
      .play()
      .then(() => setPlaying(true))
      .catch(() => setPlaying(false));
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="border-border bg-card text-card-foreground backdrop:bg-foreground/40 fixed inset-0 m-auto h-fit max-h-[85vh] w-[min(560px,90vw)] rounded-lg border p-0"
    >
      <audio
        ref={audioRef}
        preload="none"
        className="hidden"
        onEnded={() => setPlaying(false)}
        onPause={() => setPlaying(false)}
      />
      <div className="flex max-h-[85vh] flex-col">
        <header className="border-border border-b px-5 py-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold">Oefening bewerken</h2>
            {hasAudio ? (
              <InlineAudioPlayButton
                playing={playing}
                disabled={saving}
                onToggle={handleAudioToggle}
              />
            ) : null}
          </div>
        </header>

        <div className="space-y-4 overflow-y-auto px-5 py-4">
          <label className="block space-y-1 text-sm">
            <span className="text-muted-foreground text-xs">Bron</span>
            <textarea
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              rows={2}
              disabled={saving}
              className="border-border bg-background text-foreground w-full rounded-md border px-3 py-2 text-sm disabled:opacity-50"
            />
          </label>

          <label className="block space-y-1 text-sm">
            <span className="text-muted-foreground text-xs">Vertaling</span>
            <textarea
              value={targetText}
              onChange={(e) => setTargetText(e.target.value)}
              rows={2}
              disabled={saving}
              className="border-border bg-background text-foreground w-full rounded-md border px-3 py-2 text-sm disabled:opacity-50"
            />
          </label>

          <ChipListField
            label="Tags"
            items={tags}
            onChange={setTags}
            disabled={saving}
            caseInsensitiveDedupe
            placeholder="Nieuwe tag…"
            emptyLabel="Geen"
          />

          <ChipListField
            label="Alternatieven"
            items={alternatives}
            onChange={setAlternatives}
            disabled={saving}
            placeholder="Nieuw alternatief…"
            emptyLabel="Geen"
          />

          {error && (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          )}
        </div>

        <footer className="border-border flex justify-end gap-2 border-t px-5 py-3">
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="border-border inline-flex h-9 items-center rounded-md border px-3 text-sm disabled:opacity-50"
          >
            Annuleren
          </button>
          <button
            type="button"
            disabled={
              saving ||
              sourceText.trim().length === 0 ||
              targetText.trim().length === 0
            }
            onClick={() => void handleSave()}
            className="bg-accent text-accent-foreground inline-flex h-9 items-center rounded-md px-3 text-sm font-medium disabled:opacity-50"
          >
            {saving ? "Opslaan…" : "Opslaan"}
          </button>
        </footer>
      </div>
    </dialog>
  );
}
