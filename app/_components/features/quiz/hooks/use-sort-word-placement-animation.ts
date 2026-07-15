"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useCallback, useEffect, useRef, useState } from "react";

import { prefersReducedMotion } from "@/app/_components/features/chat/prefers-reduced-motion";
import { placeWordInSlot } from "@/lib/quiz/sort-config";

import type { SortExerciseState } from "@/lib/quiz/sort-config";
import type { Dispatch, RefObject, SetStateAction } from "react";

gsap.registerPlugin(useGSAP);

const PLACEMENT_DURATION = 0.42;
const PLACEMENT_EASE = "power2.out";

type UseSortWordPlacementAnimationOptions = {
  containerRef: RefObject<HTMLElement | null>;
  setSortState: Dispatch<SetStateAction<SortExerciseState>>;
};

/**
 * Animeert een woord van de pool naar een lege placeholder voordat de state
 * wordt bijgewerkt — voorkomt de huidige "teleport"-ervaring bij typen.
 */
export function useSortWordPlacementAnimation({
  containerRef,
  setSortState,
}: UseSortWordPlacementAnimationOptions) {
  const [isAnimating, setIsAnimating] = useState(false);
  const flyingElementRef = useRef<HTMLElement | null>(null);
  const activeTweenRef = useRef<gsap.core.Tween | null>(null);
  const hiddenSourceRef = useRef<HTMLElement | null>(null);

  useGSAP({ scope: containerRef });

  const restoreHiddenSource = useCallback(() => {
    if (!hiddenSourceRef.current) return;
    gsap.set(hiddenSourceRef.current, { clearProps: "opacity" });
    hiddenSourceRef.current = null;
  }, []);

  const cleanupFlyingElement = useCallback(() => {
    activeTweenRef.current?.kill();
    activeTweenRef.current = null;

    if (flyingElementRef.current) {
      flyingElementRef.current.remove();
      flyingElementRef.current = null;
    }

    restoreHiddenSource();
    setIsAnimating(false);
  }, [restoreHiddenSource]);

  const placeWordInstantly = useCallback(
    (itemId: string, slotIndex: number) => {
      cleanupFlyingElement();
      setSortState((prev) => placeWordInSlot(prev, itemId, slotIndex));
    },
    [cleanupFlyingElement, setSortState],
  );

  useEffect(() => {
    return () => cleanupFlyingElement();
  }, [cleanupFlyingElement]);

  const placeWordWithAnimation = useCallback(
    (itemId: string, slotIndex: number) => {
      if (isAnimating) return;

      const container = containerRef.current;
      if (!container || prefersReducedMotion()) {
        placeWordInstantly(itemId, slotIndex);
        return;
      }

      const sourceEl = container.querySelector<HTMLElement>(
        `[data-sort-pool-word-id="${itemId}"]`,
      );
      const targetEl = container.querySelector<HTMLElement>(
        `[data-sort-slot-index="${slotIndex}"]`,
      );

      if (!sourceEl || !targetEl) {
        placeWordInstantly(itemId, slotIndex);
        return;
      }

      const chipEl =
        sourceEl.querySelector<HTMLElement>("[data-sort-word-chip]") ?? sourceEl;
      const sourceRect = chipEl.getBoundingClientRect();
      const targetRect = targetEl.getBoundingClientRect();

      const clone = chipEl.cloneNode(true) as HTMLElement;
      clone.setAttribute("data-sort-flying-word", itemId);
      clone.style.position = "fixed";
      clone.style.left = `${sourceRect.left}px`;
      clone.style.top = `${sourceRect.top}px`;
      clone.style.width = `${sourceRect.width}px`;
      clone.style.margin = "0";
      clone.style.zIndex = "9999";
      clone.style.pointerEvents = "none";
      clone.style.transformOrigin = "top left";
      document.body.appendChild(clone);

      flyingElementRef.current = clone;
      hiddenSourceRef.current = sourceEl;
      setIsAnimating(true);

      gsap.set(sourceEl, { opacity: 0 });

      const targetX =
        targetRect.left + (targetRect.width - sourceRect.width) / 2;
      const targetY =
        targetRect.top + (targetRect.height - sourceRect.height) / 2;
      const dx = targetX - sourceRect.left;
      const dy = targetY - sourceRect.top;

      activeTweenRef.current = gsap.to(clone, {
        x: dx,
        y: dy,
        duration: PLACEMENT_DURATION,
        ease: PLACEMENT_EASE,
        onComplete: () => {
          flyingElementRef.current = null;
          hiddenSourceRef.current = null;
          activeTweenRef.current = null;
          setIsAnimating(false);
          clone.remove();
          setSortState((prev) => placeWordInSlot(prev, itemId, slotIndex));
        },
      });
    },
    [containerRef, isAnimating, placeWordInstantly, setSortState],
  );

  return {
    placeWordWithAnimation,
    placeWordInstantly,
    isAnimating,
    cleanupFlyingElement,
  };
}
