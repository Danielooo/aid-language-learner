import { getPromptAndAnswer } from "@/lib/quiz/typing-config";
import { shuffleUntilDifferent } from "@/lib/quiz/shuffle";
import { tokenizeSentence } from "@/lib/quiz/tokenize";

import type { ExerciseQuizItem } from "@/app/api/dev/exercise-generator-quiz/route";
import type { TranslationDirection } from "@/lib/quiz/typing-config";

export const MIN_SORT_WORDS = 4;
export const MAX_SORT_FETCH_RETRIES = 8;

export const SORT_DIRECTION_KEY = "aid:exercises-quiz-sorteren:direction";
export const SORT_TOPIC_KEY = "aid:exercises-quiz-sorteren:topic";

export type SortPoolItem = {
  id: string;
  word: string;
};

export type SortExerciseData = {
  prompt: string;
  promptLabel: string;
  answerLabel: string;
  primaryAnswer: string;
  correctSequences: string[][];
  tokens: string[];
};

export function getSortExerciseData(
  item: ExerciseQuizItem,
  direction: TranslationDirection,
): SortExerciseData {
  const { prompt, promptLabel, answerLabel, acceptedAnswers, primaryAnswer } =
    getPromptAndAnswer(item, direction);

  const correctSequences = acceptedAnswers.map((answer) =>
    tokenizeSentence(answer),
  );
  const tokens = tokenizeSentence(primaryAnswer);

  return {
    prompt,
    promptLabel,
    answerLabel,
    primaryAnswer,
    correctSequences,
    tokens,
  };
}

export function isSortExerciseEligible(
  data: SortExerciseData,
): boolean {
  return data.tokens.length >= MIN_SORT_WORDS;
}

/** Maakt pool-items met unieke ids voor duplicaat-woorden. */
export function createPoolFromTokens(tokens: string[]): SortPoolItem[] {
  return tokens.map((word, index) => ({
    id: `word-${index}`,
    word,
  }));
}

/**
 * Shuffle pool zodat volgorde afwijkt van de originele token-volgorde.
 */
export function shufflePool(pool: SortPoolItem[]): SortPoolItem[] {
  return shuffleUntilDifferent(pool, pool, (a, b) => a.id === b.id);
}

export type SortExerciseState = {
  slots: (string | null)[];
  pool: SortPoolItem[];
  allItems: SortPoolItem[];
  activeSlotIndex: number;
  typePrefix: string;
};

export function createInitialSortState(tokens: string[]): SortExerciseState {
  const allItems = createPoolFromTokens(tokens);
  return {
    slots: Array.from<string | null>({ length: tokens.length }).fill(null),
    pool: shufflePool([...allItems]),
    allItems,
    activeSlotIndex: 0,
    typePrefix: "",
  };
}

export function placeWordInSlot(
  state: SortExerciseState,
  itemId: string,
  slotIndex: number,
): SortExerciseState {
  const { slots, pool, allItems } = state;
  const clampedIndex = Math.max(0, Math.min(slotIndex, slots.length - 1));
  const displacedId = slots[clampedIndex];

  const itemInPool = pool.some((p) => p.id === itemId);
  const itemInSlot = slots.some((id) => id === itemId);
  if (!itemInPool && !itemInSlot) return state;

  const item = allItems.find((p) => p.id === itemId);
  if (!item) return state;

  const nextSlots = [...slots];
  nextSlots[clampedIndex] = itemId;

  if (itemInSlot) {
    const fromIndex = slots.indexOf(itemId);
    if (fromIndex !== -1 && fromIndex !== clampedIndex) {
      nextSlots[fromIndex] = displacedId;
    }
  }

  let nextPool = pool.filter((p) => p.id !== itemId);
  if (displacedId && displacedId !== itemId) {
    const displaced = allItems.find((p) => p.id === displacedId);
    if (displaced && !nextPool.some((p) => p.id === displacedId)) {
      nextPool = [...nextPool, displaced];
    }
  }

  const nextActive = getFirstEmptySlotIndex(nextSlots);

  return {
    ...state,
    slots: nextSlots,
    pool: nextPool,
    activeSlotIndex: nextActive,
    typePrefix: "",
  };
}

export function returnWordToPool(
  state: SortExerciseState,
  itemId: string,
): SortExerciseState {
  const slotIndex = state.slots.indexOf(itemId);
  if (slotIndex === -1) return state;

  const item = state.allItems.find((p) => p.id === itemId);
  if (!item) return state;

  const nextSlots = [...state.slots];
  nextSlots[slotIndex] = null;

  const nextPool = state.pool.some((p) => p.id === itemId)
    ? state.pool
    : [...state.pool, item];

  return {
    ...state,
    slots: nextSlots,
    pool: nextPool,
    activeSlotIndex: getFirstEmptySlotIndex(nextSlots),
    typePrefix: "",
  };
}

function getFirstEmptySlotIndex(slots: (string | null)[]): number {
  const index = slots.findIndex((id) => id === null);
  return index === -1 ? Math.max(0, slots.length - 1) : index;
}
