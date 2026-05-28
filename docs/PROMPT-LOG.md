# Prompt Log

System prompts, agent-instructies en model-input die in de **applicatie**
zelf zitten. Dus de prompts die de gebruiker in Cursor tikt

Voedt direct rubric-vragen 24–29 ("Prompt design") en is bron voor de
verplichte bijlage "alle gebruikte prompts binnen de applicatie".

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

_Nog leeg_

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
