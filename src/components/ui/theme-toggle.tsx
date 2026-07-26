"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

function SunIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-4"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-4"
    >
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}

function MonitorIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-4"
    >
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8" />
      <path d="M12 17v4" />
    </svg>
  );
}

const options = [
  { value: "light", label: "Licht", Icon: SunIcon },
  { value: "dark", label: "Donker", Icon: MoonIcon },
  { value: "system", label: "Systeem", Icon: MonitorIcon },
] as const;

type ThemeValue = (typeof options)[number]["value"];

// Driestandentoggle (light / dark / system). next-themes hydrateert
// async; vóór mount renderen we een neutrale placeholder om FOUC en
// hydration-mismatches te voorkomen.
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Canoniek next-themes-patroon: pas na mount is het thema bekend.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const current = (mounted ? theme : undefined) as ThemeValue | undefined;

  return (
    <div
      role="radiogroup"
      aria-label="Thema"
      className="border-border bg-card inline-flex rounded-md border p-1"
    >
      {options.map((option) => {
        const isActive = current === option.value;
        const Icon = option.Icon;
        return (
          <span key={option.value} className="group relative inline-flex">
            <button
              type="button"
              role="radio"
              aria-checked={isActive}
              aria-label={option.label}
              onClick={() => setTheme(option.value)}
              className={cn(
                "inline-flex min-h-9 min-w-9 cursor-pointer items-center justify-center rounded-sm transition-colors",
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon />
            </button>
            <span
              role="tooltip"
              className="pointer-events-none absolute top-full left-1/2 z-50 mt-1.5 hidden -translate-x-1/2 rounded-md border border-border bg-card px-2 py-1 text-xs font-medium whitespace-nowrap text-foreground shadow-md group-hover:block group-focus-within:block"
            >
              {option.label}
            </span>
          </span>
        );
      })}
    </div>
  );
}
