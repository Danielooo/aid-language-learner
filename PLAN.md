# Speelboek: Eindopdracht deel 1 + 2

Volgbaar werkplan om **deelopdracht 1** (Next.js-broncode) en **deelopdracht 2** (Supabase + Auth + React Query) af te ronden — inclusief bugs en de TanStack Query-migratie.

**Buiten scope:** deelopdracht 3 (verantwoordingsdocument) en deelopdracht 4 (presentatie). Die werk je elders uit.

Bron van de eisen: `[EINDOPDRACHT.md](EINDOPDRACHT.md)` (alleen D1, D2 + relevante quickscan-/beoordelingspunten).

**Uitgangspunt Query:** TanStack Query staat in de branch (`query-provider`, `query-keys`, …). Checklists in dit bestand kunnen **achterlopen** — bij inventory opnieuw afvinken op basis van code. Profile blijft via server actions (geen Query-kandidaat).

---

## Handoff (laatst bijgewerkt: 2026-07-23)

**Lees dit eerst** bij een nieuwe agentsessie. Werk stap voor stap met de developer: stap aankondigen → feedback → fix → pas door als de developer zegt dat de stap klaar is. Geen commits tenzij gevraagd. **NOOIT** `IDEEFASE.md` lezen of editen.

### Exact hervatten (nu)

- **Ronde:** **Fase 6 — Verificatie** (stap 10 D1/D2 — gaps open).
- **Eerste antwoord in nieuwe chat:** open D1/D2-gaps (public repo, README, Vercel, docs).
- **Branch:** `feature/user-panels`.
- **Rol:** n.v.t.
- **Bug-IDs:** volgende vrije ID = **B54**.
- **Laatst bevestigd:** B53 exercises-list ✅; Fase 6 smoke 1–9 ✅; stap 10 inventory gedaan.

### Waar we zijn


| Ronde                  | Status                                                              |
| ---------------------- | ------------------------------------------------------------------- |
| A–H product            | Klaar (Fase 6 smoke 1–8 ✅)                                          |
| Stap 9 Query           | Klaar (Tier 1/2; B53)                                               |
| Stap 10 D1/D2          | **Bezig** — kern D2 ✅; oplever-/leerlijn-gaps open (zie Gaps-tabel) |
| **Fase 6 Verificatie** | **Bijna klaar** — rest = gaps dicht of bewust uitstellen naar D3    |


### Sinds stap 1 (Auth) — tussendoor

Meegenomen bij Leren / Exercises / Voortgang / Admin:

- **B46** (fixed): Oefenen/dashboard telde global+eigen oefeningen op topicnaam → filter `owner_id = user`.
- **B51** (fixed): `/leerplan/[id]` crash na Generator audio→bestaand topic — gedeelde `learningTopic`-key shape.
- **B52** (fixed): Admin Deactiveren intermittent `bad_jwt` (ES256 kid) — admin-client prefer `SUPABASE_SERVICE_ROLE_KEY` (JWT) i.p.v. opaque `sb_secret_`.
- Stap 9: `admin-review-queue` + `exercises-list-page` → `useQuery`/`useMutation`.
- **B53** (fixed): exercises-list infinite re-render na migratie (`?? []` + setState in render).
- Voortgang: chart-rij (Komende herhalingen / Oefenactiviteit) boven Per topic.
- **Legacy moduskeuze weg:** modus alleen via hub `/oefenen` + `?modus=topic|srs`.

### Fase 6 — checklist

1. ☑ Inloggen / registreren / rollen
2. ☑ Leerplan: lijst, toggle, bewerken, verwijderen
3. ☑ Community: overnemen + bijdragen
4. ☑ Leren: flashcards / typen / sorteren + progress
5. ☑ Exercises CRUD
6. ☑ Dashboard / voortgang
7. ☑ Admin: users + Bijdragen beoordelen (als Admin)
8. ☑ Generator / AI (quota + opslaan + streaming)
9. ☑ Geen `useEffect`-fetch meer op Tier 1/2 kandidaten (grep)
10. ☑ D1/D2-checklists nagelopen; open gaps genoteerd (Gaps-tabel)

### Volgende actie

1. **Nu:** D1/D2-gaps dicht — start met repo **public**, README + Supabase URL, Vercel deploy.
2. docs/ERD = leerlijn / D3 — op verzoek.
3. Nice to haves **alleen op verzoek**.

