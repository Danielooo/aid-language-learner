"use client";

import { PauseIcon, SpeakerIcon } from "@/components/ui/audio-icons";
import { useExerciseAudio } from "@/components/features/quiz/hooks/use-exercise-audio";

type ExerciseAudioControlsProps = {
  mp3Url: string;
  autoplay?: boolean;
  variant?: "compact" | "large";
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
};

const variantClasses = {
  compact:
    "inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md border border-border bg-background text-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
  large:
    "mx-auto flex min-w-28 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border border-border/80 bg-background/80 px-8 py-4 text-foreground shadow-sm transition-colors hover:bg-accent/10 hover:text-accent-foreground",
} as const;

export function ExerciseAudioControls({
  mp3Url,
  autoplay = true,
  variant = "compact",
  className,
  onClick,
}: ExerciseAudioControlsProps) {
  const { playing, toggle } = useExerciseAudio(mp3Url, { autoplay });
  const iconClassName = variant === "large" ? "size-8" : "size-3.5";

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    onClick?.(e);
    toggle();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={playing ? "Pauzeer audio" : "Speel audio af"}
      title={playing ? "Pauzeer" : "Speel audio af"}
      className={className ?? variantClasses[variant]}
    >
      {playing ? (
        <PauseIcon className={iconClassName} />
      ) : (
        <SpeakerIcon className={iconClassName} />
      )}
    </button>
  );
}
