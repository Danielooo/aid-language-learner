# Rules Changelog

Iedere wijziging aan `.cursor/rules/*.mdc` of `AGENTS.md`. Voedt direct
rubric-vraag 16 ("initiële instructies aan Cursor + evolutie + effect
op output") en vraag 17 ("welke `.cursorrules` werkten goed en waarom").

Format: light template (max 3 zinnen). Zie [`INDEX.md`](./INDEX.md) en
[`.cursor/rules/journaling.mdc`](../.cursor/rules/journaling.mdc) voor
de drempel — alleen inhoudelijke rule-wijzigingen horen hier, geen
typo-fixes of herformuleringen zonder gedragsverandering.

---

## 2026-05-27 18:12 — `AGENTS.md` aangemaakt

**Files:** `AGENTS.md`
**Tags:** initial, next-js-16, mental-model

Begin-van-alles waarschuwing voor Next.js 16: niet de versie uit
training data, raadpleeg `node_modules/next/dist/docs/`. Voorkomt
regressies naar oude conventies (`middleware.ts`, sync `params`,
`@tailwind base`). Beslissend gebleken bij meerdere discrepanties
tussen cursusmateriaal en Next 16.

---

## 2026-05-27 18:23 → 18:24 — Single `.cursorrules` → `.cursor/rules/*.mdc` (5 files)

**Files:** `.cursorrules` (verwijderd), `.cursor/rules/tech-stack.mdc`, `conventions.mdc`, `nextjs-app-router.mdc`, `typescript-react.mdc`, `styling-tailwind.mdc`
**Tags:** migration, structure, scoping

Single `.cursorrules` (5188 bytes, geen scoping) opgesplitst in 5
`.mdc`-files met YAML frontmatter en `globs`. Eén file werd onhoudbaar
bij groei; `globs` houden context-vervuiling minimaal. Bij bewerken
van CSS komen sindsdien alleen styling-rules in context, geen
TypeScript-rules.

---

## 2026-05-27 18:27 — "Routing — de gouden regel" sectie toegevoegd

**Files:** `.cursor/rules/nextjs-app-router.mdc`
**Tags:** routing, mental-model

Expliciete sectie bovenaan: elke folder in `app/` is een route, met
mapping-tabel en folder-prefixes (`_naam`, `(naam)`, `[slug]`,
`[...slug]`). Cursusmateriaal benadrukt dit, maar de rule had het
impliciet. Voorkomt dat de agent over een react-router-achtige
library begint.

---

## 2026-05-27 18:33 — File structure best practices (4 kernregels + tree)

**Files:** `.cursor/rules/nextjs-app-router.mdc`, `.cursor/rules/conventions.mdc`
**Tags:** file-structure, components, decision

Vier kernregels + ASCII-tree: `app/` doet routing én components (geen
top-level `components/`), gedeelde UI in `app/_components/{ui,features}/`,
types in `types/`, business logic in `lib/`. Bevestigt bewuste
afwijking van cursusmateriaal — onderbouwd in
[DECISIONS](./DECISIONS.md#components-in-app-private-folders). Plus de
regel dat het bestand `proxy.ts` heet, niet `middleware.ts`.

---

## 2026-05-27 18:40 — Loading & error UI sectie + special-file signatures

**Files:** `.cursor/rules/nextjs-app-router.mdc`, `.cursor/rules/typescript-react.mdc`
**Tags:** loading, error-boundary, type-safety

Volledige sectie over `loading.tsx` en `error.tsx` (auto-wrap,
skeleton-loader, verplichte `"use client"`, exacte `{ error, reset }`
props), plus special-file signatures in `typescript-react.mdc`.
Voorkomt dat de agent `"use client"` vergeet op `error.tsx` (runtime
crash) of handmatig `<Suspense>` bouwt waar `loading.tsx` zou volstaan.

---

## 2026-05-27 18:52 — `env-variables.mdc` aangemaakt (`alwaysApply`)

**Files:** `.cursor/rules/env-variables.mdc`
**Tags:** security, env-vars, always-apply

Nieuw `alwaysApply: true` rule-bestand: server-only vs `NEXT_PUBLIC_`-
prefix, 4 security-regels, `.env.*`-precedence, optionele
type-validatie. Security-kritiek genoeg voor `alwaysApply` — zonder
deze rule kan een agent een secret achter `NEXT_PUBLIC_` zetten
waardoor het in de client-bundle wordt ingebakken.

---

## 2026-05-27 18:58 — `proxy.ts` best practices uitgewerkt

**Files:** `.cursor/rules/nextjs-app-router.mdc`
**Tags:** proxy, next-js-16, request-layer

Proxy-sectie uitgebreid van 5 naar ~38 regels: skeleton met juiste
`next/server`-imports, verplichte `matcher`, do/don't-lijsten,
single-file-principe. Officiële Next 16 docs (`16-proxy.md`) bevatten
4 best practices die ontbraken. Voorkomt klassieke fouten (imports uit
`"next"` i.p.v. `"next/server"`, ontbrekende matcher, volledige auth
in proxy).

---

## 2026-05-27 20:13 — `next/image` en `next/link` sectie toegevoegd

**Files:** `.cursor/rules/nextjs-app-router.mdc`
**Tags:** components, image, link, performance, prefetch

Nieuwe sectie "Next.js components — geen rauwe HTML" (~75 regels):
wanneer `<Image>` / `<Link>` gebruiken, `remotePatterns`-config,
`useRouter` uit `next/navigation` (niet `next/router`). Voorkomt rauwe
`<img>` (geen optimalisatie, CLS-issues), rauwe `<a>` voor interne
routes (full reload, geen prefetch), en remote images zonder
`remotePatterns` (build-error).

---

## 2026-05-28 09:54 — `protect-eindopdracht.mdc` aangemaakt

**Files:** `.cursor/rules/protect-eindopdracht.mdc`
**Tags:** rules, read-only, eindopdracht, safety, always-apply

Nieuwe `alwaysApply: true` rule die `EINDOPDRACHT.md` markeert als
read-only voor de agent. Edit/write/delete/move is verboden;
typo-fixes ook. `EINDOPDRACHT.md` is de officiële Novi-opdracht —
onbedoelde edits kunnen inhoudelijk afwijken van wat de docent
beoordeelt.

---

## 2026-05-28 09:58 — `journaling.mdc` opgeschoond na verwijderen DEV-JOURNAL

**Files:** `.cursor/rules/journaling.mdc`
**Tags:** rules, cleanup, dev-journal

Regel over `docs/DEV-JOURNAL.md` als archief verwijderd; "Geen
DEV-JOURNAL-mirror" vervangen door "Eén event = één entry = één
bestand". `DEV-JOURNAL.md` bestaat niet meer (zie
[DECISIONS](./DECISIONS.md#drop-dev-journal)); de rule mocht niet meer
naar een niet-bestaand bestand verwijzen.

---

## 2026-05-28 11:02 — Light template ingekort + drempel-tabel toegevoegd

**Files:** `.cursor/rules/journaling.mdc`, `docs/INDEX.md`
**Tags:** rules, documentation, methodology, simplification

Light template beperkt tot max 3 zinnen vrije tekst (geen
`Wat`/`Waarom`/`Effect`-sub-kopjes meer); drempel-tabel toegevoegd die
per file vastlegt wat wezenlijk genoeg is om te loggen. Voorkomt dat
kleine layout-/tekst-wijzigingen het log opblazen. Onderbouwd in
[DECISIONS](./DECISIONS.md#short-journaling-format); AI-FAILURES blijft
buiten scope.

---

## 2026-05-28 11:25 — Bestaande journal-entries zijn read-only

**Files:** `.cursor/rules/journaling.mdc`
**Tags:** rules, methodology, immutability

Nieuwe sectie "Bestaande entries zijn read-only": de agent mag oude
entries niet typografisch of stilistisch wijzigen — alleen nieuwe entries
toevoegen onderaan. Correcties lopen altijd via een nieuwe entry die de
oude eventueel markeert met `_Superseded by …._`. Uitzondering: expliciet
verzoek van de gebruiker.
