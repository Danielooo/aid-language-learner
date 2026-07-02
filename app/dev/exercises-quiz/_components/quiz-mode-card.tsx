"use client";

import Link from "next/link";

type QuizModeCardProps = {
  title: string;
  description: string;
  href?: string;
  comingSoon?: boolean;
};

export function QuizModeCard({
  title,
  description,
  href,
  comingSoon = true,
}: QuizModeCardProps) {
  const className = href
    ? "block rounded-lg border border-border bg-card p-5 text-card-foreground transition-colors hover:bg-muted/50"
    : "cursor-default rounded-lg border border-border bg-card p-5 text-card-foreground opacity-90";

  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold">{title}</h3>
        {comingSoon && (
          <span className="shrink-0 rounded-md border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            Binnenkort
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}
