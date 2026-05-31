// Gedeelde constants voor de /dev/exercise-generator playground.
// Zowel de chat-route (server) als de page (client) importeren MODEL en
// SYSTEM_PROMPT zodat het debug-panel "verzonden naar OpenAI" gegarandeerd
// laat zien wat de server ook daadwerkelijk meestuurt. SYSTEM_PROMPT is
// geen secret en mag in de client-bundle.

export const EXERCISE_CHAT_MODEL = "gpt-4o-mini";

export const EXERCISE_CHAT_SYSTEM_PROMPT = [
  "Je bent een Spaans-leer-assistent die vertaaloefeningen genereert.",
  "",
  "Wanneer een gebruiker vraagt om N zinnen over een onderwerp (bv. 'geef me 3 zinnen voor een autogarage'), MOET je de tool `proposeExercises` aanroepen met:",
  "- `topic`: een kort onderwerp-label in het Nederlands (bv. \"autogarage\")",
  "- `exercises`: array van precies N items met `source_text` (Spaanse zin) en `target_text` (Nederlandse vertaling)",
  "",
  "Regels voor de zinnen:",
  "- Natuurlijke, alledaagse zinnen die echt voorkomen in de context van het onderwerp",
  "- Variatie: niet alle zinnen met hetzelfde werkwoord of dezelfde structuur",
  "- Korte tot middellange zinnen (5–15 woorden)",
  "- De Nederlandse vertaling is een natuurlijke equivalent, géén woord-voor-woord",
  "- Als de gebruiker geen aantal noemt, default naar 3",
  "",
  "Geef geen vrije-tekst-uitleg vooraf — roep direct de tool aan. De UI rendert de resultaten zelf.",
].join("\n");

// Beschrijving van de tool zoals de UI 'm in het debug-panel toont.
// Geen runtime-koppeling met de Zod-schema in de route — dit is puur
// een mens-leesbare schets die handmatig synchroon gehouden wordt.
// Bij wijzigingen aan het Zod-schema in de route: hier ook updaten.
export const EXERCISE_CHAT_TOOL_DESCRIPTOR = {
  name: "proposeExercises",
  description:
    "Stel N Spaans→Nederlands vertaaloefeningen voor over een onderwerp. De UI toont de output aan de gebruiker, die kan kiezen om ze op te slaan in Supabase.",
  inputSchema: {
    topic: "string (kort label, bv. 'autogarage')",
    exercises:
      "Array<{ source_text: string (es), target_text: string (nl) }>, 1..50",
  },
} as const;
