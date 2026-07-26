---

purpose: >
  Dit document legt uit hoe de Vercel AI SDK in de app is ingericht:
  hoe system-prompts zijn opgebouwd, welke tool-calling-regels gelden,
  en hoe de agent stopt na een tool-call. 

---



---

## Generator en de AI SDK

Voor de Generator (genereert tekst en audio oefeningen) wordt de Vercel AI SDK gebruikt. In de browser praat de UI via de functies `useChat` en `DefaultChatTransport` met een Next.js-route; die route streamt met `streamText` (OpenAI `gpt-4o-mini`) en stuurt het antwoord terug als UI-message-stream. System-prompts voor deze feature staan in `src/lib/ai/*`. Met uittesten blijkt dit oudere OpenAI model voldoende om kwalitatief goede zinnen te genereren. Doordat het wat ouder en simpeler is, verbruikt het minder tokens en kan de user een hoog aantal requests worden geboden. Bij Tekst vult `proposeExercises` zelf Spaans→NL-oefeningen in (Zod-schema); bij Audio levert `proposeAudioExercises` alleen keywords en haalt `execute` echte spraakoefeningen met audio op via de Tatoeba API, dit zijn bestaande oefeningen uit de API en er zullen geen oefeningen worden verzonnen. De run stopt met `stopWhen: [hasToolCall(propose…), stepCountIs(3)]`: na de propose-tool (of na maximaal drie stappen), zodat de AI niet oneindig bezig is. Voor elke request die je doet gaat je dagelijkse quotum een omlaag. Dit gaat via de functie `assertAndConsumeAiQuota`.


### Scheiding IN SCOPE en OUT OF SCOPE
In de system-prompt van de Generator wordt erop gestuurd dat de output zich richt op Spaans->Nederlandse oefeningen. De eerste prompts zijn:
**"Je bent een Spaans-leer-assistent in een oefeningengenerator.",**
**"Default: elke vraag om zinnen/oefeningen over een thema of situatie is Spaans→Nederlands — ook zonder dat de gebruiker 'Spaans' of 'vertaling' zegt.",**
Na wat testen zijn er een aantal regels toegevoegd. Bijvoorbeeld:
**"- Informele of slang-thema's mogen; kies passend alledaags Spaans",**
Dit was nodig omdat de AI sommige onderwerpen zoals 'typische Gen-Z taal' buiten scope zag. Dit terwijl er wel om oefeningen werd gevraagd. Na de toevoeging werkte het wel.

### Ontdubbelen
en schrijven voor dat het model bij een geldige vraag eerst tool `listExistingExercises` aanroept (bronzinnen uit het hele persoonlijke Leerplan) — en daarna de propose-tool, die relevante oefeningen aandient. Hier is voor gekozen om te zorgen dat je niet je Leerplan ernaast hoeft te houden om te checken of je dubbele oefeningen aan het genereren bent. 

 De tool kijkt naar de oefeningen in Leerplan en haalt dubbelingen uit de gegenereerde oefeningen; de UI toont alleen de propose-output in de voorstel-tabel. 


---

## Chat ondersteuning en de AI SDK

Voor de chat tijdens Oefenen (hulp bij één actieve oefening in Flashcards, Typen of Sorteren) wordt ook de Vercel AI SDK gebruikt. De UI (`ExerciseChat`) praat via `useChat` en `DefaultChatTransport` met `POST /api/quiz/chat`; die route streamt met `streamText` (OpenAI `gpt-4o-mini`) als UI-message-stream. Het system-prompt bouwt `buildQuizChatSystemPrompt` in `src/lib/ai/exercise-quiz-chat-config.ts` per request. Zelfde modelkeuze als de Generator: kort en concreet genoeg voor uitleg over één zin, met minder tokens. Anders dan de Generator heeft deze chat **geen tools** en geen AI-quotum. De guardrails zijn ingesteld om de focus van de applicatie op het leren van taal te houden. En niet een chatbot beschikbaar te stellen waar je ongerelateerde dingen aan kan vragen.

### Twee modes: before en after

**before**
Er is nog geen antwoord gegeveg. De AI mag woorden, grammatica en hints geven, maar **niet** de volledige Nederlandse vertaling. De server stript `target_text` uit de prompt, ook als de client die meestuurt, zodat spoileren onmogelijk is.

**after**
Intussen wordt het antwoord in de UI getoond. Dan zitten `target_text`, gebruikersantwoord en daadwerkelijke antwoord (goed/fout) in de prompt voor uitleg en alternatieven. De chat wijzigt de score niet.

### Scheiding IN SCOPE en OUT OF SCOPE

Beide modes delen één GUARDRAIL: alleen vragen over **deze** oefening. IN SCOPE: woorden, grammatica, register, idiomen, alternatieve vertalingen. OUT OF SCOPE (andere zinnen, algemene lesstof, off-topic) wordt geweigerd met exact:
**"Ik kan alleen vragen over deze oefening beantwoorden."**
Twijfelgevallen: liever beantwoorden dan weigeren, zolang het over deze zin of vertaling kan gaan.

