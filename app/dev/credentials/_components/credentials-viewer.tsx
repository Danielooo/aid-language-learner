"use client";

import { useState } from "react";

import { CopyableCredentialField } from "@/app/dev/credentials/_components/copyable-credential-field";
import {
  formatUserCredentials,
  type CredUser,
  type ParsedCredMd,
} from "@/lib/dev/parse-cred-md";
import { cn } from "@/lib/utils";

type CredentialsViewerProps = {
  parsed: ParsedCredMd;
};

function CopyAllButton({ user }: { user: CredUser }) {
  const [copied, setCopied] = useState(false);

  async function handleCopyAll() {
    try {
      await navigator.clipboard.writeText(formatUserCredentials(user));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopyAll}
      className={cn(
        "cursor-pointer rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground transition-colors hover:bg-accent/90",
        copied && "opacity-90",
      )}
    >
      {copied ? "Alles gekopieerd!" : "Kopieer alles"}
    </button>
  );
}

export function CredentialsViewer({ parsed }: CredentialsViewerProps) {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {parsed.title}
        </h1>
        {parsed.introLines.length > 0 && (
          <div className="space-y-1 text-sm text-muted-foreground">
            {parsed.introLines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        )}
      </header>

      <div className="grid gap-4">
        {parsed.users.map((user) => (
          <section
            key={user.username}
            className="space-y-4 rounded-lg border border-border bg-card p-5 text-card-foreground"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold">{user.username}</h2>
              <CopyAllButton user={user} />
            </div>

            <div className="space-y-4">
              {user.fields.map((field) => (
                <CopyableCredentialField
                  key={`${user.username}-${field.label}`}
                  label={field.label}
                  value={field.value}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
