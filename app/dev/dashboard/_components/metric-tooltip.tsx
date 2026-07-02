export const METRIC_TERMS = {
  "kpi-retentie": {
    label: "Wat je onthoudt",
    help: "Het percentage goede antwoorden op geplande herhalingen in de laatste 30 dagen. Zo zie je of je woorden echt blijft onthouden.",
  },
  "kpi-beheerst": {
    label: "Goed onthouden",
    help: "Woorden die je vaak genoeg goed had. Die hoef je bijna niet meer te oefenen.",
  },
  "kpi-gemiddelde": {
    label: "Gemiddelde woordscore",
    help: "Een getal tussen 0 en 100 dat laat zien hoe goed je al je woorden gemiddeld kent. Hoger is beter.",
  },
  "kpi-gepland": {
    label: "Te doen deze week",
    help: "Het aantal herhalingen dat de komende 7 dagen op je planning staat.",
  },
  "kpi-consistentie": {
    label: "Dagen geoefend",
    help: "Hoeveel van de laatste 30 dagen je hebt geoefend. Je reeks telt achter elkaar geoefende dagen.",
  },
  "grafiek-beheerst": {
    label: "Goed onthouden over tijd",
    help: "Hoe het aantal woorden dat je goed kent groeit door de tijd heen.",
  },
  "grafiek-verdeling": {
    label: "Hoe goed je woorden kent",
    help: "Verdeling van je woorden: van nieuw tot goed onthouden.",
  },
  "grafiek-retentie": {
    label: "Onthouden over tijd",
    help: "Laat zien of je woorden goed blijft onthouden. Gebaseerd op geplande herhalingen, niet op alle oefeningen.",
  },
  "grafiek-interval": {
    label: "Onthouden per wachttijd",
    help: "Hoe goed je woorden onthoudt na verschillende wachttijden tussen herhalingen.",
  },
  "grafiek-kalender": {
    label: "Wanneer je oefende",
    help: "Elk vakje is een dag. Donkerder betekent dat je die dag meer hebt geoefend.",
  },
  "grafiek-workload": {
    label: "Wat er op de planning staat",
    help: "Hoeveel herhalingen er per dag gepland staan. Zo zie je wanneer het druk wordt.",
  },
  "grafiek-moeilijk": {
    label: "Woorden die lastig zijn",
    help: "Woorden waar je vaak fouten maakt of lang over doet. Handig om extra te oefenen.",
  },
  "grafiek-oefentype": {
    label: "Resultaat per oefening",
    help: "Vergelijkt hoe goed je het doet bij flashcards, typen en sorteren.",
  },
} as const;

export type MetricTerm = keyof typeof METRIC_TERMS;

export function getMetricLabel(term: MetricTerm): string {
  return METRIC_TERMS[term].label;
}

export function getMetricHelp(term: MetricTerm): string {
  return METRIC_TERMS[term].help;
}

type MetricTooltipProps = {
  term: MetricTerm;
};

export function MetricTooltip({ term }: MetricTooltipProps) {
  const info = METRIC_TERMS[term];
  if (!info) return null;

  return (
    <span className="group relative inline-flex shrink-0">
      <span
        tabIndex={0}
        className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-border text-[10px] text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`${info.label}: ${info.help}`}
      >
        ?
      </span>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 hidden w-52 -translate-x-1/2 rounded-md border border-border bg-card px-2.5 py-2 text-xs font-normal normal-case leading-snug tracking-normal text-muted-foreground shadow-md group-hover:block group-focus-within:block"
      >
        {info.help}
      </span>
    </span>
  );
}
