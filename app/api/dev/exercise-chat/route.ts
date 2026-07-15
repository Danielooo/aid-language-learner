import { convertToModelMessages, hasToolCall, streamText, tool } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

import {
  EXERCISE_CHAT_MODEL,
  EXERCISE_CHAT_SYSTEM_PROMPT,
} from "@/lib/ai/exercise-generator-config";
import {
  assertAndConsumeAiQuota,
  getSessionUser,
} from "@/lib/auth/assert-ai-quota";

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
        tags: z
          .array(z.string().min(1))
          .min(2)
          .max(5)
          .describe(
            "Minimaal 2 korte NL tags (streef 4) over grammatica, thema of context.",
          ),
        alternative_translations: z
          .array(z.string().min(2))
          .max(3)
          .optional()
          .describe(
            "Streef naar 1 extra correcte NL vertaling, anders geformuleerd.",
          ),
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
  draftSummary?: {
    topic: string;
    count: number;
    existingSourceTexts: string[];
  };
};

function buildSystemPrompt(draftSummary?: ChatRequestBody["draftSummary"]): string {
  if (!draftSummary || draftSummary.count === 0) {
    return EXERCISE_CHAT_SYSTEM_PROMPT;
  }

  const existingList = draftSummary.existingSourceTexts
    .map((text) => `- ${text}`)
    .join("\n");

  return [
    EXERCISE_CHAT_SYSTEM_PROMPT,
    "",
    "Draft-context (reeds in de tabel):",
    `- topic: "${draftSummary.topic}"`,
    `- aantal bestaande zinnen: ${draftSummary.count}`,
    "Bestaande Spaanse zinnen (niet opnieuw genereren):",
    existingList,
  ].join("\n");
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return Response.json({ error: "Niet ingelogd." }, { status: 401 });
  }

  const quota = await assertAndConsumeAiQuota(user);
  if (!quota.ok) {
    return Response.json({ error: quota.error }, { status: quota.status });
  }

  const { messages, draftSummary } = (await req.json()) as ChatRequestBody;

  const result = streamText({
    model: openai(EXERCISE_CHAT_MODEL),
    system: buildSystemPrompt(draftSummary),
    messages: await convertToModelMessages(messages),
    tools: { proposeExercises },
    stopWhen: hasToolCall("proposeExercises"),
  });

  return result.toUIMessageStreamResponse();
}
