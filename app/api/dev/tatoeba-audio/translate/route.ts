import { generateObject, NoObjectGeneratedError } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

import {
  TATOEBA_TRANSLATE_MODEL,
  TATOEBA_TRANSLATE_SYSTEM_PROMPT,
  buildTranslateUserMessage,
} from "@/lib/ai/tatoeba-translate-config";

// Translate-route voor de tabel op /dev/tatoeba-audio. Krijgt een batch
// items (max 50 per call) binnen, en vertaalt ze in één LLM-rondje naar
// Nederlands. Bewust `generateObject` i.p.v. een tool-call: de taak is
// deterministisch en de output-vorm vast — een tool-call zou alleen
// extra protocol-overhead toevoegen zonder semantische winst.
//
// De client chunkt zelf in batches van 50 met Promise.all om grote
// tabel-selecties (bv. 200+ rijen) parallel weg te schrijven; deze
// route hoeft alleen één batch te verwerken.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_ITEMS_PER_REQUEST = 50;

const inputSchema = z.object({
  items: z
    .array(
      z.object({
        audio_id: z.number().int().positive(),
        source_text: z.string().min(1),
        source_lang: z
          .string()
          .min(2)
          .max(4)
          .regex(/^[a-z]+$/, "lang moet een ISO 639-3 code zijn"),
      }),
    )
    .min(1)
    .max(MAX_ITEMS_PER_REQUEST),
});

// Output van de LLM. We laten de LLM de audio_id's terug-mappen zodat
// de UI eenduidig kan koppelen, ook als de volgorde verschuift.
const outputSchema = z.object({
  translations: z.array(
    z.object({
      audio_id: z.number().int().positive(),
      translation: z.string().min(1),
    }),
  ),
});

export type TranslateRequestBody = z.infer<typeof inputSchema>;
export type TranslateOutput = z.infer<typeof outputSchema>;

export type TranslateSuccess = {
  ok: true;
  translations: TranslateOutput["translations"];
  // Echo zodat het debug-panel exact ziet wat we naar OpenAI stuurden.
  request: {
    model: string;
    system: string;
    prompt: string;
    items: TranslateRequestBody["items"];
  };
};

export type TranslateFailure = {
  ok: false;
  error: string;
  reason?:
    | "validation"
    | "no_api_key"
    | "missing_translations"
    | "no_object_generated"
    | "openai_error";
  // Bij missing_translations: de audio_ids waar geen vertaling voor terugkwam.
  missing_audio_ids?: number[];
};

export type TranslateResponse = TranslateSuccess | TranslateFailure;

export async function POST(req: Request): Promise<Response> {
  let parsedBody: unknown;
  try {
    parsedBody = await req.json();
  } catch {
    return Response.json(
      {
        ok: false,
        error: "Body is geen geldige JSON.",
        reason: "validation",
      } satisfies TranslateFailure,
      { status: 400 },
    );
  }

  const parseResult = inputSchema.safeParse(parsedBody);
  if (!parseResult.success) {
    return Response.json(
      {
        ok: false,
        error: "Validatie mislukt.",
        reason: "validation",
      } satisfies TranslateFailure,
      { status: 400 },
    );
  }

  const { items } = parseResult.data;

  if (!process.env.OPENAI_API_KEY) {
    return Response.json(
      {
        ok: false,
        error: "OPENAI_API_KEY is niet geconfigureerd op de server.",
        reason: "no_api_key",
      } satisfies TranslateFailure,
      { status: 500 },
    );
  }

  const prompt = buildTranslateUserMessage(items);

  try {
    const result = await generateObject({
      model: openai(TATOEBA_TRANSLATE_MODEL),
      schema: outputSchema,
      schemaName: "TatoebaTranslations",
      schemaDescription:
        "Per audio_id één Nederlandse vertaling van de bron-zin.",
      system: TATOEBA_TRANSLATE_SYSTEM_PROMPT,
      prompt,
      temperature: 0.2,
    });

    // Sanity-check: de LLM moet voor élk audio_id een vertaling teruggeven.
    // Bij mismatch kunnen we niet veilig partieel cachen, dus we falen hard.
    const requestedIds = new Set(items.map((i) => i.audio_id));
    const returnedIds = new Set(
      result.object.translations.map((t) => t.audio_id),
    );
    const missing = Array.from(requestedIds).filter(
      (id) => !returnedIds.has(id),
    );
    if (missing.length > 0) {
      return Response.json(
        {
          ok: false,
          error: `LLM gaf geen vertaling voor ${missing.length} audio_id(s).`,
          reason: "missing_translations",
          missing_audio_ids: missing,
        } satisfies TranslateFailure,
        { status: 502 },
      );
    }

    return Response.json({
      ok: true,
      translations: result.object.translations,
      request: {
        model: TATOEBA_TRANSLATE_MODEL,
        system: TATOEBA_TRANSLATE_SYSTEM_PROMPT,
        prompt,
        items,
      },
    } satisfies TranslateSuccess);
  } catch (e) {
    if (NoObjectGeneratedError.isInstance(e)) {
      return Response.json(
        {
          ok: false,
          error:
            e.message ||
            "OpenAI kon geen geldig object genereren voor deze batch.",
          reason: "no_object_generated",
        } satisfies TranslateFailure,
        { status: 502 },
      );
    }
    return Response.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "Onbekende OpenAI-fout.",
        reason: "openai_error",
      } satisfies TranslateFailure,
      { status: 502 },
    );
  }
}
