"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

type CopyableCredentialFieldProps = {
  label: string;
  value: string;
};

export function CopyableCredentialField({
  label,
  value,
}: CopyableCredentialFieldProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-1">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="font-mono text-sm break-all text-foreground">{value}</p>
      </div>
      <button
        type="button"
        onClick={handleCopy}
        aria-label={`${label} kopiëren`}
        className={cn(
          "shrink-0 cursor-pointer rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted",
          copied && "border-ring text-foreground",
        )}
      >
        {copied ? "Gekopieerd!" : "Kopieer"}
      </button>
    </div>
  );
}
