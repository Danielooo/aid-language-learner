"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type ExerciseAudioButtonProps = {
  mp3Url: string;
};

export function ExerciseAudioButton({ mp3Url }: ExerciseAudioButtonProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const audio = new Audio(mp3Url);
    audioRef.current = audio;

    const onEnded = () => setPlaying(false);
    const onPause = () => setPlaying(false);

    audio.addEventListener("ended", onEnded);
    audio.addEventListener("pause", onPause);

    return () => {
      audio.pause();
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("pause", onPause);
      audioRef.current = null;
    };
  }, [mp3Url]);

  const handleToggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }

    void audio.play().then(() => setPlaying(true)).catch(() => {
      setPlaying(false);
    });
  }, [playing]);

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={playing ? "Pauzeer audio" : "Speel audio af"}
      title={playing ? "Pauzeer" : "Speel audio af"}
      className="shrink-0 rounded border border-border bg-background px-2 py-1 text-xs hover:bg-accent hover:text-accent-foreground"
    >
      {playing ? "⏸" : "▶"}
    </button>
  );
}
