---
description: Sync de "Beschikbare slash commands" lijst in WERKWIJZE.md met de actuele bestanden in .cursor/commands/
---

Vergelijk de "Beschikbare slash commands" sectie in `WERKWIJZE.md` met de
bestanden in `.cursor/commands/*.md` en update verschillen.

## Stappen

### 1. Inventariseer

- Lijst alle `.md` bestanden in `.cursor/commands/`
- Lees voor elk de YAML frontmatter (`description`) en de filename
  (zonder `.md`) — dat wordt de command-naam

### 2. Vergelijk en update

Open de "Beschikbare slash commands" sectie in `WERKWIJZE.md`. Voor elk
gevonden bestand:

- Bestaat er een rij `- /<naam> — <beschrijving>` die matcht? Laat staan.
- Bestaat de rij niet? Voeg toe: `- /<naam> — <description uit frontmatter>`
- Staat er een rij voor een command-bestand dat niet meer bestaat?
  Verwijder die rij.

Houd de bestaande volgorde aan; nieuwe rijen onderaan toevoegen.

### 3. Raak verder NIETS aan

- De genummerde stappen 1–6 blijven ongewijzigd
- "Voor de details" sectie blijft ongewijzigd
- Geen woordvolgorde-correcties, geen herformuleringen

### 4. Bevestig

Vat in 2–3 regels samen:
- "Toegevoegd: /xxx"
- "Verwijderd: /yyy"
- "Geen wijzigingen" als alles al synct

### 5. Log alleen bij wijziging

Als er iets is veranderd, voeg één entry toe onderaan
`docs/DEV-JOURNAL.md`:

```markdown
## YYYY-MM-DD HH:MM — WERKWIJZE.md slash-commands gesynchroniseerd

**Type:** observation
**Files:** WERKWIJZE.md
**Tags:** sync, werkwijze
**Refs:** _no commit yet_
**Duration:** ~1 min (auto)

<korte samenvatting uit stap 4>
```

Sla dit logboek-stapje over als er geen wijzigingen waren.