### Startprompt (plakken in nieuwe chat)

> Lees `PLAN.md` Handoff + Gaps-tabel. Dicht open oplevergaps of vraag prioriteit. Geen commits tenzij gevraagd. UI-termen: `.cursor/rules/ui-terminology.mdc`. NOOIT `IDEEFASE.md`.

### Regels (kort)

- Canonieke NL UI (Topic, Leerplan, Gebruikersnaam, Herhaalschema, Beheer, …); code-ids niet hernoemen om UI
- Bugs bijhouden in §0.1 (B…, status fixed/open)
- Nice to haves onderaan PLAN — niet uit jezelf oppakken; wel noteren als iets daar thuishoort

### Scope-guard — focus bewaken, niet blokkeren

**Focus nu:** bestaande flows stabiel en afronden (smoke → bugs → Fase 6).

De agent moet **altijd uitvoeren wat de developer vraagt**. Geen weigering, geen “zal ik dit wel bouwen?”-gate vooraf.

Wel **achteraf** (kort, na de fix/feature) aangeven als de vraag afwijkt van die focus — bv. een nieuwe of grote feature i.p.v. afronden/bugfix. Formuleer dan ongeveer: *“Dit was [X] — dat is eerder een nieuwe feature dan afrondwerk; focus blijft smoke/bugs/rondes. Staat (of zet) onder Nice to haves tenzij je hier bewust op door wilt.”*

- Geen preek, geen discussie vooraf — eerst bouwen, dan één zin scope-check.
- Bij opeenstapeling van zulke verzoeken: mag je dat in die nabeschouwing expliciet maken.

---

## Hoe dit plan gebruiken

1. Vul eerst de **eisenchecklists** (D1 + D2) in: afvinken wat al klopt, gaps noteren.
2. Werk daarna **fase voor fase** (bugs → Query-fundament → migratie).
3. Bij elke feature: eerst checken of er een **blocker-bug** is → die meenemen in dezelfde slice.
4. Stop een fase pas als: app start, feature laadt/schrijft via Query (waar van toepassing), en de bug(s) van die feature zijn weg of bewust uitgesteld.

```text
Eisenchecklists D1 + D2
  → Fase 0 Inventory (bugs + fetch)
  → Fase 1 Blocker bugs
  → Fase 2 Query foundation
  → Fase 3 Easy queries (Tier 1)
  → Fase 4 Lists + mutations (Tier 2)
  → Fase 5 Hard cases (Tier 3)
  → Fase 6 Polish + verify
```

Fases 2–6 dekken **criterium 2.2** en de quickscan-eis “CRUD met React Query”.

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
- [ ] Applicatie gedeployed naar productie via Vercel ← **gap** (niet gevonden in Vercel-team)
- [x] Werkt in development zonder kritieke runtime errors (Fase 6 smoke); productie na deploy opnieuw checken

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
- [ ] Alle vier functionaliteiten werken op Vercel — quickscan ← hangt aan deploy-gap

### Repo-structuur (leerlijn-intentie)

Dit project gebruikt root-`app/` (niet `src/`). Respecteer bestaande conventies; dicht gaps.

- [x] `.cursor/rules/` aanwezig (projectregels)
- [x] Skills (≥2, incl. `vercel-react-best-practices`) — in `.agents/skills/` (Skills.sh): `vercel-react-best-practices`, `supabase-postgres-best-practices`, `ai-sdk`
- [x] Query-client / provider (TanStack Query) — fases 2–6
- [x] `.env.example` (geen secrets)
- [x] `.gitignore`, TypeScript + Tailwind-config
- [ ] `README.md` met project-specifieke installatie (nu nog create-next-app template) ← **gap**
- [x] Code is schoon, gestructureerd en onderhoudbaar (criterium 1.4)

### Git / GitHub

- [ ] Project op GitHub; repository is **public** ← **gap** (nu: **private**)
- [x] Eerste commit = initiële projectopzet (historisch: gedaan)
- [x] Kleine, beschrijvende commits
- [x] Pull requests per feature; regelmatig mergen naar `main`
- [x] ≥20 kleine commits met zinvolle messages (criterium 1.5) — ~127 commits
- [x] ≥5 pull requests gemerged naar `main` (criterium 1.5) — 13 PRs

### Opleveren (D1)

