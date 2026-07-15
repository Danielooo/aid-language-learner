# Decisions (mini-ADRs)

Architectuurkeuzes, conventiekeuzes. Voedt rubric-vraag 22 ("maatregelen voor
betrouwbaarheid"), 23 (top-3 inzichten) en 28 (welke prompt-onderdelen
meeste invloed).

Format: light template (max 3 zinnen). Zie [`INDEX.md`](./INDEX.md) en
[`.cursor/rules/journaling.mdc`](../.cursor/rules/journaling.mdc) voor
de drempel — alleen ontwerp-/conceptkeuzes met blijvende impact horen
hier. Volledige rationale van eerdere ADRs blijft beschikbaar via
`git log -p docs/DECISIONS.md`.

---

## Entries

### 2026-05-27 — `.cursor/rules/*.mdc` ipv single `.cursorrules`

**Files:** `.cursor/rules/*.mdc`
**Tags:** rules, structure, methodology

Multi-file rules met YAML frontmatter (`description`, `globs`, `alwaysApply`)
in plaats van één `.cursorrules`-bestand. Schaalt per onderwerp en
`globs` houden context-vervuiling minimaal (alleen relevante rules bij
file-edit). Vereist `docs/INDEX.md` als file-overzicht.

---

### 2026-05-27 — Components in `app/_components/`, geen top-level `components/` <a id="components-in-app-private-folders"></a>

**Files:** `.cursor/rules/nextjs-app-router.mdc`, `.cursor/rules/conventions.mdc`
**Tags:** file-structure, components, deviation-from-coursebook

Components in `app/_components/{ui,features}/` (gedeeld) en
`app/<segment>/_components/` (route-specifiek), géén top-level
`components/`-folder. Project gebruikt geen `src/`-structuur; private
folders met `_`-prefix zijn de App-Router-native conventie. Wijkt
bewust af van cursusmateriaal — beide rules herhalen de waarschuwing.

---

### 2026-05-27 — Documentatiesysteem in `docs/` met capture → curate flow <a id="documentatiesysteem"></a>

