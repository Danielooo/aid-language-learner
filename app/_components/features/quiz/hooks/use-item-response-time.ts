"use client";

import { useCallback, useEffect, useRef } from "react";

/** Meet responstijd vanaf het moment dat een nieuwe oefening getoond wordt. */
export function useItemResponseTime(itemId: string | null | undefined) {
  // Startwaarde in effect i.p.v. render: render moet puur blijven.
  const shownAtRef = useRef<number>(0);

  useEffect(() => {
    if (itemId) {
      shownAtRef.current = Date.now();
    }
  }, [itemId]);

  const getResponseTimeMs = useCallback(() => {
    return Math.max(0, Date.now() - shownAtRef.current);
  }, []);

  return getResponseTimeMs;
}