- [ ] README.md met heldere installatie-instructies (collega kan zelfstandig draaien) ← **gap**
- [ ] GitHub-URL klaarzetten (formeel in D3; hier: `https://github.com/Danielooo/aid-language-learner` — eerst public maken)
- [ ] Vercel productie-URL klaarzetten (formeel in D3; hier nog leeg)

---

## Eisen deelopdracht 2 — Supabase + Auth + React Query

### Database

- [x] Schema met minimaal 4 tabellen (7: exercises, quiz_attempts, profiles, exercise_progress, user_topic_preferences, exercise_groups, exercise_group_submissions)
- [x] Logische relaties (foreign keys)
- [x] Constraints: primary keys, NOT NULL, UNIQUE waar passend
- [x] Criterium 2.1: schema + relaties + constraints kloppen

### Data in de app (React Query)

- [x] Voor relevante entiteiten: werkende **CRUD** (Create, Read, Update, Delete)
- [x] CRUD geïmplementeerd met **React Query (TanStack Query)** — caching en sync met de UI (Tier 1/2 inkl. review-queue + exercises-list)
- [x] Criterium 2.2: Query correct gebruikt voor databeheer

→ Uitvoering: fases 2–6 hieronder.

### Authenticatie en RLS

- [x] Registreren met Supabase Auth
- [x] Inloggen met Supabase Auth
- [x] Sessies correct afgehandeld in de applicatie
- [x] RLS ingeschakeld op relevante tabellen (alle 7 public-tabellen)
- [x] Policies: gebruiker leest/wijzigt/verwijdert alleen eigen data (koppeling via `user_id` / `owner_id`)
- [x] Criterium 2.3: Auth + RLS + policies

### Opleveren (D2)

- [ ] Persoonlijke Supabase REST API base URL in README.md ← **gap** (URL: `https://inpdstwtqcfcjnrqvemp.supabase.co`)
- [ ] ERD / Schema Visualizer-screenshot klaarzetten (formeel in D3)

---

## Gaps t.o.v. huidige app

Korte startnotities — vul aan terwijl je de checklists afwerkt.

Gaps-tabel:


| Gap                     | Notitie                                             | Actie                                  |
| ----------------------- | --------------------------------------------------- | -------------------------------------- |
| GitHub public           | Repo is **private**                                 | Settings → Change visibility → Public  |
| Vercel deploy           | Geen `aid-language-learner` project in Vercel-team  | Deploy + URL noteren                   |
| README                  | Nog create-next-app template                        | Install + env + scripts + Supabase URL |
| Skills                  | Klaar — `.agents/skills/` (≥2, incl. vercel-react)  | —                                      |
| `docs/*`                | PROJECT-BRIEF / PROMPT-LOG / AI-DECISIONS ontbreken | Aanmaken (leerlijn)                    |
| ERD screenshot          | Formeel D3                                          | Schema Visualizer export               |
| TanStack Query Tier 1/2 | Klaar                                               | —                                      |


---

## Fase 0 — Inventory (½–1 dag, geen grote refactors)

### 0.1 Buglijst


