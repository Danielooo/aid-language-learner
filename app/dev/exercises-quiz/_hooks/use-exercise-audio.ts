"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { prefersReducedMotion } from "@/app/_components/features/chat/prefers-reduced-motion";

type UseExerciseAudioOptions = {
  autoplay?: boolean;
};

/**
 * Beheert één HTMLAudioElement per mp3Url: lifecycle, play/pause en
 * optionele autoplay (uit bij prefers-reduced-motion).
 */
export function useExerciseAudio(
  mp3Url: string,
  options: UseExerciseAudioOptions = {},
) {
  const { autoplay = false } = options;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  const pause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    setPlaying(false);
  }, []);

  const play = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return Promise.resolve();

    return audio
      .play()
      .then(() => {
        setPlaying(true);
      })
      .catch(() => {
        setPlaying(false);
      });
  }, []);

  const toggle = useCallback(() => {
    if (playing) {
      pause();
      return;
    }
    void play();
  }, [playing, pause, play]);

  useEffect(() => {
    const audio = new Audio(mp3Url);
    audioRef.current = audio;

    const onEnded = () => setPlaying(false);
    const onPause = () => setPlaying(false);
    const onPlay = () => setPlaying(true);

    audio.addEventListener("ended", onEnded);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("play", onPlay);

    if (autoplay && !prefersReducedMotion()) {
      void audio.play().catch(() => {
        setPlaying(false);
      });
    }

    return () => {
      audio.pause();
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("play", onPlay);
      audioRef.current = null;
      setPlaying(false);
    };
  }, [mp3Url, autoplay]);

  return { playing, toggle, play, pause };
}
