# AI Failures — Quick Capture

Wanneer AI iets onverwachts of fout doet: capture binnen 30 seconden,
diepere reflectie later. Voedt rubric-vraag 21 (minimaal 3 concrete
beperkingen/onzekerheden in AI-output) en 22 (maatregelen voor
betrouwbaarheid).

Zie [`INDEX.md`](./INDEX.md) voor template.

---

## Severity-schaal

| Niveau | Wanneer | Voorbeeld |
| --- | --- | --- |
| **low** | Cosmetisch, makkelijk te fixen, geen risico | Verkeerde class-volgorde in Tailwind |
| **medium** | Werkende code, maar verkeerde aanpak / inefficiënt | `<img>` ipv `<Image>`; `middleware.ts` ipv `proxy.ts` |
| **high** | Niet-werkend, beveiligingsrisico, of misleidend | Secret achter `NEXT_PUBLIC_` zetten; Hallucinated API endpoint |

Minimum-target voor verantwoordingsdocument: **3 onderbouwde entries**
(één per severity-niveau is ideaal).

---

## Entries

_Nog leeg. Capture momenten zoals ze voorkomen._

---

## Template — kopieer & vul in

```markdown
## YYYY-MM-DD HH:MM — Korte beschrijving wat misging

**Type:** ai-failure
**Severity:** low | medium | high
**Files:** path/naar/bestand(en) waar het gebeurde
**Tags:** <feature>, <ai-model>, <type-error>
**Refs:** DEV-JOURNAL.md#<datum-tijd>, RULES-CHANGELOG.md#<anker> (als rule was gemaakt om te voorkomen)
**Duration:** ~<N> min om op te vangen

### Wat ging fout
Concrete output of gedrag. Code-snippet als dat helpt.

### Vermoedelijke oorzaak
Waarom denk je dat de AI dit deed? Ontbrekende rule? Verouderde
training data? Verkeerde context? Ambiguë prompt?

### Workaround / fix
Wat heb je gedaan om het te herstellen.

### Prevented by
Welke rule / prompt / check heb je toegevoegd om dit in de toekomst
te voorkomen. Of: "geen — eenmalig geaccepteerd risico" / "nog niet".
```

---

## Tips voor rubric-vraag 21

De rubric vraagt om **oorzaak + effect**, niet alleen "AI deed X".

- **Oorzaak** = analyse, geen verwijt. "Geen rule over X" /
  "training data van vóór Next 16" / "ambiguë prompt zonder context".
- **Effect op applicatie** = concreet. "Hot module reload brak", "build
  faalde", "test groen maar prod-bug", "extra uur debug-tijd".

Sterke voorbeelden zijn die waar je een **rule of prompt-aanpassing** als
gevolg hebt gemaakt — dat toont de iteratieve, kritische houding die de
rubric beloont.
