"use client";

import { PauseIcon, SpeakerIcon } from "@/components/ui/audio-icons";

type InlineAudioPlayButtonProps = {
  playing: boolean;
  disabled?: boolean;
  onToggle: () => void;
  /** Aria/title-prefix, bv. oefeningstekst. */
  label?: string;
};

/**
 * Compacte play/pause-knop (zelfde look als Generator-tabel).
 * Stop Propagation zodat rij-klik niet meegaat.
 */
export function InlineAudioPlayButton({
  playing,
  disabled = false,
  onToggle,
  label,
}: InlineAudioPlayButtonProps) {
  const playLabel = label ? `Speel audio af: ${label}` : "Speel audio af";
  const pauseLabel = label ? `Pauzeer audio: ${label}` : "Pauzeer audio";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      aria-label={playing ? pauseLabel : playLabel}
      title={playing ? "Pauzeer" : "Direct afspelen"}
      className="border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground inline-flex size-7 shrink-0 items-center justify-center rounded-md border disabled:opacity-50"
    >
      {playing ? (
        <PauseIcon className="size-3.5" />
      ) : (
        <SpeakerIcon className="size-3.5" />
      )}
    </button>
  );
}
