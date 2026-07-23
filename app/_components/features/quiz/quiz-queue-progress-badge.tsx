type QuizQueueProgressBadgeProps = {
  label: string | null;
};

/** Speel-chrome voortgang — absolute rechtsboven in relative + pt-* section. */
export function QuizQueueProgressBadge({ label }: QuizQueueProgressBadgeProps) {
  if (!label) return null;
  return (
    <span className="absolute right-3 top-2 text-sm font-medium tabular-nums text-foreground sm:right-4 sm:top-3">
      {label}
    </span>
  );
}
