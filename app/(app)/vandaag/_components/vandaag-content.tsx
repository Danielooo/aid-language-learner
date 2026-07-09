"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { APP_ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";

import type { TodayStatsResponse } from "@/app/api/dev/today-stats/route";

// Startscherm van de app: streak, due-reviews en snelstart-knoppen.
// Kiest de belangrijkste vervolgstap voor de gebruiker: onboarding
// (geen topics) → herhalen (due items) → nieuwe stof oefenen.

type LoadState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "loaded"; stats: TodayStatsResponse };

export function VandaagContent() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/dev/today-stats", { cache: "no-store" });
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const stats = (await res.json()) as TodayStatsResponse;
        if (!cancelled) setState({ status: "loaded", stats });
      } catch {
        if (!cancelled) setState({ status: "error" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === "loading") {
    return <VandaagSkeleton />;
  }

  if (state.status === "error") {
    return (
      <div className="space-y-4">
        <p className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Kon je voortgang niet laden. Vernieuw de pagina of probeer later
          opnieuw.
        </p>
        <QuizModeShortcuts />
      </div>
    );
  }

  const { stats } = state;
  const needsOnboarding = stats.activeTopicCount === 0;

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-3 gap-3">
        <StatCard
          label="Streak"
          value={stats.streakDays}
          suffix={stats.streakDays === 1 ? "dag" : "dagen"}
          highlight={stats.streakDays > 0}
        />
        <StatCard
          label="Klaar voor herhaling"
          value={stats.dueCount}
          suffix={stats.dueCount === 1 ? "oefening" : "oefeningen"}
          highlight={stats.dueCount > 0}
        />
        <StatCard
          label="Vandaag geoefend"
          value={stats.reviewedToday}
          suffix={stats.reviewedToday === 1 ? "beurt" : "beurten"}
        />
      </section>

      {needsOnboarding ? <OnboardingCard /> : <NextStepCard stats={stats} />}

      <QuizModeShortcuts />

      <section className="rounded-2xl border border-border bg-card p-5 text-card-foreground">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold">Eigen oefeningen maken</h2>
            <p className="text-xs text-muted-foreground">
              Laat de AI-generator zinnen maken voor een situatie die jij
              kiest — bijvoorbeeld de bakker, het station of een sollicitatie.
            </p>
          </div>
          <Link
            href={APP_ROUTES.generator}
            className="inline-flex min-h-10 items-center rounded-md border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Naar de generator
          </Link>
        </div>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  suffix,
  highlight = false,
}: {
  label: string;
  value: number;
  suffix: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4",
        highlight
          ? "border-accent/40 bg-accent/5"
          : "border-border bg-card text-card-foreground",
      )}
    >
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        {value}
        <span className="ml-1.5 text-sm font-normal text-muted-foreground">
          {suffix}
        </span>
      </p>
    </div>
  );
}

/** Geen actieve topics: stuur de gebruiker eerst naar het leerplan. */
function OnboardingCard() {
  return (
    <section className="space-y-3 rounded-2xl border border-accent/40 bg-gradient-to-br from-accent/15 via-accent/5 to-card p-6">
      <h2 className="text-lg font-semibold text-foreground">
        Welkom! Stel eerst je leerplan in
      </h2>
      <p className="text-sm text-muted-foreground">
        Kies welke topics je wilt leren — alleen actieve topics komen terug in
        je oefeningen en herhaalschema. Daarna kun je meteen oefenen.
      </p>
      <Link
        href={APP_ROUTES.leerplan}
        className="inline-flex min-h-11 items-center rounded-md bg-accent px-5 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90"
      >
        Kies je topics
      </Link>
    </section>
  );
}

/** Belangrijkste vervolgstap: herhalen als er iets due is, anders oefenen. */
function NextStepCard({ stats }: { stats: TodayStatsResponse }) {
  if (stats.dueCount > 0) {
    return (
      <section className="space-y-3 rounded-2xl border border-accent/40 bg-gradient-to-br from-accent/15 via-accent/5 to-card p-6">
        <h2 className="text-lg font-semibold text-foreground">
          {stats.dueCount === 1
            ? "1 oefening klaar voor herhaling"
            : `${stats.dueCount} oefeningen klaar voor herhaling`}
        </h2>
        <p className="text-sm text-muted-foreground">
          Herhalen op het juiste moment is de snelste manier om Spaans te
          onthouden. Doe je herhalingen voordat je nieuwe stof oppakt.
        </p>
        <Link
          href={`${APP_ROUTES.flashcards}?modus=srs`}
          className="inline-flex min-h-11 items-center rounded-md bg-accent px-5 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90"
        >
          Start herhaling
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-6 text-card-foreground">
      <h2 className="text-lg font-semibold text-foreground">
        {stats.trackedCount > 0
          ? "Alles herhaald — goed bezig"
          : "Klaar om te beginnen"}
      </h2>
      <p className="text-sm text-muted-foreground">
        {stats.trackedCount > 0
          ? "Er staat nu niets klaar voor herhaling. Oefen een topic om nieuwe zinnen aan je herhaalschema toe te voegen."
          : "Oefen een topic om je eerste zinnen te leren; daarna plant het herhaalschema ze automatisch in."}
      </p>
      <Link
        href={APP_ROUTES.oefenen}
        className="inline-flex min-h-11 items-center rounded-md bg-accent px-5 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90"
      >
        Ga oefenen
      </Link>
    </section>
  );
}

const QUIZ_SHORTCUTS = [
  {
    href: APP_ROUTES.flashcards,
    title: "Flashcards",
    description: "Bekijk en beoordeel kaartjes",
  },
  {
    href: APP_ROUTES.typen,
    title: "Typen",
    description: "Typ de vertaling zelf",
  },
  {
    href: APP_ROUTES.sorteren,
    title: "Sorteren",
    description: "Zet woorden in de juiste volgorde",
  },
] as const;

function QuizModeShortcuts() {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-foreground">Oefenvormen</h2>
      <ul className="grid gap-3 sm:grid-cols-3">
        {QUIZ_SHORTCUTS.map((mode) => (
          <li key={mode.href}>
            <Link
              href={mode.href}
              className="flex min-h-20 flex-col justify-center rounded-2xl border border-border bg-card p-4 text-card-foreground transition-all hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-md"
            >
              <span className="text-sm font-semibold text-foreground">
                {mode.title}
              </span>
              <span className="mt-0.5 text-xs text-muted-foreground">
                {mode.description}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function VandaagSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Laden">
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-2xl border border-border bg-muted/40"
          />
        ))}
      </div>
      <div className="h-44 animate-pulse rounded-2xl border border-border bg-muted/40" />
      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-2xl border border-border bg-muted/40"
          />
        ))}
      </div>
    </div>
  );
}
