import { searchTatoebaSentences } from "@/lib/api/tatoeba";

// Random Spaanse zin mét NL-vertaling voor de vertaal-quiz. Ééne plek
// die de externe API kent; client component praat alleen met deze route.

export const dynamic = "force-dynamic";

export type QuizSentence = {
  id: number;
  spanish: string;
  dutch: string[];
  attribution: { license: string; owner: string };
};

export async function GET() {
  const result = await searchTatoebaSentences({
    lang: "spa",
    transRequiredLang: "nld",
    transShowLang: "nld",
    sort: "random",
    limit: 1,
  });

  if (!result.ok) {
    return Response.json(
      { error: "Tatoeba-API gaf een fout terug.", detail: result.error },
      { status: 502 },
    );
  }

  const sentence = result.data.data[0];
  // Met sort=random + transRequiredLang in zeldzame gevallen 0 hits.
  if (!sentence) {
    return Response.json(
      { error: "Geen Spaanse zin met NL-vertaling gevonden, probeer opnieuw." },
      { status: 404 },
    );
  }

  // Filter NL-vertalingen, dedup op tekst (Tatoeba heeft soms duplicaten
  // met verschillende owners) en strip lege strings voor de zekerheid.
  const dutch = Array.from(
    new Set(
      (sentence.translations ?? [])
        .filter((t) => t.lang === "nld" && t.text.trim().length > 0)
        .map((t) => t.text),
    ),
  );

  if (dutch.length === 0) {
    return Response.json(
      { error: "Zin had geen bruikbare NL-vertaling, probeer opnieuw." },
      { status: 404 },
    );
  }

  const payload: QuizSentence = {
    id: sentence.id,
    spanish: sentence.text,
    dutch,
    attribution: { license: sentence.license, owner: sentence.owner },
  };

  return Response.json(payload);
}
