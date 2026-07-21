"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import clsx from "clsx";
import { useEffect, useMemo, useRef, useState } from "react";

import { ExerciseAudioAttribution } from "@/app/_components/features/quiz/exercise-audio-attribution";
import { ExerciseAudioControls } from "@/app/_components/features/quiz/exercise-audio-controls";
import { useSortWordPlacementAnimation } from "@/app/_components/features/quiz/hooks/use-sort-word-placement-animation";
import { TYPING_SHORTCUTS } from "@/lib/keyboard/quiz-shortcuts";
import {
  createInitialSortState,
  getSortExerciseData,
  placeWordInSlot,
  returnWordToPool,
} from "@/lib/quiz/sort-config";
import {
  evaluateSortOrder,
  findExactPrefixMatches,
  getPrefixMatchLength,
  getWordsFromSlots,
  isAllSlotsFilled,
  isExactPrefixMatch,
  matchWordsByPrefix,
} from "@/lib/quiz/sort-validate";

import { FlashcardActionButton } from "./flashcard-action-button";

import type { SortExerciseState, SortPoolItem } from "@/lib/quiz/sort-config";
import type { ExerciseQuizItem } from "@/types/quiz";
import type { TranslationDirection } from "@/lib/quiz/typing-config";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";

export type SortFeedback = {
  isCorrect: boolean;
  correctAnswer: string;
};

type SortExerciseProps = {
  item: ExerciseQuizItem;
  direction: TranslationDirection;
  feedback: SortFeedback | null;
  onSubmit: (userAnswer: string, feedback: SortFeedback) => void;
  onSkip: () => void;
  onNext: () => void;
  onPrevious?: () => void;
  canGoPrevious?: boolean;
  /** Uit bij leave-dialog zodat Enter = blijven oefenen. */
  shortcutsEnabled?: boolean;
};

