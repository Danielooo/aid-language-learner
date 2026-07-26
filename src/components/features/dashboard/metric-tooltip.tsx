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
    help: "Aantal oefeningen in je herhaalschema: Open (nu aan de beurt, incl. achterstallig), Vandaag (later vandaag gepland), daarna de komende dagen.",
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
        className="border-border text-muted-foreground focus-visible:ring-ring inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full border text-[10px] outline-none focus-visible:ring-2"
        aria-label={`${info.label}: ${info.help}`}
      >
        ?
      </span>
      <span
        role="tooltip"
        className="border-border bg-card text-muted-foreground pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 hidden w-52 -translate-x-1/2 rounded-md border px-2.5 py-2 text-xs leading-snug font-normal tracking-normal normal-case shadow-md group-focus-within:block group-hover:block"
      >
        {info.help}
      </span>
    </span>
  );
}
