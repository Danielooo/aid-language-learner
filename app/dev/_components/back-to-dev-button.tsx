"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Toont een "terug naar /dev"-knop op alle /dev/* subpagina's, maar niet
// op /dev zelf om een no-op-link te voorkomen. Client-component vanwege
// usePathname; verder ultradun.
export function BackToDevButton() {
  // const pathname = usePathname();
  // if (pathname === "/dev") return null;

  return (
    <Link
      href="/dev"
      className="inline-flex w-fit items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
    >
      <ArrowLeftIcon />
      Terug naar dev/
    </Link>
  );
}

function ArrowLeftIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}
