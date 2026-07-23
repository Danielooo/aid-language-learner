"use client";

import { useCallback, useState } from "react";

type UseQuizLeaveGuardOptions = {
  /** true = actieve speelsessie (niet setup / niet completion). */
  isMidSession: boolean;
  onLeave: () => void;
};

/**
 * Esc/terug-guard: 1e verzoek toont bevestiging, 2e Esc of bevestigen verlaat.
 */
export function useQuizLeaveGuard({
  isMidSession,
  onLeave,
}: UseQuizLeaveGuardOptions) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const dismissLeave = useCallback(() => {
    setConfirmOpen(false);
  }, []);

  const confirmLeave = useCallback(() => {
    setConfirmOpen(false);
    onLeave();
  }, [onLeave]);

  const requestLeave = useCallback(() => {
    if (isMidSession) {
      setConfirmOpen(true);
      return;
    }
    onLeave();
  }, [isMidSession, onLeave]);

  /** Voor keydown Esc: open modal of 2e Esc = echt verlaten. */
  const handleEscape = useCallback(() => {
    if (confirmOpen) {
      confirmLeave();
      return;
    }
    requestLeave();
  }, [confirmOpen, confirmLeave, requestLeave]);

  return {
    confirmOpen,
    requestLeave,
    confirmLeave,
    dismissLeave,
    handleEscape,
  };
}
