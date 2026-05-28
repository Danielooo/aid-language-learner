---
description: Herstructureer WERKWIJZE.md tot een genummerd stappenplan dat synct met de actuele bestanden in .cursor/commands/
---

Vergelijk de "Beschikbare slash commands" sectie in `WERKWIJZE.md` met de
bestanden in `.cursor/commands/*.md` en update verschillen.

## Stappen

### 1. Inventariseer

- Lijst alle `.md` bestanden in `.cursor/commands/`
- Lees voor elk de YAML frontmatter (`description`) en de filename
  (zonder `.md`) — dat wordt de command-naam

### 2. Update

- Bedenk een logische volgorde van start van de sessie tot afsluiten van de sessie
- De Werkwijze moet een genummerd stappenplan zijn
- De Werkwijze moet aangeven of een stap autmatisch gebeurt [AUTO] of dat ik zelf actie moet ondernemen [JIJ]
- De werkwijze moet duidelijk leesbaar zijn. slash commands en eventuele prompts moeten in een markdown codeblock staan