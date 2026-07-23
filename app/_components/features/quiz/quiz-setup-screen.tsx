"use client";

import type {
  TranslationDirection,
  TypingMode,
} from "@/lib/quiz/typing-config";

type QuizSetupScreenProps = {
  mode: TypingMode;
  direction: TranslationDirection;
  onModeChange: (mode: TypingMode) => void;
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
      <legend className="text-sm font-semibold text-foreground">{label}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <label
              key={option.value}
              className={`cursor-pointer rounded-xl border p-4 transition-colors ${
                selected
                  ? "border-accent bg-accent/10 ring-1 ring-accent/30"
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
              <span className="block text-sm font-medium text-foreground">
                {option.title}
              </span>
              <span className="mt-1 block text-xs text-muted-foreground">
                {option.description}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function QuizSetupScreen({
  mode,
  direction,
  onModeChange,
  onDirectionChange,
  onContinue,
}: QuizSetupScreenProps) {
  return (
    <section className="space-y-6 rounded-2xl border border-border bg-gradient-to-b from-muted/30 to-background p-6 sm:p-8">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-foreground">
          Stel je oefening in
        </h2>
        <p className="text-xs text-muted-foreground">
          Kies typvorm en vertaalrichting. Daarna selecteer je een topic.
        </p>
      </div>

      <ToggleGroup
        label="Typ-modus"
        value={mode}
        onChange={onModeChange}
        options={[
          {
            value: "full",
            title: "Volledig typen",
            description: "Typ de hele vertaling van de getoonde zin.",
          },
          {
            value: "blank",
            title: "Ontbrekend woord",
            description:
              "Eén woord ontbreekt in de vertaling. Hint: anagram van het woord.",
          },
        ]}
      />

      <ToggleGroup
        label="Vertaalrichting"
        value={direction}
        onChange={onDirectionChange}
        options={[
          {
            value: "es-to-nl",
            title: "Spaans → Nederlands",
            description: "Spaanse zin tonen, Nederlandse vertaling typen.",
          },
          {
            value: "nl-to-es",
            title: "Nederlands → Spaans",
            description: "Nederlandse zin tonen, Spaanse vertaling typen.",
          },
        ]}
      />

      <button
        type="button"
        onClick={onContinue}
        className="inline-flex h-10 cursor-pointer items-center justify-center rounded-md bg-accent px-4 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90"
      >
        Kies topic
      </button>
    </section>
  );
}
