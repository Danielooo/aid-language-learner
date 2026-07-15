// Gedeelde types voor de Tatoeba-import client-componenten.
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
  // Korte motivatie per match — alleen na zoeken op onderwerp.
  reasonsById: Record<number, string>;
  // Cosine-scores voor diagnose (intern, niet in UI).
  cosineById: Record<number, number>;
};

// Eén bericht in de chat-history. Bewust geen UIMessage uit de AI SDK:
// onze flow is geen pure LLM-stream, maar embed → cosine → LLM-zoek.
export type ChatMessage =
  | {
      role: "user";
      id: string;
      query: string;
    }
  | {
      role: "assistant";
      id: string;
      selectionId: string;
      summary: string;
      matchCount: number;
      // Alleen gezet na een zoek-query (niet bij initieel records laden).
      mode?: "search";
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
  searchModel: string;
  embedQuery?: { url: string; response: unknown; ok: boolean };
  search?: { url: string; request: unknown; response: unknown; ok: boolean };
  cosineCandidates: Array<{
    audio_id: number;
    source_text: string;
    cosine: number;
  }>;
};