_Superseded by [Drop DEV-JOURNAL.md](#drop-dev-journal)._

**Files:** `docs/INDEX.md`, `docs/DEV-JOURNAL.md`, `docs/RULES-CHANGELOG.md`, `docs/PROMPT-LOG.md`, `docs/AI-FAILURES.md`, `docs/DECISIONS.md`, `.cursor/rules/journaling.mdc`
**Tags:** documentation, methodology, eindopdracht, deelopdracht-3

Vier specialized files in `docs/` plus chronologisch `DEV-JOURNAL.md`
voor quick-capture, gestuurd door meta-rule `journaling.mdc`. Bedoeld
om reconstructie achteraf overbodig te maken voor het
verantwoordingsdocument (45%). Later vervangen door alleen-specialized
opzet (zie [`drop-dev-journal`](#drop-dev-journal)).

---

### 2026-05-27 — Commit-strategie A: één commit per logische gebeurtenis <a id="commit-strategie-a"></a>

**Files:** `WERKWIJZE.md`, `.cursor/commands/commit.md`
**Tags:** git, commits, methodology

Eén commit per logische gebeurtenis: een rule-wijziging, een ADR, een
feature in een component is telkens één commit. Voldoet ruim aan de
≥20 commits-eis en maakt het `/commit` slash-command logisch (één
event = één commit). Bij twijfel over groepering vraagt `/commit` de
gebruiker.

---

### 2026-05-27 — `/commit` met status-footer ipv apart `/sessie-eind` commando <a id="commit-met-status-footer"></a>

**Files:** `.cursor/commands/commit.md`, `.cursor/commands/sessie-eind.md` (verwijderd), `WERKWIJZE.md`
**Tags:** workflow, slash-commands, methodology, ux

`/sessie-eind` verwijderd; de drie checks (uncommitted files, open
`_no commit yet_`-entries, onvolledige velden) zitten als
status-footer aan het einde van `/commit`. Eén commando minder en de
check komt automatisch na élke commit, zonder iets te forceren.
Aantal slash-commands: 4 → 3.

---

### 2026-05-28 — Drop SHA-refs in journal-entries <a id="drop-sha-refs"></a>

**Files:** `.cursor/rules/journaling.mdc`, `.cursor/commands/audit.md` (verwijderd), `.cursor/commands/commit.md`, `WERKWIJZE.md`, `docs/INDEX.md`
**Tags:** documentation, methodology, simplification

`Refs:`-veld vervalt: de rubric eist nergens dat journal-entries naar
SHAs linken, en `git log` op de entry-timestamp geeft dezelfde
correlatie. `/audit` slash-command is verwijderd; bestaande
`_no commit yet_`-regels blijven als historisch artefact staan.
Lichter template, één commando minder (4 → 3).

---

### 2026-05-28 — Drop `docs/DEV-JOURNAL.md` <a id="drop-dev-journal"></a>

**Files:** `docs/DEV-JOURNAL.md` (verwijderd), `.cursor/rules/journaling.mdc`, `docs/INDEX.md`, `WERKWIJZE.md`, `docs/PROMPT-LOG.md`, `.cursor/commands/ai-failure.md`
**Tags:** documentation, methodology, simplification, deletion

`DEV-JOURNAL.md` verwijderd uit de werkboom; inhoud blijft leesbaar
via `git log -- docs/DEV-JOURNAL.md`. De vier specialized files dekken
alle rubric-vragen volledig — een naast-actief archief verwarde agents
en voegde niets toe. Verbreekt enkele anchor-links in oude ADRs
(geaccepteerd; context staat in de tekst zelf).

---

### 2026-05-28 — Tokenized design-system met semantische OKLCH-tokens <a id="design-tokens"></a>

**Files:** `app/globals.css`
**Tags:** styling, tailwind, design-system, theming

Semantische OKLCH-tokens in `:root` + `.dark`, gemapt naar Tailwind v4
utilities via `@theme inline`. Eén plek voor alle kleuren; rebranding
gaat via één variabele. Class-based dark variant via
`@custom-variant dark` is voorwaarde voor de user-toggle (zie
[`dark-mode-toggle`](#dark-mode-toggle)).

---

### 2026-05-28 — Toggleable dark mode via `next-themes` <a id="dark-mode-toggle"></a>

**Files:** `app/_components/theme-provider.tsx`, `app/_components/ui/theme-toggle.tsx`, `app/layout.tsx`, `app/globals.css`
**Tags:** styling, theming, accessibility, dependency

Driestandentoggle (light/dark/system) via `next-themes` (~4 kB),
gewrapt in een eigen `ThemeProvider` zodat de lib-keuze op één plek
zit. Eigen cookie-based implementatie zou meer maintenance kosten dan
de lib bespaart (vooral FOUC-bezwering). Vereist
`<html suppressHydrationWarning>` en een `mounted`-guard in de
toggle.

---

### 2026-05-28 — Hand-rolled UI-componenten i.p.v. shadcn/ui <a id="handrolled-ui"></a>

**Files:** `app/_components/ui/*`, `lib/utils.ts`
**Tags:** components, design-system, dependency, scope

Hand-rolled Tailwind componenten in `app/_components/ui/` in plaats
van shadcn/ui. Past bij rubric 1.4 (zelf-geschreven code) en 3.5
(kritische reflectie) en houdt Radix UI uit `package.json`.
Primitives worden pas gebouwd wanneer een feature ze nodig heeft;
bij toekomstige need voor a11y-kritische primitives wordt selectief
Radix toegevoegd.

---

### 2026-05-28 11:02 — Korter journaling-format en logging-drempel <a id="short-journaling-format"></a>

**Files:** `.cursor/rules/journaling.mdc`, `docs/INDEX.md`, `docs/DECISIONS.md`, `docs/RULES-CHANGELOG.md`, `docs/PROMPT-LOG.md`
**Tags:** documentation, methodology, simplification

Journaling-entries beperkt tot ~3 zinnen vrije tekst zonder
`Wat`/`Waarom`/`Effect`-sub-kopjes, plus een drempel-tabel die per
file vastlegt wat wezenlijk genoeg is om te loggen. Voorkomt dat
kleine layout-/tekstwijzigingen het log opblazen en houdt de focus op
conceptuele keuzes. Bestaande entries in DECISIONS, RULES-CHANGELOG en
PROMPT-LOG-template zijn retrofit; AI-FAILURES blijft buiten scope
vanwege rubric-specifieke `Severity:`-velden.

---

### 2026-05-28 13:35 — Vercel AI SDK Wiktionary-chatbot in /dev <a id="wiktionary-chatbot-dev"></a>

**Files:** `app/dev/wiktionary-chat/page.tsx`, `app/api/dev/chat/route.ts`, `app/api/dev/chat/preview/route.ts`, `lib/ai/wiktionary-context.ts`, `package.json`
**Tags:** ai-sdk, architecture, experiment, dev-only

Eerste integratie van Vercel AI SDK (`ai` v6 + `@ai-sdk/openai` v3 +
`@ai-sdk/react` v3) als les-11-stijl experiment onder `/dev/`: één
woord wordt vooraf via Wiktionary opgehaald en in de system prompt
geplakt, antwoord komt via `streamText` + `useChat`. Bewust gekozen
voor context-injection i.p.v. tool calling (les 12) om de minimale
les-11-flow te valideren; aparte GET-preview-route hergebruikt
dezelfde context-builder zodat de UI-debug-panels gegarandeerd
laten zien wat de LLM ook daadwerkelijk ziet. v6 wijkt af van de
lesstof (`@ai-sdk/react` i.p.v. `ai/react`, `toUIMessageStreamResponse`
i.p.v. `toDataStreamResponse`, `convertToModelMessages` op de server).

---

### 2026-05-30 12:29 — Geen NL/EN native-taal-filter voor Wiktionary <a id="no-native-taal-filter-wiktionary"></a>

**Files:** `lib/api/wiktionary.ts`, `app/dev/wiktionary/page.tsx`, `app/dev/wiktionary-chat/page.tsx`
**Tags:** wiktionary, scope, dev-only

Onderzocht of NL Wiktionary bruikbaar is voor Spaans→Nederlands als
alternatief voor de huidige EN-flow: `nl.wiktionary.org/api/rest_v1/page/definition/{word}`
blijft 501 retourneren. Geen native-taal-dropdown NL en ENG in de playground of chat implementeren. Blijft voor nu alleen ENG;


---

### 2026-05-30 12:42 — Tatoeba-quiz in /dev: lenient compare + localStorage <a id="tatoeba-quiz-dev"></a>

**Files:** `app/dev/tatoeba-quiz/page.tsx`, `app/dev/tatoeba-quiz/_components/quiz.tsx`, `app/dev/tatoeba-quiz/_components/use-quiz-storage.ts`, `app/api/dev/tatoeba-quiz/route.ts`, `lib/quiz/compare.ts`
**Tags:** tatoeba, quiz, ux, scope, dev-only, localStorage

Eerste interactieve feature (kernfunctionaliteit 3 uit `IDEEFASE.md`)
bewust onder `/dev/` gestart, met basic-lenient compare (lowercase +
leestekens + whitespace strippen, géén accent-normalisatie of fuzzy)
en `localStorage` als persistentie achter een dunne hook
(`useQuizStorage`). Score en historie kunnen later 1-op-1 naar
Supabase verplaatsen door alleen die hook te vervangen; de quiz UI en
compare-utility blijven onaangetast. Match telt tegen *alle*
NL-vertalingen die Tatoeba teruggeeft, omdat Tatoeba meerdere
gelijkwaardige vertalingen per zin levert.

---

### 2026-05-30 23:05 — Eerste Supabase-tabel: `dev_exercises` zonder RLS, dev-only <a id="dev-exercises-no-rls"></a>

**Files:** `supabase/migrations/0001_dev_exercises.sql`, `lib/supabase/admin.ts`, `app/api/dev/exercises/route.ts`, `app/dev/exercise-generator/page.tsx`
**Tags:** supabase, schema, scope, dev-only, ai-sdk, tool-calling

Eerste Supabase-aanraking: aparte `dev_` prefix-tabel zonder `user_id`/RLS,
geschreven via service-role uit `/api/dev/*`. De productie-feature (later)
krijgt een eigen `exercises`-tabel mét `user_id` + RLS — bewust géén
retrofit van de dev-tabel, omdat dev-content vaak weg-geredesigned wordt
en mengen met user-data risico geeft. AI-generatie via `streamText` +
`tool({ inputSchema: zod })` met `stopWhen: hasToolCall(...)`: één
gestructureerde tool-call vervangt vrije-tekst-output, zodat de UI
gegarandeerd renderbare JSON krijgt.

---

### 2026-06-04 10:27 — Altijd Tatoeba-attributie tonen ongeacht licentie <a id="altijd-tatoeba-attributie"></a>

**Files:** lib/api/tatoeba-audio.ts, app/dev/tatoeba-audio/

**Tags:** tatoeba, licensing, attribution, audio, compliance

Tatoeba-audio kent meerdere licenties: CC0 1.0 staat alle rechten af en
vereist geen vermelding, CC BY 2.0 FR verplicht auteur + bron + licentie,
en sommige bestanden hebben helemaal geen licentie-aanduiding. Om bij elk
mogelijk geval safe te zitten — inclusief de "geen licentie"-categorie —
tonen we altijd auteur, bron en licentie bij elk audiofragment, ook
wanneer dat technisch niet vereist is. Effect: één consistente
UI-behandeling, geen per-fragment-conditional, en geen risico op
ongedekte attributie als Tatoeba's metadata onvolledig is.

### 2026-07-15 21:24 — Admin/user rechten bevroren in REQUIREMENTS-ROLES <a id="requirements-roles"></a>

**Files:** `docs/REQUIREMENTS-ROLES.md`, `docs/IMPLEMENTATION-ROLES.md`, `docs/INDEX.md`
**Tags:** auth, rbac, admin, moderation, requirements

Productrechten voor admin vs user vastgelegd als source of truth (copy-on-approve moderatie, 10 AI-requests/dag voor users, admin onbeperkt AI, Auth-ban bij deactivate, laatste-admin niet degraderen). Bouwvolgorde staat in `IMPLEMENTATION-ROLES.md`; dit is bewust nog geen code — eerst bevroren matrix, daarna gefaseerde PRs.

### 2026-07-15 21:30 — Global submissions-schema + RLS zonder admin-peep <a id="exercise-global-submissions"></a>

**Files:** `supabase/migrations/0017_exercise_global_submissions.sql`, `types/exercise-global-submission.ts`, `lib/auth/role-capabilities.ts`, `lib/exercises/build-exercise-global-snapshot.ts`
**Tags:** supabase, rls, admin, moderation, rbac

`exercise_global_submissions` + profile-flags (`ai_disabled`, daglimiet-counters) toegevoegd voor copy-on-approve. De brede `is_admin()` read/write op personal exercises/progress uit `0016_admin_rls` is teruggedraaid zodat RLS weer own-row is; admin global-writes blijven via service-role APIs na `assertAdmin`, conform `REQUIREMENTS-ROLES.md`.

### 2026-07-15 21:45 — Rollen PR B–F: admin product-surface + quota <a id="roles-pr-b-f"></a>

**Files:** `app/(app)/admin/**`, `app/api/admin/**`, `app/api/exercises/global-submissions/**`, `lib/auth/assert-ai-quota.ts`, `proxy.ts`, `app/dev/layout.tsx`
**Tags:** auth, rbac, admin, moderation, rate-limit

Productie-admin onder `/admin` (globals, review-queue, gebruikers), user-aanbiedingen via snapshot/pending, AI-limiet 10/dag UTC + `ai_disabled`, en `/dev` alleen nog voor admins. Global corpus-mutaties lopen via service role na `assertAdmin`, gefilterd op `owner_id IS NULL`.

<!-- INSERT-NEW-ENTRY-ABOVE -->

## Template — kopieer & vul in

```markdown
### YYYY-MM-DD — Korte beslissing-titel <a id="optionele-anchor"></a>

**Files:** relevant paths
**Tags:** <topic>, <area>

Eén tot drie zinnen: wat is besloten, waarom, en het effect.
```
