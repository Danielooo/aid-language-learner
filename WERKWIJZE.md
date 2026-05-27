# Werkwijze

Per-sessie stappenplan voor journaling.
**[AUTO]** = Cursor doet het zelf · **[JIJ]** = jij moet iets doen.

Commit-strategie: **één commit per logische gebeurtenis** (zie
[`docs/DECISIONS.md`](docs/DECISIONS.md)).

## Per sessie

1. **Sessie-start** **[AUTO]**
   Niets doen. Bij je eerste substantiële prompt schrijft Cursor zelf een
   sessie-start entry in `docs/DEV-JOURNAL.md`.

2. **Tijdens werken** **[AUTO]**
   Cursor logt automatisch:
   - Cursor-rule wijzigingen → `docs/RULES-CHANGELOG.md` + `DEV-JOURNAL.md`
   - System/agent prompts in `app/api/**` of `lib/**` → `docs/PROMPT-LOG.md` + `DEV-JOURNAL.md`
   - Bewuste architectuur-/conventiekeuzes → `docs/DECISIONS.md` + `DEV-JOURNAL.md`

3. **Na elke logische gebeurtenis** **[JIJ]**
   Tik in de chat:
   ```
   /commit
   ```
   Cursor stelt een commit-message voor, doet de commit, en koppelt de
   bijbehorende journal-entries aan de nieuwe commit-SHA.

4. **Als AI iets onverwachts of fout doet** **[JIJ]**
   Tik in de chat:
   ```
   /ai-failure
   ```
   Optioneel met `severity low|medium|high` en korte beschrijving.

5. **Einde sessie** **[JIJ]**
   Tik in de chat:
   ```
   /sessie-eind
   ```
   Cursor checkt of alles is gecommit, of er nog open journal-velden zijn,
   en biedt aan losse eindjes af te ronden.

## Wekelijks

6. **Einde week — lift** **[JIJ]**
   Tik tegen Cursor:
   > "lift de belangrijkste journal-entries van deze week naar de specialized files"

7. **Einde week — sync-check** **[JIJ]**
   Tik in de chat:
   ```
   /sync-werkwijze
   ```

## Beschikbare slash commands

- `/commit` — commit één logische gebeurtenis + koppel journal-entries aan de SHA
- `/sessie-eind` — afsluitings-check voor de werksessie
- `/ai-failure` — log een AI-failure entry
- `/sync-werkwijze` — sync dit bestand met de bronbestanden

## Voor de details

- Templates en rubric-mapping: [`docs/INDEX.md`](docs/INDEX.md)
- Onderbouwing van keuzes: [`docs/DECISIONS.md`](docs/DECISIONS.md)
