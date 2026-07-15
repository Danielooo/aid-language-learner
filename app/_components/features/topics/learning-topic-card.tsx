"use client";

import type { LearningTopicItem } from "@/app/api/dev/learning-topics/route";

type LearningTopicCardProps = {
  item: LearningTopicItem;
  toggling: boolean;
  onToggle: (topic: string, isActive: boolean) => void;
};

export function LearningTopicCard({ item, toggling, onToggle }: LearningTopicCardProps) {
  const inputId = `learning-topic-${item.topic.replace(/\s+/g, "-")}`;

  return (
    <label
      htmlFor={inputId}
      className={`group flex min-h-28 cursor-pointer flex-col justify-between rounded-2xl border p-5 transition-all hover:-translate-y-0.5 hover:shadow-md ${
        item.isActive
          ? "border-accent bg-gradient-to-br from-accent/20 via-accent/5 to-card shadow-md ring-2 ring-accent/30"
          : "border-border bg-card hover:border-accent/30 hover:bg-muted/30"
      } ${toggling ? "pointer-events-none opacity-70" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {item.isOwn ? "Mijn topic" : "Globaal"}
          </span>
          <h3 className="text-base font-semibold leading-snug text-foreground">
            {item.topic}
          </h3>
        </div>
        <input
          id={inputId}
          type="checkbox"
          checked={item.isActive}
          disabled={toggling}
          onChange={(e) => onToggle(item.topic, e.target.checked)}
          className="mt-1 size-5 shrink-0 rounded border-border accent-accent"
          aria-label={`${item.isActive ? "Deactiveer" : "Activeer"} topic ${item.topic}`}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span>
          <span className="font-medium text-foreground">{item.exerciseCount}</span>{" "}
          {item.exerciseCount === 1 ? "oefening" : "oefeningen"}
        </span>
        {item.isActive && item.dueCount > 0 && (
          <span>
            <span className="font-medium text-accent">{item.dueCount}</span>{" "}
            {item.dueCount === 1 ? "klaar voor herhaling" : "klaar voor herhaling"}
          </span>
        )}
      </div>
    </label>
  );
}
