---
description: Log een AI-failure entry in docs/AI-FAILURES.md
---

Log de zojuist gemelde AI-failure als entry in `docs/AI-FAILURES.md`.
Eén event = één entry = één bestand. Zie
[`docs/DECISIONS.md#drop-sha-refs`](../../docs/DECISIONS.md#drop-sha-refs).

## Wat ging er mis

Lees wat de gebruiker na het `/ai-failure` commando schreef. Als de
gebruiker niks heeft toegevoegd, scrol dan terug door deze chat en infereer:

- Wat probeerde de AI te doen?
- Wat was er fout aan?
- Welke files waren betrokken?
- Welke workaround heeft de gebruiker (of jij) ingezet?

## Stappen

### 1. Bepaal severity

Als de gebruiker `severity low|medium|high` heeft genoemd in de prompt:
gebruik die.

Anders: lees de severity-schaal in `docs/AI-FAILURES.md`, doe een voorstel
met onderbouwing en vraag de gebruiker om te bevestigen voordat je
doorschrijft. Bijvoorbeeld:

> Severity-voorstel: **medium** omdat de code werkte maar via een
> verouderde Next.js conventie (middleware.ts ipv proxy.ts). Akkoord?

### 2. Schrijf entry in `docs/AI-FAILURES.md` (tokenzuinig — geen full Read)

Gebruik het stabiele invoeg-anker `<!-- INSERT-NEW-ENTRY-ABOVE -->` dat
direct boven `## Template — kopieer & vul in` staat. Werkwijze:

1. `Read` `docs/AI-FAILURES.md` met `offset: -15, limit: 15` (voldoet
   aan Read-before-Edit én bevat de marker + Template-blok ter
   referentie).
2. `StrReplace` met:
   - `old_string`: `<!-- INSERT-NEW-ENTRY-ABOVE -->`
   - `new_string`:

     ```
     ---

     ## YYYY-MM-DD HH:MM — <korte titel: wat ging fout>

     **Severity:** <low|medium|high>
     **Files:** <relevante files, of: —>
     **Tags:** <relevante tags>

     ### Wat ging fout
     <concrete beschrijving van het AI-gedrag + code-snippet als dat helpt>

     ### Vermoedelijke oorzaak
     <analyse, niet verwijt: ontbrekende rule? verouderde training data?
     ambiguë prompt? te brede context?>

     ### Workaround / fix
     <wat is er gedaan om het te herstellen>

     ### Prevented by
     <welke rule/prompt-aanpassing is gemaakt om dit te voorkomen, OF:
     `_door gebruiker te bepalen_` als nog open>

     <!-- INSERT-NEW-ENTRY-ABOVE -->
     ```

NOOIT de volledige `docs/AI-FAILURES.md` lezen om de invoegpositie te
vinden. Zie [`.cursor/rules/journaling.mdc`](../rules/journaling.mdc) →
"Tokenzuinig appenden in docs/".

### 3. Sluit af

Bevestig kort in 2 regels wat je hebt geschreven. Wijs de gebruiker
expliciet op velden waar `_door gebruiker te bepalen_` staat zodat die
later aangevuld worden.

## Belangrijk

- Gebruik **exact het huidige tijdstempel** in `YYYY-MM-DD HH:MM` formaat
- Schrijf NIET zelf subjectieve oordelen (`### Vermoedelijke oorzaak`
  mag analyse zijn, maar wees voorzichtig — als je niet zeker bent, vraag)
- Verzin GEEN failure die niet heeft plaatsgevonden — als je niets
  vindt om te loggen, vraag de gebruiker eerst om uitleg
- Geen `Refs:`/`Duration:` velden — die zijn afgeschaft.
