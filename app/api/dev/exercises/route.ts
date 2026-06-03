import { z } from "zod";

import { getSupabaseServerClient } from "@/lib/supabase/server";

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

const requestSchema = z.object({
  topic: z.string().nullable().optional(),
  exercises: z
    .array(
      z.object({
        source_text: z.string().min(1),
        target_text: z.string().min(1),
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

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json(
      { ok: false, error: "Niet ingelogd." },
      { status: 401 },
    );
  }

  const { topic, exercises } = parseResult.data;
  const requestBody = parseResult.data;

  const rowsToInsert = exercises.map((ex) => ({
    source_text: ex.source_text,
    target_text: ex.target_text,
    topic: topic ?? null,
    owner_id: user.id,
  }));

  const { data, error, status, statusText, count } = await supabase
    .from("exercises")
    .insert(rowsToInsert)
    .select("id, source_text, target_text, topic, owner_id, created_at");

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
    rows: data,
    requestBody,
    supabaseResponse,
  });
}
