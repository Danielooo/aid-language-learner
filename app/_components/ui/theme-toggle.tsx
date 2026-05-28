"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

const options = [
  { value: "light", label: "Licht" },
  { value: "dark", label: "Donker" },
  { value: "system", label: "Systeem" },
] as const;

type ThemeValue = (typeof options)[number]["value"];

// Driestandentoggle (light / dark / system). next-themes hydrateert
// async; vóór mount renderen we een neutrale placeholder om FOUC en
// hydration-mismatches te voorkomen.
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const current = (mounted ? theme : undefined) as ThemeValue | undefined;

  return (
    <div
      role="radiogroup"
      aria-label="Thema"
      className="border-border bg-card inline-flex rounded-md border p-1 text-sm"
    >
      {options.map((option) => {
        const isActive = current === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => setTheme(option.value)}
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
  );
}
