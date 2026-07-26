# Project brief — AID Language Learner

## Probleem

Spaans leren met zinnen die bij echte situaties passen (restaurant, luchthaven, …) vraagt om oefenmateriaal én herhaling. Handmatig zinnen verzamelen is traag; bestaande corpora (zoals Tatoeba) zijn lastig zonder selectie en vertaling. De app koppelt **AI-generatie / audio-zoek**, **persoonlijk leerplan** en een **herhaalschema** zodat de gebruiker zelf content maakt, oefent en voortgang ziet.

## Doelgroep

- Studenten / zelfstandige lerenden die Spaans→Nederlands oefenen.


## Productnaam en URLs

| | |
| --- | --- |
| Product | AID Language Learner |
| Live | https://aid-language-learner.vercel.app |
| GitHub | https://github.com/Danielooo/aid-language-learner (public) |
| Supabase API | https://inpdstwtqcfcjnrqvemp.supabase.co |

## Stack

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4
- **Data:** Supabase (Auth, Postgres, RLS) + TanStack Query (React Query) voor CRUD/cache
- **AI:** Vercel AI SDK (`streamText`, tools, `stopWhen`) + OpenAI-modellen
- **Extern:** Tatoeba API (spraakoefeningen met audio)
- **Deploy:** Vercel
- **Agent-skills:** `.agents/skills/` (o.a. `vercel-react-best-practices`, `supabase-postgres-best-practices`, `ai-sdk`)

## Vier kernfunctionaliteiten

| # | Functionaliteit | Type |
| --- | --- | --- |
| 1 | Registreren / inloggen (gebruikersnaam + wachtwoord) | Auth |
| 2 | Generator (Tekst + Audio): chat, tool-calling, streaming, opslaan als topic | AI / agent |
| 3 | Leren: Flashcards, Typen, Sorteren + herhaalschema | Casus |
| 4 | Leerplan + Community (overnemen / bijdragen) | Casus |

Overig product (niet “de vier”, wel live): Voortgang (dashboard), Profiel, Beheer (admin: bijdragen beoordelen, gebruikers).

## Auth-model (kort)

Inloggen met **Gebruikersnaam** (geen e-mail-UX). Intern: synthetisch adres `<username>@aid.local` via Supabase Auth; registratie via admin-`createUser` met `email_confirm: true` zodat synthetische adressen geen bevestigingsmail nodig hebben.

## Repo-structuur (leerlijn)

Broncode onder `src/` (`@/*` → `src/*`):

```text
src/app/           # App Router (pages, layouts, API routes)
src/components/    # ui/ + features/
src/hooks/         # gedeelde client-hooks
src/lib/           # auth, ai, quiz, srs, supabase, …
src/types/         # gedeelde types
docs/              # PROJECT-BRIEF, PROMPT-LOG, AI-DECISIONS (dit bestand)
.cursor/rules/     # projectregels (o.a. UI-terminologie)
.agents/skills/    # Skills.sh-skills
supabase/          # migrations, seed
```

API-agent-mapping (geen dummy `/api/agent`): o.a. `api/exercises/chat`, `api/exercises/audio/chat`, `api/quiz/chat`.

## Data-entiteiten 

Public-tabellen:
`exercises`, `exercise_groups`, `exercise_group_submissions`, `quiz_attempts`, `exercise_progress`, `user_topic_preferences`, `profiles`. Relaties + RLS; details en ERD in het verantwoordingsdocument.

## Canonieke UI-termen

Zie `.cursor/rules/ui-terminology.mdc`. Kort: Topic, Oefening, Leerplan, Community, Leren, Herhaalschema, Beheer, Gebruikersnaam, Brontaal (SPA), Vertaling (NL).

