"use client";

import { useEffect } from "react";

/**
 * Korte viewport (13" laptop + iPad).
 * Arbitrary media-query: [@media(max-height:60rem)]:…
 */
export const QUIZ_SHORT_VH = "[@media(max-height:60rem)]";

/**
 * Speel-deck: natuurlijke document-hoogte (pagina scrollt; chat blijft in flow).
 */
export const QUIZ_PLAYING_DECK_CLASS = "flex flex-col gap-3 outline-none";

export const QUIZ_PLAYING_HEADER_CLASS = "shrink-0 space-y-2";
export const QUIZ_PLAYING_TITLE_CLASS = "text-xl";
/** Description altijd weg tijdens playing — ruimte voor Controleren. */
export const QUIZ_PLAYING_DESCRIPTION_CLASS = "hidden";

export const QUIZ_PLAYING_SECTION_CLASS =
  "relative rounded-2xl border border-border bg-gradient-to-b from-muted/30 to-background p-3 pt-7 sm:p-4 sm:pt-8";

export const QUIZ_PLAYING_FORM_CLASS = "mx-auto flex w-full max-w-lg flex-col";

export const QUIZ_PROMPT_CARD_FIXED_CLASS = `relative h-40 shrink-0 sm:h-48 ${QUIZ_SHORT_VH}:h-28 ${QUIZ_SHORT_VH}:sm:h-32`;

/** Typen/Sorteren: harde max-hoogte zodat audio de card niet opblaast. */
export const QUIZ_PROMPT_CARD_MIN_CLASS = `relative flex max-h-36 min-h-0 shrink-0 flex-col items-center justify-center overflow-hidden rounded-2xl border border-accent/25 bg-gradient-to-br from-accent/15 via-accent/5 to-card p-3 text-center shadow-lg shadow-accent/10 sm:max-h-40 ${QUIZ_SHORT_VH}:max-h-28`;

export const QUIZ_PROMPT_TEXT_CLASS = `text-lg font-semibold leading-snug text-foreground sm:text-xl ${QUIZ_SHORT_VH}:text-base`;

export const QUIZ_PROMPT_SKELETON_CLASS = `h-36 shrink-0 animate-pulse rounded-2xl bg-muted/60 sm:h-40 ${QUIZ_SHORT_VH}:h-28`;

export const QUIZ_SHORT_HIDE_CLASS = "hidden";

export const QUIZ_PLAYING_MIDDLE_CLASS = "mt-3 flex flex-col gap-2";

export const QUIZ_FEEDBACK_SLOT_CLASS = "mt-2";

export const QUIZ_SORT_TYPE_SLOT_CLASS =
  "mt-1 flex min-h-[3.75rem] flex-col gap-1";

export function useQuizScrollToTop(enabled: boolean, resetKey: string | null) {
  useEffect(() => {
    if (!enabled) return;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [enabled, resetKey]);
}
