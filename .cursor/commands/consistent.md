---
description: Voer een geconstateerde fout of gewenste verandering consequent door de hele app door
---

De gebruiker beschrijft een **fout** die overal hetzelfde moet verdwijnen, of een **verandering** die overal hetzelfde moet landen. Jouw taak is die ene intentie **consequent** door de hele applicatie door te voeren — niet alleen op de plek die de gebruiker toevallig noemt.

## Mode

1. **Start in Plan mode** (schakel om als je in Agent zit) voor inventarisatie + voorstel.
2. **Schakel naar Agent mode** pas na expliciet akkoord van de gebruiker, en voer dan door.
3. Uitzondering: als de wijziging **triviaal lokaal** is (één bestand, geen synoniemen/varianten elders) mag je in Agent blijven — zeg dat kort.

## Input van de gebruiker

De tekst na dit commando is de intentie. Als die ontbreekt of vaag is: stel **één** korte verduidelijkingsvraag, daarna verder.

Maak scherp:

- **Wat is fout / wat moet anders?** (huidige toestand)
- **Wat is de canonieke gewenste toestand?** (één norm, geen meerdere varianten)
- **Scope-hints** als de gebruiker die geeft (UI-copy, types, API, DB, tests, …) — anders zelf bepalen via zoeken

Respecteer bestaande projectregels (o.a. UI-terminologie, conventies). Hernoem geen code/DB/API-identifiers alleen om UI-taal te matchen, tenzij de gebruiker dat expliciet vraagt.

## Werkwijze

### 1. Canon definiëren

Formuleer in 1–3 zinnen de **enige** correcte toestand. Geen “of … of …”.

### 2. Breed inventariseren

Zoek de hele codebase (niet alleen open files):

- Exacte strings, labels, foutmeldingen
- Synoniemen / oude termen / vermeden UI-woorden
- Types, helpers, hooks, API-routes, tests, docs in-repo die dezelfde intent raken
- Spiegelende features (bijv. tekst- én audio-generator, flashcards/typen/sorteren)

Gebruik Grep/Glob/explore. Lees genoeg context om false positives te vermijden.

### 3. Voorstel tonen (vóór edits)

Toon aan de gebruiker:

1. **Canon** — de gewenste toestand
2. **Treffers** — bestanden + kort *wat* er moet (groep per patroon)
3. **Bewust niet** — plekken die erop lijken maar buiten scope vallen (met reden)
4. **Risico’s** — breaking changes, DB/migraties, user-facing copy vs identifiers

Vraag: *Akkoord om dit zo door te voeren?*

**Geen code wijzigen vóór akkoord**, behalve als de gebruiker al expliciet “gewoon doen” / “voeren door” zei én de scope klein en eenduidig is.

### 4. Doorvoeren (Agent)

Na akkoord:

- Pas **alle** goedgekeurde treffers aan volgens dezelfde canon
- Geen half werk: geen “later even die andere plek”
- Geen scope-creep: geen refactors of hernoemingen buiten het voorstel
- Houd naming, imports en bestaande patronen in het project

### 5. Verifiëren

Na de edits:

- Zoek opnieuw op oude termen / foute patronen
- Meld resterende treffers of bevestig dat ze weg zijn
- Kort overzicht: wat gewijzigd is (bestanden + één regel per groep)

## Belangrijk

- **Eén canon** — geen lokale “bijna dezelfde” varianten laten bestaan
- **Hele app** — parallelle features en tests meenemen als ze hetzelfde concept raken
- **Geen stille aannames** — bij twijfel over canon of scope: vraag, dan door
- **Geen commit** tenzij de gebruiker dat apart vraagt