| ID  | Feature                 | Symptoom                                                                                                                                                                                               | Reproduceerbaar? | Ernst                   | Status     |
| --- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------- | ----------------------- | ---------- |
| B1  |                         |                                                                                                                                                                                                        | ja/nee           | blocker/high/medium/low | open       |
| B7  | Community               | Bijdragen: 4 status-tabs + count-strip i.p.v. één tabel met filter; Overnemen niet eerste tab; “Oefeningengroep” i.p.v. Topic                                                                          | ja               | high                    | fixed      |
| B8  | Community Overnemen     | Geen dropdown-filters zoals Leerplan; opnieuw overnemen geblokkeerd als topic al in leerplan stond                                                                                                     | ja               | high                    | fixed      |
| B9  | Community Overnemen     | Naamconflict-modal verscheen niet: sluiten groep-modal wiste `nameConflict` via `onClose`; bulk hernoemde stil                                                                                         | ja               | high                    | fixed      |
| B10 | Community Bijdragen     | Kolommen versprongen bij wisselen statusfilter (auto table layout)                                                                                                                                     | ja               | medium                  | fixed      |
| B11 | Community Bijdragen     | Na aanbieden sprong statusfilter naar Pending; knop bleef bruikbaar in flow                                                                                                                            | ja               | medium                  | fixed      |
| B12 | Community Bijdragen     | “Filters wissen” overbodig naast Status→Alles                                                                                                                                                          | ja               | low                     | fixed      |
| B13 | Community Bijdragen     | Afgekeurd opnieuw aanbieden zonder wijziging; afkeurreden/historie onduidelijk                                                                                                                         | ja               | high                    | fixed      |
| B14 | Leren Flashcards        | Klik Topic → crash: `useState is not defined` in `useQuizSelectionMode`                                                                                                                                | ja               | blocker                 | fixed      |
| B15 | Leren Flashcards        | Shortcuts/header/score-UX: Enter flip, Ctrl+Alt grades, Reset score, overkill pills, geen vorige                                                                                                       | ja               | high                    | fixed      |
| B16 | Leren (alle modi)       | Chrome inconsistent: Terug naar overzicht (Esc) alleen op playing-flashcards; Typen/Sorteren/topic-picker achter                                                                                       | ja               | high                    | fixed      |
| B17 | Leren Flashcards        | Shortcuts: Vorige=V, Goed=G; Overslaan weg (verstoort topic-voortgang)                                                                                                                                 | ja               | medium                  | fixed      |
| B18 | Leren (alle modi)       | Esc mid-sessie: bevestigingsmodal; 2e Esc / “Toch verlaten” = echt weg                                                                                                                                 | ja               | medium                  | fixed      |
| B19 | Leren Typen             | Look/feel anders dan Flashcards; Ctrl+Alt/F-keys onhandig; layout sprong na feedback                                                                                                                   | ja               | medium                  | fixed      |
| B20 | Leren chat              | Chat-styling week af; chat ontbrak bij Flashcards                                                                                                                                                      | ja               | medium                  | fixed      |
| B21 | Leren                   | Test-plooien (OpenAI-debug, Recente pogingen) geen meerwaarde meer                                                                                                                                     | ja               | low                     | fixed      |
| B22 | Leren SRS               | “Niet meer tonen” / suspend-UI+API-client verwijderd → nice to have                                                                                                                                    | ja               | low                     | fixed      |
| B23 | Leren Sorteren          | Look/feel week af van Flashcards/Typen                                                                                                                                                                 | ja               | medium                  | fixed      |
| B24 | Leren Vorige            | Bij herhaalschema (SRS) was Vorige altijd disabled; historie toegevoegd                                                                                                                                | ja               | medium                  | fixed      |
| B26 | Exercises zoeken        | Zoeken crashte: PostgREST parse-fout op `alternative_translations::text` in `.or()`                                                                                                                    | ja               | high                    | fixed      |
| B27 | Exercises navigatie     | “← Terug naar leerplan” week af van Oefenen-knopstijl                                                                                                                                                  | ja               | low                     | fixed      |
| B28 | Exercises leeg topic    | Alles-verwijderen vraagt meteen of oefeningen + topic weg mogen; lege staat: Topic verwijderen (geen Generator)                                                                                        | ja               | medium                  | fixed      |
| B29 | Leerplan mutations      | Actief/Verwijderen faalde stil; geen error-UI; checkbox snapte terug                                                                                                                                   | ja               | high                    | fixed      |
| B30 | Leerplan cache          | Na oefening-CRUD bleef overzicht ~30s stale (counts/Bewerkt)                                                                                                                                           | ja               | high                    | fixed      |
| B31 | Exercises zoeken        | Zoekveld vocht met browser Back (draft schreef URL terug)                                                                                                                                              | ja               | high                    | fixed      |
| B32 | Exercises paginering    | Te hoge `?page=` toonde valse “Topic verwijderen”-empty                                                                                                                                                | ja               | high                    | fixed      |
| B33 | Voortgang topic-modal   | Groot % (ladder) strookte niet met “X van Y beheerst”                                                                                                                                                  | ja               | high                    | fixed      |
| B34 | Voortgang Herhaalschema | “Alles bij” botste met Vandaag-staaf (later vandaag)                                                                                                                                                   | ja               | high                    | fixed      |
| B35 | Voortgang cache         | Geen invalidate na oefenen → stale cijfers ~30s                                                                                                                                                        | ja               | high                    | fixed      |
| B36 | Voortgang Per topic     | Empty/tooltip suggereerde elke oefenvorm; alleen herhaalschema telt                                                                                                                                    | ja               | medium                  | fixed      |
| B37 | Voortgang gestart       | Topic bleef verborgen na alleen foute SRS-antwoorden                                                                                                                                                   | ja               | medium                  | fixed      |
| B38 | Voortgang error         | “Dashboard…” zonder retry                                                                                                                                                                              | ja               | medium                  | fixed      |
| B39 | Voortgang status        | Badge “Bezig” bij ~67% terwijl verdeling “Gevorderd”                                                                                                                                                   | ja               | low                     | fixed      |
| B40 | Admin Gebruikers        | Na Deactiveer bleef bestaande sessie bruikbaar tot JWT-expiry                                                                                                                                          | ja               | high                    | fixed      |
| B41 | Admin Gebruikers        | Login na deactivatie gaf generieke fout i.p.v. “gedeactiveerd”                                                                                                                                         | ja               | medium                  | fixed      |
| B42 | Admin Gebruikers        | Geen Verwijderen-actie (account + data)                                                                                                                                                                | ja               | high                    | fixed      |
| B43 | Admin Gebruikers        | Rol wisselen (user↔admin) i.p.v. aparte Admin aanmaken                                                                                                                                                 | ja               | medium                  | fixed      |
| B44 | Admin Deactiveren       | PATCH /api/admin/users → 500 (thrown Response 401 + proxy getUser race)                                                                                                                                | ja               | blocker                 | fixed      |
| B45 | Leren Typen/Sorteren    | Overslaan weg (UI+recordSkip); N in “X van N” steeg door queue-append                                                                                                                                  | ja               | medium                  | fixed      |
| B46 | Leren Topic + Voortgang | Queue/dashboard telden global+eigen (topicnaam); alleen `owner_id` = user                                                                                                                              | ja               | high                    | fixed      |
| B47 | Leren SRS               | Geen “x van N”; N = due-snapshot bij picker, vast tot sessie-einde                                                                                                                                     | ja               | medium                  | fixed      |
| B48 | Leren Sorteren          | Controleren onder de fold op korte viewport (media-query te mild)                                                                                                                                      | ja               | high                    | superseded |
| B49 | Leren Oefenen           | Speel-UI: flex + `100dvh`-band; midden scrollt; Controleren in flow (geen sticky); alle modi                                                                                                           | ja               | high                    | fixed      |
| B50 | Leren SRS               | Geen “Fouten opnieuw doen” / main-complete na ronde (alleen SrsCompleteState)                                                                                                                          | ja               | medium                  | fixed      |
| B51 | Exercises detail        | Na Generator audio→bestaand topic crashte `/leerplan/[id]`: gedeelde `learningTopic`-key, Generator cachete groep-object, edit-page verwachtte string → React “Objects are not valid as a React child” | ja               | blocker                 | fixed      |
| B52 | Admin Deactiveren       | Intermittent `bad_jwt` / `unrecognized JWT kid` (ES256) bij ban — admin-client stuurde opaque `sb_secret_` in Authorization; GoTrue verwacht JWT → prefer `SUPABASE_SERVICE_ROLE_KEY`                  | ja               | high                    | fixed      |
| B53 | Exercises list          | Na Query-migratie: infinite re-render (`data?.rows ?? []` + setState in render) → error boundary bij openen topic/oefening                                                                             | ja               | blocker                 | fixed      |


