---
description: Maak één commit voor de huidige logische gebeurtenis en koppel de bijbehorende journal-entries aan de nieuwe commit-SHA
---

Werkstroom voor commit-strategie A: één commit per logische gebeurtenis,
direct gevolgd door koppeling van de journal-entries aan die commit.

## Stappen

### 1. Inventariseer git status

Draai parallel:

- `git status --porcelain` — modified, untracked, staged files
- `git diff --stat` — kort overzicht van wat er anders is

### 2. Inventariseer open journal-entries

Zoek in `docs/DEV-JOURNAL.md`, `docs/RULES-CHANGELOG.md`,
`docs/PROMPT-LOG.md`, `docs/AI-FAILURES.md`, `docs/DECISIONS.md` naar
entries met `_no commit yet_` in het `**Refs:**` veld. Lees voor elk:
- titel
- `**Files:**` veld
- `**Tags:**` veld

### 3. Stel groepering voor

Match de gewijzigde files met de open journal-entries. Toon de gebruiker
helder:

> Ik zie 5 gewijzigde files. Voorstel: één commit voor de "proxy.ts rule
> uitgewerkt" entry (raakt 1 file), en één commit voor de "loading & error
> UI" entry (raakt 2 files). 2 files horen bij geen entry — laat staan
> als untracked of stel een entry voor?

Als het allemaal bij **één** logische gebeurtenis hoort: één commit
voorstellen. Als het meerdere zijn: doe ze één-voor-één in volgorde.

### 4. Per groep: stel commit-message voor

Format: **conventional commits** (matcht de eindopdracht-eis van zinvolle
commit messages).

| Type | Wanneer |
| --- | --- |
| `feat(scope): ...` | Nieuwe feature of nieuwe rule |
| `fix(scope): ...` | Bug- of regressie-fix |
| `docs(scope): ...` | Wijzigingen aan `docs/`, README, of comments |
| `refactor(scope): ...` | Code-restructure zonder gedragswijziging |
| `chore(scope): ...` | Build, config, dependencies |
| `style(scope): ...` | Tailwind/CSS only, formatting |

Voorbeelden afgeleid uit entry-titels:

- Entry: "proxy.ts best practices toegevoegd" → `feat(rules): add proxy.ts best practices`
- Entry: "Components in `app/_components/`" → `docs(decisions): adopt app/_components for shared UI`
- Entry: "env-variables.mdc aangemaakt" → `feat(rules): add env-variables rule`

Vraag de gebruiker om akkoord op de message vóór je commit. Format:

> Voorstel commit:
> ```
> feat(rules): add proxy.ts best practices
> ```
> Files: `.cursor/rules/nextjs-app-router.mdc`
> Akkoord, of pas je 'm aan?

### 5. Voer de commit uit

Na akkoord:

```
git add <relevante files alleen>
git commit -m "<message>"
```

**Stage alleen de files van deze groep**, niet `git add .`. Dat hoort
bij commit-strategie A.

Onthoud de nieuwe SHA via `git rev-parse HEAD` of via de commit-output.

### 6. Update journal Refs

Vervang in alle docs-files waar de bijbehorende entry voorkomt:

```
**Refs:** _no commit yet_
```

door:

```
**Refs:** commit:`<7-char-sha>`
```

Eén entry kan in meerdere docs-files staan (bv. RULES-CHANGELOG én
DEV-JOURNAL). Update beide.

### 7. Volgende groep of stop

Als er nog open groepen zijn: stel de volgende voor, doorloop stappen 4–6.
Als alles gedaan is: ga naar stap 8.

De gebruiker kan tussendoor zeggen "stop" — laat dan eventuele resterende
open entries staan op `_no commit yet_`.

### 8. Bevestig + toon status-footer

Vat samen:

- Aantal commits gemaakt + de korte SHAs en messages
- Aantal journal-entries bijgewerkt per docs-bestand

**Daarna**, draai parallel deze status-checks (vangt het werk op dat
voorheen `/sessie-eind` deed):

- `git status --porcelain` — resterende uncommitted wijzigingen
- Zoek in `docs/*.md` naar resterende `_no commit yet_` regels
- Zoek in `docs/*.md` naar resterende `_te observeren_` of
  `_door gebruiker te bepalen_` velden

Toon een compacte footer:

```
✅ Committed `<sha>` — <message>
   Files: <files>
   Journal-entries bijgewerkt: <n>

📋 Status:
   • Uncommitted wijzigingen: <n> files (<file-namen of "—">)
   • Open `_no commit yet_` entries: <n>
   • Onvolledige `_te observeren_` velden: <n>

→ <vervolgsuggestie>
```

Voor de vervolgsuggestie:

- Alle tellers `0` → `✓ Klaar voor volgende /commit of voor het einde van de sessie.`
- Nog uncommitted files → `Nog X logische gebeurtenis(sen) open. Doe gerust /commit of laat staan voor volgende sessie.`
- Open `_no commit yet_` zonder uncommitted files → `Er staan X entries op _no commit yet_ maar geen uncommitted files. Mogelijk al gecommit zonder Refs-update — wil je dat ik per entry een SHA voorstel?`
- Onvolledige `_te observeren_` velden alleen → `X velden nog _te observeren_; laten staan voor week-recap is prima.`

Forceer niets. De footer is informatief. De gebruiker beslist of er
nóg een `/commit` volgt of dat de sessie hier eindigt.

## Belangrijk

- **NOOIT** een commit doen zonder de gebruiker de message te tonen en
  expliciet akkoord te krijgen
- **NOOIT** `git add .` of `git add -A` gebruiken — bij commit-strategie A
  stage je alleen de files van één logische gebeurtenis
- **NOOIT** een commit-message verzinnen voor werk dat geen journal-entry
  heeft; vraag eerst of er een entry geschreven moet worden
- Bij twijfel over groepering: laat de gebruiker beslissen
- Hou commit-messages **kort en in de gebiedende wijs** (Engels conventional
  commit stijl): `add X`, `fix Y`, niet `added X` of `fixed Y`
