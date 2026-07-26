"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { InlineAudioPlayButton } from "@/components/features/exercises/inline-audio-play-button";

import type { AdminExerciseRow } from "@/lib/exercises/types";

type MyExercisesTableProps = {
  rows: AdminExerciseRow[];
  selectedIds: Set<string>;
  onToggle: (exerciseId: string) => void;
  onToggleAll: () => void;
  onRowClick: (row: AdminExerciseRow) => void;
  disabled?: boolean;
};

function formatAltsPreview(alts: string[]): string {
  if (alts.length === 0) return "—";
  if (alts.length === 1) return alts[0];
  return `${alts[0]} · +${alts.length - 1}`;
}

/**
 * Read-only overzichtstabel; klik (of Enter) opent de bewerk-modal.
 * Eén gedeelde audio-speler (zoals Generator): max. één rij speelt tegelijk.
 */
export function MyExercisesTable({
  rows,
  selectedIds,
  onToggle,
  onToggleAll,
  onRowClick,
  disabled = false,
}: MyExercisesTableProps) {
  const allSelected =
    rows.length > 0 && rows.every((r) => selectedIds.has(r.exercise_id));

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  useEffect(() => {
    const node = audioRef.current;
    return () => {
      node?.pause();
    };
  }, []);

  // Stop afspelen als de rij van de pagina verdwijnt.
  useEffect(() => {
    if (!playingId) return;
    if (!rows.some((r) => r.exercise_id === playingId)) {
      audioRef.current?.pause();
      // Rijwissel komt uit serverdata; lokale afspeelstatus moet mee resetten.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPlayingId(null);
    }
  }, [rows, playingId]);

  const handlePlayToggle = useCallback((exerciseId: string, mp3Url: string) => {
    const node = audioRef.current;
    if (!node) return;
    setPlayingId((current) => {
      if (current === exerciseId) {
        node.pause();
        return null;
      }
      if (node.src !== mp3Url) node.src = mp3Url;
      void node.play().catch(() => {
        setPlayingId(null);
      });
      return exerciseId;
    });
  }, []);

  return (
    <div className="border-border overflow-x-auto rounded-md border">
      <audio
        ref={audioRef}
        preload="none"
        className="hidden"
        onEnded={() => setPlayingId(null)}
      />
      <table className="w-full min-w-[44rem] text-left text-sm">
        <thead className="border-border bg-muted/40 text-muted-foreground border-b text-xs">
          <tr>
            <th className="w-10 px-3 py-2 align-middle">
              <input
                type="checkbox"
                checked={allSelected}
                disabled={disabled || rows.length === 0}
                onChange={onToggleAll}
                aria-label="Alles selecteren"
                className="border-border accent-accent size-4 rounded"
              />
            </th>
            <th className="w-12 px-3 py-2 align-middle">Audio</th>
            <th className="px-3 py-2">Bron</th>
            <th className="px-3 py-2">Vertaling</th>
            <th className="px-3 py-2">Alternatieven</th>
            <th className="px-3 py-2">Topic</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const selected = selectedIds.has(row.exercise_id);
            const alts = row.alternative_translations;
            const extra = Math.max(0, alts.length - 1);
            const mp3Url = row.has_audio && row.mp3_url ? row.mp3_url : "";
            return (
              <tr
                key={row.exercise_id}
                tabIndex={0}
                title="Klik om te bewerken"
                onClick={() => {
                  if (!disabled) onRowClick(row);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !disabled) onRowClick(row);
                }}
                className="border-border/60 hover:bg-muted/40 cursor-pointer border-b"
              >
                <td
                  className="px-3 py-2 align-middle"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    disabled={disabled}
                    onChange={() => onToggle(row.exercise_id)}
                    aria-label={`Selecteer oefening ${row.sentence_text}`}
                    className="border-border accent-accent size-4 rounded"
                  />
                </td>
                <td
                  className="px-3 py-2 align-middle"
                  onClick={(e) => e.stopPropagation()}
                >
                  {mp3Url ? (
                    <InlineAudioPlayButton
                      playing={playingId === row.exercise_id}
                      disabled={disabled}
                      label={row.sentence_text}
                      onToggle={() => handlePlayToggle(row.exercise_id, mp3Url)}
                    />
                  ) : (
                    <span className="text-muted-foreground/70 text-[10px]">
                      —
                    </span>
                  )}
                </td>
                <td
                  className="text-foreground max-w-[14rem] truncate px-3 py-2 align-middle"
                  title={row.sentence_text}
                >
                  {row.sentence_text}
                </td>
                <td
                  className="text-foreground max-w-[14rem] truncate px-3 py-2 align-middle"
                  title={row.target_text}
                >
                  {row.target_text}
                </td>
                <td className="px-3 py-2 align-middle">
                  <span className="inline-flex max-w-[14rem] items-center gap-1.5">
                    <span
                      className="text-foreground truncate"
                      title={formatAltsPreview(alts)}
                    >
                      {alts[0] ?? "—"}
                    </span>
                    {extra > 0 && (
                      <span className="bg-muted text-muted-foreground shrink-0 rounded px-1.5 py-0.5 text-xs tabular-nums">
                        +{extra}
                      </span>
                    )}
                  </span>
                </td>
                <td
                  className="text-muted-foreground max-w-[10rem] truncate px-3 py-2 align-middle"
                  title={row.topic ?? undefined}
                >
                  {row.topic?.trim() ? row.topic : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
