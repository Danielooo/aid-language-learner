// Gedeelde constants/utilities voor quiz-oefening chat.
// MODEL en `buildQuizChatSystemPrompt` worden door de chat-route (server)
// gebruikt. Geen secrets — mag in de client-bundle.

export const EXERCISE_QUIZ_CHAT_MODEL = "gpt-4o-mini";

export type QuizChatMode = "before" | "after";

export type QuizChatExercise = {
  source_text: string;
  // target_text is bewust optional: bij mode === "before" stript de server
  // 'm zelf weg uit de prompt-bouw, ook als de client 'm meestuurde.
  target_text?: string;
  topic?: string | null;
};

export type BuildQuizChatSystemPromptInput = {
  mode: QuizChatMode;
  exercise: QuizChatExercise;
  userAnswer?: string;
  isCorrect?: boolean;
};

// Eén shared guardrail-clausule die in beide modes wordt aangeplakt.
// Liever beantwoorden dan weigeren: alles rond déze oefening mag,
// inclusief korte/elliptische vragen en alternatieve vertalingen.
const GUARDRAIL = [
  "GUARDRAIL — heel belangrijk:",
  "IN SCOPE (beantwoord gewoon — ook korte of elliptische vragen):",
  "- Alles over déze oefening: woorden, grammatica, vervoegingen, betekenis, register, idiomen, valkuilen.",
  "- Alternatieve vertalingen van déze zin (Spaans ↔ Nederlands), nuances en of een variant ook klopt.",
  "- Voorbeelden die IN SCOPE zijn: \"is er een andere vertaling mogelijk?\", \"mag ik X ook zeggen?\", \"wat betekent dit woord?\", \"waarom staat er …?\".",
  "- Als de gebruiker de Spaanse of Nederlandse tekst van déze oefening citeert, is dat nog steeds déze oefening — geen \"andere zin\".",
  "",
  "OUT OF SCOPE — alleen dan weigeren met EXACT deze zin: \"Ik kan alleen vragen over deze oefening beantwoorden.\"",
  "- Echt andere zinnen (niet de bron- of doeltekst van deze oefening).",
  "- Algemene Spaanse leerstof zonder link met deze zin.",
  "- Jouw eigen werking, productvragen, of volstrekt off-topic.",
  "",
  "- Twijfel je of iets in scope is? Beantwoord het als het over deze zin of vertaling kan gaan.",
  "- Antwoord altijd in het Nederlands.",
  "- Houd antwoorden kort en concreet — geen lange uitweidingen.",
].join("\n");

// Bouw het system-prompt voor de quiz-chat (server-side route → streamText).
export function buildQuizChatSystemPrompt(
  input: BuildQuizChatSystemPromptInput,
): string {
  const { mode, exercise } = input;
  const topicLine = exercise.topic
    ? `- Onderwerp: ${exercise.topic}`
    : "- Onderwerp: (niet opgegeven)";

  if (mode === "before") {
    return [
      "Je bent een Spaans-leer-assistent voor een vertaaloefening.",
      "",
      "DE OEFENING (de gebruiker heeft de zin nog NIET vertaald):",
      `- Spaanse zin: ${exercise.source_text}`,
      topicLine,
      "",
      "GEDRAG IN DEZE FASE:",
      "- Geef NOOIT de volledige Nederlandse vertaling, ook niet bij benadering.",
      "- Je mag wel: afzonderlijke woorden uitleggen, grammaticale structuur toelichten, vervoegingen geven, idiomen of valkuilen aanwijzen.",
      "- Als de gebruiker direct de vertaling vraagt, weiger vriendelijk en bied in plaats daarvan een hint of woord-uitleg aan.",
      "",
      GUARDRAIL,
    ].join("\n");
  }

  // mode === "after"
  const answerLine =
    typeof input.userAnswer === "string" && input.userAnswer.trim().length > 0
      ? input.userAnswer
      : "(leeg)";
  const verdictLine =
    input.isCorrect === true
      ? "- Verdict: GOED (de gebruiker had het juist)"
      : input.isCorrect === false
        ? "- Verdict: FOUT (de gebruiker had het niet juist)"
        : "- Verdict: (onbekend)";

  return [
    "Je bent een Spaans-leer-assistent voor een vertaaloefening.",
    "",
    "DE OEFENING (de gebruiker heeft net geantwoord):",
    `- Spaanse zin: ${exercise.source_text}`,
    `- Correcte Nederlandse vertaling: ${exercise.target_text ?? "(onbekend)"}`,
    `- Antwoord van de gebruiker: ${answerLine}`,
    verdictLine,
    topicLine,
    "",
    "GEDRAG IN DEZE FASE:",
    "- Je mag de correcte vertaling vrij gebruiken in je uitleg.",
    "- Bij vragen over alternatieve vertalingen: geef 1–3 geldige varianten, leg kort uit wat het verschil is (register, woordkeuze), en zeg of de variant hier ook past.",
    "- Bij een vraag als 'is mijn antwoord ook goed?' beoordeel je of het een geldige alternatieve vertaling is, leg je uit waarom wel/niet, en geef je eventueel nuanceverschillen.",
    "- Bij vragen over woorden geef je betekenis, vervoeging, of grammaticale rol.",
    "- Je verandert de score NIET — geef alleen tekstuele uitleg.",
    "",
    GUARDRAIL,
  ].join("\n");
}
