import { buildWiktionaryContext } from "@/lib/ai/wiktionary-context";

// Debug-endpoint. Bouwt exact dezelfde context als de chat-route maar
// streamt niets — geeft de raw JSON terug die de UI in haar
// debug-panels rendert. Geen OpenAI-call, dus gratis.

export const dynamic = "force-dynamic";

const MODEL = "gpt-4o-mini";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const word = url.searchParams.get("word") ?? "";
  const focusLang = url.searchParams.get("focus") ?? "es";

  const context = await buildWiktionaryContext(word, focusLang);

  return Response.json({
    model: MODEL,
    word: context.word,
    focusLang: context.focusLang,
    systemPrompt: context.systemPrompt,
    wiktionaryResult: context.wiktionaryResult,
  });
}
