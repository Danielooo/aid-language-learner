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
   Cursor stelt een commit-message voor, doet de commit, koppelt de
   bijbehorende journal-entries aan de nieuwe commit-SHA, en toont een
   status-footer met eventuele open eindjes (uncommitted files,
   `_no commit yet_` entries, onvolledige velden).

4. **Als AI iets onverwachts of fout doet** **[JIJ]**
   Tik in de chat:
   ```
   /ai-failure
   ```
   Optioneel met `severity low|medium|high` en korte beschrijving.

5. **Einde sessie** **[JIJ]**
   Geen apart commando nodig. Na je laatste `/commit` heeft de
   status-footer je al laten zien wat (eventueel) nog open is. Niets
   meer te doen? Sluit Cursor af. Wel iets open dat nog moet? Vraag
   het natuurlijk: *"wat is mijn git-status?"* of *"zijn er nog
   `_no commit yet_` entries?"*.

## Wekelijks

1. **Einde week — audit** **[JIJ]**
   *(Voorheen "lift", maar in de praktijk een audit-stap geworden.)*

   Capture in `DEV-JOURNAL.md` én curate in de specialized files
   gebeurt al tijdens je sessies, omdat de meta-rule
   [`.cursor/rules/journaling.mdc`](.cursor/rules/journaling.mdc)
   Cursor forceert om bij rule-edits, prompt-edits en architectuurkeuzes
   meteen béide te updaten. Deze wekelijkse stap is daarom geen tweede
   schrijfronde meer, maar een **audit/verificatie-pas**:

   - Heeft de meta-rule echt overal meegeschreven?
   - Zijn de cross-references (`Refs:`) consistent?
   - Welke `_te observeren_` velden kun je nu invullen omdat het effect
     bekend is?
   - Welke AI-failures of prompt-iteraties heb je niet meteen gelogd
     maar zou je achteraf nog willen vastleggen?

   Tik tegen Cursor (Agent-mode):
   > Lees alle nieuwe entries van deze week in `docs/DEV-JOURNAL.md`.
   > Check of elke rubric-waardige entry een corresponderende entry
   > heeft in de juiste specialized file (RULES-CHANGELOG / PROMPT-LOG
   > / AI-FAILURES / DECISIONS) en of de cross-references kloppen. Vul
   > `_te observeren_` velden in waar het effect inmiddels bekend is.
   > Rapporteer ontbrekende of inconsistente entries — schrijf niets
   > weg zonder mijn akkoord.

2. **Einde week — sync-check** **[JIJ]**
   Tik in de chat:
   ```
   /sync-werkwijze
   ```

## Beschikbare slash commands

- `/commit` — commit één logische gebeurtenis + koppel journal-entries aan de SHA + status-footer
- `/ai-failure` — log een AI-failure entry
- `/sync-werkwijze` — sync dit bestand met de bronbestanden

## Voor de details

- Templates en rubric-mapping: [`docs/INDEX.md`](docs/INDEX.md)
- Onderbouwing van keuzes: [`docs/DECISIONS.md`](docs/DECISIONS.md)
