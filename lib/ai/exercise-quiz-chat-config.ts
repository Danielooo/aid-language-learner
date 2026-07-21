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
// Strikt: alleen vragen over de actuele oefening; al het andere wordt
// vriendelijk geweigerd in een vaste zin zodat de UI er voorspelbaar uitziet.
const GUARDRAIL = [
  "GUARDRAIL — heel belangrijk:",
  "- Beantwoord ALLEEN vragen die direct gaan over deze ene oefening: de Spaanse zin, woorden erin, grammatica, vervoegingen, vertalingsalternatieven.",
  "- Vragen over andere onderwerpen (algemene Spaanse leerstof, andere zinnen, jouw eigen werking, off-topic) wijs je af met EXACT deze zin: \"Ik kan alleen vragen over deze oefening beantwoorden.\"",
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
    "- Bij een vraag als 'is mijn antwoord ook goed?' beoordeel je of het een geldige alternatieve vertaling is, leg je uit waarom wel/niet, en geef je eventueel nuanceverschillen.",
    "- Bij vragen over woorden geef je betekenis, vervoeging, of grammaticale rol.",
    "- Je verandert de score NIET — geef alleen tekstuele uitleg.",
    "",
    GUARDRAIL,
  ].join("\n");
}
