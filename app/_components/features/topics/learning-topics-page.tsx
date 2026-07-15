"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { APP_ROUTES } from "@/lib/routes";

import { GlobalTopicsToggle } from "./global-topics-toggle";
import { LearningTopicCard } from "./learning-topic-card";

import type {
  LearningTopicItem,
  LearningTopicsResponse,
} from "@/types/learning-topics";

async function fetchLearningTopics(
  includeGlobal: boolean,
): Promise<LearningTopicsResponse> {
  const params = new URLSearchParams();
  if (includeGlobal) params.set("includeGlobal", "true");
  const res = await fetch(`/api/learning-topics?${params.toString()}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Status ${res.status}`);
  }
  return (await res.json()) as LearningTopicsResponse;
}

export function LearningTopicsPage() {
  const [includeGlobal, setIncludeGlobal] = useState(false);
  const [topics, setTopics] = useState<LearningTopicItem[]>([]);
  const [activeCount, setActiveCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingTopic, setTogglingTopic] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchLearningTopics(includeGlobal);
        if (!cancelled) {
          setTopics(data.topics);
          setActiveCount(data.activeCount);
        }
      } catch (err) {
        if (!cancelled) {
          setTopics([]);
          setActiveCount(0);
          setError(err instanceof Error ? err.message : "Kon topics niet laden.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [includeGlobal]);

  async function handleToggle(topic: string, isActive: boolean) {
    const previous = topics;
    setTogglingTopic(topic);
    setTopics((current) =>
      current.map((item) =>
        item.topic === topic ? { ...item, isActive } : item,
      ),
    );
    setActiveCount((count) => count + (isActive ? 1 : -1));

    try {
      const res = await fetch("/api/learning-topics", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, isActive }),
      });
      const body = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !body.ok) {
        throw new Error(body.error ?? `Status ${res.status}`);
      }
      const data = await fetchLearningTopics(includeGlobal);
      setTopics(data.topics);
      setActiveCount(data.activeCount);
    } catch (err) {
      setTopics(previous);
      setActiveCount(previous.filter((item) => item.isActive).length);
      setError(err instanceof Error ? err.message : "Kon voorkeur niet opslaan.");
    } finally {
      setTogglingTopic(null);
    }
  }

  const ownTopics = topics.filter((item) => item.isOwn);
  const globalTopics = topics.filter((item) => !item.isOwn);

  return (
    <div className="space-y-6">
      <GlobalTopicsToggle checked={includeGlobal} onChange={setIncludeGlobal} />

      {error && (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <span>
          <span className="font-medium text-foreground">{activeCount}</span> actieve
          {activeCount === 1 ? " topic" : " topics"}
        </span>
        {activeCount === 0 && !loading && (
          <Link
            href={APP_ROUTES.generator}
            className="font-medium text-accent underline-offset-2 hover:underline"
          >
            Oefeningen genereren
          </Link>
        )}
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-2xl border border-border bg-muted/40"
            />
          ))}
        </div>
      ) : ownTopics.length === 0 && !includeGlobal ? (
        <p className="text-sm text-muted-foreground">
          Nog geen eigen topics.{" "}
          <Link
            href={APP_ROUTES.generator}
            className="font-medium text-accent underline-offset-2 hover:underline"
          >
            Genereer oefeningen
          </Link>{" "}
          en sla ze op om je leerplan samen te stellen.
        </p>
      ) : (
        <div className="space-y-8">
          {ownTopics.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-foreground">Mijn topics</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {ownTopics.map((item) => (
                  <LearningTopicCard
                    key={item.topic}
                    item={item}
                    toggling={togglingTopic === item.topic}
                    onToggle={handleToggle}
                  />
                ))}
              </div>
            </section>
          )}

          {includeGlobal && globalTopics.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-foreground">Globale topics</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {globalTopics.map((item) => (
                  <LearningTopicCard
                    key={item.topic}
                    item={item}
                    toggling={togglingTopic === item.topic}
                    onToggle={handleToggle}
                  />
                ))}
              </div>
            </section>
          )}

          {includeGlobal && globalTopics.length === 0 && ownTopics.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Geen globale topics beschikbaar.
            </p>
          )}

          {topics.length === 0 && includeGlobal && (
            <p className="text-sm text-muted-foreground">
              Geen topics gevonden. Genereer eerst oefeningen via de generator.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
