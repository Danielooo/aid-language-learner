# Dev Journal

Chronologisch logboek van het project. Alles wat noemenswaardig is komt
hier eerst, in volgorde van gebeurtenis. Specialized files
(`RULES-CHANGELOG`, `PROMPT-LOG`, `AI-FAILURES`, `DECISIONS`) trekken
later de rubric-relevante entries hieruit.

Zie [`INDEX.md`](./INDEX.md) voor template en werkstroom.

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
