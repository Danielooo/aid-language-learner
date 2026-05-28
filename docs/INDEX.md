# Docs — index en werkstroom

Dit `docs/` directory is het verantwoordingssysteem voor de eindopdracht
(Deelopdracht 3 — Verantwoordingsdocument, 45% van het eindcijfer).

## Bestanden

| Bestand | Rol |
| --- | --- |
| [`INDEX.md`](./INDEX.md) | Dit bestand: wat staat waar, werkstroom, template, rubric-mapping |
| [`RULES-CHANGELOG.md`](./RULES-CHANGELOG.md) | Iedere wijziging aan `.cursor/rules/` of `AGENTS.md` met reden en effect |
| [`PROMPT-LOG.md`](./PROMPT-LOG.md) | System prompts, agent-instructies (de prompts ín de applicatie) |
| [`AI-FAILURES.md`](./AI-FAILURES.md) | Wanneer AI iets onverwachts/fout deed |
| [`DECISIONS.md`](./DECISIONS.md) | Architectuurkeuzes (mini-ADRs) |

## Werkstroom: één event, één bestand

```
gebeurtenis X
   ↓
schrijf één entry in de juiste specialized file       ← zie trigger-tabel
   ↓
/commit (alleen git)
```

Chronologie loopt via de `YYYY-MM-DD HH:MM` timestamps in de entry-titels
en de timestamps in `git log`; geen expliciete SHA-koppeling per entry.
Zie [`DECISIONS.md#drop-sha-refs`](./DECISIONS.md#drop-sha-refs) voor de
onderbouwing.

Eén event = één entry = één bestand. De
[`.cursor/rules/journaling.mdc`](../.cursor/rules/journaling.mdc) meta-rule
forceert Cursor in Agent-mode om bij de juiste triggers automatisch de
entry te schrijven.

## Trigger-tabel

| Gebeurtenis | Bestand | Auto |
| --- | --- | --- |
| Cursor rule (`.cursor/rules/*.mdc` of `AGENTS.md`) toevoegen/wijzigen | `RULES-CHANGELOG.md` | ✅ Cursor doet het |
| System-/agent-prompt in `app/api/**` of `lib/**` | `PROMPT-LOG.md` | ✅ Cursor doet het |
| Bewuste architectuur-/conventiekeuze | `DECISIONS.md` | ✅ Cursor doet het |
| AI deed iets onverwachts/fout | `AI-FAILURES.md` | ⚠️ Jij tikt `/ai-failure` |

## Light template

Maximaal 3 zinnen vrije tekst. Geen `### Wat` / `### Waarom` / `### Effect`
sub-kopjes. Geen `Type:`-veld (impliciet via het bestand).

```markdown
## YYYY-MM-DD HH:MM — Korte titel

**Files:** path/naar/bestand1, path/naar/bestand2
**Tags:** tag1, tag2

Eén tot drie zinnen: wat is besloten/gewijzigd, waarom, en het effect.
```

### Drempel — wanneer wél, wanneer níét

| Bestand | Wél loggen | Niet loggen |
| --- | --- | --- |
| `DECISIONS.md` | Ontwerp-/conceptkeuze met blijvende impact: lib-keuze, structuur, conventie, format-/proces-keuze | Kleine layout-aanpassingen, tekstuele content-tweaks, variable-renames, typo-fixes |
| `RULES-CHANGELOG.md` | Rule toevoegen/verwijderen, of inhoudelijke wijziging (nieuw concept, andere drempel, ander gedrag) | Typo's, witregel-fixes, kleine voorbeeld-uitbreiding, herformulering zonder gedragsverandering |
| `PROMPT-LOG.md` | Nieuwe of inhoudelijk gewijzigde system-/agent-prompt | Woord-vervanging, formatting, alleen variabele-naam in prompt-tekst |

Bij twijfel: niet loggen. `AI-FAILURES.md` valt buiten deze drempel —
gebruikt eigen format via `/ai-failure`.

### Per-file extra velden

Alleen waar de rubric ze afdwingt:

- **`AI-FAILURES.md`**: `Severity: low | medium | high` (Q21 vraagt om
  oorzaak/effect — severity helpt prioriteren)
- **`PROMPT-LOG.md`**: `Iteration: <N>`, `Replaces: v<N-1>` of `—` (Q25
  vraagt om iteratie-ketens) + letterlijke prompt in een code-block
- **`DECISIONS.md`**: geen extra velden. Bij latere herziening: italic
  regel `_Superseded by [titel](#anchor)._` direct onder de heading.

## Vangnetten voor de gebruiker

De gebruiker kan op elk moment vragen:

- "Log dit als AI-failure, severity medium."
- "Maak een entry voor wat we deze sessie hebben gedaan."

## Rubric-mapping — welk bestand voedt welke vraag

Bron: `EINDOPDRACHT.md` § Deelopdracht 3.

### AI-assisted ontwikkelproces

| Vraag | Wat vraagt 'ie | Bestand(en) |
| --- | --- | --- |
| 16 | Initiële Cursor-instructies + evolutie + effect op output | `RULES-CHANGELOG.md` |
| 17 | Welke `.cursorrules` werkten goed en waarom | `RULES-CHANGELOG.md` (`Effect`-veld) + `DECISIONS.md` |
| 18 | Hoe controleerde je dat code correct was | `AI-FAILURES.md` + eigen reflectie |
| 19 | Mate van controle over het proces | Eigen reflectie + alle bestanden als bron |
| 20 | Mate van zelf aanpassen van AI-code | `AI-FAILURES.md` (`Workaround`) |
| 21 | 3 concrete beperkingen/onzekerheden in AI-output | `AI-FAILURES.md` (3+ entries verplicht) |
| 22 | Maatregelen voor betrouwbaarheid AI-output | `DECISIONS.md` + `RULES-CHANGELOG.md` |
| 23 | Top-3 inzichten voor een nieuwe student | Eigen reflectie + alle bestanden als bron |

### Prompt design

| Vraag | Wat vraagt 'ie | Bestand(en) |
| --- | --- | --- |
| 24 | Belangrijke prompts voor kernfeatures | `PROMPT-LOG.md` |
| 25 | Typische iteratie (prompt → output → aanpassing) | `PROMPT-LOG.md` (`Iteration:` + `Replaces:` ketens) |
| 26 | 3 prompts die goed werkten + waarom | `PROMPT-LOG.md` (filter op succes) |
| 27 | 3 prompts die slecht werkten + verbeteringen | `PROMPT-LOG.md` (iteratie-ketens) + `AI-FAILURES.md` |
| 28 | Welke prompt-onderdelen meeste invloed hadden | Eigen reflectie + `PROMPT-LOG.md` |
| 29 | Afhankelijkheid van prompt en inputdata | Reflectie + `PROMPT-LOG.md` + `AI-FAILURES.md` |

### Bijlagen (verplicht)

- **Alle app-prompts** → `PROMPT-LOG.md`
- **Volledige agent-instructie** → `PROMPT-LOG.md` (laatste versie)
- **Cursor-instructies** → `.cursor/rules/*.mdc` files + `RULES-CHANGELOG.md` voor de evolutie

## Tip: einde-week reviewprompt

Aan het einde van een werkweek:

> Lees alle nieuwe entries van deze week in de specialized files.
> Identificeer welke entries rubric-waardig zijn (vraag 16, 17, 21, 25,
> 27 zijn de zwaarste). Stel voor welke entries nog verdieping nodig
> hebben (`### Waarom`/`### Effect` velden uitbreiden). Schrijf niets
> weg zonder mijn akkoord.
