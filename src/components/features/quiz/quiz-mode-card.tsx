"use client";

import Link from "next/link";

import type { ReactNode } from "react";

const cardBase =
  "flex h-full min-h-28 flex-col rounded-2xl border p-5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30";

const cardIdle =
  "border-border bg-card hover:border-accent/40 hover:bg-muted/40";

const cardSelected =
  "border-accent bg-gradient-to-br from-accent/20 via-accent/5 to-card ring-2 ring-accent/30";

type QuizModeCardProps = {
  title: string;
  description: string;
  icon?: ReactNode;
  href?: string;
  selected?: boolean;
  onSelect?: () => void;
  comingSoon?: boolean;
};

/** Gelijkvormige keuzetegel: link, selectie-toggle, of disabled. */
export function QuizModeCard({
  title,
  description,
  icon,
  href,
  selected = false,
  onSelect,
  comingSoon = false,
}: QuizModeCardProps) {
  const className = [
    cardBase,
    selected ? cardSelected : cardIdle,
    comingSoon && !href && !onSelect ? "cursor-default opacity-90" : "",
    onSelect ? "cursor-pointer" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {icon && (
            <span className="bg-accent/10 text-accent flex size-10 shrink-0 items-center justify-center rounded-md">
              {icon}
            </span>
          )}
          <h3 className="text-foreground text-base font-semibold">{title}</h3>
        </div>
        {comingSoon && (
          <span className="border-border bg-muted text-muted-foreground shrink-0 rounded-md border px-2 py-0.5 text-xs font-medium">
            Binnenkort
          </span>
        )}
      </div>
      <p className="text-muted-foreground mt-3 text-sm">{description}</p>
    </>
  );

  if (href && !comingSoon) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  if (onSelect) {
    return (
      <button
        type="button"
        role="radio"
        aria-checked={selected}
        onClick={onSelect}
        className={className}
      >
        {content}
      </button>
    );
  }

  return <div className={className}>{content}</div>;
}

function IconShell({ children }: { children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-5"
    >
      {children}
    </svg>
  );
}

export function FlashcardsIcon() {
  return (
    <IconShell>
      <rect x="3" y="5" width="14" height="14" rx="2" />
      <path d="M7 3h12a2 2 0 0 1 2 2v12" />
    </IconShell>
  );
}

export function TypenIcon() {
  return (
    <IconShell>
      <path d="M4 6h16" />
      <path d="M8 6v12" />
      <path d="M4 18h8" />
      <path d="M14 14h6" />
      <path d="M17 11v6" />
    </IconShell>
  );
}

export function SorterenIcon() {
  return (
    <IconShell>
      <path d="M4 7h10" />
      <path d="M4 12h14" />
      <path d="M4 17h8" />
      <path d="M18 5v4l2-2" />
      <path d="M18 15v4l2-2" />
    </IconShell>
  );
}
