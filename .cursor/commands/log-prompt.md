---
description: Log een nieuwe entry in docs/PROMPT-LOG.md voor een app-interne system-/agent-prompt
---

Voeg een nieuwe entry toe aan `docs/PROMPT-LOG.md`. De gebruiker geeft
steekwoorden; jij scant recent gewijzigde files in `app/api/**` en
`lib/ai/**` om de letterlijke prompt op te halen, vult metadata in en
schrijft het. Zie [`.cursor/rules/journaling.mdc`](../rules/journaling.mdc).

## Wat is er gewijzigd

Lees wat de gebruiker na het `/log-prompt` commando schreef. Als de
gebruiker niks heeft toegevoegd, scrol terug en infereer welke prompt
recent is toegevoegd of gewijzigd. Als je niets vindt: vraag eerst om
context.

## Stappen

### 1. Drempel-check

`docs/PROMPT-LOG.md` is voor **nieuwe of inhoudelijk gewijzigde
app-interne prompts** (Vercel AI SDK system prompt, agent-instructie,
model-input in `app/api/**` of `lib/**`). **Niet** voor:

- Cursor-chat prompts (die landen impliciet in `RULES-CHANGELOG.md`
  bij rule-wijzigingen)
- Woord-vervangingen of formatting-tweaks zonder gedragsverandering

Bij twijfel: vraag de gebruiker of deze wijziging wezenlijk genoeg is.

### 2. Zoek de letterlijke prompt

Scan recent gewijzigde files in `app/api/**` en `lib/ai/**`:

- `git status --porcelain -- 'app/api/**' 'lib/ai/**'`
- `git diff --stat HEAD -- 'app/api/**' 'lib/ai/**'`

In die kandidaten zoek naar:

- `system: \`...\`` of `system: "..."` in route-handlers (typisch bij
  `streamText({ system, ... })`)
- String-constanten / template-literals in `lib/ai/*.ts` met namen als
  `*Prompt`, `*Instruction`, `SYSTEM_*`, of variabelen die elders als
  `system`-property doorgegeven worden

Beslislogica:

- **Eén duidelijke kandidaat** → gebruik die
- **Meerdere kandidaten** → toon kort de file-pads + eerste regel van
  elke kandidaat, vraag welke
- **Geen kandidaten** → vraag expliciet om het file-pad

Lees de prompt letterlijk uit de source en behoud whitespace.
Template-placeholders (`${...}`, `{variabele}`) mogen blijven; geef ze
weer zoals ze in de code staan.

### 3. Bepaal Iteration en Replaces (tokenzuinig — geen full Read)

Gebruik `Grep` ipv `Read` op `docs/PROMPT-LOG.md`:

- `pattern`: `^## .* — System prompt: <AgentNaam> v\d+`
- `path`: `docs/PROMPT-LOG.md`
- `output_mode`: `content`

Vervang `<AgentNaam>` letterlijk door de naam waarvoor je een nieuwe
versie logt. De output is een korte lijst matchende headers (geen full
file), waaruit je het hoogste versienummer afleidt:

- **Geen matches** → `Iteration: 1 of 1`, `Replaces: —`
- **Hoogste match was v<N>** → nieuwe wordt v<N+1>,
  `Iteration: <N+1> of <N+1>`, `Replaces: v<N>`

Update óók de header van de vorige versie van `... v<N>` naar
... NEE. Bestaande entries zijn read-only — niet aanraken. De keten is
afleidbaar uit de Replaces-velden in nieuwere entries.

### 4. Stel de entry voor

Gebruik **exact het huidige tijdstempel** in `YYYY-MM-DD HH:MM` formaat.

Bepaal:
- **AgentNaam**: PascalCase, beschrijvend (`WiktionaryChatbot`,
  `ExerciseGenerator`, ...)
- **Files**: paths van geraakte routes / lib-helpers
- **Tags**: `agent`, `system-prompt`, plus feature- en context-tags
- **Body**: 1 tot 3 lopende zinnen — bij eerste versie: doel + verwacht
  effect; bij iteratie: doel + wat er veranderde t.o.v. vorige versie
  + waarom

Toon het voorstel:

> Voorstel entry voor `docs/PROMPT-LOG.md`:
>
> ```markdown
> ## 2026-05-31 10:42 — System prompt: AgentNaam v1
>
> **Files:** app/api/.../route.ts, lib/ai/...ts
> **Iteration:** 1 of 1
> **Replaces:** —
> **Tags:** agent, system-prompt, feature
>
> ### Prompt (letterlijk)
>
> \`\`\`text
> Je bent een ...
> \`\`\`
>
> Eén tot drie zinnen ...
> ```
>
> Akkoord, of aanpassen?

### 5. Schrijf entry (tokenzuinig — geen full Read)

Na akkoord: gebruik het stabiele invoeg-anker
`<!-- INSERT-NEW-ENTRY-ABOVE -->` dat direct boven
`## Template — kopieer & vul in` staat. Werkwijze:

1. `Read` `docs/PROMPT-LOG.md` met `offset: -15, limit: 15` (voldoet
   aan Read-before-Edit én bevat de marker + Template-blok ter
   referentie).
2. `StrReplace` met:
   - `old_string`: `<!-- INSERT-NEW-ENTRY-ABOVE -->`
   - `new_string`:

     ```
     ---

     <hier de nieuwe entry zoals voorgesteld in stap 4, inclusief
     letterlijke prompt in een ```text-codeblock>

     <!-- INSERT-NEW-ENTRY-ABOVE -->
     ```

NOOIT de volledige `docs/PROMPT-LOG.md` lezen om de invoegpositie te
vinden. Zie [`.cursor/rules/journaling.mdc`](../rules/journaling.mdc) →
"Tokenzuinig appenden in docs/".

### 6. Sluit af

Bevestig in 1-2 regels welke file je hebt bijgewerkt.

## Belangrijk

- Raak **bestaande entries niet aan** (read-only-regel uit
  `journaling.mdc`). Ook geen versie-nummers in oude headers bijwerken.
- De letterlijke prompt **moet** in een `\`\`\`text`-codeblock; verzin
  hem nooit, kopieer uit de source.
- Geen `Refs:`/`Duration:` velden — die zijn afgeschaft.
- Max ~3 zinnen vrije tekst. Geen `### Wat` / `### Waarom` / `### Effect`
  sub-kopjes.
