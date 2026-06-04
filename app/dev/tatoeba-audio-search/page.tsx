// /dev/tatoeba-audio-search — semantische zoekmachine over een
// localStorage-corpus van Tatoeba audio-records.
//
// Flow:
//   1. Klik "Haal corpus op" → server pagineert Tatoeba en embed alle
//      sentences via text-embedding-3-small (512 dims). Resultaat in
//      localStorage per `lang`.
//   2. Type een query in de chat → server embed de query, client doet
//      cosine-similarity tegen de huidige scope (= top van de stack),
//      en optioneel een LLM-rerank voor strakkere selectie + samenvatting.
//   3. Resultaat push't op de selectie-stack; tabel toont de top.
//      Volgende query verfijnt binnen de huidige selectie. "Terug"-knop
//      pop't één niveau.
//
// Bewust geen `useChat` van @ai-sdk/react: onze "chat" is geen pure
// LLM-stream maar een pipeline (embed → cosine → optionele rerank).
// Een handgerolde state-machine geeft meer controle over de stack.

import { AudioSearchPage } from "./_components/audio-search-page";

export const dynamic = "force-dynamic";

export default function TatoebaAudioSearchPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Tatoeba audio-zoeken (semantisch)
        </h1>
        <p className="text-sm text-muted-foreground">
          Haal eenmalig 500 Tatoeba-zinnen + embeddings op (gecached in
          localStorage), en zoek er semantisch in via natuurlijke taal.
          Multi-turn: elke nieuwe query verfijnt de huidige selectie. De
          &quot;Terug&quot;-knop pop&apos;t één stap terug.
        </p>
      </header>

      <AudioSearchPage />
    </div>
  );
}
