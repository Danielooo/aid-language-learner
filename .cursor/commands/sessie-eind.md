---
description: Sluit een werksessie af — check of alles gecommit is, koppel restende journal-entries, en bied losse eindjes aan
---

Einde-sessie afsluiting. Onder commit-strategie A zou het meeste al
gecommit moeten zijn via `/commit`; dit is je vangnet.

## Stappen

### 1. Status-check

Parallel:

- `git status --porcelain` — zijn er nog uncommitted wijzigingen?
- Zoek in `docs/*.md` naar resterende `_no commit yet_` regels
- Zoek in `docs/*.md` naar resterende `_te observeren_` of
  `_door gebruiker te bepalen_` velden

### 2. Rapporteer overzicht

Toon de gebruiker:

> **Status sessie-eind:**
> - Uncommitted wijzigingen: 3 files (`a.tsx`, `b.ts`, `c.md`)
> - Open journal-entries (zonder commit): 2
> - Onvolledige velden in entries: 4 stuks `_te observeren_`, 1 stuks `_door gebruiker te bepalen_`

Als alles 0 is: meld "Sessie is afgerond, niets meer open" en sla
overige stappen over.

### 3. Bied opties aan

Per categorie waar nog werk ligt, stel de gebruiker een actie voor:

**Bij uncommitted wijzigingen:**
> Wil je deze nog committen? Ik kan `/commit` voor je starten, of we
> laten ze open voor volgende sessie.

**Bij open journal-entries:**
> Twee entries staan op `_no commit yet_` maar er zijn geen wijzigingen
> meer. Mogelijk waren ze al gecommit zonder dat de Refs zijn bijgewerkt.
> Wil je dat ik kijk welke commit erbij hoort en de Refs bijwerk?

**Bij onvolledige velden:**
> 4 entries hebben nog `_te observeren_` in het Effect-veld. Wil je die
> nu langslopen, of laten staan voor week-recap?

Vraag per categorie of de gebruiker er nú iets aan wil doen. Forceer
niets.

### 4. Voer gevraagde acties uit

Doe alleen wat de gebruiker bevestigt. Als de gebruiker "ja" zegt bij
"open journal-entries oplossen":

- Draai `git log --oneline -20`
- Vergelijk timestamps + Files-velden met de open entries
- Stel per entry een SHA voor, vraag akkoord, vervang `_no commit yet_`

### 5. Wekelijkse recap-suggestie

Als het de **eerste sessie-eind van die week** is op een vrijdag/zaterdag/
zondag (of als de gebruiker dit aangeeft), suggereer:

> Wil je nu meteen de week-recap doen? Ik kan de belangrijkste entries
> van deze week voorstellen om te liften naar de specialized files.

Geen forced action — alleen suggestie.

### 6. Bevestig sessie-einde

Sluit af met:

- Aantal entries dat nog open is (en wat de gebruiker daarmee wil doen)
- Aantal commits in deze sessie (uit `git log --since="<sessie-start tijd>" --oneline`)
- "Klaar voor de volgende sessie" als alles netjes is

## Belangrijk

- Forceer geen acties — sessie-eind is reflectie, geen verplichting
- Maak NOOIT commits zonder via `/commit` of expliciet akkoord
- Verzin geen ontbrekende velden voor entries — die zijn vaak bewust
  open gelaten omdat het effect later moet worden vastgesteld
- Wees beknopt — sessie-eind hoort niet 10 minuten te duren
