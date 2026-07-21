"use client";

import {
  SRS_INTERVAL_GUIDE,
  type SrsGuideGroup,
} from "@/lib/srs/schedule";

type SrsExplainerProps = {
  /** Compacte variant voor moduskeuze-scherm. */
  compact?: boolean;
};

const GROUP_LABELS: Record<SrsGuideGroup, string> = {
  "first-day": "Eerste dag (bij goed antwoord)",
  later: "Daarna (bij goed antwoord)",
  relearning: "Bij een fout antwoord",
};

const GROUP_ORDER: SrsGuideGroup[] = ["first-day", "later", "relearning"];

export function SrsExplainer({ compact = false }: SrsExplainerProps) {
  return (
    <details
      className="rounded-xl border border-border bg-card/60 text-card-foreground"
      open={!compact}
    >
      <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-foreground">
        Hoe werkt spaced repetition?
      </summary>
      <div className="space-y-4 border-t border-border px-4 py-4 text-sm text-muted-foreground">
        <p>
          Je oefent alleen kaarten die <strong className="text-foreground">nu aan de beurt</strong>{" "}
          zijn. Oefeningen uit actieve topics in je leerplan staan direct in je
          herhaalschema. Bij een goed antwoord schuift een oefening door naar het volgende,
          langere interval. Bij een fout antwoord blijft dezelfde oefening meteen in de
          queue staan tot je hem goed hebt.
        </p>

        {GROUP_ORDER.map((group) => {
          const steps = SRS_INTERVAL_GUIDE.filter((step) => step.group === group);
          if (steps.length === 0) return null;

          return (
            <div key={group} className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground">
                {GROUP_LABELS[group]}
              </h3>
              <ul className="space-y-1.5">
                {steps.map((step) => (
                  <li key={step.label} className="flex gap-2">
                    <span className="shrink-0 font-medium text-foreground">
                      {step.label}:
                    </span>
                    <span>{step.description}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}

        <p className="text-xs">
          Overslaan telt niet mee voor je herhaalschema.
        </p>
      </div>
    </details>
  );
}
