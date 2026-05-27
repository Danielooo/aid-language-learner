# Docs — index en werkstroom

Dit `docs/` directory is het verantwoordingssysteem voor de eindopdracht
(Deelopdracht 3 — Verantwoordingsdocument, 45% van het eindcijfer).

## Bestanden

| Bestand | Rol |
| --- | --- |
| [`INDEX.md`](./INDEX.md) | Dit bestand: wat staat waar, werkstroom, template, rubric-mapping |
| [`DEV-JOURNAL.md`](./DEV-JOURNAL.md) | Chronologisch logboek van alles — quick capture, LLM-doorzoekbaar |
| [`RULES-CHANGELOG.md`](./RULES-CHANGELOG.md) | Iedere wijziging aan `.cursor/rules/` met reden en effect |
| [`PROMPT-LOG.md`](./PROMPT-LOG.md) | System prompts, agent-instructies (de prompts ín de applicatie) |
| [`AI-FAILURES.md`](./AI-FAILURES.md) | Quick-capture wanneer AI iets onverwachts/fout deed |
| [`DECISIONS.md`](./DECISIONS.md) | Architectuurkeuzes (mini-ADRs) |

## Werkstroom: capture → curate

```
moment X gebeurt
   ↓
schrijf ≤60 sec in DEV-JOURNAL.md             ← altijd
   ↓
einde sessie / einde week
   ↓
voor rubric-momenten: lift naar specialized   ← curated, dieper
```

- **DEV-JOURNAL** = ruw, snel, eerlijk, alles
- **Specialized files** = alleen entries die je voor het
  verantwoordingsdocument gaat gebruiken — schoner uitgewerkt

## Template (uniform voor alle bestanden)

Iedere entry gebruikt deze structuur. Velden onderaan worden later aangevuld.

```markdown
## YYYY-MM-DD HH:MM — Korte titel

**Type:** rules-update | app-prompt | ai-failure | decision | observation
**Files:** path/naar/bestand1, path/naar/bestand2
**Tags:** tag1, tag2
**Refs:** AI-FAILURES.md#anker, commit:`<sha>` (of: _no commit yet_)
**Duration:** ~N min

### Wat
Korte feitelijke beschrijving.

### Waarom
De reden / trigger / context.

### Effect (of: verwacht effect)
Wat veranderde door deze actie aan de output, code, of AI-gedrag.
```

### Per-bestand variant

De `Type` en de focus van **Wat / Waarom / Effect** verschilt per bestand:

- **DEV-JOURNAL**: alles. `Type` mag elke waarde zijn.
- **RULES-CHANGELOG**: `Type: rules-update`. Extra velden `Before:` / `After:`.
- **PROMPT-LOG**: `Type: app-prompt`. Extra velden `Used in:` / `Iteration:` / `Replaces:`.
- **AI-FAILURES**: `Type: ai-failure`. Extra velden `Severity:` (low/medium/high), `Cause:`, `Workaround:`, `Prevented by:`.
- **DECISIONS**: `Type: decision`. Extra velden `Status:` (proposed/accepted/superseded), `Alternatives considered:`, `Consequences:`.

## Trigger-tabel — wanneer schrijf je in welk bestand

| Gebeurtenis | Bestand(en) | Tijd | Auto |
| --- | --- | --- | --- |
| Start van een werksessie | DEV-JOURNAL | 0 sec | ✅ Cursor schrijft sessie-start bij eerste prompt |
| Cursor rule toevoegen/wijzigen | DEV-JOURNAL + RULES-CHANGELOG | 0 sec | ✅ Cursor doet het |
| System/agent prompt aangepast in app | PROMPT-LOG + DEV-JOURNAL | 0 sec | ✅ Cursor doet het |
| Bewuste keuze gemaakt (lib, architectuur, conventie) | DECISIONS + DEV-JOURNAL | 0 sec | ✅ Cursor doet het |
| AI deed iets raars | DEV-JOURNAL + AI-FAILURES | 30 sec | ⚠️ Jij meldt: "log dit als AI-failure, severity X" |
| Algemene observatie of learning | alleen DEV-JOURNAL | 30 sec | ⚠️ Jij tikt 1 zin |
| Einde van een werksessie | DEV-JOURNAL (commit-refs invullen) | 1 min | ⚠️ Jij tikt: "update no-commit-yet velden" na commit |
| Einde van de week | DEV-JOURNAL recap + scan `no commit yet` | 15 min | ⚠️ Jij tikt: "lift belangrijkste entries naar specialized files" |

