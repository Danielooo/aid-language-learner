---
description: Log een nieuwe entry in docs/DECISIONS.md op basis van steekwoorden
---

Voeg een nieuwe entry toe aan `docs/DECISIONS.md`. De gebruiker geeft
steekwoorden; jij maakt er lopende zinnen van en vult de metadata in.
Eén event = één entry = één bestand. Zie
[`.cursor/rules/journaling.mdc`](../rules/journaling.mdc).

## Wat is er besloten

Lees wat de gebruiker na het `/log-decision` commando schreef. Als de
gebruiker niks heeft toegevoegd, scrol terug door deze chat en infereer
de strekking. Als je niets vindt om te loggen: vraag de gebruiker eerst
om steekwoorden voordat je verder gaat.

## Stappen

### 1. Drempel-check

`docs/DECISIONS.md` is voor ontwerp-/conceptkeuzes met blijvende impact
(lib-keuze, structuur, conventie, format-/proces-keuze). **Niet** voor
kleine layout-aanpassingen, content-tweaks, variable-renames of
typo-fixes.

Bij twijfel: vraag de gebruiker kort of dit echt een DECISIONS-entry
waard is. Bijvoorbeeld:

> Dit lijkt me meer een implementatiedetail dan een blijvende
> ontwerpkeuze. Toch loggen, of slaan we over?

### 2. Stel de entry voor

Gebruik **exact het huidige tijdstempel** in `YYYY-MM-DD HH:MM` formaat.

Bepaal:
- **Titel** (max ~10 woorden, beschrijvend)
- **Slug** voor de anchor: kebab-case, eerste 3-4 betekenisvolle woorden
  van de titel. Stel 'm voor; de gebruiker kan 'm afslaan als er geen
  verwijzing nodig is.
- **Files**: paths van de bestanden die geraakt zijn (gebruik
  `git status --porcelain` + `git diff --stat HEAD` als je het niet zeker weet)
- **Tags**: 2-5 relevante tags op basis van files + onderwerp
- **Body**: 1 tot 3 lopende zinnen die wat / waarom / effect dekken

Toon het voorstel:

> Voorstel entry voor `docs/DECISIONS.md`:
>
> ```markdown
> ### 2026-05-31 10:42 — Korte beslissing-titel <a id="korte-beslissing-titel"></a>
>
> **Files:** path/a.ts, path/b.ts
> **Tags:** tag1, tag2
>
> Eén tot drie zinnen ...
> ```
>
> Akkoord, of aanpassen?

### 3. Schrijf entry (tokenzuinig — geen full Read)

Na akkoord: gebruik het stabiele invoeg-anker
`<!-- INSERT-NEW-ENTRY-ABOVE -->` dat direct boven
`## Template — kopieer & vul in` staat. Werkwijze:

1. `Read` `docs/DECISIONS.md` met `offset: -15, limit: 15` (voldoet aan
   Read-before-Edit én bevat de marker + Template-blok ter referentie).
2. `StrReplace` met:
   - `old_string`: `<!-- INSERT-NEW-ENTRY-ABOVE -->`
   - `new_string`:

     ```
     ---

     <hier de nieuwe entry zoals voorgesteld in stap 2>

     <!-- INSERT-NEW-ENTRY-ABOVE -->
     ```

NOOIT de volledige `docs/DECISIONS.md` lezen om de invoegpositie te
vinden — dat verspilt context-window. Zie
[`.cursor/rules/journaling.mdc`](../rules/journaling.mdc) → "Tokenzuinig
appenden in docs/".

### 4. Sluit af

Bevestig in 1-2 regels welke file je hebt bijgewerkt.

## Belangrijk

- Raak **bestaande entries niet aan** (read-only-regel uit
  `journaling.mdc`). Correcties lopen via een nieuwe entry.
- Geen `Refs:`/`Duration:` velden — die zijn afgeschaft.
- Geen subjectieve reflectie verzinnen: bij twijfel `_door gebruiker te bepalen_`.
- Max ~3 zinnen vrije tekst. Geen `### Wat` / `### Waarom` / `### Effect`
  sub-kopjes.
