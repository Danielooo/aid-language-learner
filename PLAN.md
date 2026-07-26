# Eindopdracht checklists (D1–D4 + Quickscan)

Volgbaar checklist-document voor de hele eindopdracht. Bron: [EINDOPDRACHT.md](EINDOPDRACHT.md).

**Werkregel:** vink items af zodra ze klaar zijn — inclusief de **Quickscan** en het **Stappenplan**. Bij elke sessie: eerst Handoff → huidige stap → checklists bijwerken.

Schrijfplek verantwoordingsdocument: [verdoc/VW.md](verdoc/VW.md) (map lokaal, zie `.gitignore`). Geen commits tenzij gevraagd. **NOOIT** `IDEEFASE.md` lezen of editen.

---

## Handoff (laatst bijgewerkt: 2026-07-26)

**Lees dit eerst** bij een nieuwe agentsessie. Werk stap voor stap met de developer. Geen commits tenzij gevraagd.

### Exact hervatten (nu)

- **Stap:** **4 — Verantwoordingsdocument (D3)** (stap 3 docs ✅)
- **Productie-URL:** [https://aid-language-learner.vercel.app](https://aid-language-learner.vercel.app)
- **GitHub:** `https://github.com/Danielooo/aid-language-learner` (**public**)
- **Supabase API:** `https://inpdstwtqcfcjnrqvemp.supabase.co`
- **Docs-bronnen:** `docs/PROJECT-BRIEF.md`, `docs/PROMPT-LOG.md`, `docs/AI-DECISIONS.md`
- **ERD:** `verdoc/assets/figuur-01-erd.png` (+ `.mmd` bron)



### Volgende actie

1. VW-bullets in `verdoc/VW.md` (zie bestaande bullet-approach; bron = `docs/*`).
2. Bijlage A/B plakken uit PROMPT-LOG; C = Cursor-rules.
3. ERD als Figuur in VW-looptekst (APA); PDF via Pandoc.
4. Quickscan “Algemene eisen” + “AI gebruik” bijwerken.
5. Nice to haves **alleen op verzoek**.



### Startprompt (plakken in nieuwe chat)

> Lees `PLAN.md` Handoff + Stappenplan. We zitten op stap 4 (VW / D3). Vul `verdoc/VW.md` met bullets uit docs/; Bijlage A/B uit PROMPT-LOG. Geen commits tenzij gevraagd. UI-termen: `.cursor/rules/ui-terminology.mdc`. NOOIT `IDEEFASE.md`.



### Regels (kort)

- Canonieke NL UI (Topic, Leerplan, Gebruikersnaam, Herhaalschema, Beheer, …); code-ids niet hernoemen om UI
- Nice to haves onderaan — niet uit jezelf oppakken
- Broncode onder `src/` (leerlijn); imports via `@/*` → `src/*`

---



## Structuur t.o.v. leerlijn

Bron: EINDOPDRACHT § Repository structuur / screenshot.


| Leerlijn                                  | Dit project                                                  | Status                 |
| ----------------------------------------- | ------------------------------------------------------------ | ---------------------- |
| `.cursor/rules/`                          | `.cursor/rules/` (conventions, nextjs-app-router, …)         | OK                     |
| `.skills/`                                | `.agents/skills/` + `skills-lock.json`                       | Equivalent (Skills.sh) |
| `docs/PROJECT-BRIEF.md` e.d.              | `docs/` gevuld (BRIEF, PROMPT-LOG, AI-DECISIONS)             | OK                     |
| `src/app/`                                | `src/app/`                                                   | OK                     |
| `src/components/{ui,layout,features}`     | `src/components/` (ui + features; layout-map optioneel leeg) | OK                     |
| `src/hooks/`                              | `src/hooks/`                                                 | OK                     |
| `src/lib/` (supabase, utils, queryClient) | `src/lib/` + `src/components/query-provider.tsx`             | Equivalent             |
| `src/types/`                              | `src/types/`                                                 | OK                     |
| `src/app/api/agent/route.ts`              | `api/exercises/chat`, `exercises/audio/chat`, `quiz/chat`    | Mapping (geen dummy)   |
| `(auth)/login` + `register`               | aanwezig                                                     | OK                     |
| `proxy.ts`                                | `src/proxy.ts`                                               | OK                     |
| `tailwind.config.ts`                      | Tailwind v4 via CSS `@theme`                                 | Stack-equivalent       |
| Extra (`supabase/`, MCP, PLAN, …)         | behouden                                                     | Bewust                 |


---



## Stappenplan

Volgorde om de eindopdracht af te ronden. Eén stap tegelijk; pas door als de developer zegt dat de stap klaar is. Bij afronden: stap hier afvinken + relevante Quickscan-/D-checklists bijwerken.

### Stap 1 — Code opschonen

Doel: schone, presentabele codebase vóór documentatie en demo (criterium 1.4). Geen nieuwe features, geen nice-to-haves. Structuur-migratie = alleen verplaatsen + stubs (geen deletes).

- [x] **src/-migratie:** screenshot-indeling (`src/app`, `src/components`, `src/hooks`, `src/lib`, `src/types`, `docs/` stubs); `@/`* → `src/*`
- [x] **Inventory + dode code 1B:** orphans, unused exports, redirect-stubs, dode Tatoeba-admin UI/API weg; live Generator-audio behouden
- [x] **Unused deps** opruimen (`@dnd-kit/sortable`, ongebruikte `@nivo/`*)
- [x] **Lint & types:** `npm run lint` + `npm run typecheck` groen; `src/` Prettier
- [x] **eslint-disable:** opgeschoond; resterende met NL-waarom (generator/quiz patterns)
- [x] **Split** `audio-result-table` → types + parts + main
- [x] **Sanity:** `npm run build` + unit tests OK
- [x] PLAN: deze stap afvinken; Handoff → stap 2

**Klaar als:** structuur OK, geen bekende dode feature-code, lint/tsc groen, korte smoke OK. ✅

### Stap 2 — Product-gaps afronden

- [x] Supabase Auth Site URL + Redirect URLs op productie (+ localhost)
- [x] Prod-smoke: login + vier kernflows op Vercel
  - Auth: login `testuser1` / `testuser2` → `/oefenen`
  - Leren: flashcards (topic-keuze → kaart omdraaien → Goed/Fout)
  - Generator: stream + voorstel (`testuser2`; `testuser1` heeft `ai_disabled`)
  - Leerplan: 15 topics; Community: Overnemen 3 topics
- [x] Gaps-tabel syncen met werkelijkheid (repo **public**, README URLs OK)
- [x] Docent toegevoegd in Supabase-team (rol **Developer** — voldoende)
- [x] PLAN + Quickscan bijwerken

**Klaar als:** Auth URLs, prod-smoke, gaps sync, docent-toegang. ✅

### Stap 3 — Docs voor leerlijn / D3-voorbereiding

- [x] Inhoud vullen in `docs/PROJECT-BRIEF.md`, `docs/PROMPT-LOG.md`, `docs/AI-DECISIONS.md`
- [x] ERD klaarzetten — `verdoc/assets/figuur-01-erd.png` (gegenereerd uit live schema/FK’s; `.mmd` bron ernaast; mag later vervangen door Schema Visualizer-export)
- [x] App-prompts + agent-instructie verzameld in `docs/PROMPT-LOG.md` (P1–P5; bron voor VW-bijlage A/B)

**Klaar als:** drie docs gevuld, ERD-asset, prompts verzameld. ✅

### Stap 4 — Verantwoordingsdocument (D3) *(nu)*

- [ ] Schrijven in `verdoc/VW.md` via D3-checklist (alle vragen + structuur)
- [ ] 2500 - 4500 woorden; concrete voorbeelden; bijlagen
- [ ] Exporteren naar PDF; titelblad-meta + TOC + paginanummers
- [ ] Quickscan “Algemene eisen” + “AI gebruik” bijwerken



### Stap 5 — Presentatie (D4)

- [ ] Demo-script volgens D4-checklist (incl. RLS-bewijs + unhappy path)
- [ ] Live of opnemen (`.mp4` / `.mov`, max 12 min)
- [ ] Quickscan presentatie-items afvinken



### Stap 6 — Inlevercheck

- [ ] Alle deelproducten aanwezig (code, Supabase, VW-PDF, presentatie)
- [ ] Quickscan volledig nagelopen (alles `[x]` of bewust N/A)
- [ ] D1–D4-checklists finaliseren

---



## Quickscan

Randvoorwaarden uit [EINDOPDRACHT.md](EINDOPDRACHT.md). Beoordelaar kan teruggeven tot hieraan is voldaan. **Bijwerken zodra iets af kan.**

### Algemene eisen

- [ ] Naam van de student, inleverdatum en leerlijntitel zijn opgenomen op de titelpagina van het verantwoordingsdocument
- [ ] Het technisch verantwoordingsdocument is digitaal ingeleverd als PDF
- [ ] De GitHub repository URL is bijgevoegd in het verantwoordingsdocument
- [ ] De Vercel productie URL is bijgevoegd in het verantwoordingsdocument
- [ ] De Supabase API base URL is bijgevoegd in het verantwoordingsdocument en de betrokken docent is toegevoegd als administrator binnen je team in Supabase *(docent = Developer ✅; URL in VW → stap 4)*
- [ ] Alle deelopdrachten zijn uitgewerkt en de gevraagde deelproducten zijn aanwezig
- [ ] Het verantwoordingsdocument is goed leesbaar zonder storende grammatica- en spellingsfouten
- [ ] De omvang van het verantwoordingsdocument beslaat 2500–3000 woorden (exclusief inhoudsopgave en bijlagen)
- [ ] De presentatie duurt maximaal 12 minuten
- [ ] De eventuele videopresentatie is ingeleverd als .mp4 of .mov bestand
- [ ] Pagina's in het verantwoordingsdocument zijn genummerd en gerefereerd in de inhoudsopgave



### Inhoudelijke eisen

- [x] Het project is geüpload naar een GitHub repository: deze repository staat op **public**
- [x] Skills.sh is geïnstalleerd met minimaal 2 actieve skills (waaronder vercel-react-best-practices) — in `.agents/skills/`
- [x] README.md bevat heldere installatie-instructies die ervoor zorgen dat een collega developer het project zelfstandig kan draaien
- [x] De applicatie is geprogrammeerd in Next.js (App Router) met TypeScript en Tailwind CSS
- [x] De applicatie is gekoppeld aan een Supabase database met minimaal 4 tabellen
- [x] Het database schema bevat relaties en authenticatie
- [x] CRUD-operaties zijn geïmplementeerd met React Query
- [x] De Vercel AI SDK is geïmplementeerd met werkende AI Agent
- [x] Minimaal 1 externe API is geïntegreerd via Tool Calling
- [x] AI interpreteert/combineert data (niet alleen doorsturen)
- [x] Streaming responses zijn in de chat-interface geïmplementeerd
- [x] De applicatie is gedeployed op Vercel en bevat vier werkende functionaliteiten (lokaal/Fase 6 ✅; prod-smoke 2026-07-26 ✅)



### AI gebruik

- [x] Het gebruik van AI is toegestaan en verwacht bij deze eindopdracht
- [ ] Alle AI-prompts en uitgewerkte agent-instructie zijn toegevoegd als bijlage in het verantwoordingsdocument
- [ ] Architectuurbeslissingen gemaakt met AI-hulp zijn gedocumenteerd

---



## Eisen deelopdracht 1 — Broncode Next.js



### Stack en product

- [x] Full-stack webapp gebouwd met Cursor
- [x] Frontend: Next.js (App Router) + TypeScript + Tailwind CSS
- [x] Backend: Supabase
- [x] Externe data via netwerkrequests naar een API (Tatoeba)
- [x] AI verrijkt/interpreteert die data (niet alleen doorsturen)
- [x] Verrijkte resultaten worden waar nodig opgeslagen in de eigen database
- [x] Vercel AI SDK met werkende AI Agent
- [x] Minimaal 1 externe API geïntegreerd via Tool Calling (`proposeAudioExercises` → Tatoeba)
- [x] Streaming responses in de chat-interface
- [x] Applicatie gedeployed naar productie via Vercel — [https://aid-language-learner.vercel.app](https://aid-language-learner.vercel.app)
- [x] Werkt in development zonder kritieke runtime errors (Fase 6 smoke); productie opnieuw gecheckt (2026-07-26)



### Vier kernfunctionaliteiten

Minimaal vier, waarvan: registreren/inloggen, ≥1 AI-gedreven (agent-based), + twee casus-features.


| #   | Functionaliteit                                   | Type                   | Status |
| --- | ------------------------------------------------- | ---------------------- | ------ |
| 1   | Registreren en inloggen                           | verplicht (auth)       | [x]    |
| 2   | Generator (AI + tools + stream)                   | verplicht (AI / agent) | [x]    |
| 3   | Leren (Flashcards/Typen/Sorteren + herhaalschema) | casus                  | [x]    |
| 4   | Leerplan + Community (overnemen/bijdragen)        | casus                  | [x]    |


- [x] Agent-based flow met tool-calling + `stopWhen` (AI SDK 6; equivalent meerstaps/`maxSteps`) — criterium 1.3
- [x] Externe API + LLM-interpretatie met gebruikersinput — criterium 1.2
- [x] Alle vier functionaliteiten werken op Vercel — prod-smoke 2026-07-26 ✅



### Repo-structuur (leerlijn-intentie)

Dit project gebruikt `src/` volgens de leerlijn (zie § Structuur t.o.v. leerlijn).

- [x] `.cursor/rules/` aanwezig (projectregels)
- [x] Skills (≥2, incl. `vercel-react-best-practices`) — in `.agents/skills/` (Skills.sh): `vercel-react-best-practices`, `supabase-postgres-best-practices`, `ai-sdk`
- [x] `src/app`, `src/components`, `src/hooks`, `src/lib`, `src/types`
- [x] Query-client / provider (TanStack Query) — `src/components/query-provider.tsx`
- [x] `.env.example` (geen secrets)
- [x] `.gitignore`, TypeScript + Tailwind-config (v4 via CSS)
- [x] `README.md` met project-specifieke installatie
- [x] `docs/` gevuld (PROJECT-BRIEF, PROMPT-LOG, AI-DECISIONS)
- [x] Code is schoon, gestructureerd en onderhoudbaar (criterium 1.4)



### Git / GitHub

- [x] Project op GitHub; repository is **public**
- [x] Eerste commit = initiële projectopzet (historisch: gedaan)
- [x] Kleine, beschrijvende commits
- [x] Pull requests per feature; regelmatig mergen naar `main`
- [x] ≥20 kleine commits met zinvolle messages (criterium 1.5) — ~127 commits
- [x] ≥5 pull requests gemerged naar `main` (criterium 1.5) — 13 PRs



### Opleveren (D1)

- [x] README.md met heldere installatie-instructies (collega kan zelfstandig draaien)
- [x] GitHub-URL klaarzetten (formeel in D3; hier: `https://github.com/Danielooo/aid-language-learner` — **public**)
- [x] Vercel productie-URL klaarzetten — [https://aid-language-learner.vercel.app](https://aid-language-learner.vercel.app) (formeel ook in D3)

---



## Eisen deelopdracht 2 — Supabase + Auth + React Query



### Database

- [x] Schema met minimaal 4 tabellen (7: exercises, quiz_attempts, profiles, exercise_progress, user_topic_preferences, exercise_groups, exercise_group_submissions)
- [x] Logische relaties (foreign keys)
- [x] Constraints: primary keys, NOT NULL, UNIQUE waar passend
- [x] Criterium 2.1: schema + relaties + constraints kloppen



### Data in de app (React Query)

- [x] Voor relevante entiteiten: werkende **CRUD** (Create, Read, Update, Delete)
- [x] CRUD geïmplementeerd met **React Query (TanStack Query)** — caching en sync met de UI
- [x] Criterium 2.2: Query correct gebruikt voor databeheer



### Authenticatie en RLS

- [x] Registreren met Supabase Auth
- [x] Inloggen met Supabase Auth
- [x] Sessies correct afgehandeld in de applicatie
- [x] RLS ingeschakeld op relevante tabellen (alle 7 public-tabellen)
- [x] Policies: gebruiker leest/wijzigt/verwijdert alleen eigen data (koppeling via `user_id` / `owner_id`)
- [x] Criterium 2.3: Auth + RLS + policies



### Opleveren (D2)

- [x] Persoonlijke Supabase REST API base URL in README.md (URL: `https://inpdstwtqcfcjnrqvemp.supabase.co`)

---



## Eisen deelopdracht 3 — Verantwoordingsdocument

Werkbestand: [verdoc/VW.md](verdoc/VW.md). Beantwoord vragen tekstueel én met concrete voorbeelden (code, prompts, configs). Geen algemeenheden.

### Technische Implementatie AI-functionaliteit

- [ ] 1. Hoe haalt jouw applicatie data op uit de externe API?
- [ ] 2. Waar en hoe wordt deze data verwerkt voordat deze naar het model gaat?
- [ ] 3. Hoe ziet jouw input naar het model eruit? (prompt + data)
- [ ] 4. Hoe wordt de output van het model verwerkt in jouw applicatie?
- [ ] 5. Hoe heb je de stappen binnen jouw AI-agent met maxSteps ingericht? (in dit project: `stopWhen` / AI SDK 6-equivalent)
- [ ] 6. Welke tools en skills heb je geïntegreerd binnen de agent en waarom?
- [ ] 7. Hoe heb je foutafhandeling en fallback-mechanismen ingericht binnen de AI-flow?
- [ ] 8. Welke ontwerpkeuzes heb je gemaakt om de autonomie, betrouwbaarheid en voorspelbaarheid van de AI-functionaliteit te waarborgen?



### Database ontwerp en AI-gerelateerde dataverwerking

- [ ] 1. Laat visueel zien hoe jouw Supabase database eruitziet (leesbaar screenshot van het ERD)
- [ ] 2. Licht jouw database-schema toe aan de hand van het ERD (PK, FK, kardinaliteiten)
- [ ] 3. Hoe heb je Row Level Security (RLS) ingericht?
- [ ] 4. Welke policies heb je geschreven en wat doen deze precies? (concrete voorbeelden)
- [ ] 5. Welke rol speelt jouw database in de AI-functionaliteit? (DB → model-input; model-output → opslag)
- [ ] 6. Welke risico’s of beperkingen zie je in de combinatie van AI en jouw datamodel?
- [ ] 7. Hoe zou je jouw databaseontwerp aanpassen als AI-functionaliteit betrouwbaarder of schaalbaarder moet worden?



### AI-Assisted ontwikkelproces

- [ ] 1. Wat waren je initiële instructies aan Cursor? Hoe aangepast? Welke invloed op output?
- [ ] 2. Welke gebruikte .cursorrules werkten goed en waarom?
- [ ] 3. Hoe heb je gecontroleerd dat de gegenereerde code daadwerkelijk correct was en werkte?
- [ ] 4. In hoeverre had je het gevoel dat je controle had over de gegenereerde code en het ontwikkelproces?
- [ ] 5. In hoeverre heb je gegenereerde code zelf moeten aanpassen of herschrijven?
- [ ] 6. Minimaal 3 concrete beperkingen/onzekerheden in AI-output: oorzaak + effect op de app
- [ ] 7. Welke maatregelen voor betrouwbaarheid van AI-output? (validatie, filtering, fallback, UI-feedback, …)
- [ ] 8. Drie belangrijkste inzichten/richtlijnen die je een nieuwe student over Cursor zou meegeven



### Prompt design

(Alleen prompts in de applicatie — system prompts / model-input — niet Cursor-devprompts.)

- [ ] 1. Welke belangrijke prompts heb je gebruikt om jouw kern-features te bouwen?
- [ ] 2. Hoe zag een typische iteratie eruit? (prompt → output → aanpassing → nieuwe prompt)
- [ ] 3. Drie voorbeelden van prompts die heel goed werkten — waarom?
- [ ] 4. Drie voorbeelden van prompts die minder goed werkten — oorzaak + hoe verbeterd?
- [ ] 5. Welke onderdelen van jouw prompts hadden de grootste invloed? (structuur, rol, constraints, voorbeelden, …)
- [ ] 6. In hoeverre is de kwaliteit van de output afhankelijk van jouw prompt en inputdata?



### Documentstructuur (leerlijn)

- [ ] Titelblad: naam, inleverdatum, titel leerlijn, GitHub URL, Vercel URL, Supabase API Base URL
- [ ] Samenvatting (max 150 woorden)
- [ ] Inhoudsopgave met correcte paginanummering (inclusief bijlagen)
- [ ] Introductie (probleem, doelgroep, features; tip: 1–3 UI-screenshots)
- [ ] Technische Implementatie AI dataflow
- [ ] Database ontwerp (+ ERD)
- [ ] AI-Assisted Development Proces
- [ ] Conclusie (geleerd over AI; toevoeging vs kritisch)
- [ ] Bijlage: alle gebruikte prompts binnen de applicatie (system prompts / model-input)
- [ ] Bijlage: volledige uiteindelijke agent-instructie zoals geïmplementeerd
- [ ] Bijlage: gebruikte Cursor-instructies tijdens het ontwikkelproces (.cursorrules / prompts)



### Opleveren (D3)

- [ ] Technisch verantwoordingsdocument als PDF
- [ ] Omvang 2500–3000 woorden (excl. inhoudsopgave en bijlagen)
- [ ] Concrete voorbeelden uit dit project (geen algemeenheden)

---



## Eisen deelopdracht 4 — (Video)presentatie

Circa 8–12 minuten (max 12). Live of vooraf opgenomen. Nadruk: aantoonbaar werkende functionaliteit; ook unhappy paths.

### Opbouw

- [ ] 1. Project lokaal starten + globale structuur tonen (max 30–60 seconden)
- [ ] 2. Koppeling met de Supabase database laten zien
- [ ] 3. Supabase-dashboard tonen:
  - [ ] a. Aanwezige tabellen
  - [ ] b. Relaties tussen tabellen
  - [ ] c. RLS is ingeschakeld
  - [ ] d. Eén tabel met `user_id` / `owner_id` + één voorbeeld-policy
  - [ ] e. Aantonen dat gebruiker B data van A niet kan zien/aanpassen/verwijderen
- [ ] 4. Applicatie op de productie-URL tonen
- [ ] 5. Vier kernfunctionaliteiten demonstreren:
  - [ ] f. Registreren en inloggen
  - [ ] g. AI-functionaliteit (invoer → reactie app → resultaat zichtbaar)
  - [ ] h. Twee overige casus-functionaliteiten (Leren; Leerplan/Community)
- [ ] Ook unhappy path: verkeerde keuzes / foutieve data



### Opleveren (D4)

- [ ] (Video)presentatie max 12 minuten — live of `.mp4` / `.mov`

---



## Gaps t.o.v. huidige app


| Gap                  | Notitie                                            | Actie                                   |
| -------------------- | -------------------------------------------------- | --------------------------------------- |
| Auth URLs + smoke    | Auth URLs + prod-smoke 2026-07-26 ✅                | —                                       |
| Docent Supabase team | Docent als **Developer** toegevoegd ✅              | —                                       |
| `docs/*` inhoud      | PROJECT-BRIEF / PROMPT-LOG / AI-DECISIONS gevuld ✅ | — (VW citeert in stap 4)                |
| ERD                  | `verdoc/assets/figuur-01-erd.png` ✅ (live schema)  | In VW als Figuur 1; optioneel SV-export |


---



## Archief D1/D2

D1/D2-productwerk is grotendeels klaar: Fase 6 smoke (auth, Leerplan, Community, Leren, Exercises CRUD, Dashboard, Admin, Generator/streaming) ✅; TanStack Query Tier 1/2 ✅; laatste bug B53 fixed. Uitvoeringsfases, buglijst en fetch-inventory zijn uit dit bestand gehaald — eisen staan hierboven.

---



## Nice to haves

Geen assessment-eisen — pas doen als open gaps / D3–D4 dat toelaten. Agent pakt ze niet uit zichzelf op.

- [x] Loading state maken
- [x] Skeleton loader maken
- [x] Standaard verversknop-component (met loading state)
- [ ] Community + Leerplan: twee zoekbalken (Topics en Tags gescheiden i.p.v. één gecombineerd veld)
- [ ] OAuth (Google/GitHub) terug op login — knoppen + flow verwijderd (werkten niet); opnieuw inbouwen indien nodig
- [ ] Oefening uitsluiten van herhaalschema (“Niet meer tonen” / suspend) — bij voorkeur vanuit Leerplan of oefeningenbeheer, niet mid-sessie in Oefenen
- [ ] Alternatieve vertalingen toevoegen tijdens het oefenen (bv. na feedback een geldig antwoord opslaan als alternatief)
- [ ] Voortgang → topic-detail: doorlink naar Oefenen voor dat specifieke topic
- [ ] Oefenen keyboard-shortcuts terugzetten (Spatie/G/F/V; typen/sorteren Enter/[ /]; audio Ctrl+Alt+P; leave Enter; labels + gedeelde module) — Esc blijft al in product
- [ ] Vorige oefening in Oefenen (flashcards/typen/sorteren + SRS-historie) — verwijderd vóór deadline; opnieuw inbouwen indien gewenst