# Decisions (mini-ADRs)

Architectuurkeuzes, conventiekeuzes, en bewuste afwijkingen van
cursusmateriaal. Voedt rubric-vraag 22 ("maatregelen voor
betrouwbaarheid"), 23 (top-3 inzichten) en 28 (welke prompt-onderdelen
meeste invloed).

Format: lichtgewicht ADR (Architecture Decision Record).

Zie [`INDEX.md`](./INDEX.md) voor template.

---

## Status-legenda

- **Proposed** — geformuleerd, nog niet uitgevoerd
- **Accepted** — uitgevoerd, actief
- **Superseded by X** — vervangen door beslissing X
- **Deprecated** — niet meer relevant, ingetrokken

---

## Entries

### 2026-05-27 — `.cursor/rules/*.mdc` ipv single `.cursorrules`

**Type:** decision
**Status:** Accepted
**Files:** `.cursor/rules/*.mdc`
**Tags:** rules, structure, methodology
**Refs:** [RULES-CHANGELOG.md#2026-05-27-1823--1824](./RULES-CHANGELOG.md), [DEV-JOURNAL.md#2026-05-27-1824](./DEV-JOURNAL.md)

#### Context
Begin van project. Cursor accepteert beide formats: single `.cursorrules`
of `.cursor/rules/*.mdc`. Eerste optie is simpel, tweede is per-onderwerp
en scoped.

#### Decision
Multi-file `.cursor/rules/*.mdc` met YAML frontmatter (`description`,
`globs`, `alwaysApply`).

#### Argumenten voor
- Schaalbaar bij groei (per-onderwerp uit te breiden)
- `globs` houden context-vervuiling minimaal (alleen relevante regels
  in context bij file-edit)
- `alwaysApply: true` voor kritische regels (`tech-stack`,
  `conventions`, `env-variables`)
- Aanbevolen door Cursor zelf voor de nieuwere rules-engine

#### Argumenten tegen
- Iets meer onderhoud (5 files vs 1)
- Discoverability iets minder (moet weten welk bestand voor wat)

#### Consequences
- `INDEX.md` nodig om files-overzicht te bewaren (in plaats daarvan
  staat dat nu in `docs/INDEX.md`)
- Cross-references tussen rule-bestanden mogen niet impliciet zijn

---

### 2026-05-27 — Components in `app/_components/`, geen top-level `components/` <a id="components-in-app-private-folders"></a>

**Type:** decision
**Status:** Accepted
**Files:** `.cursor/rules/nextjs-app-router.mdc`, `.cursor/rules/conventions.mdc`
**Tags:** file-structure, components, deviation-from-coursebook
**Refs:** [RULES-CHANGELOG.md#2026-05-27-1833](./RULES-CHANGELOG.md), [DEV-JOURNAL.md#2026-05-27-1833](./DEV-JOURNAL.md)

#### Context
Cursusmateriaal raadt aan: top-level `src/components/{ui,features}/`.
Dit project gebruikt echter géén `src/`-folder (App Router direct in
project-root). Bovendien staat Next.js App Router toe — en moedigt
het zelfs aan — om non-routable code co-located in `app/` te zetten
via private folders (`_components/`).

#### Decision
Components in `app/_components/{ui,features}/` (gedeeld) en
`app/<segment>/_components/` (route-specifiek). Géén top-level
`components/`.

#### Argumenten voor
- App-Router-native conventie (private folders met `_` prefix)
- Alles bij elkaar: routing en bijbehorende UI in dezelfde structuur
- Matchet de werkelijke project-structuur (geen `src/`)

#### Argumenten tegen
- Wijkt af van cursusmateriaal → moet bewust gedocumenteerd worden
  (dat doet deze entry)
- Toekomstige refactor naar `src/` kost meer werk

#### Consequences
- `nextjs-app-router.mdc` bevat expliciete waarschuwing "NOOIT een
  top-level `components/` folder maken"
- `conventions.mdc` herhaalt dit onder "Types en business logic"

---

### 2026-05-27 — Documentatiesysteem in `docs/` met capture → curate flow <a id="documentatiesysteem"></a>

**Type:** decision
**Status:** Superseded by [Drop DEV-JOURNAL.md](#drop-dev-journal)
**Files:** `docs/INDEX.md`, `docs/DEV-JOURNAL.md`, `docs/RULES-CHANGELOG.md`, `docs/PROMPT-LOG.md`, `docs/AI-FAILURES.md`, `docs/DECISIONS.md`, `.cursor/rules/journaling.mdc`
**Tags:** documentation, methodology, eindopdracht, deelopdracht-3
**Refs:** [DEV-JOURNAL.md#2026-05-27-1944](./DEV-JOURNAL.md), [EINDOPDRACHT.md § Deelopdracht 3](../EINDOPDRACHT.md)

#### Context
Deelopdracht 3 (Verantwoordingsdocument) weegt 45% van eindcijfer en
vraagt om concrete voorbeelden (initiële vs. gewijzigde
Cursor-instructies, 3+ AI-failures, prompt-iteraties). Achteraf
reconstrueren is onbetrouwbaar; tijdens werk loggen is essentieel.

Project beslaat meerdere weken bij 6–8u/week, dus puur git-commit als
log is te krap.

#### Decision
Hybride: één chronologisch `DEV-JOURNAL.md` voor quick-capture + 4
gespecialiseerde files voor curated rubric-entries + `INDEX.md` als TOC.
Uniform machine-leesbaar template (Type/Files/Tags/Refs/Duration +
Wat/Waarom/Effect). Plus een meta-rule `.cursor/rules/journaling.mdc`
die Cursor in Agent-mode forceert om bij rule/prompt-wijzigingen
auto-entries te schrijven.

#### Alternatieven overwogen
- **Alleen git commit messages** — verworpen: te beperkt voor reflectie,
  niet zoekbaar op thema, en ik vergeet soms te committen
- **Eén groot dev journal** — verworpen: onleesbaar bij 200+ entries
- **Specialized files zonder centraal journal** — verworpen: te veel
  context-switches tijdens capture
- **Cursor Hooks voor volledige automatisering** — uitgesteld: extra
  setup-overhead, terugkomen op als blijkt dat ik vergeet entries te
  maken

#### Argumenten voor
- Capture-overhead per sessie: ~10–15 min (acceptabel)
- Rubric-mapping in `INDEX.md` maakt schrijven van verantwoordings-
  document een samenstel-taak i.p.v. herinner-taak
- LLM-leesbaar template laat Cursor het meeste werk doen
- Werkt ook als ik vergeet te committen (Files-veld in elke entry)

#### Argumenten tegen
- Discipline-afhankelijk: als ik niet schrijf, niets in de logs
- Risico op duplicate werk (DEV-JOURNAL + specialized file voor zelfde
  event) — gemitigeerd door "specialized = alleen rubric-waardig"

#### Consequences
- Werkstroom: start sessie → schrijf header in DEV-JOURNAL → tijdens
  werken auto-entries via journaling-rule → einde sessie commit + refs
- Wekelijkse recap-prompt nodig (staat in INDEX)
- Bij DEV-JOURNAL.md > 500 entries: overweeg archivering per maand/sprint

---

### 2026-05-27 — Commit-strategie A: één commit per logische gebeurtenis <a id="commit-strategie-a"></a>

**Type:** decision
**Status:** Accepted
**Files:** WERKWIJZE.md, .cursor/commands/commit.md, .cursor/commands/sessie-eind.md
**Tags:** git, commits, methodology
**Refs:** [DEV-JOURNAL.md](./DEV-JOURNAL.md), commit:`20dfb25`

#### Context
De eindopdracht vraagt om minimaal 20 kleine commits met zinvolle
messages en minimaal 5 pull requests. Daarnaast wil ik dat elke
journal-entry te koppelen is aan precies één commit, zodat de
`**Refs:** commit:<sha>` veld eenduidig blijft.

#### Decision
Eén commit per logische gebeurtenis. Een rule-wijziging is één commit,
een ADR is één commit, een feature in een component is één commit. Dit
wordt ondersteund door het `/commit` slash command dat per groep een
commit voorstelt en direct de journal-entries koppelt.

#### Alternatieven overwogen
- **Optie B: één commit per sessie** — verworpen: te grof voor 20+
  commits eis, en koppeling van entries aan commits wordt onnauwkeurig
- **Optie C: gemengd (kleine batches)** — verworpen voor consistentie;
  ik kan dit later alsnog laten kantelen als het te veel friction geeft

#### Argumenten voor
- Voldoet ruim aan de 20+ commits eis van de eindopdracht
- Iedere journal-entry heeft precies één SHA → eenvoudig te verifiëren
- Commit-messages worden afgeleid uit entry-titels → automatisch
  conventional-commit-stijl
- Maakt het `/commit` slash command logisch (één event = één commit)

#### Argumenten tegen
- Meer commits = meer git-handelingen per sessie (gemitigeerd door
  `/commit` slash command)
- Bij grote refactors kan "één gebeurtenis" arbitrair worden — vraagt
  discipline

#### Consequences
- WERKWIJZE.md stap 3 = `/commit` na elke logische gebeurtenis
- `/commit` slash command aangemaakt om groepering + commit + Refs-update
  in één flow te doen
- `/commit` toont na elke commit een status-footer met open eindjes
  (uncommitted files, `_no commit yet_` entries, onvolledige velden),
  waardoor een aparte sessie-eind-check overbodig is. Zie ADR
  ["`/commit` met status-footer ipv apart `/sessie-eind` commando"](#commit-met-status-footer)
- Bij twijfel over groepering: `/commit` vraagt de gebruiker

---

### 2026-05-27 — `/commit` met status-footer ipv apart `/sessie-eind` commando <a id="commit-met-status-footer"></a>

**Type:** decision
**Status:** Accepted
**Files:** .cursor/commands/commit.md, .cursor/commands/sessie-eind.md (verwijderd), WERKWIJZE.md, docs/DECISIONS.md
**Tags:** workflow, slash-commands, methodology, ux
**Refs:** [DEV-JOURNAL.md](./DEV-JOURNAL.md), commit:`385e180`

#### Context
Bij commit-strategie A doe je per logische gebeurtenis `/commit`. Er was
ook een apart `/sessie-eind` commando dat aan het einde van de sessie
checkt op uncommitted wijzigingen, `_no commit yet_` entries en
onvolledige `_te observeren_` velden.

In de praktijk overlappen die twee: na je laatste `/commit` doe je een
sessie-eind-check, maar `/commit` weet nog niet of dit je laatste was.
Twee commands waar één voldoet, en de check krijgt pas waarde aan het
einde van de sessie — dus is hij makkelijk te vergeten.

#### Decision
`/sessie-eind` verwijderd. De drie checks (uncommitted files, open
`_no commit yet_` entries, onvolledige velden) zijn toegevoegd als
status-footer aan het einde van `/commit`. Elke commit toont nu
informatief wat er nog open is, zonder iets te forceren.

#### Alternatieven overwogen
- **Twee aparte commands houden** — verworpen: dunne grens, en
  sessie-eind wordt vergeten omdat het optioneel voelt
- **`/sessie-eind` houden als read-only status-only commando** —
  verworpen: dezelfde info kun je in natuurlijke taal vragen
  (*"wat is mijn git-status?"*); commando voegt geen waarde toe
- **`/commit` een `--final` flag geven** — verworpen: flag-based UX
  is fiddly, en de footer is goedkoop genoeg om altijd te tonen

#### Argumenten voor
- Eén commando minder om te onthouden (3 ipv 4 slash commands)
- Status-footer komt automatisch na élke commit, niet alleen als de
  gebruiker eraan denkt
- Minder cognitieve belasting: "is dit mijn laatste commit?" hoef je
  niet meer te beantwoorden
- Sluit aan op de realiteit: elke commit kán je laatste zijn

#### Argumenten tegen
- Wat info dubbel bij meerdere snel-opeenvolgende commits (status-footer
  vier keer achter elkaar) — gemitigeerd doordat de footer compact is
- Geen apart "eind-sessie" moment meer: discipline om bij `0 0 0` af te
  sluiten ligt bij de gebruiker

#### Consequences
- `.cursor/commands/sessie-eind.md` verwijderd
- `.cursor/commands/commit.md` stap 8 uitgebreid met status-footer
- WERKWIJZE.md stap 5 ("Einde sessie") herschreven naar "geen apart
  commando nodig"
- Lijst beschikbare slash commands teruggebracht naar 3
- Bovenstaande ADR "Commit-strategie A" Consequences-regel bijgewerkt

---

### 2026-05-28 — Drop SHA-refs in journal-entries <a id="drop-sha-refs"></a>

**Type:** decision
**Status:** Accepted
**Files:** `.cursor/rules/journaling.mdc`, `.cursor/commands/audit.md` (verwijderd), `.cursor/commands/commit.md`, `WERKWIJZE.md`, `docs/INDEX.md`
**Tags:** documentation, methodology, simplification

#### Context
De rubric ([EINDOPDRACHT.md](../EINDOPDRACHT.md) § Deelopdracht 3, Q16–Q29)
eist nergens dat journal-entries naar specifieke commits linken. Q1.5
vraagt alleen om ≥20 zinvolle commits met messages — dat gaat over de
git-history zélf, niet over verwijzingen vanuit het verantwoordingsdocument.

Tijdstempels in entry-titels (`YYYY-MM-DD HH:MM`) + `git log`-tijden geven
al een chronologische correlatie. Niemand (jij, docent) gaat tijdens
nakijken een SHA in git invoeren om een entry te verifiëren.

Het bijhouden van `Refs:` (handmatig of via `/audit`) kost onderhoud +
tokens voor nul rubric-waarde.

#### Decision
- `Refs:` veld wordt verwijderd uit de light template (in
  `.cursor/rules/journaling.mdc` + `docs/INDEX.md`).
- Nieuwe entries krijgen geen `Refs:` veld meer.
- Bestaande `_no commit yet_` regels in `RULES-CHANGELOG.md` en
  `DEV-JOURNAL.md` blijven onaangetast staan als historisch artefact —
  ze tonen impliciet "deze entry is geschreven vóór deze cleanup".
- `/audit` slash-command vervalt; bestand verwijderd.

#### Alternatieven overwogen
- **Drop volledig + opruimen (16 entries)** — verworpen: cleanup-werk
  zonder rubric-waarde, bestaande entries hebben historische context
- **Keep als optioneel veld** — verworpen: half-half-aanpak houdt
  `/audit`-infrastructuur in stand voor twijfelgevallen
- **Cancel alleen audit-run, verder niets** — verworpen: lost het
  onderliggende probleem (overhead per entry) niet op

#### Argumenten voor
- Lichter template = minder friction per entry
- `/audit` weg = één slash-command minder om te onthouden + geen
  wekelijkse taak meer
- Bestaande entries als-is laten = geen retroactief sleutelen aan
  historie

#### Argumenten tegen
- Subtiel inconsistent: oude entries hebben `Refs:` veld, nieuwe niet —
  gemitigeerd door archief-banner in `DEV-JOURNAL.md` en het feit dat
  `RULES-CHANGELOG.md` entries zonder SHA evengoed leesbaar zijn
- Vermoeilijkt verificatie "welke commit hoort bij deze rule-wijziging"
  — opgelost door `git log --since/--until` op de entry-timestamp

#### Consequences
- Eerdere ADR ["Commit-strategie A"](#commit-strategie-a)
  Consequences-punt "Iedere journal-entry heeft precies één SHA →
  eenvoudig te verifiëren" vervalt — strategie A zelf (één commit per
  logische gebeurtenis voor de ≥20 commits eis) blijft.
- `WERKWIJZE.md` Beschikbare slash commands: 4 → 3 (drop `/audit`).
- 16 bestaande `_no commit yet_` entries blijven zichtbaar staan.

---

### 2026-05-28 — Drop `docs/DEV-JOURNAL.md` <a id="drop-dev-journal"></a>

**Type:** decision
**Status:** Accepted
**Files:** `docs/DEV-JOURNAL.md` (verwijderd), `.cursor/rules/journaling.mdc`, `docs/INDEX.md`, `WERKWIJZE.md`, `docs/PROMPT-LOG.md`, `.cursor/commands/ai-failure.md`
**Tags:** documentation, methodology, simplification, deletion

#### Context
`DEV-JOURNAL.md` was sinds [Documentatiesysteem-ADR](#documentatiesysteem)
de chronologische capture-file naast vier specialized files. Bij de
[Versimpel journaling](#) refactor van 2026-05-28 is hij al gedegradeerd
tot archief ("geen nieuwe entries meer hier"). De vier specialized files
dekken inmiddels alle rubric-vragen volledig.

Een archief-bestand naast actieve files veroorzaakt drie issues:
1. Onduidelijkheid voor toekomstige agents (mag ik hier nog schrijven?)
2. Statische omvang van ~420 regels die niets meer toevoegt
3. Inconsistente cross-refs (broken anchors in oude ADRs)

#### Decision
- `docs/DEV-JOURNAL.md` is verwijderd uit de werkboom.
- De inhoud blijft volledig leesbaar via `git log -- docs/DEV-JOURNAL.md`
  en `git show <sha>:docs/DEV-JOURNAL.md` voor archiveringsdoeleinden.
- Actieve regels en commands die nog naar `DEV-JOURNAL.md` verwezen zijn
  bijgewerkt (`journaling.mdc`, `INDEX.md`, `WERKWIJZE.md`, `PROMPT-LOG.md`,
  `ai-failure.md`).
- Oude ADRs en `RULES-CHANGELOG.md` entries die `DEV-JOURNAL.md` als
  cross-ref hebben, blijven onaangetast — die links zijn historische
  anchors in een file die niet meer bestaat.

#### Alternatieven overwogen
- **In de repo houden als archief** — verworpen: confuseert agents, voegt
  niets toe aan het verantwoordingsdocument
- **Inhoud verplaatsen naar een `docs/archive/`-folder** — verworpen:
  git-history is een betere archieflocatie, geen file-duplicatie
- **Inhoud verspreiden over specialized files** — verworpen:
  retroactief sleutelen aan historie + dubbele administratie

#### Argumenten voor
- Eén minder bestand om mentaal te tracken
- `docs/` bevat nu alleen actieve, gebruikte files
- Inhoud blijft 100% reproduceerbaar via git

#### Argumenten tegen
- Broken anchor-links in oude ADRs (bv. `[DEV-JOURNAL.md#2026-05-27-1944]`)
  resolven niet meer — gemitigeerd door context binnen de ADR-tekst zelf
- Hergebruik van historische context vereist nu `git show` ipv directe
  file-read — acceptabele drempel

#### Consequences
- [Documentatiesysteem](#documentatiesysteem) ADR is gemarkeerd als
  Superseded by deze ADR.
- Toekomstige agents lezen `INDEX.md` en zien direct dat er 4 specialized
  files zijn (geen DEV-JOURNAL meer).

---

### 2026-05-28 — Tokenized design-system met semantische OKLCH-tokens <a id="design-tokens"></a>

**Type:** decision
**Status:** Accepted
**Files:** `app/globals.css`
**Tags:** styling, tailwind, design-system, theming

#### Context
Vóór feature-werk een design-baseline vastleggen. De standaard
`create-next-app` template stelde alleen `--background` en `--foreground`
in, zonder semantische namen voor primary/accent/muted/border/destructive.
Dat dwingt later kleurkeuzes hard-coded in components af, waardoor een
rebranding pijnlijk wordt.

#### Decision
Semantische CSS-variabelen in `:root` (light) + `.dark` (dark) met
OKLCH-waarden, gemapt op `--color-*` in `@theme inline`. Tailwind v4
maakt elke `--color-foo` automatisch tot utility (`bg-foo`, `text-foo`,
`border-foo`), dus de tokens dragen zichzelf.

Tokens: `background`, `foreground`, `card` + `-foreground`, `muted` +
`-foreground`, `primary` + `-foreground`, `accent` + `-foreground`,
`border`, `input`, `ring`, `destructive` + `-foreground`.

#### Alternatieven overwogen
- **Raw kleuren in components** (bv. `bg-zinc-50 dark:bg-zinc-900`) —
  verworpen: rebranding wordt zoek-en-vervang door codebase
- **Volledig shadcn/ui-token-schema** — niet relevant: we kiezen
  hand-rolled (zie [Hand-rolled UI-componenten](#handrolled-ui))

#### Argumenten voor
- Eén plek (`globals.css`) voor alle kleuren
- OKLCH geeft betere perceptuele uniformiteit dan HSL/RGB
- Tailwind v4 genereert utilities automatisch — geen duplicatie

#### Argumenten tegen
- Tokens vereisen discipline: hard-coded `bg-blue-600` glipt anders alsnog
  binnen. Mitigatie: eslint/review op feature-PR's

#### Consequences
- Class-based dark variant via `@custom-variant dark (&:where(.dark, .dark *))`
  is noodzakelijk om de `.dark`-class te laten triggeren — zie
  [Toggleable dark mode](#dark-mode-toggle)
- Tailwind utility `bg-foreground/text-background` werkt buiten de doos

---

### 2026-05-28 — Toggleable dark mode via `next-themes` <a id="dark-mode-toggle"></a>

**Type:** decision
**Status:** Accepted
**Files:** `app/_components/theme-provider.tsx`, `app/_components/ui/theme-toggle.tsx`, `app/layout.tsx`, `app/globals.css`
**Tags:** styling, theming, accessibility, dependency

#### Context
Dark mode kan op drie manieren: (a) alleen OS-voorkeur volgen via
`prefers-color-scheme`, (b) één modus afdwingen, of (c) een user-toggle
met persistente keuze. Voor een educatieve consumer-app is (c) de
verwachte UX, en het demonstreert ook expliciet de design-tokens.

#### Decision
Driestandentoggle (light / dark / system) via [`next-themes`](https://github.com/pacocoursey/next-themes),
gewrapt in een eigen `ThemeProvider` zodat de lib-keuze op één plek
zit. `<html suppressHydrationWarning lang="nl">` in `RootLayout`.
`disableTransitionOnChange` voorkomt flash bij wisselen.

#### Alternatieven overwogen
- **Eigen cookie-based toggle + Server Component reader** — verworpen:
  FOUC-bezwering niet-triviaal, kost meer maintenance dan een ~4 kB lib
  bespaart
- **Alleen `prefers-color-scheme`** — verworpen: geen user-control, geeft
  ook geen tastbaar UX-element om in de presentatie te demonstreren
- **Eén modus (alleen light of dark)** — verworpen: minder rijk
  demonstratiemateriaal van het token-systeem

#### Argumenten voor
- ~4 kB, dé standaard voor App Router (>2M downloads/wk)
- FOUC-vrij dankzij inline script
- Werkt naadloos met `@custom-variant dark (&:where(.dark, .dark *))`

#### Argumenten tegen
- Extra dependency die meegroeit met React/Next-upgrades — gemitigeerd
  doordat de wrapper-component één import-punt is

#### Consequences
- `ThemeToggle` rendert pas na hydrate (`mounted` guard) om
  hydration-mismatches te voorkomen
- Bij voegen van nieuwe themes (bv. high-contrast) volstaat een extra
  selector + één extra optie in `ThemeToggle`

---

### 2026-05-28 — Hand-rolled UI-componenten i.p.v. shadcn/ui <a id="handrolled-ui"></a>

**Type:** decision
**Status:** Accepted
**Files:** `app/_components/ui/*`, `lib/utils.ts`
**Tags:** components, design-system, dependency, scope

#### Context
Voor de UI-laag waren twee kandidaten: (a) **shadcn/ui** — copy-paste
componenten op Radix UI met een breed primitive-pakket, of (b)
**hand-rolled** Tailwind componenten in `app/_components/ui/`. Shadcn
zou tijd besparen op standaard primitives, maar trekt Radix UI en een
eigen tokens-conventie de codebase binnen.

#### Decision
Hand-rolled. Componenten leven in `app/_components/ui/` (gedeeld) of
`app/<segment>/_components/` (route-specifiek). Standaard helper
`cn()` in [`lib/utils.ts`](../lib/utils.ts) (clsx + tailwind-merge).
Eerste opgeleverde primitive: `Container`. Verdere primitives (Button,
Input, Card) komen pas wanneer een feature ze écht nodig heeft — geen
spec-anticipatie.

#### Alternatieven overwogen
- **shadcn/ui volledig** — verworpen: cursus-rubric eist eigen
  TypeScript-/React-code (clean code-principes); shadcn-snippets
  vervagen wat "zelf geschreven" is en zou ik in 3.5 (kritische
  reflectie) moeten verantwoorden. Eigen componenten geven scherper
  signaal van begrip.
- **Hybride (alleen Radix-primitives voor a11y-kritische dingen)** —
  uitgesteld: als blijkt dat focus-trap/positionering voor Dialog of
  Popover non-triviaal wordt, kunnen we per-component Radix selectief
  toevoegen zonder de rest van shadcn binnen te halen. ADR wordt dan
  gesplitst.

#### Argumenten voor
- Past bij rubric 1.4 (schone, gestructureerde, **zelf-geschreven**
  TypeScript- en Next.js-code) en bij 3.5 (kritisch reflecteren op
  AI-gegenereerde code — minder copy-paste = makkelijker te verantwoorden)
- Minimale dependency-voetafdruk: `clsx` + `tailwind-merge` zijn 2 kleine
  utilities, geen Radix UI in `package.json`
- Volledige controle over a11y-attributen, naamgeving en types

#### Argumenten tegen
- Meer werk per primitive — gemitigeerd doordat we ze pas bouwen wanneer
  ze nodig zijn, niet bij voorbaat
- Sommige a11y-patterns (focus-trap in Dialog, virtualized Listbox) zijn
  niet-triviaal — opgelost door selectief Radix toe te voegen wanneer
  dat speelt (zie alternatief 2)

#### Consequences
- `.cursor/rules/conventions.mdc` ("Components in `app/_components/ui/`
  of `app/_components/features/`") blijft leidend
- `cn()` is de canonieke manier voor conditionele classes in alle nieuwe
  componenten
- Bij toekomstige need voor Radix: ADR-splitsing per primitive

---

## Template — kopieer & vul in

```markdown
### YYYY-MM-DD — Korte beslissing-titel

**Type:** decision
**Status:** Proposed | Accepted | Superseded by ... | Deprecated
**Files:** relevant paths
**Tags:** <topic>, <area>
**Refs:** DEV-JOURNAL.md#<anker>, RULES-CHANGELOG.md#<anker>

#### Context
Wat was de situatie, welke spanning of onduidelijkheid moest worden
opgelost.

#### Decision
Wat je hebt gekozen (één zin, en daarna max één alinea uitleg).

#### Alternatieven overwogen
- Optie A — verworpen omdat ...
- Optie B — verworpen omdat ...

#### Argumenten voor
- ...

#### Argumenten tegen
- ...

#### Consequences
Wat verandert er door deze keuze. Welke vervolg-acties zijn nodig.
```