export function SortExercise({
  item,
  direction,
  feedback,
  onSubmit,
  onSkip,
  onNext,
  onPrevious,
  canGoPrevious = false,
  shortcutsEnabled = true,
}: SortExerciseProps) {
  const exerciseData = useMemo(
    () => getSortExerciseData(item, direction),
    [item, direction],
  );

  // Reset per oefening loopt via remount: de deck rendert dit component
  // met key={item.id}, dus initializers volstaan.
  const [sortState, setSortState] = useState<SortExerciseState>(() =>
    createInitialSortState(exerciseData.tokens),
  );
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sortAreaRef = useRef<HTMLDivElement>(null);

  const { placeWordWithAnimation, isAnimating } =
    useSortWordPlacementAnimation({
      containerRef: sortAreaRef,
      setSortState,
    });

  const poolById = useMemo(
    () => new Map(sortState.allItems.map((p) => [p.id, p])),
    [sortState.allItems],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  useEffect(() => {
    if (!feedback) {
      inputRef.current?.focus();
    }
  }, [feedback, item.id, sortState.activeSlotIndex]);

  const ambiguousMatches = useMemo(() => {
    if (sortState.typePrefix.trim().length === 0) return [];
    return matchWordsByPrefix(sortState.typePrefix, sortState.pool);
  }, [sortState.typePrefix, sortState.pool]);

  const exactMatches = useMemo(() => {
    if (sortState.typePrefix.trim().length === 0) return [];
    return findExactPrefixMatches(sortState.typePrefix, sortState.pool);
  }, [sortState.typePrefix, sortState.pool]);

  // Afgeleide waarde i.p.v. state: geen setState-cascade in een effect.
  const prefixError = useMemo(() => {
    if (feedback || sortState.typePrefix.length === 0) return false;
    return matchWordsByPrefix(sortState.typePrefix, sortState.pool).length === 0;
  }, [feedback, sortState.typePrefix, sortState.pool]);

  // Autoplaatsing blijft een side-effect: het start een animatie en muteert
  // daarna de sort-state.
  useEffect(() => {
    if (feedback || sortState.typePrefix.length === 0) return;

    const matches = matchWordsByPrefix(sortState.typePrefix, sortState.pool);
    if (matches.length === 1 && !isAnimating) {
      placeWordWithAnimation(matches[0]!.id, sortState.activeSlotIndex);
    }
  }, [
    sortState.typePrefix,
    sortState.pool,
    sortState.activeSlotIndex,
    feedback,
    placeWordWithAnimation,
    isAnimating,
  ]);

  function handleTypePrefixChange(value: string) {
    setSortState((prev) => ({ ...prev, typePrefix: value }));
  }

  function handleCheck() {
    if (feedback) return;
    if (!isAllSlotsFilled(sortState.slots)) return;
    const userWords = getWordsFromSlots(sortState.slots, poolById);
    const result = evaluateSortOrder(
      userWords,
      exerciseData.correctSequences,
      exerciseData.primaryAnswer,
    );
    onSubmit(userWords.join(" "), result);
  }

  function handlePrefixKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter" || feedback || isAnimating) return;

    // Alle slots vol → Enter = controleren (niet proberen te plaatsen)
    if (isAllSlotsFilled(sortState.slots)) {
      e.preventDefault();
      handleCheck();
      return;
    }

    e.preventDefault();

    const matches = matchWordsByPrefix(sortState.typePrefix, sortState.pool);
    const exact = findExactPrefixMatches(sortState.typePrefix, sortState.pool);

    if (exact.length === 1) {
      placeWordWithAnimation(exact[0]!.id, sortState.activeSlotIndex);
      return;
    }
    if (matches.length === 1) {
      placeWordWithAnimation(matches[0]!.id, sortState.activeSlotIndex);
    }
  }

  function handleDragStart(event: DragStartEvent) {
    if (feedback) return;
    setActiveDragId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDragId(null);
    if (feedback) return;

    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    if (overId === "pool") {
      setSortState((prev) => returnWordToPool(prev, activeId));
      return;
    }

    if (overId.startsWith("slot-")) {
      const slotIndex = Number.parseInt(overId.replace("slot-", ""), 10);
      if (!Number.isNaN(slotIndex)) {
        setSortState((prev) => placeWordInSlot(prev, activeId, slotIndex));
      }
    }
  }

  function handleSlotClick(index: number) {
    if (feedback) return;
    setSortState((prev) => ({ ...prev, activeSlotIndex: index, typePrefix: "" }));
    inputRef.current?.focus();
  }

  function handleFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (feedback) {
      onNext();
      return;
    }
    handleCheck();
  }

  const activeDragItem = activeDragId
    ? poolById.get(activeDragId)
    : undefined;
  const allFilled = isAllSlotsFilled(sortState.slots);
  const hasFeedback = feedback !== null;
  const showPrevious = Boolean(onPrevious);

  // Enter: controleren als alles geplaatst is, of volgende na feedback —
  // ook als focus niet (meer) in het prefix-veld zit.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!shortcutsEnabled) return;
      if (e.key !== "Enter" || e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) {
        return;
      }
      if (isAnimating) return;

      if (feedback) {
        e.preventDefault();
        e.stopPropagation();
        onNext();
        return;
      }

      if (!isAllSlotsFilled(sortState.slots)) return;

      e.preventDefault();
      e.stopPropagation();
      const userWords = getWordsFromSlots(sortState.slots, poolById);
      const result = evaluateSortOrder(
        userWords,
        exerciseData.correctSequences,
        exerciseData.primaryAnswer,
      );
      onSubmit(userWords.join(" "), result);
    }

    window.addEventListener("keydown", onKeyDown, { capture: true });
    return () =>
      window.removeEventListener("keydown", onKeyDown, { capture: true });
  }, [
    shortcutsEnabled,
    feedback,
    isAnimating,
    sortState.slots,
    poolById,
    exerciseData.correctSequences,
    exerciseData.primaryAnswer,
    onSubmit,
    onNext,
  ]);

  return (
    <form onSubmit={handleFormSubmit} className="mx-auto w-full max-w-lg">
      {/* Prompt-kaart — zelfde taal als flashcard / typen */}
      <div className="relative flex min-h-64 flex-col items-center justify-center rounded-2xl border border-accent/25 bg-gradient-to-br from-accent/15 via-accent/5 to-card p-6 text-center shadow-lg shadow-accent/10 sm:min-h-72">
        <div className="flex w-full flex-col items-center gap-3">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {exerciseData.promptLabel}
          </span>
          <p className="text-2xl font-semibold leading-snug text-foreground sm:text-3xl">
            {exerciseData.prompt}
          </p>
          {item.mp3_url && (
            <ExerciseAudioControls mp3Url={item.mp3_url} variant="large" />
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
          Sleep of typ de woorden ({exerciseData.answerLabel}) in volgorde
        </p>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div ref={sortAreaRef} className="mt-4 space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Volgorde
            </p>
            <div className="flex flex-wrap gap-2">
              {sortState.slots.map((slotItemId, index) => (
                <SortSlot
                  key={`slot-${index}`}
                  index={index}
                  item={slotItemId ? poolById.get(slotItemId) : undefined}
                  isActive={sortState.activeSlotIndex === index}
                  disabled={hasFeedback}
                  onClick={() => handleSlotClick(index)}
                />
              ))}
            </div>
          </div>

          <WordPool
            items={sortState.pool}
            typePrefix={sortState.typePrefix}
            disabled={hasFeedback}
          />
        </div>

        <DragOverlay>
          {activeDragItem ? (
            <WordChip item={activeDragItem} isDragging overlay />
          ) : null}
        </DragOverlay>
      </DndContext>

      {!hasFeedback && !allFilled && (
        <label htmlFor="sort-prefix" className="mt-4 flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Typ voor positie {sortState.activeSlotIndex + 1}
          </span>
          <input
            id="sort-prefix"
            ref={inputRef}
            type="text"
            value={sortState.typePrefix}
            onChange={(e) => handleTypePrefixChange(e.target.value)}
            onKeyDown={handlePrefixKeyDown}
            disabled={sortState.pool.length === 0 || isAnimating}
            placeholder="Eerste letter(s) van het woord…"
            autoComplete="off"
            className={clsx(
              "w-full rounded-xl border bg-background px-4 py-3 text-sm shadow-sm disabled:opacity-70",
              prefixError
                ? "border-destructive ring-1 ring-destructive/40"
                : "border-input",
            )}
          />
          {ambiguousMatches.length > 1 && exactMatches.length === 1 && (
            <p className="text-xs text-muted-foreground">
              Druk Enter om «{exactMatches[0]!.word}» te kiezen
            </p>
          )}
          {ambiguousMatches.length > 1 && exactMatches.length !== 1 && (
            <p className="text-xs text-muted-foreground">
              Meer letters typen — kandidaten:{" "}
              {ambiguousMatches.map((m) => m.word).join(", ")}
            </p>
          )}
          {prefixError && (
            <p className="text-xs text-destructive">
              Geen woord in de pool begint zo.
            </p>
          )}
        </label>
      )}

      {/* Vaste feedback-hoogte zodat knoppen niet omlaag springen */}
      <div className="mt-4 min-h-[4.75rem]">
        {feedback ? <FeedbackBanner feedback={feedback} /> : null}
      </div>

      {showPrevious ? (
        <div className="mt-4">
          <FlashcardActionButton
            label="Vorige oefening"
            onClick={() => onPrevious?.()}
            disabled={!canGoPrevious}
          />
        </div>
      ) : null}

      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {hasFeedback ? (
          <FlashcardActionButton
            label="Volgende oefening"
            shortcut="Enter"
            onClick={onNext}
            variant="accent"
          />
        ) : (
          <FlashcardActionButton
            label="Controleren"
            shortcut="Enter"
            onClick={handleCheck}
            disabled={!allFilled}
            variant="accent"
          />
        )}
        <FlashcardActionButton
          label="Overslaan"
          shortcut={TYPING_SHORTCUTS.skip}
          onClick={onSkip}
          disabled={hasFeedback}
        />
      </div>
    </form>
  );
}

function SortSlot({
  index,
  item,
  isActive,
  disabled,
  onClick,
}: {
  index: number;
  item?: SortPoolItem;
  isActive: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `slot-${index}`,
    disabled,
  });

  return (
    <div
      ref={setNodeRef}
      data-sort-slot-index={index}
      className={clsx(
        "rounded-xl border border-dashed transition-colors",
        item
          ? "inline-flex w-fit items-center justify-center p-1"
          : "flex min-h-12 min-w-[4.5rem] items-center justify-center px-2 py-1.5 sm:min-h-10",
        isActive && !disabled && "border-accent ring-1 ring-accent/30",
        isOver && "border-accent bg-accent/10",
        !isActive && "border-border bg-muted/20",
      )}
    >
      {item ? (
        <DraggableWordChip item={item} disabled={disabled} />
      ) : (
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          className="flex h-full w-full cursor-pointer items-center justify-center disabled:cursor-default"
        >
          <span className="text-xs text-muted-foreground">{index + 1}</span>
        </button>
      )}
    </div>
  );
}

