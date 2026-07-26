type QuizQueueProgressBadgeProps = {
  label: string | null;
};

/** Speel-chrome voortgang — absolute rechtsboven in relative + pt-* section. */
export function QuizQueueProgressBadge({ label }: QuizQueueProgressBadgeProps) {
  if (!label) return null;
  return (
    <span className="text-foreground absolute top-2 right-3 text-sm font-medium tabular-nums sm:top-3 sm:right-4">
      {label}
    </span>
  );
}
