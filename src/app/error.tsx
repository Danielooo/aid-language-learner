"use client";

import { useEffect } from "react";

import { Container } from "@/components/ui/container";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Hook voor latere observability (Sentry/Vercel). Voor nu: console
    // is acceptabel in een error-boundary — niet in business-code.
    console.error(error);
  }, [error]);

  return (
    <Container
      width="sm"
      className="flex flex-1 flex-col items-center justify-center gap-6 py-24 text-center"
    >
      <div className="space-y-2">
        <p className="text-muted-foreground text-sm font-medium">
          Er ging iets mis
        </p>
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">
          De pagina kon niet worden geladen
        </h1>
        <p className="text-muted-foreground text-sm">
          Probeer het opnieuw. Blijft de fout terugkomen, ververs dan de pagina.
        </p>
      </div>
      <button
        type="button"
        onClick={reset}
        className="bg-accent text-accent-foreground inline-flex min-h-11 items-center justify-center rounded-md px-5 text-sm font-medium transition-colors hover:opacity-90"
      >
        Opnieuw proberen
      </button>
      {error.digest && (
        <p className="text-muted-foreground text-xs">
          Fout-ID: <code className="font-mono">{error.digest}</code>
        </p>
      )}
    </Container>
  );
}
