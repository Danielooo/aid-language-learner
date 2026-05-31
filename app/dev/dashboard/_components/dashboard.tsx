"use client";

import Link from "next/link";
import { useMemo } from "react";

import { useQuizStorage } from "@/app/dev/exercise-generator-quiz/_components/use-quiz-storage";

import {
  byTopic,
  dailyAccuracy,
  summarize,
  weakExercises,
} from "./stats";

import type {
  DailyAccuracy,
  Summary,
  TopicStat,
  WeakExercise,
} from "./stats";

// Data komt nu uit Supabase via `useQuizStorage` (fetcht `/api/dev/
// quiz-attempts` op mount). Tot de fetch klaar is tonen we skeletons
// om SSR-hydration mismatches en lege-state-flicker te voorkomen.

const TREND_DAYS = 7;

export function Dashboard() {
  const { attempts, hydrated, reset } = useQuizStorage();

  // Memo's zijn niet strikt nodig (max 50 attempts), maar maken
  // intentie expliciet: deze afgeleide data hoort bij `attempts`.
  const summary = useMemo<Summary>(() => summarize(attempts), [attempts]);
  const topics = useMemo<TopicStat[]>(() => byTopic(attempts), [attempts]);
  const weak = useMemo<WeakExercise[]>(
    () => weakExercises(attempts, 5),
    [attempts],
  );
  const trend = useMemo<DailyAccuracy[]>(
    () => dailyAccuracy(attempts, TREND_DAYS),
    [attempts],
  );

  function handleReset() {
    if (window.confirm("Score en geschiedenis echt wissen?")) reset();
  }

  if (!hydrated) {
    return <DashboardSkeleton />;
  }

  if (attempts.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-6">
      <KpiStrip summary={summary} />

      <Section
        title="Per topic"
        hint="Zwakste topics bovenaan. Topics met minder dan 3 pogingen worden gemarkeerd als te weinig data."
      >
        <TopicList stats={topics} />
      </Section>

      <Section
        title="Zwakke oefeningen"
        hint="Top 5 zinnen met de meeste foute pogingen uit je laatste 50 pogingen."
      >
        <WeakList items={weak} />
      </Section>

      <Section
        title={`Trend (laatste ${TREND_DAYS} dagen)`}
        hint="Accuracy per kalenderdag. Lege balken zijn dagen zonder pogingen."
      >
        <TrendChart days={trend} />
      </Section>

      <FooterActions onReset={handleReset} total={summary.total} />
    </div>
  );
}

function KpiStrip({ summary }: { summary: Summary }) {
  return (
    <section className="space-y-2">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Totaal" value={summary.total} />
        <KpiCard label="Goed" value={summary.correct} tone="positive" />
        <KpiCard label="Fout" value={summary.incorrect} tone="negative" />
        <KpiCard label="Accuracy" value={`${summary.accuracyPct}%`} />
      </div>
      <p className="text-xs text-muted-foreground">
        {summary.uniqueExercises} unieke oefening
        {summary.uniqueExercises === 1 ? "" : "en"} geprobeerd
      </p>
    </section>
  );
}

function KpiCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone?: "positive" | "negative";
}) {
  const toneClass =
    tone === "positive"
      ? "text-emerald-700 dark:text-emerald-300"
      : tone === "negative"
        ? "text-destructive"
        : "text-foreground";
  return (
    <div className="rounded-lg border border-border bg-card p-4 text-card-foreground">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${toneClass}`}>
        {value}
      </p>
    </div>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-lg border border-border bg-card p-5 text-card-foreground">
      <header className="space-y-0.5">
        <h2 className="text-sm font-semibold">{title}</h2>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </header>
      {children}
    </section>
  );
}

function TopicList({ stats }: { stats: TopicStat[] }) {
  if (stats.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Geen topics gevonden in je historie.
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {stats.map((s) => (
        <li
          key={s.topic}
          className="rounded-md border border-border bg-background p-3"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-sm font-medium text-foreground">
              {s.topic}
            </span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {s.correct} / {s.total} goed ·{" "}
              <span className="text-foreground">{s.accuracyPct}%</span>
              {!s.hasEnoughData && (
                <span className="ml-1 rounded bg-muted px-1 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                  te weinig data
                </span>
              )}
            </span>
          </div>
          <AccuracyBar pct={s.accuracyPct} muted={!s.hasEnoughData} />
        </li>
      ))}
    </ul>
  );
}

function AccuracyBar({ pct, muted }: { pct: number; muted?: boolean }) {
  // Drempels zijn een eerste guess: <50% kritiek, <80% twijfel, rest oké.
  // Bij te weinig data kleuren we neutraal grijs zodat 100% op één
  // poging niet als "goed" leest.
  const fillClass = muted
    ? "bg-muted-foreground/40"
    : pct < 50
      ? "bg-destructive"
      : pct < 80
        ? "bg-amber-500"
        : "bg-emerald-500";
  return (
    <div className="mt-2 h-2 w-full overflow-hidden rounded bg-muted">
      <div
        className={`h-full ${fillClass}`}
        style={{ width: `${Math.max(2, pct)}%` }}
        aria-hidden
      />
    </div>
  );
}

function WeakList({ items }: { items: WeakExercise[] }) {
  if (items.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Nog geen foute pogingen. Goed bezig!
      </p>
    );
  }
  return (
    <ul className="divide-y divide-border">
      {items.map((w) => (
        <li key={w.exerciseId} className="space-y-1 py-3 first:pt-0 last:pb-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-destructive/15 px-1.5 py-0.5 text-[10px] font-medium text-destructive tabular-nums">
              {w.wrong}× fout / {w.attempts}× geprobeerd
            </span>
            {w.topic && (
              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {w.topic}
              </span>
            )}
          </div>
          <p className="text-sm font-medium text-foreground">{w.source_text}</p>
          <p className="text-xs text-muted-foreground">
            <span className="opacity-70">vertaling:</span> {w.target_text}
          </p>
        </li>
      ))}
    </ul>
  );
}

function TrendChart({ days }: { days: DailyAccuracy[] }) {
  const hasAnyData = days.some((d) => d.total > 0);
  return (
    <div className="space-y-2">
      <div className="flex h-32 items-end gap-1.5">
        {days.map((d) => (
          <TrendBar key={d.date} day={d} />
        ))}
      </div>
      {!hasAnyData && (
        <p className="text-xs text-muted-foreground">
          Nog geen pogingen in de afgelopen {days.length} dagen.
        </p>
      )}
    </div>
  );
}

function TrendBar({ day }: { day: DailyAccuracy }) {
  const heightPct = day.total === 0 ? 0 : Math.max(4, day.accuracyPct);
  const fillClass =
    day.total === 0
      ? "bg-muted"
      : day.accuracyPct < 50
        ? "bg-destructive/70"
        : day.accuracyPct < 80
          ? "bg-amber-500/80"
          : "bg-emerald-500/80";
  // Minder pogingen = doorzichtiger, zodat een dag met 1 poging
  // visueel niet even "zwaar" weegt als een dag met 10.
  const opacity =
    day.total === 0 ? 0.3 : Math.min(1, 0.4 + day.total * 0.1);

  // `h-full` is essentieel: de outer chart-container heeft `items-end`,
  // wat children juist NIET stretcht. Zonder expliciete hoogte zou de
  // balk-wrapper `flex-1` tegen een hoogteloze ouder lopen en collapsen
  // naar 0px — de balken zouden onzichtbaar zijn.
  return (
    <div className="flex h-full flex-1 flex-col items-center gap-1">
      <div
        className="flex w-full flex-1 items-end"
        title={`${day.date}: ${day.correct}/${day.total} goed (${day.accuracyPct}%)`}
      >
        <div
          className={`w-full rounded-t ${fillClass}`}
          style={{ height: `${heightPct}%`, opacity }}
          aria-hidden
        />
      </div>
      <span className="text-[10px] text-muted-foreground tabular-nums">
        {formatDayLabel(day.date)}
      </span>
    </div>
  );
}

function formatDayLabel(isoDate: string): string {
  // "2026-05-31" → "31/05". Korter dan een dag-naam en
  // localised-onafhankelijk; voldoende voor 7-dagen-trend.
  const [, m, d] = isoDate.split("-");
  return `${d}/${m}`;
}

function FooterActions({
  onReset,
  total,
}: {
  onReset: () => void;
  total: number;
}) {
  return (
    <section className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-muted/30 px-4 py-3 text-sm">
      <div className="flex flex-wrap gap-2">
        <Link
          href="/dev/exercise-generator-quiz"
          className="inline-flex h-9 items-center rounded-md bg-accent px-3 text-xs font-medium text-accent-foreground transition-colors hover:bg-accent/90"
        >
          Verder oefenen
        </Link>
        <Link
          href="/dev/exercise-generator"
          className="inline-flex h-9 items-center rounded-md border border-input bg-background px-3 text-xs hover:bg-muted"
        >
          Nieuwe oefeningen toevoegen
        </Link>
      </div>
      <button
        type="button"
        onClick={onReset}
        disabled={total === 0}
        className="cursor-pointer text-xs text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
      >
        Reset score & historie
      </button>
    </section>
  );
}

function EmptyState() {
  return (
    <section className="space-y-3 rounded-lg border border-dashed border-border bg-card p-6 text-center text-card-foreground">
      <p className="text-sm font-medium">Nog geen pogingen om te tonen.</p>
      <p className="text-xs text-muted-foreground">
        Doe eerst een paar oefeningen — daarna verschijnt hier je
        prestatie-overzicht.
      </p>
      <div className="flex flex-wrap justify-center gap-2 pt-1">
        <Link
          href="/dev/exercise-generator-quiz"
          className="inline-flex h-9 items-center rounded-md bg-accent px-3 text-xs font-medium text-accent-foreground transition-colors hover:bg-accent/90"
        >
          Start de quiz
        </Link>
        <Link
          href="/dev/exercise-generator"
          className="inline-flex h-9 items-center rounded-md border border-input bg-background px-3 text-xs hover:bg-muted"
        >
          Eerst oefeningen genereren
        </Link>
      </div>
    </section>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-lg border border-border bg-muted/40"
          />
        ))}
      </div>
      <div className="h-40 animate-pulse rounded-lg border border-border bg-muted/40" />
      <div className="h-40 animate-pulse rounded-lg border border-border bg-muted/40" />
      <div className="h-40 animate-pulse rounded-lg border border-border bg-muted/40" />
    </div>
  );
}