**Ernst:**

- **blocker** — leerflow, auth, of dataverlies kapot
- **high** — verkeerde data of actie faalt stil
- **medium** — irritant maar omzeilbaar
- **low** — polish/copy/layout

### 0.2 Fetch-inventory (migratie-backlog)

Alles hieronder is (was) `useState`/`useEffect` + `fetch`.

#### Tier 1 (eenvoudig)

- [x] `app/_components/features/dashboard/use-dashboard-stats.ts`
- [x] Quiz progress/due:
  - [x] `app/_components/features/quiz/exercises-quiz-page.tsx` — hub alleen; progress via hooks elders
  - [x] `app/_components/features/quiz/srs-topic-picker-section.tsx` → `useExerciseProgress`
- [x] Topics in 3 decks:
  - [x] `app/_components/features/quiz/flashcard-deck.tsx` → `useQuizTopics`
  - [x] `app/_components/features/quiz/typing-quiz-deck.tsx` → `useQuizTopics`
  - [x] `app/_components/features/quiz/sort-quiz-deck.tsx` → `useQuizTopics`
- [x] `app/_components/features/topics/leerplan-group-edit-page.tsx`
- [x] `app/_components/features/tatoeba/audio-stats-panel.tsx`
- [x] AI-quota in generator-bestanden (`use-ai-quota.ts`)

