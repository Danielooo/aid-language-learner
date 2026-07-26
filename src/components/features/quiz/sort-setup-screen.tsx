"use client";

import type { TranslationDirection } from "@/lib/quiz/typing-config";

type SortSetupScreenProps = {
  direction: TranslationDirection;
  onDirectionChange: (direction: TranslationDirection) => void;
  onContinue: () => void;
};

function ToggleGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; title: string; description: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-foreground text-sm font-semibold">{label}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <label
              key={option.value}
              className={`cursor-pointer rounded-xl border p-4 transition-colors ${
                selected
                  ? "border-accent bg-accent/10 ring-accent/30 ring-1"
                  : "border-border bg-card hover:bg-muted/40"
              }`}
            >
              <input
                type="radio"
                name={label}
                value={option.value}
                checked={selected}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              <span className="text-foreground block text-sm font-medium">
                {option.title}
              </span>
              <span className="text-muted-foreground mt-1 block text-xs">
                {option.description}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function SortSetupScreen({
  direction,
  onDirectionChange,
  onContinue,
}: SortSetupScreenProps) {
  return (
    <section className="border-border from-muted/30 to-background space-y-6 rounded-2xl border bg-gradient-to-b p-6 sm:p-8">
      <div className="space-y-1">
        <h2 className="text-foreground text-sm font-semibold">
          Stel je oefening in
        </h2>
        <p className="text-muted-foreground text-xs">
          Kies welke taal je sorteert. Daarna selecteer je een topic.
        </p>
      </div>

      <ToggleGroup
        label="Vertaalrichting"
        value={direction}
        onChange={onDirectionChange}
        options={[
          {
            value: "es-to-nl",
            title: "Spaans → Nederlands",
            description: "Spaanse zin tonen, Nederlandse woorden sorteren.",
          },
          {
            value: "nl-to-es",
            title: "Nederlands → Spaans",
            description: "Nederlandse zin tonen, Spaanse woorden sorteren.",
          },
        ]}
      />

      <button
        type="button"
        onClick={onContinue}
        className="bg-accent text-accent-foreground hover:bg-accent/90 inline-flex h-10 cursor-pointer items-center justify-center rounded-md px-4 text-sm font-medium transition-colors"
      >
        Kies topic
      </button>
    </section>
  );
}
