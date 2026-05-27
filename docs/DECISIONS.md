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
**Status:** Accepted
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
