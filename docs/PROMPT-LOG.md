# Prompt Log

System prompts, agent-instructies en model-input die in de **applicatie**
zelf zitten. Niet de prompts die je in Cursor tikt — die staan
(impliciet) in `RULES-CHANGELOG.md` en `DEV-JOURNAL.md`.

Voedt direct rubric-vragen 24–29 ("Prompt design") en is bron voor de
verplichte bijlage "alle gebruikte prompts binnen de applicatie".

Zie [`INDEX.md`](./INDEX.md) voor template.

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

_Nog leeg. Eerste app-prompt komt zodra de Vercel AI SDK agent is opgezet._

---

## Template — kopieer & vul in

```markdown
## YYYY-MM-DD HH:MM — System prompt: <AgentNaam> v<N>

**Type:** app-prompt
**Used in:** app/api/<route>/route.ts (regel <X-Y>)
**Iteration:** <N> of N
**Replaces:** v<N-1> (of: —)
**Tags:** agent, system-prompt, <feature>
**Refs:** AI-FAILURES.md#<anker> (als deze versie reageert op een failure)
**Duration:** ~<N> min schrijven

### Prompt (letterlijk)

\`\`\`text
Je bent een ...
\`\`\`

### Wat
Doel van deze prompt in 1–2 zinnen.

### Waarom
Waarom dit nu, en wat verschilde van de vorige versie.
Bij iteratie: link naar wat er met de vorige versie misging.

### Effect / verwacht effect
Wat veranderde aan modelgedrag of output-kwaliteit.
Bij eerste versie: wat verwacht je?
```
