"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const TABS = [
  { href: "/dev/exercise-generator", label: "Genereren" },
  { href: "/dev/my-exercises", label: "Mijn oefeningen" },
] as const;

export function ExerciseToolsTabs() {
  const pathname = usePathname();

  return (
    <nav
      className="flex gap-1 rounded-lg border border-border bg-muted/40 p-1"
      aria-label="Oefeningen-tools"
    >
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "rounded-md px-4 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
            aria-current={active ? "page" : undefined}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
