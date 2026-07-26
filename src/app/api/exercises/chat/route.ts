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
  EXERCISE_CHAT_MODEL,
  EXERCISE_CHAT_SYSTEM_PROMPT,
} from "@/lib/ai/exercise-generator-config";
import {
  assertAndConsumeAiQuota,
  getSessionUser,
} from "@/lib/auth/assert-ai-quota";
import {
  buildNormalizedSourceTextSet,
  listPersonalSourceTexts,
  normalizeSourceText,
} from "@/lib/exercises/list-personal-source-texts";
import { getSupabaseServerClient } from "@/lib/supabase/server";

import type { UIMessage } from "ai";

// Generator Tekst: multi-step tool-calling.
// 1) `listExistingExercises` — bronzinnen uit heel Leerplan
// 2) `proposeExercises` — gestructureerde voorstellen; hard filter op exacte
//    overlap met Leerplan + draft.
//
// `stopWhen: [hasToolCall("proposeExercises"), stepCountIs(3)]` stopt na
// de propose-tool (list stopt niet) met een safety-cap op stappen.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const listExistingExercisesSchema = z.object({});

const proposeExercisesSchema = z.object({
  topic: z
    .string()
    .min(1)
    .describe("Kort onderwerp-label in het Nederlands, bv. 'autogarage'."),
  exercises: z
    .array(
      z.object({
        source_text: z.string().min(2).describe("Spaanse zin (bron-taal)."),
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

type ChatRequestBody = {
  messages: UIMessage[];
  draftSummary?: {
    topic: string;
    count: number;
    existingSourceTexts: string[];
  };
};

function buildSystemPrompt(
  draftSummary?: ChatRequestBody["draftSummary"],
): string {
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

  const supabase = await getSupabaseServerClient();
  const listed = await listPersonalSourceTexts(supabase, user.id);
  const excludeSet = buildNormalizedSourceTextSet([
    ...listed.sourceTexts,
    ...(draftSummary?.existingSourceTexts ?? []),
  ]);

  const listExistingExercises = tool({
    description:
      "Haal Spaanse bronzinnen op uit het hele persoonlijke Leerplan. Roep dit aan vóór proposeExercises bij elke IN-SCOPE genereer-vraag.",
    inputSchema: listExistingExercisesSchema,
    execute: async () => listed,
  });

  const proposeExercises = tool({
    description:
      "Alleen voor Spaans→Nederlands vertaaloefeningen. Stel N zinnen voor over een onderwerp; vermijd exacte overlap met listExistingExercises en de draft. De UI toont ze zodat de gebruiker kan opslaan.",
    inputSchema: proposeExercisesSchema,
    execute: async (input) => {
      const filtered = input.exercises.filter(
        (ex) => !excludeSet.has(normalizeSourceText(ex.source_text)),
      );
      const droppedDuplicates = input.exercises.length - filtered.length;

      if (filtered.length === 0) {
        return {
          ok: false as const,
          topic: input.topic,
          exercises: [] as const,
          droppedDuplicates,
          error:
            "Alle voorgestelde zinnen staan al in je Leerplan of in dit voorstel. Probeer een ander thema of andere formuleringen.",
        };
      }

      return {
        ok: true as const,
        topic: input.topic,
        exercises: filtered,
        droppedDuplicates,
      };
    },
  });

  const result = streamText({
    model: openai(EXERCISE_CHAT_MODEL),
    system: buildSystemPrompt(draftSummary),
    messages: await convertToModelMessages(messages),
    tools: { listExistingExercises, proposeExercises },
    stopWhen: [hasToolCall("proposeExercises"), stepCountIs(3)],
  });

  return result.toUIMessageStreamResponse();
}
