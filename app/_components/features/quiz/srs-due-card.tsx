"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { APP_ROUTES } from "@/lib/routes";

import type { ProgressStatsResponse } from "@/types/progress";

type LoadState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "loaded"; dueCount: number };

/** Prominente CTA wanneer er SRS-oefeningen klaarstaan voor herhaling. */
export function SrsDueCard() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/exercise-progress", { cache: "no-store" });
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = (await res.json()) as ProgressStatsResponse;
        if (!cancelled) setState({ status: "loaded", dueCount: data.dueCount });
      } catch {
        if (!cancelled) setState({ status: "error" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === "loading") {
    return (
      <div
        className="h-36 animate-pulse rounded-2xl border border-border bg-muted/40"
        aria-busy="true"
        aria-label="Herhaalstatus laden"
      />
    );
  }

  if (state.status === "error" || state.dueCount === 0) {
    return null;
  }

  const { dueCount } = state;

  return (
    <section className="space-y-3 rounded-2xl border border-accent/40 bg-gradient-to-br from-accent/15 via-accent/5 to-card p-6">
      <h2 className="text-lg font-semibold text-foreground">
        {dueCount === 1
          ? "1 oefening klaar voor herhaling"
          : `${dueCount} oefeningen klaar voor herhaling`}
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