function WordPool({
  items,
  typePrefix,
  disabled,
}: {
  items: SortPoolItem[];
  typePrefix: string;
  disabled: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: "pool",
    disabled,
  });

  const prefixMatches = useMemo(() => {
    if (typePrefix.trim().length === 0) return new Set<string>();
    return new Set(
      matchWordsByPrefix(typePrefix, items).map((item) => item.id),
    );
  }, [typePrefix, items]);

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Woorden
      </p>
      <div
        ref={setNodeRef}
        className={clsx(
          "flex min-h-12 flex-wrap gap-2 rounded-xl border border-border/60 bg-muted/20 p-3",
          isOver && "border-accent bg-accent/5",
        )}
      >
        {items.length === 0 ? (
          <span className="text-xs text-muted-foreground">
            Alle woorden geplaatst
          </span>
        ) : (
          items.map((item) => (
            <DraggableWordChip
              key={item.id}
              item={item}
              typePrefix={typePrefix}
              isPrefixMatch={prefixMatches.has(item.id)}
              isExactMatch={isExactPrefixMatch(item.word, typePrefix)}
              disabled={disabled}
            />
          ))
        )}
      </div>
    </div>
  );
}

function DraggableWordChip({
  item,
  typePrefix = "",
  isPrefixMatch = false,
  isExactMatch = false,
  disabled,
}: {
  item: SortPoolItem;
  typePrefix?: string;
  isPrefixMatch?: boolean;
  isExactMatch?: boolean;
  disabled: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: item.id,
      disabled,
    });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-sort-pool-word-id={item.id}
      className="inline-flex"
      {...listeners}
      {...attributes}
    >
      <WordChip
        item={item}
        typePrefix={typePrefix}
        isPrefixMatch={isPrefixMatch}
        isExactMatch={isExactMatch}
        isDragging={isDragging}
      />
    </div>
  );
}

