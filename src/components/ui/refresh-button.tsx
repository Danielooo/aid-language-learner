"use client";

import { cn } from "@/lib/utils";

type RefreshButtonProps = {
  onClick: () => void;
  isRefreshing: boolean;
  disabled?: boolean;
  className?: string;
};

/**
 * Standaard Ververs-knop voor list/admin-toolbars.
 * Pending-label volgt ux-product (Verversen… + disabled).
 */
export function RefreshButton({
  onClick,
  isRefreshing,
  disabled = false,
  className,
}: RefreshButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || isRefreshing}
      onClick={onClick}
      className={cn(
        "border-border text-foreground inline-flex h-9 items-center rounded-md border px-3 text-xs disabled:opacity-50",
        className,
      )}
    >
      {isRefreshing ? "Verversen…" : "Ververs"}
    </button>
  );
}
