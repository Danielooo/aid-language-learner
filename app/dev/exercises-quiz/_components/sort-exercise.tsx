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

import { ExerciseAudioButton } from "@/app/dev/exercises-quiz/_components/exercise-audio-button";
import {
  QUIZ_SHORTCUTS,
  formatQuizShortcut,
} from "@/lib/keyboard/quiz-shortcuts";
import {
  createInitialSortState,
  getSortExerciseData,
  placeWordInSlot,
  returnWordToPool,
} from "@/lib/quiz/sort-config";
import {
  evaluateSortOrder,
  getWordsFromSlots,
  isAllSlotsFilled,
  matchWordsByPrefix,
} from "@/lib/quiz/sort-validate";

import type { SortExerciseState, SortPoolItem } from "@/lib/quiz/sort-config";
import type { ExerciseQuizItem } from "@/app/api/dev/exercise-generator-quiz/route";
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
};

export function SortExercise({
  item,
  direction,
  feedback,
  onSubmit,
  onSkip,
  onNext,
}: SortExerciseProps) {
  const exerciseData = useMemo(
    () => getSortExerciseData(item, direction),
    [item, direction],
  );

  const [sortState, setSortState] = useState<SortExerciseState>(() =>
    createInitialSortState(exerciseData.tokens),
  );
  const [prefixError, setPrefixError] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const poolById = useMemo(
    () => new Map(sortState.allItems.map((p) => [p.id, p])),
    [sortState.allItems],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  useEffect(() => {
    setSortState(createInitialSortState(exerciseData.tokens));
    setPrefixError(false);
    setActiveDragId(null);
  }, [item.id, exerciseData.tokens]);

  useEffect(() => {
    if (!feedback) {
      inputRef.current?.focus();
    }
  }, [feedback, item.id, sortState.activeSlotIndex]);

  const ambiguousMatches = useMemo(() => {
    if (sortState.typePrefix.trim().length === 0) return [];
    return matchWordsByPrefix(sortState.typePrefix, sortState.pool);
  }, [sortState.typePrefix, sortState.pool]);

  useEffect(() => {
    if (feedback || sortState.typePrefix.length === 0) {
      setPrefixError(false);
      return;
    }

    const matches = matchWordsByPrefix(sortState.typePrefix, sortState.pool);
    if (matches.length === 0) {
      setPrefixError(true);
      return;
    }

    setPrefixError(false);
    if (matches.length === 1) {
      setSortState((prev) =>
        placeWordInSlot(prev, matches[0]!.id, prev.activeSlotIndex),
      );
    }
  }, [sortState.typePrefix, sortState.pool, sortState.activeSlotIndex, feedback]);

  function handleTypePrefixChange(value: string) {
    setSortState((prev) => ({ ...prev, typePrefix: value }));
  }

  function handlePrefixKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter" || feedback) return;
    e.preventDefault();
    const matches = matchWordsByPrefix(sortState.typePrefix, sortState.pool);
    if (matches.length === 1) {
      setSortState((prev) =>
        placeWordInSlot(prev, matches[0]!.id, prev.activeSlotIndex),
      );
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

    const userWords = getWordsFromSlots(sortState.slots, poolById);
    const result = evaluateSortOrder(
      userWords,
      exerciseData.correctSequences,
      exerciseData.primaryAnswer,
    );
    onSubmit(userWords.join(" "), result);
  }

  const activeDragItem = activeDragId
    ? poolById.get(activeDragId)
    : undefined;
  const allFilled = isAllSlotsFilled(sortState.slots);
  const disabled = feedback !== null;

  return (
    <form onSubmit={handleFormSubmit} className="space-y-5">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {exerciseData.promptLabel}
          </p>
          {item.topic && (
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {item.topic}
            </span>
          )}
          {item.mp3_url && <ExerciseAudioButton mp3Url={item.mp3_url} />}
        </div>
        <p className="text-xl font-medium leading-snug text-foreground">
          {exerciseData.prompt}
        </p>
        <p className="font-mono text-[10px] text-muted-foreground/70">
          #{item.id.slice(0, 8)}
        </p>
      </div>

      <p className="text-xs text-muted-foreground">
        Zet de woorden ({exerciseData.answerLabel}) in de juiste volgorde —
        sleep of typ de eerste letter(s) per positie.
      </p>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="space-y-4">
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
                  disabled={disabled}
                  onClick={() => handleSlotClick(index)}
                />
              ))}
            </div>
          </div>

          <WordPool
            items={sortState.pool}
            disabled={disabled}
          />
        </div>

        <DragOverlay>
          {activeDragItem ? (
            <WordChip item={activeDragItem} isDragging overlay />
          ) : null}
        </DragOverlay>
      </DndContext>

      {!disabled && (
        <label htmlFor="sort-prefix" className="flex flex-col gap-1.5">
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
            disabled={sortState.pool.length === 0}
            placeholder="Eerste letter(s) van het woord..."
            autoComplete="off"
            className={clsx(
              "w-full rounded-md border bg-background px-3 py-2 text-sm",
              prefixError
                ? "border-destructive ring-1 ring-destructive/40"
                : "border-input",
            )}
          />
          {ambiguousMatches.length > 1 && (
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

      {feedback && <FeedbackBanner feedback={feedback} />}

      <div className="flex flex-wrap gap-2">
        {!feedback && (
          <>
            <button
              type="submit"
              disabled={!allFilled}
              className="inline-flex h-10 cursor-pointer items-center justify-center rounded-md bg-accent px-4 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Controleren
            </button>
            <button
              type="button"
              onClick={onSkip}
              className="inline-flex h-10 cursor-pointer items-center justify-center rounded-md border border-input bg-background px-4 text-sm hover:bg-muted"
            >
              Skip ({formatQuizShortcut(QUIZ_SHORTCUTS.skip)})
            </button>
          </>
        )}
        {feedback && (
          <button
            type="submit"
            className="inline-flex h-10 cursor-pointer items-center justify-center rounded-md bg-accent px-4 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90"
          >
            Volgende oefening (Enter)
          </button>
        )}
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
      className={clsx(
        "rounded-lg border border-dashed transition-colors",
        item
          ? "inline-flex w-fit items-center justify-center p-1"
          : "flex min-h-10 min-w-[4.5rem] items-center justify-center px-2 py-1.5",
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
  disabled,
}: {
  items: SortPoolItem[];
  disabled: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: "pool",
    disabled,
  });

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Woorden
      </p>
      <div
        ref={setNodeRef}
        className={clsx(
          "flex min-h-12 flex-wrap gap-2 rounded-lg border border-border bg-muted/20 p-3",
          isOver && "border-accent bg-accent/5",
        )}
      >
        {items.length === 0 ? (
          <span className="text-xs text-muted-foreground">
            Alle woorden geplaatst
          </span>
        ) : (
          items.map((item) => (
            <DraggableWordChip key={item.id} item={item} disabled={disabled} />
          ))
        )}
      </div>
    </div>
  );
}

function DraggableWordChip({
  item,
  disabled,
}: {
  item: SortPoolItem;
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
      className="inline-flex"
      {...listeners}
      {...attributes}
    >
      <WordChip item={item} isDragging={isDragging} />
    </div>
  );
}

function WordChip({
  item,
  isDragging,
  overlay,
}: {
  item: SortPoolItem;
  isDragging?: boolean;
  overlay?: boolean;
}) {
  return (
    <span
      className={clsx(
        "inline-flex cursor-grab items-center rounded-md border border-border bg-card px-2.5 py-1 text-sm font-medium text-foreground shadow-sm active:cursor-grabbing",
        isDragging && "opacity-40",
        overlay && "cursor-grabbing shadow-md ring-2 ring-accent/40",
      )}
    >
      {item.word}
    </span>
  );
}

function FeedbackBanner({ feedback }: { feedback: SortFeedback }) {
  if (feedback.isCorrect) {
    return (
      <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">
        <p className="font-medium">Goed!</p>
        <p className="mt-1 text-xs opacity-80">
          Antwoord:{" "}
          <span className="font-medium">{feedback.correctAnswer}</span>
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
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
    <div className="space-y-3">
      <div className="h-3 w-16 animate-pulse rounded bg-muted" />
      <div className="h-6 w-3/4 animate-pulse rounded bg-muted" />
      <div className="h-12 w-full animate-pulse rounded bg-muted" />
      <div className="h-16 w-full animate-pulse rounded bg-muted" />
    </div>
  );
}
