# Requirements — Admin & User rollen

**Status:** bevroren (source of truth)  
**Datum:** 2026-07-15 (bijgewerkt 2026-07-16: Community-aanbiedingen + naming)  
**Scope:** productrechten en constraints; geen implementatiedetail (zie [`IMPLEMENTATION-ROLES.md`](./IMPLEMENTATION-ROLES.md)).

Rolbron (tot nader order): Supabase Auth `app_metadata.role === "admin"`.
Geen derde rol. Afwezige/null role = **user**.

---

## Rollen

| Rol | Betekenis |
| --- | --- |
| **User** | Leerling: oefenen, eigen materiaal beheren, AI-generatie (gelimiteerd), **oefeningengroep** als global *aanbieden* ter goedkeuring |
| **Admin** | Platformbeheerder + moderatie: review-queue (Pending / Goedgekeurd / Afgekeurd, status heen-en-weer), gebruikerslijst, rollen, deactiveren, AI per user uitzetten. Geen corpus-create/edit- of Tatoeba-UI. |

---

## Capability matrix — content & oefeningen

| Capability | User | Admin |
| --- | --- | --- |
| Community-oefeningengroepen lezen (actieve corpus-groepen) | ja | ja |
| **Community-oefeningengroep kopiëren** naar personal (hele groep) | ja (leerplan) | ja (eigen account) |
| Eigen (persoonlijke) oefeningen / oefeningengroepen CRUD | ja | ja (eigen account) |
| AI-generatie voor eigen oefeningen | ja, max **10 requests/dag** (tenzij admin AI heeft uitgezet) | ja, **onbeperkt** |
| **Oefeningengroep** aan community **aanbieden** | ja → snapshot/pending via `/community` | n.v.t. (corpus via user-aanbiedingen) |
| Individuele oefening als community aanbieden | **nee** | nee |
| Community publiceren zonder review | nee | nee (alleen via review-queue copy-on-approve) |
| Pending review goed-/afkeuren | nee | ja (review-queue, groep-niveau) |
| Review-status terugzetten / corrigeren | nee | ja (Pending ↔ Goedgekeurd ↔ Afgekeurd) |
| Goedgekeurde community-groepen soft-deactiveren | nee | **nee** (geen soft-hide in review-queue) |
| Community-oefeningengroepen bewerken (inhoud) | nee | nee (geen corpus-edit-UI) |
| Andermans **persoonlijke** oefeningen zien/bewerken | nee | **nee** |
| Tatoeba-import + AI-verrijking community corpus | nee | nee (geen Tatoeba-UI) |
| Bulk ops (goedkeuren via review-queue) | nee | ja |
| Eigen aanbiedingen + status bekijken | ja (`/community`) | n.v.t. |

---

## Moderatieflow

1. User biedt een **hele oefeningengroep** aan de community (via `/community` → Huidige oefeningengroepen) → **snapshot** van groepsnaam + alle lid-oefeningen als `pending`.
2. Het **persoonlijke origineel** blijft bewerkbaar; wijzigingen raken de pending snapshot niet. Community toont alleen de snapshot.
3. Admin reviewt in een **review-queue** met tabs **Pending | Goedgekeurd | Afgekeurd**:
   - **Goedkeuren** → **copy-on-approve**: nieuwe community `exercise_groups` (`owner_id` null) + member exercises; origineel blijft van de user; status `approved`.
   - **Afkeuren** → status `rejected` + **optionele** reden.
   - **Terug naar Pending** (vanaf Goedgekeurd/Afgekeurd) → status `pending`; bij Goedgekeurd wordt de gepubliceerde community-groep **hard verwijderd**.
   - **Afkeuren vanaf Goedgekeurd** → `rejected` + hard delete van de community-groep.
   - **Goedkeuren vanaf Afgekeurd** → opnieuw copy-on-approve.
4. User mag een pending aanbieding **niet** intrekken (geen withdraw-UI).
5. Na reject mag user **opnieuw aanbieden** (nieuwe snapshot van de *huidige* personal groep). Na approve: opnieuw aanbieden geblokkeerd (tot admin de approve terugdraait).
6. Geen e-mail/push; status in-app via `/community` (Pending / Goedgekeurd / Afgekeurd).
7. Geen automatische personal kopie na approve. Users kunnen een community-oefeningengroep **on-demand** naar personal kopiëren via het leerplan (hele groep).

### Terminologie

- **Oefeningengroep** = set oefeningen (`exercise_groups` + leden).
- **Oefening** = individuele vertaaloefening (CRUD op `/oefeningen`).
- User-facing label **Community** (niet “Globaal”) voor het gedeelde corpus en de bijdrage-pagina.

### Community → personal (leerplan)

- User ziet actieve community-oefeningengroepen onder **Community oefeningengroepen**.
- Openen toont alle lid-oefeningen; **één actie** kopieert de hele groep naar een nieuwe persoonlijke groep (`owner_id = user`).
- Na kopie wordt het topic (groepsnaam) **actief** gezet in `user_topic_preferences` zodat oefenen/SRS werkt.
- Idempotent op groepsnaam: bestaat er al een persoonlijke groep met dezelfde naam, dan geen tweede kopie.
- Community-materiaal wordt niet meer “in place” geactiveerd; practice gebeurt via persoonlijke kopie.

### Duplicate / al-community

Als dezelfde persoonlijke groep al tot een goedgekeurde community-groep heeft geleid, is **opnieuw aanbieden geblokkeerd**. Afwijzing blokkeert opnieuw aanbieden niet.

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

**Deactiveren (account)** = Auth-ban (login geblokkeerd) + bestaande sessies invalidiseren. Geen soft-flag die alleen in de UI hide’t zonder Auth-afdwinging.

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

## Uitdrukkelijk buiten scope (nu)

- Impersonatie
- Admin inzage in andermans voortgang of persoonlijke oefeningen
- User mag community-groepen direct publiceren of bewerken
- Admin corpus-create/edit-UI en Tatoeba-import-UI
- Intrekken (withdraw) van pending aanbiedingen
- Aparte notificatiekanalen (e-mail/push)

---

## Besloten open punten (defaults bevroren)

| # | Vraag | Besluit |
| --- | --- | --- |
| 1 | Admin AI-limiet | Onbeperkt |
| 2 | Account deactiveren | Auth ban + sessies weg |
| 3 | Laatste admin degraderen | Nee |
| 4 | Opnieuw aanbieden na approve | Geblokkeerd |
| 5 | Admin corpus create/edit / Tatoeba-UI | Nee — review + beheer goedgekeurde globals ([ADR](./DECISIONS.md#exercise-groups-review)) |
| 6 | Aanbieden-eenheid | Alleen hele oefeningengroep |
| 7 | Global groep soft-deactivate | `is_active` op `exercise_groups` |

Wijzigingen aan dit document = bewuste productkeuze; log een ADR in [`DECISIONS.md`](./DECISIONS.md).
