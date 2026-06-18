"use client";

import { useEffect, useRef } from "react";

import type { UploadDescriptor, UploadResponse } from "./types";

// Zes collapsible debug-panels die de volledige roundtrip blootleggen:
//
//   1. Verzonden naar Tatoeba (sectie A): URL + parsed query
//   2. Ontvangen van Tatoeba (sectie A): raw JSON
//   3. Verzonden naar Tatoeba (sectie B): URL + parsed query
//   4. Ontvangen van Tatoeba (sectie B): raw JSON
//   5. Verzonden naar Supabase Storage: laatste upload-args
//   6. Ontvangen van Supabase Storage: laatste upload-response
//
// ⌘+/ toggelt alle panels tegelijk (zelfde patroon als
// [app/dev/exercise-generator/page.tsx](../../exercise-generator/page.tsx)).

export type TatoebaCall = {
  url: string;
  params: Record<string, string>;
  response: unknown;
  ok: boolean;
};

export function DebugPanels({
  audioCall,
  sentencesCall,
  lastUploadRequest,
  lastUploadResponse,
}: {
  audioCall: TatoebaCall | null;
  sentencesCall: TatoebaCall | null;
  lastUploadRequest: UploadDescriptor | null;
  lastUploadResponse: UploadResponse | null;
}) {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!e.metaKey || e.key !== "/") return;
      const sec = sectionRef.current;
      if (!sec) return;
      e.preventDefault();
      const detailsList = sec.querySelectorAll("details");
      const anyOpen = Array.from(detailsList).some((d) => d.open);
      detailsList.forEach((d) => {
        d.open = !anyOpen;
      });
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <section ref={sectionRef} className="space-y-3">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        Debug-panels
        <kbd className="rounded border border-border bg-muted/40 px-1.5 py-0.5 font-mono text-[10px] font-normal text-muted-foreground/70">
          ⌘ /
        </kbd>
      </h2>

      <DetailsPanel title="1. Verzonden naar Tatoeba — /unstable/audios (sectie A)">
        {audioCall ? (
          <div className="space-y-2">
            <UrlLine url={audioCall.url} />
            <JsonBlock data={audioCall.params} />
          </div>
        ) : (
          <Empty>Nog geen request — vul het formulier in en verstuur.</Empty>
        )}
      </DetailsPanel>

      <DetailsPanel title="2. Ontvangen van Tatoeba — /unstable/audios (sectie A)">
        {audioCall ? (
          <JsonBlock data={audioCall.response} />
        ) : (
          <Empty>Nog geen response.</Empty>
        )}
      </DetailsPanel>

      <DetailsPanel title="3. Verzonden naar Tatoeba — /v1/sentences?has_audio=yes (sectie B)">
        {sentencesCall ? (
          <div className="space-y-2">
            <UrlLine url={sentencesCall.url} />
            <JsonBlock data={sentencesCall.params} />
          </div>
        ) : (
          <Empty>Nog geen request.</Empty>
        )}
      </DetailsPanel>

      <DetailsPanel title="4. Ontvangen van Tatoeba — /v1/sentences?has_audio=yes (sectie B)">
        {sentencesCall ? (
          <JsonBlock data={sentencesCall.response} />
        ) : (
          <Empty>Nog geen response.</Empty>
        )}
      </DetailsPanel>

      <DetailsPanel title="5. Verzonden naar Supabase Storage (laatste upload-args)">
        {lastUploadRequest ? (
          <JsonBlock data={lastUploadRequest} />
        ) : (
          <Empty>
            Nog niets geüpload. Klik op &quot;Upload naar Supabase&quot; bij een
            audio of gebruik de bulk-upload-knop.
          </Empty>
        )}
      </DetailsPanel>

      <DetailsPanel title="6. Ontvangen van Supabase Storage (laatste response)">
        {lastUploadResponse ? (
          <JsonBlock data={lastUploadResponse} />
        ) : (
          <Empty>Nog geen Supabase-response.</Empty>
        )}
      </DetailsPanel>
    </section>
  );
}

function DetailsPanel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <details className="rounded-md border border-border bg-card text-card-foreground">
      <summary className="cursor-pointer px-4 py-2 text-xs font-medium text-muted-foreground">
        {title}
      </summary>
      <div className="px-4 pb-4">{children}</div>
    </details>
  );
}

function JsonBlock({ data }: { data: unknown }) {
  return (
    <pre className="max-h-[400px] overflow-auto rounded bg-muted/40 p-3 font-mono text-xs">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

function UrlLine({ url }: { url: string }) {
  return (
    <div className="rounded-md border border-border bg-muted/30 p-2 text-xs">
      <span className="font-medium text-foreground">URL: </span>
      <code className="font-mono break-all">{url}</code>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted-foreground">{children}</p>;
}
