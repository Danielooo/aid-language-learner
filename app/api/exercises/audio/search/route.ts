import { z } from "zod";

import { getSessionUser } from "@/lib/auth/assert-ai-quota";
import { searchAudioExercises } from "@/lib/tatoeba/search-audio-exercises";

// Losse zoek-route (zelfde pipeline als chat-tool execute).
// Handig voor hergebruik/tests zonder LLM-roundtrip.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const requestSchema = z.object({
  topic: z.string().min(1),
  count: z.number().int().min(1).max(30).default(10),
  keywords: z.array(z.string().min(1)).min(1).max(8),
  tags: z.array(z.string().min(1)).min(2).max(5),
});

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return Response.json({ ok: false, error: "Niet ingelogd." }, { status: 401 });
  }

  let parsedBody: unknown;
  try {
    parsedBody = await req.json();
  } catch {
    return Response.json(
      { ok: false, error: "Body is geen geldige JSON." },
      { status: 400 },
    );
  }

  const parsed = requestSchema.safeParse(parsedBody);
  if (!parsed.success) {
    return Response.json(
      {
        ok: false,
        error: "Validatie mislukt.",
        issues: parsed.error.issues,
      },
      { status: 400 },
    );
  }

  const result = await searchAudioExercises(parsed.data);
  if (!result.ok) {
    return Response.json({ ok: false, error: result.error }, { status: 502 });
  }

  return Response.json({
    ok: true,
    topic: result.topic,
    exercises: result.exercises,
    urls: result.urls,
  });
}
