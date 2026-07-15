# Requirements — Admin & User rollen

**Status:** bevroren (source of truth)  
**Datum:** 2026-07-15  
**Scope:** productrechten en constraints; geen implementatiedetail (zie [`IMPLEMENTATION-ROLES.md`](./IMPLEMENTATION-ROLES.md)).

Rolbron (tot nader order): Supabase Auth `app_metadata.role === "admin"`.
Geen derde rol. Afwezige/null role = **user**.

---

## Rollen

| Rol | Betekenis |
| --- | --- |
| **User** | Leerling: oefenen, eigen materiaal beheren, AI-generatie (gelimiteerd), global *aanbieden* ter goedkeuring |
| **Admin** | Content- én platformbeheerder: global corpus, moderatiequeue, gebruikerslijst, rollen, deactiveren, AI per user uitzetten |

---

## Capability matrix — content & oefeningen

| Capability | User | Admin |
| --- | --- | --- |
| Global oefeningen oefenen / lezen | ja | ja |
| Eigen (persoonlijke) oefeningen CRUD | ja | ja (eigen account) |
| AI-generatie voor eigen oefeningen | ja, max **10 requests/dag** (tenzij admin AI heeft uitgezet) | ja, **onbeperkt** |
| Oefening als global **aanbieden** | ja → snapshot/pending | n.v.t. (admin maakt zelf globals) |
| Global publiceren zonder review | nee | ja (Tatoeba-import, handmatig, na goedkeuring copy) |
| Pending review goed-/afkeuren | nee | ja (review-queue) |
| Global oefeningen bewerken / verwijderen | nee | ja |
| Andermans **persoonlijke** oefeningen zien/bewerken | nee | **nee** |
| Tatoeba-import + AI-verrijking global corpus | nee | ja |
| Bulk ops (goedkeuren / verrijken / verwijderen globals) | nee | ja |

---

## Moderatieflow

1. User klikt **aanbieden als global** → er wordt een **snapshot** van de inhoud vastgelegd als `pending`.
2. Het **persoonlijke origineel** blijft bewerkbaar; wijzigingen raken de pending snapshot niet.
3. Admin reviewt in een **review-queue**:
   - **Goedkeuren** → **copy-on-approve**: nieuwe global rij (`owner_id` null); origineel blijft van de user; status `approved` in UI.
   - **Afwijzen** → status `rejected` + **verplichte reden**; user ziet dit in de app.
4. User mag een **pending** aanbieding **intrekken**.
5. Na reject mag user **opnieuw aanbieden** (nieuwe snapshot).
6. Geen e-mail/push; alleen **in-app status**.

### Duplicate / al-global

Als dezelfde persoonlijke oefening (of een eerder goedgekeurde snapshot daarvan) al tot een global heeft geleid, is **opnieuw aanbieden geblokkeerd** (duidelijke foutmelding). Afwijzing of intrekking blokkeert opnieuw aanbieden niet.

---

## Capability matrix — platform / accounts

| Capability | User | Admin |
| --- | --- | --- |
| Eigen profiel bewerken | ja | ja |
| Eigen account verwijderen | ja | **nee** |
| Gebruikerslijst bekijken | nee | ja |
| Rol toekennen/afnemen (user ↔ admin) | nee | ja |
| Account deactiveren / blokkeren | nee | ja |
| Voortgang van anderen inzien | nee | nee |
| Impersonatie | nee | nee |
| AI-generatie per user uitzetten | nee | ja |

### Deactiveren (semantics)

**Deactiveren** = Auth-ban (login geblokkeerd) + bestaande sessies invalidiseren. Geen soft-flag die alleen in de UI hide’t zonder Auth-afdwinging.

### Laatste-admin bescherming

De **enige** overgebleven admin mag zichzelf **niet** degraderen naar user. Promote/demote faalt met een duidelijke fout als dat de laatste admin zou verwijderen.

---

## Harde constraints (privacy & enforcement)

| Constraint | Regel |
| --- | --- |
| Persoonlijke oefeningen van anderen | Nooit zichtbaar voor users; admin bewerkt ze ook niet |
| Voortgang van anderen | Nooit voor users; geen admin “spy dashboard” in deze scope |
| Admin-writes | Altijd via server + rolcheck; geen client RLS-bypass |
| Rate limit | Default **10 AI-requests/dag** per user; admin kan AI per user uitzetten |
| Admin AI | Onbeperkt voor admin-accounts |

---

## Uitdrukkelijk buiten scope

- Impersonatie
- Admin inzage in andermans voortgang of persoonlijke oefeningen
- User mag globals direct publiceren of bewerken
- Aparte notificatiekanalen (e-mail/push)

---

## Besloten open punten (defaults bevroren)

| # | Vraag | Besluit |
| --- | --- | --- |
| 1 | Admin AI-limiet | Onbeperkt |
| 2 | Deactiveren | Auth ban + sessies weg |
| 3 | Laatste admin degraderen | Nee |
| 4 | Opnieuw aanbieden na approve | Geblokkeerd |

Wijzigingen aan dit document = bewuste productkeuze; log een ADR in [`DECISIONS.md`](./DECISIONS.md).
