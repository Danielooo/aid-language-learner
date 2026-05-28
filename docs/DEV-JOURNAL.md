# Dev Journal

> **Archief.** Tot 2026-05-27 schreven we hier alle gebeurtenissen
> chronologisch, naast de specialized files. Sinds 2026-05-28 gaat elke
> gebeurtenis direct naar de juiste specialized file
> ([`RULES-CHANGELOG`](./RULES-CHANGELOG.md), [`PROMPT-LOG`](./PROMPT-LOG.md),
> [`AI-FAILURES`](./AI-FAILURES.md), [`DECISIONS`](./DECISIONS.md)) — geen
> mirror hier meer. De entries hieronder blijven staan als historische
> context. Zie [`INDEX.md`](./INDEX.md) voor de nieuwe werkstroom.

---

## 2026-05-27 18:11 — Project gestart

**Type:** observation
**Files:** —
**Tags:** project-start, scaffolding
**Refs:** _no commit yet_
**Duration:** —

### Wat
Next.js 16.2.6 boilerplate aangemaakt met TypeScript, Tailwind v4, App
Router. Initiële commit met scaffolding.

### Waarom
Vertrekpunt voor eindopdracht AI Developer.

### Effect
Werkbare scaffold met `app/`, `public/`, `next.config.ts`,
`tsconfig.json`, `package.json`.

---

## 2026-05-27 18:12 — `AGENTS.md` met Next-versie waarschuwing

**Type:** rules-update
**Files:** AGENTS.md
**Tags:** rules, next-js-16, mental-model
**Refs:** _no commit yet_

### Wat
`AGENTS.md` aangemaakt met de waarschuwing dat dit Next.js 16 is, niet
de versie uit de training data van AI-modellen, en met verwijzing naar
`node_modules/next/dist/docs/` als bron-van-waarheid.

### Waarom
Voorkomen dat agents oudere conventies (sync `params`,
`middleware.ts`, `@tailwind base`) gebruiken die in Next 16 broken zijn.

### Effect
Elke agent-sessie start met deze context. Later in de week bleek dit
cruciaal toen cursusmateriaal `middleware.ts` en `src/`-conventies
toonden die niet bij Next 16 horen.

---

## 2026-05-27 18:23 — Eerste `.cursorrules` aangemaakt (single file)

**Type:** rules-update
**Files:** .cursorrules
**Tags:** rules, initial
**Refs:** _no commit yet_

### Wat
Eén `.cursorrules` bestand met regels voor tech stack, file structure,
naming, React/Server Components, Tailwind v4, TypeScript, Nederlandse
comments, imports.

### Waarom
Eerste poging tot consistente AI-guidance volgens een schermafbeelding
uit cursusmateriaal die om een `.cursorrules` vroeg.

### Effect
Werkbaar maar single-file is moeilijk te onderhouden bij groei.
Vervangen 1 minuut later (zie volgende entry).

---

## 2026-05-27 18:24 — Migratie naar `.cursor/rules/*.mdc`

