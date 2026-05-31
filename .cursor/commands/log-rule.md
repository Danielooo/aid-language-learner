---
description: Log een nieuwe entry in docs/RULES-CHANGELOG.md voor een rule-wijziging
---

Voeg een nieuwe entry toe aan `docs/RULES-CHANGELOG.md`. De gebruiker
geeft steekwoorden; jij maakt er lopende zinnen van en vult de metadata
in. Zie [`.cursor/rules/journaling.mdc`](../rules/journaling.mdc).

## Wat is er gewijzigd

Lees wat de gebruiker na het `/log-rule` commando schreef. Als de
gebruiker niks heeft toegevoegd, scrol terug door deze chat en infereer
welke rule is aangepast. Als je niets vindt: vraag eerst om context.

## Stappen

### 1. Drempel-check

`docs/RULES-CHANGELOG.md` is voor:

- Een rule (`.cursor/rules/*.mdc` of `AGENTS.md`) toevoegen of verwijderen
- Een **inhoudelijke** wijziging: nieuw concept, andere drempel, ander
  gedrag

**Niet** voor: typo's, witregel-fixes, kleine voorbeeld-uitbreidingen,
herformuleringen zonder gedragsverandering.

Bij twijfel: vraag de gebruiker of dit echt gedrag verandert.

### 2. Stel de entry voor

Gebruik **exact het huidige tijdstempel** in `YYYY-MM-DD HH:MM` formaat.

Bepaal:
- **Titel** (max ~10 woorden, beschrijvend)
- **Files**: paths van de geraakte rule-bestanden (gebruik
  `git status --porcelain -- .cursor/rules/ AGENTS.md` als je het niet
  zeker weet); zet ze in backticks
- **Tags**: 2-5 relevante tags, bijna altijd inclusief `rules`
- **Body**: 1 tot 3 lopende zinnen die wat / waarom / effect dekken

Toon het voorstel:

> Voorstel entry voor `docs/RULES-CHANGELOG.md`:
>
> ```markdown
> ## 2026-05-31 10:42 — Korte titel
>
> **Files:** `.cursor/rules/foo.mdc`
> **Tags:** rules, topic
>
> Eén tot drie zinnen ...
> ```
>
> Akkoord, of aanpassen?

### 3. Schrijf entry (tokenzuinig — geen full Read)

Na akkoord: gebruik het stabiele invoeg-anker
`<!-- INSERT-NEW-ENTRY-ABOVE -->` dat aan het einde van het bestand
staat. Werkwijze:

1. `Read` `docs/RULES-CHANGELOG.md` met `offset: -15, limit: 15`
   (voldoet aan Read-before-Edit én bevestigt dat de marker bestaat).
2. `StrReplace` met:
   - `old_string`: `<!-- INSERT-NEW-ENTRY-ABOVE -->`
   - `new_string`:

     ```
     ---

     <hier de nieuwe entry zoals voorgesteld in stap 2>

     <!-- INSERT-NEW-ENTRY-ABOVE -->
     ```

NOOIT de volledige `docs/RULES-CHANGELOG.md` lezen om de invoegpositie te
vinden. Zie [`.cursor/rules/journaling.mdc`](../rules/journaling.mdc) →
"Tokenzuinig appenden in docs/".

### 4. Sluit af

Bevestig in 1-2 regels welke file je hebt bijgewerkt.

## Belangrijk

- Raak **bestaande entries niet aan** (read-only-regel uit
  `journaling.mdc`). Correcties lopen via een nieuwe entry.
- Geen `Refs:`/`Duration:` velden — die zijn afgeschaft.
- Max ~3 zinnen vrije tekst. Geen `### Wat` / `### Waarom` / `### Effect`
  sub-kopjes.