#### Tier 2 (lijst + mutations)

- [x] `app/_components/features/topics/leerplan-groups-page.tsx`
- [x] `app/_components/features/admin/admin-users-table.tsx`
- [x] `app/_components/features/community/community-adopt-panel.tsx`
- [x] `app/_components/features/quiz/use-quiz-storage.ts`
- [x] `app/_components/features/exercises/exercises-list-page.tsx`
- [x] `app/_components/features/admin/admin-review-queue.tsx`
- [x] `app/_components/features/community/community-bijdragen-panel.tsx`

#### Tier 3 (laatst)

- [ ] Generator persist + invalidate (houd `useChat` van AI SDK)
- [ ] `app/_components/features/quiz/hooks/use-quiz-session.ts` — alleen progress-mutations waar zinvol; sessie-state machine niet forceren in Query
- [ ] `app/_components/features/tatoeba/audio-search-page.tsx`

#### Niet migreren

- Profile server actions
- localStorage-caches (`lib/hooks/use-*-cache.ts`)
- Animatie-hooks

**Klaar als:** D1/D2-checklists deels ingevuld + buglijst + tiers hierboven bekend.

---

## Fase 1 — Alleen blocker-bugs (vóór grote Query-migratie)

Voor elke **blocker**:

1. Reproduceer (stappen + verwacht vs werkelijk).
2. Isoleer: UI / API-route / DB-RLS.
3. Kleinste fix die het pad herstelt.
4. Als de root cause “stale fetch / race / geen invalidate” is → noteer “meenemen in Fase 3/4 voor feature X” i.p.v. nóg een `useEffect`-hack, tenzij je vandaag moet demo’en.

**Klaar als:** geen bekende blockers meer, of elke resterende blocker heeft een bewuste workaround + ticket.

---

## Fase 2 — Query-fundament (één keer goed)

Dekking: start van criterium **2.2** / quickscan React Query.

- [ ] Installeer `@tanstack/react-query` (Devtools optioneel, alleen development)
- [ ] Maak `app/_components/query-provider.tsx` (`QueryClient` + `QueryClientProvider`)
- [ ] Wrap in `app/layout.tsx` naast `ThemeProvider`
- [ ] Conventies:
  - [ ] Query keys in `lib/query-keys.ts` (factories per domein)
  - [ ] Dunne fetch-helpers: `fetch('/api/...')` + throw bij `!res.ok`
  - [ ] UX volgens `.cursor/rules/ux-product.mdc` (`Laden…`, dim bij refresh, `role="alert"` + Opnieuw) — geen toast-bibliotheek

**Klaar als:** app boot, provider hangt.

---

## Fase 3 — Tier 1 migreren (template zetten)

Volgorde (niet door elkaar):

1. [ ] **Dashboard** — `use-dashboard-stats.ts` → `useQuery`; return-shape behouden
2. [ ] **Quiz progress/due** — gedeelde hooks + keys voor `/api/exercise-progress` (incl. `?breakdown=topics`)
3. [ ] **Shared** `useQuizTopics` — `/api/quiz/topics` uit de drie decks
4. [ ] Leerplan group-edit, audio-stats, generator quota

Per item:

- [ ] `useEffect`/`setLoading` weg voor die fetch
- [ ] loading/error/empty volgens UX-regels
- [ ] handmatig getest in de UI
- [ ] gerelateerde medium-bug meegenomen als die in deze feature zat

**Klaar als:** Tier 1-bestanden geen handmatige mount-fetch meer hebben voor die endpoints.

---

## Fase 4 — Tier 2: lists + mutations

Per feature **verticaal** (query + mutations + invalidate in één sessie) — dit is de kern van **CRUD + React Query**:

1. [ ] Leerplan groups (toggle learning / delete → `invalidateQueries`)
2. [ ] Admin users
3. [ ] Community adopt
4. [ ] Exercise picker (filters in query key)
5. [ ] Quiz storage (optimistic waar het al zo was)
6. [x] Exercises list (page/search in query key; refresh-in-place = content laten staan + `isFetching` dimmen)
7. [x] Admin review queue (parallel queries per status)
8. [ ] Community bijdragen

Patroon voor writes:

- `useMutation` → bij success `queryClient.invalidateQueries({ queryKey: … })`
- Geen stille failure: toon bestaande error-UI