**Type:** rules-update
**Files:** .cursor/rules/tech-stack.mdc, .cursor/rules/conventions.mdc, .cursor/rules/nextjs-app-router.mdc, .cursor/rules/typescript-react.mdc, .cursor/rules/styling-tailwind.mdc
**Tags:** rules, migration, structure
**Refs:** _no commit yet_, zie [RULES-CHANGELOG.md](./RULES-CHANGELOG.md#2026-05-27-1824)

### Wat
Single `.cursorrules` verwijderd. Vervangen door 5 gespecialiseerde
`.mdc` bestanden onder `.cursor/rules/` met YAML frontmatter
(`description`, `globs`, `alwaysApply`).

### Waarom
- Schaalbaarder (per onderwerp uit te breiden)
- Per-onderwerp `globs` houden context-vervuiling minimaal
- Aanbevolen door Cursor's nieuwere rules-systeem
- Kritieke info (`tech-stack`, `conventions`) blijft via
  `alwaysApply: true` altijd in context

### Effect
Bij bewerken van bv. een CSS-bestand komen alleen styling-rules in
context; TypeScript-rules niet. Verwacht: scherpere outputs zonder
ruis.

---

## 2026-05-27 18:27 — Routing "gouden regel" sectie toegevoegd

**Type:** rules-update
**Files:** .cursor/rules/nextjs-app-router.mdc
**Tags:** rules, routing, app-router
**Refs:** _no commit yet_

### Wat
Sectie "Routing — de gouden regel" toegevoegd aan
`nextjs-app-router.mdc` met mapping-tabel `app/blog/[slug]/page.tsx →
/blog/mijn-post`.

### Waarom
Cursusmateriaal benadrukt het mentale model (folder = route, geen
react-router nodig). Originele rule had het impliciet, niet expliciet.

### Effect
Verwacht: agent maakt geen verwarring meer over routing-libraries en
weet dat een folder pas publiek wordt met `page.tsx`/`route.ts`.

---

## 2026-05-27 18:33 — File structure best practices uitgewerkt

**Type:** rules-update
**Files:** .cursor/rules/nextjs-app-router.mdc, .cursor/rules/conventions.mdc
**Tags:** rules, file-structure, conventions
**Refs:** _no commit yet_, zie [DECISIONS.md](./DECISIONS.md#components-in-app-private-folders)

### Wat
File structure sectie uitgebreid met 4 kernregels en een ASCII-tree:
components in `app/_components/{ui,features}/`, business logic in
`lib/`, globale types in `types/`, `proxy.ts` (niet `middleware.ts`)
in project-root. Cursusmateriaal toonde top-level `components/`, maar
keuze: alles in `app/`.

### Waarom
- Cursusmateriaal in `src/`-structuur conflicteerde met dit project
  (geen `src/`)
- Components in `app/` met private folders houdt routing en UI bij
  elkaar
- Bewuste afwijking van cursusmateriaal moet vastgelegd worden
  (zie DECISIONS)

### Effect
Verwacht: agent maakt geen top-level `components/` folder meer.
Conflict tussen cursusmateriaal en project-structuur is bewust
beslecht.

---

## 2026-05-27 18:40 — Loading & error UI uitgewerkt

**Type:** rules-update
**Files:** .cursor/rules/nextjs-app-router.mdc, .cursor/rules/typescript-react.mdc
**Tags:** rules, loading, error-boundary
**Refs:** _no commit yet_

### Wat
Sectie "Loading & error UI" toegevoegd met skeleton-loader patroon
(`animate-pulse`) en de verplichte `"use client"` + `{ error, reset }`
signature voor error boundaries. In `typescript-react.mdc` bovendien
een sectie "Special-file signatures" met de exacte types voor
`error.tsx`, `page.tsx` (async params), en `layout.tsx`.

### Waarom
Cursusmateriaal toonde de patterns; mijn originele rule noemde
loading/error alleen als bullets, zonder uitleg dat error.tsx
verplicht een Client Component is.

### Effect
Verwacht: agent vergeet `"use client"` niet meer bij error.tsx, en
gebruikt correct `params: Promise<...>` voor dynamische routes.

---

## 2026-05-27 18:48 — `next/image`, `next/link` en `Metadata` regels

**Type:** observation
**Files:** —
**Tags:** rules, gap-analysis, next-apis
**Refs:** _no commit yet_

### Wat
Gat in rules vastgesteld: niets over `next/image`, `next/link` of
`Metadata`. Voorstel uitgewerkt maar nog niet doorgevoerd.

### Waarom
Cursusmateriaal liet dit zien. Zonder regel zou de agent waarschijnlijk
rauwe `<img>` en `<a>` gebruiken (slecht voor performance, geen
prefetch) en `<title>` in JSX zetten (werkt niet in Server Components).

### Effect
_Nog niet doorgevoerd._ TODO voor volgende sessie.

---

## 2026-05-27 18:52 — `env-variables.mdc` aangemaakt

**Type:** rules-update
**Files:** .cursor/rules/env-variables.mdc
**Tags:** rules, security, env-vars
**Refs:** _no commit yet_

### Wat
Nieuw rule-bestand met `alwaysApply: true` over `NEXT_PUBLIC_` prefix,
security-regels (geheim ≠ `NEXT_PUBLIC_`), `.env.*` bestanden, en
optionele TypeScript-typing van `process.env`.

### Waarom
Niets in de rules over env vars terwijl het security-kritiek is. Een
agent die de Stripe secret achter `NEXT_PUBLIC_` zet lekt die naar
elke bezoeker.

### Effect
Verwacht: agent gebruikt `NEXT_PUBLIC_` alleen voor expliciet veilige
client-config. Server-secrets blijven server-only.

---

## 2026-05-27 18:58 — `proxy.ts` best practices uitgewerkt

**Type:** rules-update
**Files:** .cursor/rules/nextjs-app-router.mdc
**Tags:** rules, proxy, next-js-16
**Refs:** _no commit yet_

### Wat
Korte 5-regel sectie over `proxy.ts` (alleen rename uit Next 16)
vervangen door uitgebreide sectie met skeleton, named/default export,
matcher-verplichting, do/don't lijst (geen full auth, geen
data-fetching, geen `fetch` cache-opties).

### Waarom
Officiële Next 16 docs (`16-proxy.md`) hebben 4 best practices die
nog ontbraken. Single-file principe, matcher-scoping, imports uit
`next/server` zijn allemaal valkuilen waar een agent zonder rule in
zou lopen.

### Effect
Verwacht: als ik proxy.ts ga bouwen krijgt 'ie meteen een `matcher`
config en zit de import op `next/server`.

---

## 2026-05-27 19:44 — Documentatiesysteem opgezet

**Type:** decision
**Files:** docs/INDEX.md, docs/DEV-JOURNAL.md, docs/RULES-CHANGELOG.md, docs/PROMPT-LOG.md, docs/AI-FAILURES.md, docs/DECISIONS.md, .cursor/rules/journaling.mdc
**Tags:** documentation, methodology, eindopdracht
**Refs:** _no commit yet_, zie [DECISIONS.md](./DECISIONS.md#documentatiesysteem)

### Wat
6 docs-bestanden aangemaakt + `journaling.mdc` meta-rule. Doel: vraag
16, 17, 21, 25, 27 uit Deelopdracht 3 onderbouwen zonder achteraf
reconstrueren.

### Waarom
Deelopdracht 3 weegt 45%, vraagt om concrete voorbeelden (initiële vs.
gewijzigde Cursor-instructies, 3+ AI-failures, prompt-iteraties) die
achteraf niet meer betrouwbaar te reproduceren zijn.

### Effect
Werkstroom verandert: ~10–15 min schrijftijd per sessie + 15 min per
week = verantwoordingsdocument schrijven wordt samenstellen i.p.v.
herinneren. Zie DECISIONS voor de afweging.

---

## 2026-05-27 20:13 — `next/image` en `next/link` sectie toegevoegd

**Type:** rules-update
**Files:** .cursor/rules/nextjs-app-router.mdc
**Tags:** rules, components, image, link, performance
**Refs:** commit:`ee63145`, zie [RULES-CHANGELOG.md](./RULES-CHANGELOG.md#2026-05-27-2013--nextimage-en-nextlink-sectie-toegevoegd)
**Duration:** ~10 min

### Wat
Nieuwe sectie "Next.js components — geen rauwe HTML" toegevoegd aan
`nextjs-app-router.mdc`, geplaatst tussen `proxy.ts` en `Server vs Client
Components`. Bevat twee subsecties:

- **`<Image>` uit `next/image`**: waarom (size-optimalisatie, CLS,
  lazy loading, blur), static vs remote met code-voorbeelden,
  `remotePatterns` whitelist in `next.config.ts`, regels voor `alt`,
  `fill`, en `priority` op LCP-image.
- **`<Link>` uit `next/link`**: waarom (auto-prefetch in viewport,
  client-side transitions), interne `<Link>` vs externe `<a>`, gebruik
  van `prefetch={false}` voor lange lijsten, en de waarschuwing dat
  `useRouter` uit **`next/navigation`** moet komen, niet `next/router`.

Bron-verwijzingen naar `node_modules/next/dist/docs/01-app/01-getting-started/12-images.md`
en `.../04-linking-and-navigating.md` zodat de agent bij twijfel kan
doorklikken.

`Metadata` is bewust afgesplitst als aparte TODO — gebruiker vroeg alleen
om image+link.

### Waarom
Op 18:48 had ik dit gat al vastgesteld maar nog niet doorgevoerd. Zonder
regel zou de agent rauwe `<img>` (geen optimalisatie, CLS) en `<a>` (full
page reload, geen prefetch) gebruiken, of `next/router` importeren (Pages
Router API).

### Effect
_Verwacht:_ bij UI-werk kiest agent automatisch voor `<Image>`/`<Link>`,
gebruikt `<a>` alleen voor externe links, en stelt voor `remotePatterns`
te configureren bij remote images.

---

## 2026-05-27 20:52 — Commit-strategie + `/commit` en `/sessie-eind` commands

**Type:** decision
**Files:** WERKWIJZE.md, .cursor/commands/commit.md, .cursor/commands/sessie-eind.md, docs/DECISIONS.md
**Tags:** git, commits, slash-commands, methodology
**Refs:** [DECISIONS.md#commit-strategie-a](./DECISIONS.md#commit-strategie-a), commit:`20dfb25`

### Wat
Drie wijzigingen:
1. Commit-strategie A formeel gekozen: één commit per logische gebeurtenis
2. `.cursor/commands/commit.md` aangemaakt — `/commit` voor per-event commit
   + auto-koppelen van journal-entries
3. `.cursor/commands/sessie-eind.md` aangemaakt — `/sessie-eind` als
   eind-sessie-vangnet
4. WERKWIJZE.md aangepast: stap 3 = `/commit`, stap 5 = `/sessie-eind`

### Waarom
Eindopdracht vereist 20+ commits met goede messages. Per-event committen
sluit aan op het journaling-systeem (één entry = één SHA). `/commit`
slash command voorkomt friction door staging + message + Refs-update in
één flow te bundelen.

### Effect
_Verwacht:_ ik tik na elke gebeurtenis `/commit`, krijg een
message-voorstel, accepteer of pas aan, en de journal-Refs zijn meteen
up-to-date. `/sessie-eind` blijft als vangnet voor losse eindjes.

---

## 2026-05-27 21:00 — `/sessie-eind` gemerged in `/commit` status-footer

**Type:** decision
**Files:** .cursor/commands/commit.md, .cursor/commands/sessie-eind.md (verwijderd), WERKWIJZE.md, docs/DECISIONS.md
**Tags:** workflow, slash-commands, methodology, refinement
**Refs:** commit:`385e180`, zie [DECISIONS.md#commit-met-status-footer](./DECISIONS.md#commit-met-status-footer)
**Duration:** ~10 min

### Wat
`/sessie-eind` commando verwijderd. De drie checks (uncommitted files,
`_no commit yet_` entries, onvolledige `_te observeren_` velden) zijn
verhuisd naar een status-footer aan het einde van `/commit` (nieuwe
substappen in stap 8). WERKWIJZE.md stap 5 herschreven: "geen apart
commando nodig". Slash-commands-lijst van 4 naar 3.

### Waarom
De grens tussen `/commit` en `/sessie-eind` was dun: na je laatste
`/commit` doe je een sessie-eind-check, maar `/commit` weet nog niet
of dit je laatste was. Twee commands waar één voldoet — en de check
krijgt pas waarde aan het einde van de sessie, dus makkelijk te
vergeten. Door de footer altijd te tonen komt de check automatisch,
zonder dat de gebruiker eraan hoeft te denken.

### Effect
_Verwacht:_ minder commando's om te onthouden, status komt automatisch
na élke commit, en het natuurlijke moment van "ik ben klaar" valt
samen met "alle tellers staan op 0 in de footer". Mogelijke kanttekening:
status-info kan dubbel voelen bij snel-opeenvolgende commits, maar de
footer is compact genoeg.

---

## 2026-05-27 21:13 — Wekelijkse "lift"-stap herijkt naar "audit"-stap

**Type:** decision
**Files:** WERKWIJZE.md
**Tags:** workflow, journaling, methodology, audit
**Refs:** commit:`9ba4a81`
**Duration:** ~5 min

### Wat
WERKWIJZE.md `## Wekelijks` stap 1 herschreven. Heette voorheen
"Einde week — lift" met de prompt "lift de belangrijkste journal-entries
van deze week naar de specialized files". Is nu "Einde week — audit"
met een uitgebreidere audit-prompt die check op (a) compleetheid
DEV-JOURNAL ↔ specialized files, (b) consistentie cross-references,
(c) inmiddels bekende `_te observeren_` velden, (d) niet-gelogde
AI-failures/prompt-iteraties.

Daarnaast formatting-fixes in WERKWIJZE.md: backtick-omsloten markdown
links (`` `[…](…)` ``) ontwikkeld naar gewone links, typo
`app/api/)**` → `app/api/**`, ontbrekende `/commit` en `/ai-failure`
code-blocks in stappen 3 en 4 hersteld, code-block indent in
sync-check stap genormaliseerd.

### Waarom
Gemerkt tijdens het uitleggen van de lift-stap: door
`.cursor/rules/journaling.mdc` (de meta-rule) schrijft Cursor tijdens
de sessie al direct naar de specialized files. De "lift" als
afzonderlijke curate-fase is daarmee vrijwel leeg. Wat overblijft is
een verificatie/audit-rol: checken dat de meta-rule overal heeft
meegeschreven, gaten dichten, `_te observeren_` velden achteraf
invullen.

Capture en curate gebeuren dus synchroon (i.p.v. capture nu, curate
later) — en dat is een gevolg van de meta-rule die we eerder hebben
opgezet, niet iets dat we expliciet hebben besloten. Door de stap nu
te herijken sluit de werkwijze beter aan op de feitelijke flow.

### Effect
_Verwacht:_ aan einde van een week pakt de audit-prompt expliciet
de zaken op die wél nog ontbreken (gemiste AI-failures, niet-ingevulde
effecten) i.p.v. duplicate werk te doen voor entries die al in
specialized files staan. Lift-fatigue voorkomen.

_Te observeren:_ of de audit-stap iets oplevert dat de meta-rule
zelf had moeten oppikken — als de meta-rule structureel iets mist,
dán die rule aanscherpen i.p.v. de audit-stap te verzwaren.
