import { z } from "zod";

import { getExerciseUserAccess } from "@/lib/exercises/exercise-access";
import { ensurePersonalExerciseGroup } from "@/lib/exercises/ensure-personal-exercise-group";

// Persist-route voor de oefeningen-generator. Accepteert een batch
// vertaaloefeningen die de user (na review van de chat-output) wil
// opslaan. Sinds auth ingevoerd is wordt elke nieuwe rij eigenaar
// van de huidige user via `owner_id`. RLS dwingt sowieso af dat
// `owner_id = auth.uid()`, maar we sturen 'm expliciet mee voor
// duidelijke fouten en voor het debug-panel.
//
// Returnt zowel de echo van de request body als de Supabase-response,
// zodat de UI beide in debug-panels kan tonen ("verzonden naar Supabase",
// "ontvangen van Supabase").

export const dynamic = "force-dynamic";
export const maxDuration = 30;

function parseTagsCsv(value: string): string[] {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

const requestSchema = z.object({
  topic: z.string().min(1),
  exercises: z
    .array(
      z.object({
        source_text: z.string().min(1),
        target_text: z.string().min(1),
        tags: z
          .string()
          .min(1)
          .refine((value) => parseTagsCsv(value).length >= 2, {
            message: "Minimaal 2 tags vereist.",
          }),
        alternative_translations: z.array(z.string()).optional(),
      }),
    )
    .min(1)
    .max(100),
});

export async function POST(req: Request) {
  let parsedBody: unknown;
  try {
    parsedBody = await req.json();
  } catch {
    return Response.json(
      { ok: false, error: "Body is geen geldige JSON." },
      { status: 400 },
    );
  }

  const parseResult = requestSchema.safeParse(parsedBody);
  if (!parseResult.success) {
    return Response.json(
      {
        ok: false,
        error: "Validatie mislukt.",
        issues: parseResult.error.issues,
      },
      { status: 400 },
    );
  }

  const access = await getExerciseUserAccess();
  if (!access.ok) {
    return Response.json(
      { ok: false, error: "Niet ingelogd." },
      { status: 401 },
    );
  }

  const { topic, exercises } = parseResult.data;
  const requestBody = parseResult.data;
  const supabase = access.supabase;

  const groupResult = await ensurePersonalExerciseGroup(
    supabase,
    access.userId,
    topic,
  );
  if (!groupResult.ok) {
    return Response.json(
      { ok: false, error: groupResult.error, requestBody },
      { status: 500 },
    );
  }

  const rowsToInsert = exercises.map((ex) => ({
    source_text: ex.source_text,
    target_text: ex.target_text,
    topic,
    tags: ex.tags,
    alternative_translations: ex.alternative_translations ?? [],
    owner_id: access.userId,
    group_id: groupResult.groupId,
  }));

  const { data, error, status, statusText, count } = await supabase
    .from("exercises")
    .insert(rowsToInsert)
    .select(
      "id, source_text, target_text, topic, owner_id, group_id, created_at",
    );

  // Volledige Supabase-response retourneren zodat de UI het debug-panel kan vullen.
  const supabaseResponse = { data, error, status, statusText, count };

  if (error) {
    return Response.json(
      {
        ok: false,
        error: error.message,
        requestBody,
        supabaseResponse,
      },
      { status: 500 },
    );
  }

  return Response.json({
    ok: true,
    inserted: data?.length ?? 0,
    groupId: groupResult.groupId,
    groupName: topic.trim(),
    rows: data,
    requestBody,
    supabaseResponse,
  });
}
