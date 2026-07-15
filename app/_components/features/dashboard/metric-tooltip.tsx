export const METRIC_TERMS = {
  "grafiek-srs-stappen": {
    label: "Oefeningen per SRS-stap",
    help: "Per SRS-stap: hoeveel oefeningen je X keer goed hebt gehad. Standaard zie je het totaal; schakel naar Verdeeld om aan de beurt (blauw) en wachten (groen) te zien.",
  },
  "grafiek-activiteit": {
    label: "Oefenactiviteit",
    help: "Schakel tussen Pogingen (donkerblauw = veel, lichtblauw = weinig, grijs = geen) en Nauwkeurigheid (groen = meer goed, rood = meer fout). Nauwkeurigheidskleur geldt vanaf 10 pogingen per dag. Streak telt aaneengesloten dagen met minstens één poging.",
  },
  "grafiek-accuracy": {
    label: "Goed vs fout",
    help: "Verdeling van je quiz-pogingen: groen = goed, rood = fout. Kies een periode via het menu. Altijd toont maximaal je 5000 meest recente pogingen uit actieve topics.",
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
