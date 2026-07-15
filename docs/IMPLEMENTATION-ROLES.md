# Implementation plan — Admin & User rollen

**Bron van requirements:** [`REQUIREMENTS-ROLES.md`](./REQUIREMENTS-ROLES.md)  
**Status:** PR A–F geïmplementeerd (schema, enforcement, moderatie, rate limit, users, admin-nav)  
**Datum:** 2026-07-15

Dit document vertaalt de bevroren requirements naar concrete bouwstappen.
Volgorde is afhankelijkheidsgericht: data/model eerst, daarna enforcement, daarna UI.

---

## Huidige gaps (kort)

1. Geen pending/snapshot-model voor global-aanbiedingen.
2. Generator zet altijd `owner_id = userId`; geen approval-pad.
3. Tatoeba-persist en veel `/dev`-routes gebruiken service role zonder `assertAdmin`.
4. Geen productie admin-nav / capability helper in app-shell.
5. Geen rate-limit of `ai_disabled` per user.
6. Geen users-lijst / promote-demote / deactivate in de app.
7. RLS kent de rol niet; admin-mutaties moeten via server APIs blijven.

---

## Fase 1 — Datamodel

### 1a. `exercise_global_submissions` (of equivalent)

Nieuw: snapshot + review-status, los van `exercises`.

Voorgestelde kolommen (indicatief):

| Kolom | Doel |
| --- | --- |
| `id` | PK |
| `source_exercise_id` | FK naar persoonlijke oefening |
| `submitted_by` | `auth.uid()` van aanbieder |
| `snapshot` | JSONB met inhoud op submit-moment |
| `status` | `pending` \| `approved` \| `rejected` \| `withdrawn` |
| `reject_reason` | tekst (verplicht bij reject) |
| `reviewed_by` / `reviewed_at` | admin audit |
| `resulting_exercise_id` | FK naar nieuwe global rij na approve (nullable) |
| `created_at` / `updated_at` | timestamps |

RLS-idee:
- User: SELECT/INSERT/UPDATE (withdraw) **eigen** submissions.
- Approve/reject/copy: **alleen** via server + `assertAdmin` + service role (niet via user client).

Unieke constraint / check: blokkeer nieuwe `pending`/`approved`-flow als `source_exercise_id` al een `approved` rij heeft met `resulting_exercise_id` gezet.

### 1b. User platform flags

Op `profiles` (of aparte `user_settings`):

- `ai_disabled boolean default false`
- eventueel `ai_requests_date date` + `ai_requests_count int` voor daglimiet  
  (of aparte `ai_usage_events` tabel als je historie wilt)

Deactiveren blijft Auth-side (`ban_duration` / ban user), niet alleen een profile-flag.

---

## Fase 2 — Enforcement & helpers

| Werk | Detail |
| --- | --- |
| `assertAdmin` uitbreiden | Alle routes die global schrijven of service role gebruiken |
| Tatoeba persist-batch e.d. | Achter `assertAdmin` |
| Capability helper | bv. `getRoleCapabilities(user)` → `{ isAdmin, canGenerateAi, canDeleteAccount, ... }` |
| `/dev` gating | Productie: `/dev` alleen admin, of tools migreren naar `/(app)/admin/*` |
| Proxy | Optioneel: admin-only prefixes in [`proxy.ts`](../proxy.ts) |

Admin-writes blijven **server-only**; RLS voor users ongewijzigd (eigen + global read).

---

## Fase 3 — Moderatie APIs & user flow

| Endpoint / action | Wie | Gedrag |
| --- | --- | --- |
| `POST .../submit-global` | user | Snapshot + `pending`; fout als al approved voor `source_exercise_id` |
| `POST .../withdraw` | user | Alleen eigen `pending` → `withdrawn` |
| `GET .../my-submissions` | user | Status + reject reason in UI |
| `GET .../review-queue` | admin | Lijst `pending` |
| `POST .../approve` | admin | Insert global `exercises` (`owner_id null`) + link `resulting_exercise_id` |
| `POST .../reject` | admin | `rejected` + verplichte reden |
| Bulk approve/reject | admin | Zelfde regels, batched |

UI:
- User: knop “Aanbieden als global” bij eigen oefening + statusbadge.
- Admin: review-queue pagina (bulk selecteren toegestaan).

---

## Fase 4 — Rate limits & AI disable

1. Bij elke user AI-generatie-request: check `ai_disabled` → 403.
2. Tel requests per UTC-dag (of Europe/Amsterdam — vastleggen in ADR bij bouw).
3. Bij `count >= 10` → 429 met duidelijke melding.
4. Admin-account: limiet overslaan.
5. Admin UI: toggle “AI uitzetten” per user → update `profiles.ai_disabled`.

Bestanden waarschijnlijk: generator route(s) onder `app/api/dev/exercises/` of productie-equivalent.

---

## Fase 5 — Platformbeheer

Admin-only pagina (voorkeur: `/(app)/admin/gebruikers` i.p.v. eeuwig `/dev`):

| Actie | Implementatie |
| --- | --- |
| Lijst users | Admin API: profiles + auth metadata (role, banned) |
| Promote / demote | `auth.admin.updateUserById` → `app_metadata.role` |
| Laatste-admin lock | Voor demote: tel admins; als `count === 1` en target = die admin → weigeren |
| Deactiveren | Auth ban + sessies invalidiseren (Supabase admin API) |
| Reactiveren | Ban opheffen (scope: meenemen als spiegel van deactivate) |

Blijft verboden: admin eigen account via profiel-UI verwijderen (bestaand gedrag behouden).

---

## Fase 6 — Admin content (bestáánd opschonen)

Al deels aanwezig onder `/api/dev/exercises-admin` + Tatoeba-tools:

1. Alle global write-paden achter `assertAdmin`.
2. Admin mag **alleen** global bewerken/verwijderen — geen peep/edit in andermans persoonlijke rijen (huidige admin list die álles toont: inperken of filteren op `owner_id IS NULL` + submissions).
3. Bulk enrich / delete globals behouden.
4. Productie-nav: “Beheer” zichtbaar alleen voor `isAdmin`.

---

## Voorgestelde levervolgorde (PRs)

1. **PR A** — migration submissions + RLS stubs + types ✅  
2. **PR B** — `assertAdmin` op alle global-write `/api/dev/*` + filter admin list op globals ✅  
3. **PR C** — submit / withdraw / review-queue APIs + minimale UI ✅  
4. **PR D** — AI rate limit + `ai_disabled` ✅  
5. **PR E** — users admin (list, role, ban) + last-admin guard ✅  
6. **PR F** — productie admin-nav; `/dev` aanscherpen of deprecaten ✅

---

## Acceptatiecriteria (samenvatting)

- User kan personal CRUD + beperkt AI; kan global aanbieden; ziet status; kan withdraw/resubmit na reject.
- Approve maakt **nieuwe** global; origineel blijft persoonlijk.
- Al-approved source kan niet opnieuw pending worden.
- Admin: review-queue, global CRUD, Tatoeba/enrich, bulk; **geen** edit van andermans personal.
- Admin: users list, promote/demote (niet laatste admin), deactivate (ban + sessions).
- User ziet nooit andermans personal of progress.
- Alle admin-mutaties server-side + role check.
