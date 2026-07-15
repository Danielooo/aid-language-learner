"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useEffect, useRef } from "react";

import {
  QUIZ_SHORTCUTS,
  formatQuizShortcut,
} from "@/lib/keyboard/quiz-shortcuts";

import { ExerciseAudioAttribution } from "./exercise-audio-attribution";
import { ExerciseAudioControls } from "./exercise-audio-controls";
import { FlashcardActionButton } from "./flashcard-action-button";

import type { ExerciseQuizItem } from "@/types/quiz";

gsap.registerPlugin(useGSAP);

export type FlashcardPhase = "front" | "back";

type FlashcardProps = {
  item: ExerciseQuizItem;
  phase: FlashcardPhase;
  onFlip: () => void;
  onGradeCorrect: () => void;
  onGradeIncorrect: () => void;
  onSkip: () => void;
  animating?: boolean;
};

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function Flashcard({
  item,
  phase,
  onFlip,
  onGradeCorrect,
  onGradeIncorrect,
  onSkip,
  animating = false,
}: FlashcardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!cardRef.current) return;
      if (prefersReducedMotion()) {
        gsap.set(cardRef.current, {
          opacity: 1,
          y: 0,
          scale: 1,
          rotationX: 0,
        });
        return;
      }
      gsap.fromTo(
        cardRef.current,
        { opacity: 0, y: 24, scale: 0.96, rotationX: -4 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          rotationX: 0,
          duration: 0.45,
          ease: "power2.out",
        },
      );
    },
    { scope: cardRef, dependencies: [item.id], revertOnUpdate: true },
  );

  useEffect(() => {
    const inner = innerRef.current;
    if (!inner) return;

    const rotation = phase === "back" ? 180 : 0;
    if (prefersReducedMotion()) {
      gsap.set(inner, { rotateX: rotation });
      return;
    }

    const tween = gsap.to(inner, {
      rotateX: rotation,
      duration: 0.55,
      ease: "power2.inOut",
    });
    return () => {
      tween.kill();
    };
  }, [phase]);

  function handleCardPointerDown() {
    if (animating || !cardRef.current || prefersReducedMotion()) return;
    gsap.to(cardRef.current, { scale: 0.98, duration: 0.1 });
  }

  function handleCardPointerUp() {
    if (animating || !cardRef.current || prefersReducedMotion()) return;
    gsap.to(cardRef.current, { scale: 1, duration: 0.15, ease: "power2.out" });
  }

  function handleCardClick() {
    if (animating) return;
    onFlip();
  }

  const isBack = phase === "back";

  return (
    <div className="mx-auto w-full max-w-lg">
      <div
        ref={cardRef}
        data-flashcard-root
        role="button"
        aria-label={isBack ? "Kaart terugdraaien" : "Kaart omdraaien"}
        onClick={handleCardClick}
        onPointerDown={handleCardPointerDown}
        onPointerUp={handleCardPointerUp}
        onPointerLeave={handleCardPointerUp}
        className={`relative h-64 cursor-pointer [perspective:1000px] sm:h-72 ${
          animating ? "pointer-events-none" : ""
        }`}
        style={{ perspective: "1000px" }}
      >
        <div
          ref={innerRef}
          className="relative h-full w-full [transform-style:preserve-3d]"
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* Voorkant */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-accent/25 bg-gradient-to-br from-accent/15 via-accent/5 to-card p-6 text-center shadow-lg shadow-accent/10 [backface-visibility:hidden]"
            style={{ backfaceVisibility: "hidden" }}
          >
            <div className="flex w-full flex-col items-center gap-3">
              {item.topic && (
                <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent">
                  {item.topic}
                </span>
              )}
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Spaans
              </span>
              <p className="text-2xl font-semibold leading-snug text-foreground sm:text-3xl">
                {item.source_text}
              </p>
              {item.mp3_url && (
                <ExerciseAudioControls
                  mp3Url={item.mp3_url}
                  variant="large"
                />
              )}
              {item.mp3_url && (
                <ExerciseAudioAttribution
                  author={item.tatoeba_author}
                  license={item.tatoeba_license}
                  attributionUrl={item.tatoeba_attribution_url}
                />
              )}
            </div>
            <p className="absolute bottom-4 text-[11px] text-muted-foreground/80">
              Klik of druk Spatie om te draaien
            </p>
          </div>

          {/* Achterkant */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-card to-muted/30 p-6 text-center shadow-lg shadow-emerald-500/10 [backface-visibility:hidden] [transform:rotateX(180deg)]"
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateX(180deg)",
            }}
          >
            <div className="flex flex-col items-center gap-3">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Nederlands
              </span>
              <p className="text-2xl font-semibold leading-snug text-foreground sm:text-3xl">
                {item.target_text}
              </p>
            </div>
            <p className="absolute bottom-4 text-[11px] text-muted-foreground/80">
              Wist je het? Geef jezelf een score
            </p>
          </div>
        </div>
      </div>

      <div
        className={`mt-4 grid gap-2 ${isBack ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2"}`}
      >
        {!isBack && (
          <>
            <FlashcardActionButton
              label="Omdraaien"
              shortcut={["Spatie", "Enter"]}
              onClick={onFlip}
              disabled={animating}
              variant="accent"
            />
            <FlashcardActionButton
              label="Overslaan"
              shortcut={formatQuizShortcut(QUIZ_SHORTCUTS.skip)}
              onClick={onSkip}
              disabled={animating}
            />
          </>
        )}
        {isBack && (
          <>
            <FlashcardActionButton
              label="Goed"
              shortcut={formatQuizShortcut(QUIZ_SHORTCUTS.gradeCorrect)}
              onClick={onGradeCorrect}
              disabled={animating}
              variant="success"
            />
            <FlashcardActionButton
              label="Fout"
              shortcut={formatQuizShortcut(QUIZ_SHORTCUTS.gradeIncorrect)}
              onClick={onGradeIncorrect}
              disabled={animating}
              variant="danger"
            />
            <FlashcardActionButton
              label="Terug"
              shortcut={["Spatie", "Enter"]}
              onClick={onFlip}
              disabled={animating}
            />
            <FlashcardActionButton
              label="Overslaan"
              shortcut={formatQuizShortcut(QUIZ_SHORTCUTS.skip)}
              onClick={onSkip}
              disabled={animating}
            />
          </>
        )}
      </div>
    </div>
  );
}

/** Exit-animatie na beoordeling; retourneert een promise die resolved na de tween. */
export function animateCardExit(
  cardEl: HTMLElement | null,
  isCorrect: boolean,
): Promise<void> {
  if (!cardEl) return Promise.resolve();

  if (prefersReducedMotion()) {
    gsap.set(cardEl, { opacity: 0 });
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    gsap.to(cardEl, {
      opacity: 0,
      y: isCorrect ? -40 : 40,
      duration: 0.3,
      ease: "power2.in",
      onComplete: resolve,
    });
  });
}
