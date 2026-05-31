# Werkwijze

Genummerd stappenplan voor een werksessie, van start tot afsluiten.
**[AUTO]** = Cursor doet het zelf · **[JIJ]** = jij doet iets.

Commit-strategie: **één commit per logische gebeurtenis** (zie
[`docs/DECISIONS.md`](docs/DECISIONS.md)).

## Stappen

1. **Start van de sessie** **[JIJ]**
   Open Cursor en begin met je eerste prompt. Geen aparte sessie-start
   journal-entry — die zijn afgeschaft.

2. **Tijdens werken — entry loggen** **[AUTO]** of **[JIJ]**
   Bij elke rule-/prompt-/architectuurwijziging hoort één entry in de
   juiste specialized file:
   - Cursor-rule (`.cursor/rules/*.mdc` of `AGENTS.md`) → `docs/RULES-CHANGELOG.md`
   - System-/agent-prompt in `app/api/**` of `lib/**` → `docs/PROMPT-LOG.md`
   - Bewuste architectuur-/conventiekeuze → `docs/DECISIONS.md`

   **[AUTO]** Als de `journaling`-rule actief is, doet Cursor dit zelf.

   **[JIJ]** Anders (of expliciet) tik je per file één van:

   ```
   /log-rule <steekwoorden>
   /log-prompt <steekwoorden>
   /log-decision <steekwoorden>
   ```

   Cursor maakt er lopende zinnen van, vult metadata in en vraagt akkoord
   voor wegschrijven. Eén event = één entry = één bestand.

3. **Na elke logische gebeurtenis** **[JIJ]**
   Tik:

   ```
   /commit
   ```

   Cursor stelt een conventional-commit message voor en doet de commit
   na akkoord. Journal-entries linken niet naar SHAs — chronologie loopt
   via entry-timestamps + `git log`. Zie
   [`docs/DECISIONS.md#drop-sha-refs`](docs/DECISIONS.md#drop-sha-refs).

4. **Als AI iets onverwachts of fout doet** **[JIJ]**
   Tik:

   ```
   /ai-failure
   ```

   Optioneel gevolgd door `severity low|medium|high` en korte
   beschrijving. Logt in `docs/AI-FAILURES.md`.

5. **Bij wijziging in slash commands** **[JIJ]**
   Heb je tijdens de sessie een bestand in `.cursor/commands/` toegevoegd
   of verwijderd? Tik:

   ```
   /sync-werkwijze
   ```

   Werkt deze WERKWIJZE.md bij volgens de actuele commando's.

6. **Afsluiten van de sessie** **[JIJ]**
   Check dat alles gecommit is. Vraag Cursor desnoods:

   ```
   wat is mijn git-status?
   ```

   Geen open eindjes? Sluit Cursor af.

## Beschikbare slash commands

- `/commit` — stage relevante files + conventional-commit message + commit
- `/ai-failure` — log een AI-failure entry in `docs/AI-FAILURES.md`
- `/log-decision` — log een entry in `docs/DECISIONS.md`
- `/log-prompt` — log een entry in `docs/PROMPT-LOG.md` (scant `app/api/**` + `lib/ai/**` voor de letterlijke prompt)
- `/log-rule` — log een entry in `docs/RULES-CHANGELOG.md`
- `/sync-werkwijze` — synct WERKWIJZE.md met `.cursor/commands/`

## Voor de details

- Templates en rubric-mapping: [`docs/INDEX.md`](docs/INDEX.md)
- Onderbouwing van keuzes: [`docs/DECISIONS.md`](docs/DECISIONS.md)
