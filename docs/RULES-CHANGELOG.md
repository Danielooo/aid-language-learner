# Rules Changelog

Iedere wijziging aan `.cursor/rules/*.mdc` of `AGENTS.md`. Voedt direct
rubric-vraag 16 ("initiële instructies aan Cursor + evolutie + effect
op output") en vraag 17 ("welke `.cursorrules` werkten goed en waarom").

Zie [`INDEX.md`](./INDEX.md) voor template.

---

## 2026-05-27 18:12 — AGENTS.md aangemaakt

**Type:** rules-update
**Files:** AGENTS.md
**Before:** —
**After:** 5 regels: Next.js 16 waarschuwing + verwijzing naar `node_modules/next/dist/docs/`
**Tags:** initial, next-js-16, mental-model
**Refs:** _no commit yet_

### Wat
Begin-van-alles waarschuwing: dit is Next.js 16, niet de versie uit
training data.

### Waarom
Voorkomen dat agents oudere conventies (`middleware.ts`, sync `params`,
`@tailwind base`) gebruiken die in Next 16 broken zijn.

### Effect
_Bevestigd:_ later in de week bleek dit beslissend bij meerdere
discrepanties tussen cursusmateriaal en Next 16 (middleware → proxy,
src/ vs root, sync vs async params).

---

## 2026-05-27 18:23 → 18:24 — Single `.cursorrules` → `.cursor/rules/*.mdc` (5 files)

**Type:** rules-update (migratie)
**Files:**
- Verwijderd: `.cursorrules`
- Aangemaakt: `.cursor/rules/tech-stack.mdc`, `conventions.mdc`, `nextjs-app-router.mdc`, `typescript-react.mdc`, `styling-tailwind.mdc`
**Before:** 1 bestand, 5188 bytes, geen scoping
**After:** 5 bestanden met YAML frontmatter (`description`, `globs`, `alwaysApply`)
**Tags:** migration, structure, scoping
**Refs:** _no commit yet_

### Wat
- `tech-stack.mdc` — `alwaysApply: true` — Next 16/Tailwind v4 waarschuwingen
- `conventions.mdc` — `alwaysApply: true` — naming, comments, imports
- `nextjs-app-router.mdc` — `globs: app/**/*.{ts,tsx}` — App Router specifics
- `typescript-react.mdc` — `globs: **/*.{ts,tsx}` — TS + React patterns
- `styling-tailwind.mdc` — `globs: **/*.{tsx,css}` — Tailwind v4

### Waarom
Single-file werd onhoudbaar bij groei. Cursor raadt `.cursor/rules/*.mdc`
met `globs` aan voor scoped context.

### Effect
Bij bewerken van een CSS-bestand komen alleen styling-rules in context;
TypeScript-rules niet → scherpere outputs, minder context-vervuiling.

---

## 2026-05-27 18:27 — "Routing — de gouden regel" sectie toegevoegd

**Type:** rules-update
**Files:** `.cursor/rules/nextjs-app-router.mdc`
**Before:** 52 regels, routing impliciet
**After:** 78 regels, met mapping-tabel `app/blog/[slug]/page.tsx → /blog/mijn-post` en uitleg "folder = route, geen react-router nodig"
**Tags:** routing, mental-model
**Refs:** _no commit yet_

### Wat
Expliciete sectie bovenaan met:
- "Elke folder in `app/` is een route"
- Mapping-tabel met 6 voorbeelden (aangepast aan dit project: `app/` in
  project-root, niet `src/app/`)
- Folder-prefixes (`_naam`, `(naam)`, `[slug]`, `[...slug]`)
- Folder wordt pas publiek met `page.tsx`/`route.ts`

### Waarom
Cursusmateriaal benadrukt het mentale model maar mijn rule had het
impliciet, niet uitgelegd.

### Effect
_Verwacht:_ agent maakt geen verwarring over routing-libraries.

---

## 2026-05-27 18:33 — File structure best practices (4 kernregels + tree)

**Type:** rules-update
**Files:** `.cursor/rules/nextjs-app-router.mdc`, `.cursor/rules/conventions.mdc`
**Before:** Vage bullets ("globaal gedeelde UI: `app/_components/` of top-level `components/`")
**After:** Expliciete keuze in `nextjs-app-router.mdc` met ASCII-tree; in `conventions.mdc` sectie "Types en business logic — waar plaatsen"
**Tags:** file-structure, components, decision
**Refs:** _no commit yet_, zie [DECISIONS.md](./DECISIONS.md#components-in-app-private-folders)

### Wat
Vier kernregels:
1. `app/` = routing én components (geen top-level `components/`!)
2. Gedeelde components in `app/_components/ui/` (generiek) + `app/_components/features/` (specifiek)
3. Globale types in top-level `types/index.ts`
4. Business logic in top-level `lib/utils.ts` + `lib/api.ts`

Plus ASCII-tree met de volledige verwachte project-structuur, en
`proxy.ts` (niet `middleware.ts`) in project-root.

### Waarom
Cursusmateriaal toonde top-level `components/` in een `src/`-structuur.
Dit project gebruikt geen `src/`; bewust gekozen voor components
co-located in `app/`. Bevestigd in DECISIONS.

### Effect
_Verwacht:_ agent maakt geen top-level `components/` meer, en zet
proxy-bestand niet als `middleware.ts` neer.

---

## 2026-05-27 18:40 — Loading & error UI sectie + special-file signatures

**Type:** rules-update
**Files:** `.cursor/rules/nextjs-app-router.mdc`, `.cursor/rules/typescript-react.mdc`
**Before:** `loading.tsx` en `error.tsx` als 2 bullets zonder uitleg
**After:** Volledige sectie met skeleton-loader voorbeeld + verplichte `"use client"` + `{ error, reset }` props
**Tags:** loading, error-boundary, type-safety
**Refs:** _no commit yet_

### Wat
- `nextjs-app-router.mdc`: sectie "Loading & error UI (App Router specials)" met:
  - Hoe ze auto-wrappen rond `page.tsx` (geen handmatige Suspense/ErrorBoundary)
  - Skeleton-loader patroon (`animate-pulse space-y-4`)
  - Verplichte `"use client"` op `error.tsx`
  - Exacte `{ error: Error & { digest?: string }; reset: () => void }` props
  - Verwijzing naar `global-error.tsx` voor root-layout errors
- `typescript-react.mdc`: nieuwe sectie "Special-file signatures" met types
  voor `error.tsx`, `page.tsx` (async params), `layout.tsx`.

### Waarom
Zonder deze regels zou agent waarschijnlijk:
1. `"use client"` vergeten op error.tsx → runtime crash
2. Verkeerde prop-signature gebruiken
3. Handmatig `<Suspense fallback>` bouwen i.p.v. `loading.tsx` aanmaken
4. Simpele "Loading..." tekst i.p.v. nette skeleton

### Effect
_Verwacht:_ error/loading files krijgen meteen de juiste signature en
patroon.

---

## 2026-05-27 18:52 — `env-variables.mdc` aangemaakt (alwaysApply)

**Type:** rules-update
**Files:** `.cursor/rules/env-variables.mdc`
**Before:** Niets over env vars
**After:** 3340 bytes, `alwaysApply: true`, sectie over `NEXT_PUBLIC_`, security-regels, `.env.*` bestanden, optionele TS-typing
**Tags:** security, env-vars, always-apply
**Refs:** _no commit yet_

### Wat
Volledig nieuw rule-bestand:
- Tabel server-only vs `NEXT_PUBLIC_` (met code-voorbeelden ✅/❌)
- 4 security-regels (geheim ≠ `NEXT_PUBLIC_`, secrets alleen
  server-side, geen client-side `process.env.SECRET`, geen secrets in
  `next.config.ts`)
- `.env.*` bestand-tabel (`.env.local` niet committen, `.env.example`
  wel, precedence-volgorde)
- Optionele `types/env.d.ts` voor autocomplete
- Wanneer iets WEL `NEXT_PUBLIC_` mag zijn (Stripe publishable key,
  Sentry DSN, feature flags)

### Waarom
Security-kritiek + project-breed → `alwaysApply: true`. Een agent zonder
deze regel kan een secret achter `NEXT_PUBLIC_` zetten en die wordt in
de client-bundle ingebakken.

### Effect
_Verwacht:_ agent gebruikt prefix alleen voor expliciet veilige client-config.

---

## 2026-05-27 18:58 — `proxy.ts` best practices uitgewerkt

**Type:** rules-update
**Files:** `.cursor/rules/nextjs-app-router.mdc`
**Before:** 5 regels "rename uit middleware.ts" + locatie
**After:** ~38 regels met skeleton, do/don't lijst, single-file principe, matcher-verplichting
**Tags:** proxy, next-js-16, request-layer
**Refs:** _no commit yet_

### Wat
Vervangen door:
- Skeleton met `NextRequest`/`NextResponse` imports uit `next/server`
- Verplichte `matcher` config met voorbeeld
- "Wel gebruiken voor" lijst (headers, redirects met request-data, A/B,
  optimistic auth)
- "NIET gebruiken voor" lijst (simpele redirects → `next.config.ts`,
  volledige auth, data-fetching, `fetch()` cache-opties hebben geen
  effect)
- Single-file principe + modulariseren via `lib/proxy/*.ts`

### Waarom
Officiële Next 16 docs (`16-proxy.md`) hebben 4 best practices die in
mijn 5-regel sectie ontbraken. Imports uit `"next"` i.p.v. `"next/server"`
is een klassieke valkuil.

### Effect
_Verwacht:_ wanneer ik proxy.ts ga bouwen krijg ik direct correcte
imports, een matcher, en geen poging tot full-auth in proxy.

---

## NOG TE DOEN — `next/image`, `next/link`, `Metadata` regels

**Type:** rules-update (gepland)
**Files:** `.cursor/rules/nextjs-app-router.mdc` (uit te breiden)

### Wat
Sectie "Next.js components & APIs (geen rauwe HTML)" toevoegen:
- Altijd `<Image>` uit `next/image`, nooit `<img>`
- Altijd `<Link>` uit `next/link` voor interne navigatie, nooit `<a>`
- Metadata via `export const metadata: Metadata` of
  `generateMetadata()`, nooit `<title>` in JSX

### Waarom
Cursusmateriaal liet dit zien. Voorstel uitgewerkt in chat
2026-05-27 maar nog niet doorgevoerd.
