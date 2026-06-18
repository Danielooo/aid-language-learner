"use client";

import Link from "next/link";
import { useState } from "react";

import {
  getToolsByCategory,
  type DevTool,
  type DevToolCategory,
  type DevView,
} from "@/app/dev/_components/dev-tools";
import { cn } from "@/lib/utils";

const VIEW_OPTIONS: { value: DevView; label: string }[] = [
  { value: "lab", label: "Lab" },
  { value: "use", label: "Use" },
  { value: "both", label: "Both" },
];

const SECTION_LABELS: Record<DevToolCategory, string> = {
  lab: "Lab",
  use: "Use",
};

function DevToolCard({ tool }: { tool: DevTool }) {
  return (
    <li>
      <Link
        href={tool.href}
        className="block rounded-lg border border-border bg-card p-5 text-card-foreground transition-colors hover:border-ring"
      >
        <h3 className="text-base font-semibold">{tool.title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{tool.description}</p>
      </Link>
    </li>
  );
}

function DevToolSection({ category }: { category: DevToolCategory }) {
  const tools = getToolsByCategory(category);

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold tracking-tight text-foreground">
        {SECTION_LABELS[category]}
      </h2>
      <ul className="grid gap-3">
        {tools.map((tool) => (
          <DevToolCard key={tool.href} tool={tool} />
        ))}
      </ul>
    </section>
  );
}

export function DevIndexPage() {
  const [view, setView] = useState<DevView>("use");

  const showLab = view === "lab" || view === "both";
  const showUse = view === "use" || view === "both";

  return (
    <div className="space-y-6">
      <header className="space-y-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            API-playground
          </h1>
          <p className="text-sm text-muted-foreground">
            Verken externe API&apos;s (Lab) en gebruik de workflow-tools rond
            oefeningen en voortgang (Use).
          </p>
        </div>

        <div
          role="radiogroup"
          aria-label="Filter op categorie"
          className="border-border bg-card inline-flex rounded-md border p-1 text-sm"
        >
          {VIEW_OPTIONS.map((option) => {
            const isActive = view === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={isActive}
                onClick={() => setView(option.value)}
                className={cn(
                  "min-h-9 cursor-pointer rounded-sm px-3 font-medium transition-colors",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </header>

      <div className="space-y-8">
        {showLab && <DevToolSection category="lab" />}
        {showUse && <DevToolSection category="use" />}
      </div>
    </div>
  );
}
