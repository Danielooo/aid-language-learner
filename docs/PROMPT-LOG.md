# Prompt Log

System prompts, agent-instructies en model-input die in de **applicatie**
zelf zitten — typisch de **Vercel AI SDK** agent in `app/api/**` en
helpers in `lib/**`. Niet de prompts die je in Cursor tikt tijdens het
ontwikkelen.

Voedt direct rubric-vragen 24–29 ("Prompt design", zie
[EINDOPDRACHT.md § Deelopdracht 3](../EINDOPDRACHT.md)) en is bron voor
de verplichte bijlage "alle gebruikte prompts binnen de applicatie".

Format: light template (max 3 zinnen) + verplicht code-block met de
letterlijke prompt. Zie [`INDEX.md`](./INDEX.md) en
[`.cursor/rules/journaling.mdc`](../.cursor/rules/journaling.mdc) voor
de drempel.

---

## Hoe ik prompts versioneer

Ketens van iteraties worden expliciet gemaakt via `Replaces:`:

```
QuizAgent v1 ─→ QuizAgent v2 ─→ QuizAgent v3 (current)
                  Replaces: v1   Replaces: v2
```

Daarmee kun je voor rubric-vraag 25 ("hoe zag een typische iteratie eruit")
direct een keten reconstrueren.

---

## Entries

## 2026-05-28 13:35 — System prompt: WiktionaryChatbot v1

**Files:** app/api/dev/chat/route.ts, lib/ai/wiktionary-context.ts
**Iteration:** 1 of 1
**Replaces:** —
**Tags:** agent, system-prompt, wiktionary, dev-only

### Prompt (letterlijk)

```text
Je bent een Spaans-leer-assistent. Antwoord ALTIJD in het Nederlands.

Hieronder staat de Wiktionary-data voor het woord "<word>" in de "<focusLang>"-sectie. Gebruik UITSLUITEND deze data om vragen te beantwoorden — verzin niets. Als de data leeg is of geen antwoord geeft op de vraag, zeg dat eerlijk.

WIKTIONARY-DATA:
<gerenderde entries: per part-of-speech een nummering met gestripte definities en parsed examples, of "(geen entries gevonden ...)" / "LOOKUP MISLUKT: ..."-fallback>
```

Eerste system prompt voor de `/dev/wiktionary-chat`-experimentchatbot. Doel: valideren of les-11-context-injection genoeg is om een LLM te laten redeneren over ruwe Wiktionary-data zonder te hallucineren. Verwacht effect: bij goed-gedocumenteerde Spaanse woorden gedetailleerde NL-uitleg; bij coverage-gaps eerlijke "ik weet het niet". Wanneer het woord-veld leeg is wordt een vervangende meta-prompt geserveerd die de gebruiker terugverwijst naar dat veld.

---

---

## Template — kopieer & vul in

```markdown
## YYYY-MM-DD HH:MM — System prompt: <AgentNaam> v<N>

**Files:** app/api/<route>/route.ts
**Iteration:** <N> of N
**Replaces:** v<N-1> (of: —)
**Tags:** agent, system-prompt, <feature>

### Prompt (letterlijk)

\`\`\`text
Je bent een ...
\`\`\`

Eén tot drie zinnen: doel van deze prompt, waarom deze versie, en wat
veranderde t.o.v. de vorige versie (bij eerste versie: verwacht
effect).
```
