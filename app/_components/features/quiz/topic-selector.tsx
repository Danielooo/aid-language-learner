import { ALL_TOPICS } from "./constants";

type TopicSelectorProps = {
  topics: string[];
  topicsLoading: boolean;
  selected: string;
  onChange: (next: string) => void;
  id?: string;
};

export function TopicSelector({
  topics,
  topicsLoading,
  selected,
  onChange,
  id = "topic-select",
}: TopicSelectorProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-card px-4 py-3 text-sm text-card-foreground">
      <label
        htmlFor={id}
        className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
      >
        Topic
      </label>
      <select
        id={id}
        value={selected}
        onChange={(e) => onChange(e.target.value)}
        disabled={topicsLoading}
        className="cursor-pointer rounded-md border border-input bg-background px-2 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
      >
        <option value={ALL_TOPICS}>Alle topics</option>
        {topics.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
      {topicsLoading && (
        <span className="text-xs text-muted-foreground">topics laden…</span>
      )}
      {!topicsLoading && topics.length === 0 && (
        <span className="text-xs text-muted-foreground">
          Geen topics beschikbaar
        </span>
      )}
    </div>
  );
}
