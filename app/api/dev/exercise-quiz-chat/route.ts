import { convertToModelMessages, streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

import {
  EXERCISE_QUIZ_CHAT_MODEL,
  buildQuizChatSystemPrompt,
} from "@/lib/ai/exercise-quiz-chat-config";
import { getSupabaseServerClient } from "@/lib/supabase/server";

import type { UIMessage } from "ai";

// Chat-route voor /dev/exercise-generator-quiz. De LLM krijgt geen tools —
// dit is een uitleg-chat zonder structured output. Het system-prompt verschilt
// per `mode`:
//   - "before": gebruiker heeft nog niet ingediend → target_text wordt door
//     de prompt-builder weggelaten zelfs als de client 'm meestuurde, zodat
//     de LLM 'm fysiek niet kan spoileren.
//   - "after":  gebruiker heeft ingediend → target_text + userAnswer +
//     isCorrect zitten in de prompt zodat de LLM kan uitleggen/valideren.

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const exerciseSchema = z.object({
  source_text: z.string().min(1),
  target_text: z.string().min(1),
  topic: z.string().nullable().optional(),
});

const bodySchema = z.object({
  messages: z.array(z.unknown()).min(1),
  mode: z.enum(["before", "after"]),
  exercise: exerciseSchema,
  userAnswer: z.string().optional(),
  isCorrect: z.boolean().optional(),
});

export async function POST(req: Request) {
  // Quiz-chat is alleen nuttig als je ingelogd bent en daadwerkelijk
  // oefent. Voorkomt dat een onauth'd client de chat aanroept.
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Niet ingelogd." }, { status: 401 });
  }

  const json = (await req.json().catch(() => null)) as unknown;
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request body", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { messages, mode, exercise, userAnswer, isCorrect } = parsed.data;

  // Bij "before"-mode strippen we target_text uit de prompt-input zodat de
  // LLM 'm hoe-dan-ook niet ziet, ook al stuurt de client het mee in de
  // body voor het debug-panel.
  const promptExercise =
    mode === "before"
      ? {
          source_text: exercise.source_text,
          topic: exercise.topic ?? null,
        }
      : {
          source_text: exercise.source_text,
          target_text: exercise.target_text,
          topic: exercise.topic ?? null,
        };

  const systemPrompt = buildQuizChatSystemPrompt({
    mode,
    exercise: promptExercise,
    userAnswer,
    isCorrect,
  });

  const result = streamText({
    model: openai(EXERCISE_QUIZ_CHAT_MODEL),
    system: systemPrompt,
    messages: await convertToModelMessages(messages as UIMessage[]),
  });

  return result.toUIMessageStreamResponse();
}
