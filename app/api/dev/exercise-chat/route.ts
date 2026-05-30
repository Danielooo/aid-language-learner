import { convertToModelMessages, hasToolCall, streamText, tool } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

import {
  EXERCISE_CHAT_MODEL,
  EXERCISE_CHAT_SYSTEM_PROMPT,
} from "@/lib/ai/exercise-generator-config";

import type { UIMessage } from "ai";

// Dev-playground chat-route. De LLM krijgt één tool aangereikt
// (`proposeExercises`) waarmee 'ie een gestructureerde lijst van
// Spaans→Nederlands vertaalzinnen kan voorstellen. De tool is
// puur output-shaping: `execute` echo't de input zodat de UI de
// gevalideerde JSON in de tool-result-part terugkrijgt.
//
// `stopWhen: hasToolCall("proposeExercises")` zorgt dat de chat
// na de tool-call afrondt en de LLM niet nog een vrije-tekst
// turn krijgt over de zinnen die 'ie net heeft gegenereerd —
// bespaart tokens en houdt de UI-flow voorspelbaar.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const proposeExercisesSchema = z.object({
  topic: z
    .string()
    .min(1)
    .describe("Kort onderwerp-label in het Nederlands, bv. 'autogarage'."),
  exercises: z
    .array(
      z.object({
        source_text: z
          .string()
          .min(2)
          .describe("Spaanse zin (bron-taal)."),
        target_text: z
          .string()
          .min(2)
          .describe("Nederlandse vertaling van de zin."),
      }),
    )
    .min(1)
    .max(50)
    .describe("Lijst voorgestelde vertaaloefeningen."),
});

const proposeExercises = tool({
  description:
    "Stel N Spaans→Nederlands vertaaloefeningen voor over een onderwerp. De UI toont de output aan de gebruiker, die kan kiezen om ze op te slaan in Supabase.",
  inputSchema: proposeExercisesSchema,
  execute: async (input) => input,
});

type ChatRequestBody = {
  messages: UIMessage[];
};

export async function POST(req: Request) {
  const { messages } = (await req.json()) as ChatRequestBody;

  const result = streamText({
    model: openai(EXERCISE_CHAT_MODEL),
    system: EXERCISE_CHAT_SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    tools: { proposeExercises },
    stopWhen: hasToolCall("proposeExercises"),
  });

  return result.toUIMessageStreamResponse();
}
