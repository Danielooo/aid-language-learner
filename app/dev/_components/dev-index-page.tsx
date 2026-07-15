"use client";

import Link from "next/link";

import { DEV_TOOLS, type DevTool } from "@/app/dev/_components/dev-tools";

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

export function DevIndexPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Dev-tools
        </h1>
        <p className="text-sm text-muted-foreground">
          Admin- en workflow-tools rond oefeningen, audio en voortgang.
        </p>
      </header>

      <ul className="grid gap-3">
        {DEV_TOOLS.map((tool) => (
          <DevToolCard key={tool.href} tool={tool} />
        ))}
      </ul>
    </div>
  );
}