function WordChip({
  item,
  typePrefix = "",
  isPrefixMatch = false,
  isExactMatch = false,
  isDragging,
  overlay,
}: {
  item: SortPoolItem;
  typePrefix?: string;
  isPrefixMatch?: boolean;
  isExactMatch?: boolean;
  isDragging?: boolean;
  overlay?: boolean;
}) {
  return (
    <span
      data-sort-word-chip
      className={clsx(
        // Ruimere padding op touch-schermen: vingervriendelijke sleepdoelen.
        "inline-flex min-h-10 cursor-grab touch-manipulation items-center rounded-xl border bg-card px-3 py-1.5 text-sm font-medium text-foreground shadow-sm active:cursor-grabbing sm:min-h-8 sm:px-2.5 sm:py-1",
        isExactMatch && isPrefixMatch
          ? "border-accent ring-1 ring-accent/30"
          : "border-border",
        isDragging && "opacity-40",
        overlay && "cursor-grabbing shadow-md ring-2 ring-accent/40",
      )}
    >
      <WordChipLabel word={item.word} prefix={isPrefixMatch ? typePrefix : ""} />
    </span>
  );
}

function WordChipLabel({ word, prefix }: { word: string; prefix: string }) {
  const matchLength = getPrefixMatchLength(word, prefix);
  if (matchLength === 0) return <>{word}</>;

  return (
    <>
      <span className="font-bold">{word.slice(0, matchLength)}</span>
      {word.slice(matchLength)}
    </>
  );
}

function FeedbackBanner({ feedback }: { feedback: SortFeedback }) {
  if (feedback.isCorrect) {
    return (
      <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-center text-sm text-emerald-700 dark:text-emerald-300">
        <p className="font-medium">Goed!</p>
        <p className="mt-1 text-xs opacity-80">
          Antwoord:{" "}
          <span className="font-medium">{feedback.correctAnswer}</span>
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-center text-sm text-destructive">
      <p className="font-medium">Niet goed.</p>
      <p className="mt-1 text-xs">
        Geldig antwoord:{" "}
        <span className="font-medium">{feedback.correctAnswer}</span>
      </p>
    </div>
  );
}

export function SortExerciseSkeleton() {
  return (
    <div className="mx-auto w-full max-w-lg space-y-4">
      <div className="h-64 animate-pulse rounded-2xl bg-muted/60 sm:h-72" />
      <div className="h-12 animate-pulse rounded-xl bg-muted/60" />
      <div className="h-16 animate-pulse rounded-xl bg-muted/60" />
      <div className="h-[4.75rem]" />
      <div className="grid grid-cols-2 gap-2">
        <div className="h-12 animate-pulse rounded-xl bg-muted/60" />
        <div className="h-12 animate-pulse rounded-xl bg-muted/60" />
      </div>
    </div>
  );
}