**Klaar als:** Tier 2 features lezen/schrijven via Query; lijsten verversen na acties zonder full-page-reload-hacks.

---

## Fase 5 — Tier 3 (bewust beperkt)

- [ ] Generator: persist-mutations invalidaten leerplan/exercises-lijsten; **laat AI SDK** `useChat` **staan**
- [ ] Quiz session: alleen netwerkdelen die baat hebben bij Query; “next card”-loop mag state machine blijven
- [ ] Tatoeba audio-search: laatste; splits waar mogelijk (topics/stats al gedaan) vs. zware search/persist-pipeline

**Klaar als:** je kunt uitleggen wat wél/niet in Query zit en waarom (assessment-vriendelijk).

---

## Fase 6 — Verificatie

Handmatige smoke (product + D1/D2):

- [x] Inloggen / registreren / rollen
- [x] Leerplan: lijst, toggle, bewerken, verwijderen
- [x] Community: overnemen + bijdragen
- [x] Leren: flashcards / typen / sorteren + progress
- [x] Exercises CRUD
- [x] Dashboard / voortgang
- [x] Admin: users + review (als beheerder)
- [x] Generator / AI-agent (quota + opslaan + streaming)
- [x] Geen `useEffect`-fetch meer op Tier 1/2 kandidaten (grep op `setLoading` in die files)
- [x] D1- en D2-eisenchecklists nagelopen; open gaps genoteerd (zie Gaps-tabel)

Optioneel: React Query Devtools — cache keys kloppen, geen eindeloze refetches.

---

## Werkregels

- **Eerst eisen**, dan bouwen — checklist bijwerken wanneer iets klaar is.
- **Eén feature tegelijk** afmaken voordat je de volgende start.
- **Bug + Query samen** als de bug in die feature’s fetch-laag zit.
- **Geen big-bang** (“alle files tegelijk naar Query”).
- Commit bij voorkeur per fase of per feature (helpt criterium 1.5).
- UI-copy Nederlands en canoniek (`.cursor/rules/ui-terminology.mdc`).

---

## Geschatte volgorde in dagen (richtlijn)


| Blok    | Focus                                          |
| ------- | ---------------------------------------------- |
| Dag 0–1 | Eisenchecklists D1+D2 invullen + Fase 0 + 1    |
| Dag 2   | Fase 2 + start Fase 3 (dashboard als template) |
| Dag 3–4 | Rest Fase 3 + start Fase 4                     |
| Dag 5–6 | Rest Fase 4                                    |
| Dag 7   | Fase 5 + 6; D1/D2-checklists finaliseren       |


Pas aan op jouw deadline. Snijd Tier 3 in als tijd op is — Tier 1+2 + geen blockers + afgevinkte D1/D2-kern is al een sterk assessment-verhaal.

---

## Notities / uitbreidingen

*(Hier kun je extra eisen, bugs, beslissingen en links kwijt.)*

---

## Nice to haves

Geen assessment-eisen — pas doen als D1/D2 en blockers af zijn. Agent pakt ze niet uit zichzelf op (zie Handoff → Scope-guard).

- [ ] Loading state maken
- [ ] Skeleton loader maken
- [ ] Standaard verversknop-component (met loading state)
- [ ] Community + Leerplan: twee zoekbalken (Topics en Tags gescheiden i.p.v. één gecombineerd veld)
- [ ] OAuth (Google/GitHub) terug op login — knoppen + flow verwijderd (werkten niet); opnieuw inbouwen indien nodig
- [ ] Oefening uitsluiten van herhaalschema (“Niet meer tonen” / suspend) — bij voorkeur vanuit Leerplan of oefeningenbeheer, niet mid-sessie in Oefenen
- [ ] Alternatieve vertalingen toevoegen tijdens het oefenen (bv. na feedback een geldig antwoord opslaan als alternatief)
- [ ] Voortgang → topic-detail: doorlink naar Oefenen voor dat specifieke topic
- [ ] Oefenen keyboard-shortcuts terugzetten (Spatie/G/F/V; typen/sorteren Enter/[ /]; audio Ctrl+Alt+P; leave Enter; labels + gedeelde module) — Esc blijft al in product
- [ ] Vorige oefening in Oefenen (flashcards/typen/sorteren + SRS-historie) — verwijderd vóór deadline; opnieuw inbouwen indien gewenst