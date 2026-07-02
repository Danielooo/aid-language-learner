"use client";

import { useEffect } from "react";

import { useExerciseAudio } from "@/app/dev/exercises-quiz/_hooks/use-exercise-audio";
import {
  QUIZ_SHORTCUTS,
  formatQuizShortcut,
  isQuizShortcut,
} from "@/lib/keyboard/quiz-shortcuts";

type ExerciseAudioControlsProps = {
  mp3Url: string;
  autoplay?: boolean;
  variant?: "compact" | "large";
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
};

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className ?? "size-3.5"}
    >
      <path d="M4 2.5v11l9-5.5-9-5.5z" />
    </svg>
  );
}

function PauseIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className ?? "size-3.5"}
    >
      <path d="M3.5 2h2.5v12H3.5V2zm6.5 0H12.5v12H10V2z" />
    </svg>
  );
}

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
  const shortcutLabel = formatQuizShortcut(QUIZ_SHORTCUTS.playAudio);
  const iconClassName = variant === "large" ? "size-8" : "size-3.5";

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!isQuizShortcut(e, QUIZ_SHORTCUTS.playAudio)) return;
      e.preventDefault();
      e.stopPropagation();
      toggle();
    }

    window.addEventListener("keydown", onKeyDown, { capture: true });
    return () => {
      window.removeEventListener("keydown", onKeyDown, { capture: true });
    };
  }, [toggle]);

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    onClick?.(e);
    toggle();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={
        playing
          ? `Pauzeer audio (${shortcutLabel})`
          : `Speel audio af (${shortcutLabel})`
      }
      title={
        playing
          ? `Pauzeer (${shortcutLabel})`
          : `Speel audio af (${shortcutLabel})`
      }
      className={className ?? variantClasses[variant]}
    >
      {playing ? (
        <PauseIcon className={iconClassName} />
      ) : (
        <PlayIcon className={iconClassName} />
      )}
      {variant === "large" && (
        <span className="text-[10px] font-normal text-muted-foreground/70">
          {shortcutLabel}
        </span>
      )}
    </button>
  );
}
