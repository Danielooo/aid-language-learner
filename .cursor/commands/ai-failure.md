---
description: Log een AI-failure entry in docs/AI-FAILURES.md en docs/DEV-JOURNAL.md
---

Log de zojuist gemelde AI-failure als entry in beide journals.

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

### 2. Schrijf entry in `docs/AI-FAILURES.md`

Voeg onderaan de "Entries" sectie toe (boven het "Template" gedeelte):

```markdown
## YYYY-MM-DD HH:MM — <korte titel: wat ging fout>

**Type:** ai-failure
**Severity:** <low|medium|high>
**Files:** <relevante files, of: —>
**Tags:** <relevante tags>
**Refs:** docs/DEV-JOURNAL.md#YYYY-MM-DD-HHMM, _no commit yet_
**Duration:** ~<N> min om op te vangen

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
```

### 3. Spiegel naar `docs/DEV-JOURNAL.md`

Voeg een korte entry onderaan toe die terugverwijst:

```markdown
## YYYY-MM-DD HH:MM — AI-failure: <zelfde korte titel>

**Type:** ai-failure
**Files:** <zelfde>
**Tags:** ai-failure, <severity>
**Refs:** docs/AI-FAILURES.md#YYYY-MM-DD-HHMM
**Duration:** ~<N> min

Zie volledige analyse in [AI-FAILURES.md](./AI-FAILURES.md).
```

### 4. Sluit af

Bevestig kort in 2 regels wat je hebt geschreven. Wijs de gebruiker
expliciet op velden waar `_door gebruiker te bepalen_` staat zodat die
later aangevuld worden.

## Belangrijk

- Gebruik **exact het huidige tijdstempel** in `YYYY-MM-DD HH:MM` formaat
- Schrijf NIET zelf subjectieve oordelen (`### Vermoedelijke oorzaak`
  mag analyse zijn, maar wees voorzichtig — als je niet zeker bent, vraag)
- Verzin GEEN failure die niet heeft plaatsgevonden — als je niets
  vindt om te loggen, vraag de gebruiker eerst om uitleg
