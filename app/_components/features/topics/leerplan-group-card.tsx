"use client";

import type { ExerciseGroupListItem } from "@/types/exercise-groups";

type LeerplanGroupCardProps = {
  item: ExerciseGroupListItem;
  variant: "global" | "personal";
  toggling?: boolean;
  onOpen: () => void;
  onToggleActive?: (name: string, isActive: boolean) => void;
};

/**
 * Kaart voor een oefeningengroep in het leerplan.
 * Personal: actief-checkbox; community: “al gekopieerd”-label.
 */
export function LeerplanGroupCard({
  item,
  variant,
  toggling = false,
  onOpen,
  onToggleActive,
}: LeerplanGroupCardProps) {
  const isActive = item.isActive ?? false;
  const inputId = `leerplan-group-${item.id}`;

  return (
    <div
      className={`flex min-h-28 flex-col justify-between rounded-2xl border p-5 transition-all hover:-translate-y-0.5 hover:shadow-md ${
        variant === "personal" && isActive
          ? "border-accent bg-gradient-to-br from-accent/20 via-accent/5 to-card shadow-md ring-2 ring-accent/30"
          : "border-border bg-card hover:border-accent/30 hover:bg-muted/30"
      } ${toggling ? "opacity-70" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={onOpen}
          className="min-w-0 flex-1 space-y-1 text-left"
        >
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {variant === "global" ? "Community" : "Persoonlijk"}
          </span>
          <h3 className="text-base font-semibold leading-snug text-foreground">
            {item.name}
          </h3>
        </button>

        {variant === "personal" && onToggleActive ? (
          <input
            id={inputId}
            type="checkbox"
            checked={isActive}
            disabled={toggling}
            onChange={(e) => onToggleActive(item.name, e.target.checked)}
            className="mt-1 size-5 shrink-0 rounded border-border accent-accent"
            aria-label={`${isActive ? "Deactiveer" : "Activeer"} groep ${item.name}`}
          />
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <button
          type="button"
          onClick={onOpen}
          className="text-left hover:text-foreground"
        >
          <span className="font-medium text-foreground">{item.exerciseCount}</span>{" "}
          {item.exerciseCount === 1 ? "oefening" : "oefeningen"}
        </button>
        {variant === "global" && item.alreadyCopied ? (
          <span className="font-medium text-accent">Al in leerplan</span>
        ) : null}
      </div>
    </div>
  );
}
