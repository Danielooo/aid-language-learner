import { convertToModelMessages, hasToolCall, streamText, tool } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

import {
  AUDIO_EXERCISE_CHAT_MODEL,
  AUDIO_EXERCISE_CHAT_SYSTEM_PROMPT,
} from "@/lib/ai/audio-exercise-generator-config";
import {
  assertAndConsumeAiQuota,
  getSessionUser,
} from "@/lib/auth/assert-ai-quota";
import { searchAudioExercises } from "@/lib/tatoeba/search-audio-exercises";

import type { UIMessage } from "ai";

// Audio-generator chat: LLM levert zoekintentie; tool-execute haalt
// Tatoeba-hits op zodat de UI dezelfde voorstel→opslaan-flow krijgt
// als de tekstgenerator.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const proposeAudioExercisesSchema = z.object({
  topic: z
    .string()
    .min(1)
    .describe("Kort onderwerp-label in het Nederlands, bv. 'restaurant'."),
  count: z
    .number()
    .int()
    .min(1)
    .max(20)
    .describe("Gewenst aantal oefeningen (max 20)."),
  keywords: z
    .array(z.string().min(1))
    .min(1)
    .max(8)
    .describe("Spaanse zoekwoorden voor Tatoeba."),
  tags: z
    .array(z.string().min(1))
    .min(2)
    .max(5)
    .describe("Minimaal 2 korte NL tags over thema of grammatica."),
});

type ChatRequestBody = {
  messages: UIMessage[];
  draftSummary?: {
    topic: string;
    count: number;
    existingSourceTexts: string[];
    existingAudioIds: number[];
  };
};

function buildSystemPrompt(
  draftSummary?: ChatRequestBody["draftSummary"],
): string {
  if (!draftSummary || draftSummary.count === 0) {
    return AUDIO_EXERCISE_CHAT_SYSTEM_PROMPT;
  }

  const existingList = draftSummary.existingSourceTexts
    .map((text) => `- ${text}`)
    .join("\n");

  return [
    AUDIO_EXERCISE_CHAT_SYSTEM_PROMPT,
    "",
    "Draft-context (reeds in de tabel):",
    `- topic: "${draftSummary.topic}"`,
    `- aantal bestaande zinnen: ${draftSummary.count}`,
    "Bestaande Spaanse zinnen (vermijd overlap via andere keywords):",
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
  const excludeAudioIds = draftSummary?.existingAudioIds ?? [];

  // Tool binnen POST zodat execute exclude-IDs uit draftSummary kan gebruiken.
  const proposeAudioExercises = tool({
    description:
      "Alleen voor Spaans→Nederlands oefeningen mét Tatoeba-audio. Zoek N hits bij een onderwerp; de UI toont ze zodat de gebruiker kan opslaan.",
    inputSchema: proposeAudioExercisesSchema,
    execute: async (input) => {
      const result = await searchAudioExercises({
        ...input,
        excludeAudioIds,
      });
      if (!result.ok) {
        return {
          ok: false as const,
          topic: input.topic,
          exercises: [] as const,
          error: result.error,
        };
      }
      return {
        ok: true as const,
        topic: result.topic,
        exercises: result.exercises,
      };
    },
  });

  const result = streamText({
    model: openai(AUDIO_EXERCISE_CHAT_MODEL),
    system: buildSystemPrompt(draftSummary),
    messages: await convertToModelMessages(messages),
    tools: { proposeAudioExercises },
    stopWhen: hasToolCall("proposeAudioExercises"),
  });

  return result.toUIMessageStreamResponse();
}
