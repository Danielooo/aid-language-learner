// Gedeelde types voor de /dev/tatoeba-audio-search client-componenten.
// Bewust gescheiden zodat we ze ook zonder de "use client"-bound
// component kunnen importeren in eventuele server-side helpers.

// Eén selectie in de undo-stack. De wortel ("alle 500 records") is
// `query: null`. Elke verfijning push't een nieuwe `Selection` boven
// op de stack; "Terug" pop't de top.
export type Selection = {
  id: string;
  query: string | null;
  audioIds: number[];
  summary: string;
  // Korte motivatie per match — alleen aanwezig bij rerank-runs zodat
  // we in de tabel kunnen tonen waaróm de LLM die zin koos.
  reasonsById: Record<number, string>;
  // Cosine-scores voor diagnose; ook alleen aanwezig na een query.
  cosineById: Record<number, number>;
};

// Eén bericht in de chat-history. Bewust geen UIMessage uit de AI SDK:
// onze flow is geen pure LLM-stream, maar een pipeline van embed →
// cosine → optionele rerank.
export type ChatMessage =
  | {
      role: "user";
      id: string;
      query: string;
    }
  | {
      role: "assistant";
      id: string;
      // Linkt aan een Selection.id zodat klikken op een ouder bericht
      // de tabel terug-kan-springen naar die selectie.
      selectionId: string;
      summary: string;
      matchCount: number;
      // 'rerank' = LLM heeft gefilterd en herrangschikt;
      // 'cosine' = puur cosine top-K, geen LLM-call.
      mode: "rerank" | "cosine";
    }
  | {
      role: "system-error";
      id: string;
      error: string;
    };

// Snapshot van de laatst-uitgevoerde search-pipeline, voor het
// debug-panel onderaan de pagina.
export type SearchDebugSnapshot = {
  query: string;
  scopeSize: number;
  topK: number;
  rerankRequested: boolean;
  embedQuery?: { url: string; response: unknown; ok: boolean };
  rerank?: { url: string; request: unknown; response: unknown; ok: boolean };
  cosineCandidates: Array<{
    audio_id: number;
    source_text: string;
    cosine: number;
  }>;
};
