import {
  convertToModelMessages,
  hasToolCall,
  stepCountIs,
  streamText,
  tool,
} from "ai";
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
import { listPersonalSourceTexts } from "@/lib/exercises/list-personal-source-texts";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { searchAudioExercises } from "@/lib/tatoeba/search-audio-exercises";

import type { UIMessage } from "ai";

// Audio-generator: multi-step — list Leerplan-bronteksten, daarna
// proposeAudioExercises (Tatoeba-zoek met exacte source_text-uitsluiting).

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const listExistingExercisesSchema = z.object({});

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
  const draftSourceTexts = draftSummary?.existingSourceTexts ?? [];

  const supabase = await getSupabaseServerClient();
  const listed = await listPersonalSourceTexts(supabase, user.id);
  const excludeSourceTexts = [...listed.sourceTexts, ...draftSourceTexts];

  const listExistingExercises = tool({
    description:
      "Haal Spaanse bronzinnen op uit het hele persoonlijke Leerplan. Roep dit aan vóór proposeAudioExercises bij elke IN-SCOPE zoek-vraag.",
    inputSchema: listExistingExercisesSchema,
    execute: async () => listed,
  });

  // Tool binnen POST zodat execute exclude-lijsten uit draft + Leerplan kan gebruiken.
  const proposeAudioExercises = tool({
    description:
      "Alleen voor Spaans→Nederlands oefeningen mét Tatoeba-audio. Zoek N hits bij een onderwerp; vermijd overlap met listExistingExercises en de draft. De UI toont ze zodat de gebruiker kan opslaan.",
    inputSchema: proposeAudioExercisesSchema,
    execute: async (input) => {
      const result = await searchAudioExercises({
        ...input,
        excludeAudioIds,
        excludeSourceTexts,
      });
      if (!result.ok) {
        return {
          ok: false as const,
          topic: input.topic,
          exercises: [] as const,
          error: result.error,
        };
      }
      if (result.exercises.length === 0) {
        return {
          ok: false as const,
          topic: input.topic,
          exercises: [] as const,
          error:
            "Geen nieuwe spraakoefeningen gevonden — ze stonden al in je Leerplan of voorstel. Probeer andere zoekwoorden.",
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
    tools: { listExistingExercises, proposeAudioExercises },
    stopWhen: [hasToolCall("proposeAudioExercises"), stepCountIs(3)],
  });

  return result.toUIMessageStreamResponse();
}
