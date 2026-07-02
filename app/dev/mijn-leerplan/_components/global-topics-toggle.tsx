"use client";

type GlobalTopicsToggleProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
};

export function GlobalTopicsToggle({ checked, onChange }: GlobalTopicsToggleProps) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 rounded border-border accent-accent"
      />
      <span>
        <span className="font-medium text-foreground">Toon ook globale topics</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">
          Seed-oefeningen van de app (bijv. restaurant, luchthaven).
        </span>
      </span>
    </label>
  );
}