## Automatisering (Cursor + journaling-rule)

Er staat een meta-rule `.cursor/rules/journaling.mdc` met `alwaysApply: true`.
Die forceert Cursor in Agent-mode om bij bepaalde wijzigingen automatisch
ook de juiste docs-entry te schrijven (bv. RULES-CHANGELOG bij een rule-edit).

Voor zaken die niet auto gaan kun je op elk moment tegen Cursor zeggen:

- `"Log dit als AI-failure, severity medium."`
- `"Maak een DEV-JOURNAL entry voor wat we deze sessie hebben gedaan, met commit-refs uit git log."`
- `"Lift de belangrijkste journal-entries van deze week naar de specialized files."`

## Rubric-mapping — welk bestand voedt welke vraag

Bron: `EINDOPDRACHT.md` § Deelopdracht 3.

### AI-assisted ontwikkelproces
| Vraag | Wat vraagt 'ie | Bestand(en) |
| --- | --- | --- |
| 16 | Initiële Cursor-instructies + evolutie + effect op output | RULES-CHANGELOG (primair) + DEV-JOURNAL |
| 17 | Welke `.cursorrules` werkten goed en waarom | RULES-CHANGELOG (`Effect`-veld) + DECISIONS |
| 18 | Hoe controleerde je dat code correct was | DEV-JOURNAL + AI-FAILURES |
| 19 | Mate van controle over het proces | Eigen reflectie + DEV-JOURNAL |
| 20 | Mate van zelf aanpassen van AI-code | DEV-JOURNAL + AI-FAILURES (`Workaround`) |
| 21 | 3 concrete beperkingen/onzekerheden in AI-output | AI-FAILURES (3+ entries verplicht) |
| 22 | Maatregelen voor betrouwbaarheid AI-output | DECISIONS + RULES-CHANGELOG |
| 23 | Top-3 inzichten voor een nieuwe student | Eigen reflectie + alle bestanden als bron |

### Prompt design
| Vraag | Wat vraagt 'ie | Bestand(en) |
| --- | --- | --- |
| 24 | Belangrijke prompts voor kernfeatures | PROMPT-LOG |
| 25 | Typische iteratie (prompt → output → aanpassing) | PROMPT-LOG (`Iteration:` + `Replaces:` ketens) |
| 26 | 3 prompts die goed werkten + waarom | PROMPT-LOG (filter op succes) |
| 27 | 3 prompts die slecht werkten + verbeteringen | PROMPT-LOG (iteratie-ketens) + AI-FAILURES |
| 28 | Welke prompt-onderdelen meeste invloed hadden | Eigen reflectie + PROMPT-LOG |
| 29 | Afhankelijkheid van prompt en inputdata | Reflectie + PROMPT-LOG + AI-FAILURES |

### Bijlagen (verplicht)
- **Alle app-prompts** → `PROMPT-LOG.md` is je bron
- **Volledige agent-instructie** → `PROMPT-LOG.md` (laatste versie van de agent-prompt)
- **Cursor-instructies** → `.cursor/rules/*.mdc` files + `RULES-CHANGELOG.md` voor de evolutie

## Tip: end-of-week reviewprompt

Aan het einde van de week, in Agent mode:

> Lees alle nieuwe entries van deze week in `docs/DEV-JOURNAL.md`. Identificeer welke entries
> rubric-waardig zijn (vraag 16, 17, 21, 25, 27 zijn de zwaarste). Stel voor welke entries
> uitgelicht moeten worden in welke specialized file, en wat er nog ontbreekt aan
> `**Waarom:**` of `**Effect:**` velden. Schrijf niets weg zonder mijn akkoord.
