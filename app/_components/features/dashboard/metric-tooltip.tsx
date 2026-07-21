export const METRIC_TERMS = {
  "voortgang-samenvatting": {
    label: "Herhaalschema",
    help: "Hoeveel van je actieve oefeningen nu bij zijn (niet aan de beurt). 100% = alles bij. Later vandaag geplande herhalingen tellen hier nog niet als open.",
  },
  "voortgang-topics": {
    label: "Per topic",
    help: "Alleen actieve topics uit je leerplan die je via het herhaalschema al hebt geoefend. Het % is hoe ver je bent tot alles beheerst is (9× goed per oefening). Topic oefenen zonder herhaalschema vult dit niet. Klik voor detail.",
  },
  "grafiek-komende-herhalingen": {
    label: "Komende herhalingen",
    help: "Aantal oefeningen per dag in je herhaalschema voor de komende 7 dagen. Vandaag omvat achterstallig én later vandaag gepland. Dat kan hoger zijn dan ‘open’ bij Herhaalschema (alleen nu aan de beurt).",
  },
  "grafiek-activiteit": {
    label: "Oefenactiviteit",
    help: "Aantal oefenpogingen per dag over de laatste 14 dagen (alle oefenvormen). Streak telt aaneengesloten dagen met minstens één poging.",
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
