---
description: Stage relevante files, stel een conventional-commit message voor, commit na akkoord
---

Snelle, light-weight commit. Geen docs-scan, geen `Refs:`-update, geen
status-footer.

## Stappen

### 1. Inventariseer

Draai parallel:

- `git status --porcelain`
- `git diff --stat`

### 2. Stel commit-message voor

Gebruik **conventional commits**:

| Type | Wanneer |
| --- | --- |
| `feat(scope): ...` | Nieuwe feature of nieuwe rule |
| `fix(scope): ...` | Bug- of regressie-fix |
| `docs(scope): ...` | Wijzigingen aan `docs/`, README, of comments |
| `refactor(scope): ...` | Code-restructure zonder gedragswijziging |
| `chore(scope): ...` | Build, config, dependencies |
| `style(scope): ...` | Tailwind/CSS only, formatting |

Toon het voorstel aan de gebruiker:

> Voorstel commit:
> ```
> feat(rules): add proxy.ts best practices
> ```
> Files: `.cursor/rules/nextjs-app-router.mdc`
> Akkoord, of pas je 'm aan?

Als er duidelijk meerdere logische gebeurtenissen open staan, stel kort
groepering voor — Default is meerdere commits, maar stel ook een enkele commit voor

### 3. Commit

Na akkoord:

```
git add <relevante files>
git commit -m "<message>"
```

**Stage alleen de files van deze logische gebeurtenis**, niet `git add .`.

Toon de nieuwe SHA (`git rev-parse --short HEAD`) en bevestig met één
regel: `✅ <sha> — <message>`.

## Belangrijk

- **NOOIT** committen zonder de message te tonen en akkoord te krijgen
- **NOOIT** `git add .` of `git add -A`
- **NOOIT** een commit-message verzinnen voor werk dat de gebruiker niet
  duidelijk wil committen — vraag bij twijfel
- Hou messages **kort en in de gebiedende wijs** (Engels): `add X`, `fix Y`,
  niet `added` / `fixed`
