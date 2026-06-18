"use client";

import type { SearchDebugSnapshot } from "./types";

// Debug-panel onderaan de pagina: toont de laatste search-pipeline
// (embed-query, cosine pre-filter, LLM-zoek). Consistent met de andere
// /dev pagina's; alle details in collapsibles zodat de hoofd-UI rustig
// blijft.

export function SearchDebug({ snapshot }: { snapshot: SearchDebugSnapshot }) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold text-muted-foreground">
        Debug — laatste search-pipeline
      </h3>

      <div className="rounded-md border border-border bg-card px-4 py-2 text-card-foreground">
        <p className="text-xs">
          <span className="font-medium text-foreground">Query: </span>
          <em>&quot;{snapshot.query}&quot;</em>
        </p>
        <p className="text-[10px] text-muted-foreground">
          Scope: {snapshot.scopeSize} records · interne top-K: {snapshot.topK}{" "}
          · zoekmodel: {snapshot.searchModel}
        </p>
      </div>

      {snapshot.embedQuery && (
        <details className="rounded-md border border-border bg-card text-card-foreground">
          <summary className="cursor-pointer px-4 py-2 text-xs font-medium text-muted-foreground">
            1. POST {snapshot.embedQuery.url}{" "}
            <span
              className={`ml-2 rounded px-1.5 py-0.5 text-[9px] font-medium ${snapshot.embedQuery.ok ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-destructive/10 text-destructive"}`}
            >
              {snapshot.embedQuery.ok ? "OK" : "FOUT"}
            </span>
          </summary>
          <div className="px-4 pb-4">
            <pre className="max-h-[300px] overflow-auto rounded bg-muted/40 p-3 font-mono text-[10px]">
              {JSON.stringify(snapshot.embedQuery.response, null, 2)}
            </pre>
          </div>
        </details>
      )}

      <details className="rounded-md border border-border bg-card text-card-foreground">
        <summary className="cursor-pointer px-4 py-2 text-xs font-medium text-muted-foreground">
          2. Cosine pre-filter ({snapshot.cosineCandidates.length})
        </summary>
        <div className="px-4 pb-4">
          <pre className="max-h-[300px] overflow-auto rounded bg-muted/40 p-3 font-mono text-[10px]">
            {JSON.stringify(snapshot.cosineCandidates, null, 2)}
          </pre>
        </div>
      </details>

      {snapshot.search && (
        <details className="rounded-md border border-border bg-card text-card-foreground">
          <summary className="cursor-pointer px-4 py-2 text-xs font-medium text-muted-foreground">
            3. Zoeken (LLM) — POST {snapshot.search.url}{" "}
            <span
              className={`ml-2 rounded px-1.5 py-0.5 text-[9px] font-medium ${snapshot.search.ok ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-destructive/10 text-destructive"}`}
            >
              {snapshot.search.ok ? "OK" : "FOUT"}
            </span>
          </summary>
          <div className="space-y-2 px-4 pb-4">
            <div>
              <p className="text-[10px] font-medium text-muted-foreground">
                Request
              </p>
              <pre className="max-h-[300px] overflow-auto rounded bg-muted/40 p-3 font-mono text-[10px]">
                {JSON.stringify(snapshot.search.request, null, 2)}
              </pre>
            </div>
            <div>
              <p className="text-[10px] font-medium text-muted-foreground">
                Response
              </p>
              <pre className="max-h-[300px] overflow-auto rounded bg-muted/40 p-3 font-mono text-[10px]">
                {JSON.stringify(snapshot.search.response, null, 2)}
              </pre>
            </div>
          </div>
        </details>
      )}
    </section>
  );
}
