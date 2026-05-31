import { convertToModelMessages, streamText } from "ai";
import { openai } from "@ai-sdk/openai";

import { buildWiktionaryContext } from "@/lib/ai/wiktionary-context";

import type { UIMessage } from "ai";

// Hou de route dynamic — system prompt hangt af van een live Wiktionary
// fetch per request. Zonder dit zou Next.js bij build-time willen
// prerenderen.
export const dynamic = "force-dynamic";
export const maxDuration = 30;

type ChatRequestBody = {
  messages: UIMessage[];
  word?: string;
  focusLang?: string;
};

export async function POST(req: Request) {
  const { messages, word, focusLang } =
    (await req.json()) as ChatRequestBody;

  const { systemPrompt } = await buildWiktionaryContext(word, focusLang);

  const result = streamText({
    model: openai("gpt-4o-mini"),
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
