# CocoIndex — uitleg & implementatie

> Bronnen: [cocoindex.io](https://cocoindex.io/),
> [github.com/cocoindex-io/cocoindex](https://github.com/cocoindex-io/cocoindex),
> [quickstart](https://cocoindex.io/docs/getting_started/quickstart/),
> [overview](https://cocoindex.io/docs/getting_started/overview/).
> Versie waarop dit document is gebaseerd: **CocoIndex v1.0.x** (mei 2026).

---

## 1. Wat is CocoIndex (in één paragraaf)

CocoIndex is een **declaratief, incrementeel data-pipeline framework voor
AI-workloads**. Je schrijft in Python *wat* de uiteindelijke staat van je
target (bijv. een pgvector-tabel, knowledge graph of bestand) moet zijn als
functie van je source-data. CocoIndex (core in Rust) bepaalt zelf *hoe* het
die staat bereikt, en herberekent bij elke run alleen de **delta** — de
records waarvan de input óf de transformatie-code is veranderd. Resultaat:
altijd-verse embeddings/indexen tegen ~10× lagere kosten dan een volledige
herberekening.

Vergelijk het met **React, maar voor data**:

| React           | CocoIndex                                              |
| --------------- | ------------------------------------------------------ |
| `UI = f(state)` | `target_state = transformation(source_state)`          |
| Re-rendert wat veranderde | Herberekent alleen de records waarvan de input of code veranderde |
| Virtual DOM diff | Hash-gebaseerde delta-detectie (input + code) |

---

## 2. Het mentale model

```
SOURCE  ──►  F (jouw Python-transformatie)  ──►  TARGET
 .txt           @coco.fn / @cocoindex.flow_def           pgvector / Neo4j /
 .pdf                                                    LanceDB / files / ...
 API
 DB
```

- Jij declareert de pipeline één keer.
- De engine detecteert deltas op drie niveaus:
  1. **Component-niveau** — alleen veranderde source-items opnieuw verwerken.
  2. **Functie-niveau** — dure functies (zoals `embed()`) zijn gememoiseerd
     op `hash(input) + hash(code)`; gelijke input + gelijke code ⇒ cache-hit.
  3. **Target-niveau** — minimale set van inserts/updates/deletes naar de
     target store.
- Elke byte in de target is traceerbaar naar zijn source-byte (**lineage**).

---

## 3. Kernconcepten (API-vocabulaire)

| Concept          | Wat het is                                                                 |
| ---------------- | -------------------------------------------------------------------------- |
| **Source**       | Connector voor input: `LocalFile`, `S3`, `GoogleDrive`, `Postgres`, ...    |
| **Flow**         | De declaratieve definitie van source → transform → target (`@cocoindex.flow_def` of `@coco.fn`). |
| **Data scope**   | Hiërarchische container in de flow (bijv. *documents* → *chunks*).         |
| **Function**     | Een transformatie (`SplitRecursively`, `SentenceTransformerEmbed`, eigen `@coco.fn`). |
| **Collector**    | Verzamelt rows door alle scopes heen en exporteert ze naar de target.      |
| **Target**       | Output-connector: Postgres/pgvector, Qdrant, LanceDB, Neo4j, ChromaDB, ... |
| **App**          | De runnable unit die source-argumenten bindt aan de main-flow.             |
| **Memoization**  | `@coco.fn(memo=True)` ⇒ resultaat cachen op `hash(input)+hash(code)`.      |
| **Live mode**    | `cocoindex update main -L` ⇒ continu updaten i.p.v. eenmalige run.         |
| **CocoInsight**  | UI om per-stap te zien wat er door je pipeline stroomt (debug/lineage).    |

### Twee schrijfstijlen
CocoIndex heeft twee API-stijlen die je in voorbeelden tegenkomt:

1. **Builder-stijl** (oudere docs, nog steeds geldig):

   ```python
   @cocoindex.flow_def(name="TextEmbedding")
   def text_embedding_flow(flow_builder, data_scope):
       data_scope["documents"] = flow_builder.add_source(
           cocoindex.sources.LocalFile(path="markdown_files"))
       ...
   ```

2. **Function-stijl** (v1.0+ aanbevolen):

   ```python
   @coco.fn(memo=True)
   async def process_file(file, table): ...

   @coco.fn
   async def main(src): ...

   app = coco.App("MyApp", main, src="./docs")
   ```

Beide werken; nieuwe projecten kunnen direct de function-stijl gebruiken.

---

## 4. Hoe het onder de motorkap werkt

1. **Source-scan** — connector levert items (file, row, message...). Per
   item wordt een **fingerprint** berekend: `hash(content) + hash(metadata)`.
2. **Code-fingerprint** — elke `@coco.fn` heeft een hash over de
   functie-source + dependencies.
3. **Delta-detectie** — engine vergelijkt `(input_hash, code_hash)` met de
   vorige run (state opgeslagen in `COCOINDEX_DB`, default SQLite).
   - Onveranderd ⇒ skip, target-row blijft staan.
   - Gewijzigd ⇒ run F opnieuw, upsert target.
   - Source verdwenen ⇒ delete corresponderende target-rows.
4. **Parallelle uitvoering** — Rust scheduler runt onafhankelijke items
   parallel, met automatische batching naar GPU's / embedding-APIs.
5. **Lineage-log** — elke target-row weet via welke source(s) en
   functie-versie hij is gemaakt; zichtbaar in CocoInsight.

> **Belangrijk:** alleen `@coco.fn`-functies (of `add_source` / built-in
> functies) doen mee met delta-detectie. Bijwerkingen *buiten* de flow
> (random API calls in module-scope, globale state) breken de aannames.

---

## 5. Beperking voor dit project: CocoIndex is Python-only

Deze repo is **Next.js 16 + TypeScript**. CocoIndex bestaat alleen als
**Python-package** (Rust-core onder de motorkap, geen Node-bindings). Je kunt
het dus **niet** importeren in een route handler of server action.

De realistische integratie is een **out-of-process worker-architectuur**:

```
┌────────────────────────┐        ┌──────────────────────────┐        ┌────────────────────┐
│ Tatoeba API / lokale   │  pull  │ CocoIndex Python-service │  push  │ Supabase Postgres  │
│ JSON-dumps             │ ─────► │ (één map, eigen venv)    │ ─────► │  + pgvector tabel  │
└────────────────────────┘        └──────────────────────────┘        └─────────┬──────────┘
                                                                                │ read
                                                                                ▼
                                                                      ┌────────────────────┐
                                                                      │  Next.js (deze     │
                                                                      │  repo) → @supabase │
                                                                      │  /supabase-js      │
                                                                      └────────────────────┘
```

- **CocoIndex doet de zware ETL**: ophalen, chunken, embedden, schrijven
  naar Supabase. Draait als CLI / cron / GitHub Action / Supabase Edge
  Function-trigger.
- **Next.js leest** alleen uit Postgres via de Supabase-client en doet
  pgvector-similarity queries vanaf de server (een route handler in
  `app/api/.../route.ts`).

Voordeel: jouw client-side localStorage + cosine in
`app/dev/tatoeba-audio-search/` kan vervangen worden door één
server-query. Embeddings hoef je niet meer per sessie te genereren.

---

## 6. Concrete implementatie voor de Tatoeba-feature

Doel: alle Tatoeba audio-zinnen (NL/ES) incrementeel ingestien, embedden
met `text-embedding-3-small` (zoals nu al), en in een Supabase-tabel met
pgvector-index zetten — zodat de Next.js app er semantisch in kan zoeken.

### 6.1. Mappenstructuur

Laat de Python-pipeline naast je Next.js-repo leven (los venv, los
deploy-traject). Bijvoorbeeld:

```
aid-language-learner/        ← deze repo (Next.js)
indexer/                     ← nieuwe map, eigen Git-history of submodule
├── pyproject.toml
├── .env                     ← COCOINDEX_DB, SUPABASE_DB_URL, OPENAI_API_KEY
├── main.py                  ← flow-definitie
└── README.md
```

Je kunt het ook *in* deze repo zetten als top-level `indexer/`-map; voeg
het dan toe aan `.gitignore` voor `__pycache__/`, `.venv/` en
`cocoindex.db`.

### 6.2. Python-omgeving

```bash
# In de indexer/ map:
python3.12 -m venv .venv
source .venv/bin/activate
pip install -U cocoindex openai psycopg[binary] python-dotenv
```

- `python3.12 -m venv .venv` — maak virtuele Python-env. `-m venv` runt
  het venv-module, `.venv` is de doelmap.
- `pip install -U cocoindex ...` — `-U` = `--upgrade`, pakt steeds de
  nieuwste versie.

### 6.3. Supabase-tabel + pgvector

Eenmalig in de Supabase SQL editor:

```sql
create extension if not exists vector;

create table if not exists tatoeba_sentences (
  id            bigint primary key,        -- Tatoeba sentence ID
  lang          text   not null,
  text          text   not null,
  audio_url     text,
  attribution   jsonb,                     -- auteur + license
  category      text,
  embedding     vector(512),               -- text-embedding-3-small 512d
  source_hash   text,                      -- voor CocoIndex-lineage debug
  updated_at    timestamptz default now()
);

create index if not exists tatoeba_sentences_embedding_ivfflat
  on tatoeba_sentences using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);
```

### 6.4. CocoIndex flow (`indexer/main.py`)

```python
import os
import httpx
import cocoindex as coco
from cocoindex.connectors import postgres
from openai import OpenAI

_openai = OpenAI()  # leest OPENAI_API_KEY uit env

# Memoized: zolang text + model + dit code-block niet wijzigen,
# hoeft de embedding-call niet opnieuw.
@coco.fn(memo=True)
async def embed_text(text: str) -> list[float]:
    resp = _openai.embeddings.create(
        model="text-embedding-3-small",
        input=text,
        dimensions=512,
    )
    return resp.data[0].embedding

@coco.fn(memo=True)
async def index_sentence(sentence: dict, table) -> None:
    embedding = await embed_text(sentence["text"])
    table.declare_row(
        id=sentence["id"],
        lang=sentence["lang"],
        text=sentence["text"],
        audio_url=sentence.get("audio_url"),
        attribution=sentence.get("attribution"),
        category=sentence.get("category"),
        embedding=embedding,
    )

@coco.fn
async def main(lang: str, page_size: int) -> None:
    # Source: itereer Tatoeba-pagina's. Voor productie kun je dit vervangen
    # door een lokale JSON-dump die je nightly synct.
    async with httpx.AsyncClient() as client:
        sentences: list[dict] = []
        page = 1
        while True:
            r = await client.get(
                "https://tatoeba.org/eng/api_v0/search",
                params={"lang": lang, "page": page, "limit": page_size,
                        "has_audio": "yes"},
            )
            data = r.json().get("results", [])
            if not data:
                break
            sentences.extend(data)
            page += 1
            if page > 20:   # safety cap voor dev
                break

    table = await postgres.mount_table_target(
        os.environ["SUPABASE_DB_URL"],
        table_name="tatoeba_sentences",
        primary_key="id",
    )
    table.declare_vector_index(column="embedding")

    await coco.mount_each(index_sentence,
                          ((s["id"], s) for s in sentences),
                          table)

app = coco.App(
    coco.AppConfig(name="TatoebaIndexer"),
    main,
    lang="spa",
    page_size=100,
)

if __name__ == "__main__":
    app.update_blocking()
```

### 6.5. De pipeline draaien

```bash
# eenmalige backfill
cocoindex update main.py

# of: live-mode, blijft draaien en pakt nieuwe Tatoeba-pagina's op
cocoindex update main.py -L
```

- `cocoindex update main.py` — runt de flow tegen de huidige source-staat.
  Eerste keer: alles. Daarna: alleen veranderde records.
- `-L` = `--live`: blijf draaien en monitor source-changes (CDC waar
  beschikbaar, anders polling).

CocoIndex bewaart zijn delta-state in `COCOINDEX_DB` (zet bijv.
`COCOINDEX_DB=./cocoindex.db` in `.env`). **Deze DB hoort niet in Supabase**
en bevat geen user-data; het is puur het lineage-/cache-grootboek.

### 6.6. Vanuit Next.js queryen

Maak in deze repo een nieuwe route handler die semantisch zoekt via
pgvector — geen client-side cosine meer nodig:

```ts
// app/api/dev/tatoeba-audio-search/semantic/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: Request) {
  const { queryEmbedding, lang, limit = 20 } = await req.json();

  // Roept een Postgres RPC aan die pgvector-similarity doet.
  const { data, error } = await supabase.rpc("match_tatoeba_sentences", {
    query_embedding: queryEmbedding,
    target_lang: lang,
    match_count: limit,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ results: data });
}
```

Bijbehorende SQL-functie:

```sql
create or replace function match_tatoeba_sentences(
  query_embedding vector(512),
  target_lang text,
  match_count int
) returns table (
  id bigint, text text, audio_url text, attribution jsonb,
  category text, similarity float
)
language sql stable as $$
  select id, text, audio_url, attribution, category,
         1 - (embedding <=> query_embedding) as similarity
  from tatoeba_sentences
  where lang = target_lang
  order by embedding <=> query_embedding
  limit match_count;
$$;
```

De bestaande `app/api/dev/tatoeba-audio-search/embed-query/route.ts` blijft
de query embedden (server-side OpenAI), maar geeft het resultaat door aan
deze nieuwe semantische route in plaats van de hele corpus naar de client te
sturen.

---

## 7. Wanneer (niet) inzetten

**Goed passend:**
- Tatoeba/Wikipedia/PDF-bibliotheken die periodiek groeien.
- Embeddings die duur zijn om opnieuw te genereren (OpenAI/voice).
- Knowledge graphs uit transcripts (Spaans-NL voorbeeldzinnen → entiteiten).
- LLM-extractie (categorie-tagging van zinnen) die je niet bij elke deploy
  wilt herhalen.

**Overkill / niet passend:**
- 50 oefeningen die handmatig zijn ingevoerd — gewoon Supabase-rows.
- Realtime user-input (chat, antwoorden) — dat is OLTP, geen ETL.
- Pure frontend-state (zoals jullie huidige localStorage-cache van een
  query-result).

---

## 8. Roadmap voor deze repo

Concrete volgorde als je CocoIndex wilt integreren:

1. **Bewijs-van-werking lokaal** — installeer CocoIndex in een losse map,
   draai de quickstart (PDF → Markdown). Niet integreren, gewoon voelen.
2. **`indexer/`-map aanmaken** in deze repo (of als submodule), `.gitignore`
   voor `cocoindex.db`, `.venv/`, `__pycache__/`.
3. **Supabase-tabel + pgvector-extensie** aanmaken (SQL hierboven). Voeg de
   migratie toe aan je Supabase-migrations-flow.
4. **`indexer/main.py`** schrijven zoals in §6.4, beginnen met 100 zinnen
   (`page_size=100, page<=1`) om kosten te beperken.
5. **`cocoindex update main.py`** draaien, output in Supabase verifiëren.
6. **Next.js route handler** + SQL-functie zoals in §6.6 toevoegen.
7. **Bestaande `audio-search-page.tsx` aanpassen**: client-cosine vervangen
   door fetch naar `/api/dev/tatoeba-audio-search/semantic`.
8. **Scheduling**: zet `cocoindex update main.py` als nightly cron (GitHub
   Action of Supabase pg_cron + Edge Function die de Python-job triggert).
9. **Categorisatie-stap** toevoegen (de "Admin-knop" uit IDEEFASE §TODO):
   in dezelfde flow een `@coco.fn(memo=True)` die per zin via OpenAI een
   categorie kiest uit bestaande Supabase-categorieën.

---

## 9. Verder lezen

- **Overview & mental model** — <https://cocoindex.io/docs/getting_started/overview/>
- **Quickstart (5 min, PDF → Markdown)** — <https://cocoindex.io/docs/getting_started/quickstart/>
- **Installatie + system requirements** — <https://cocoindex.io/docs/getting_started/installation/>
- **20+ voorbeelden** — <https://github.com/cocoindex-io/cocoindex/tree/main/examples>
- **LanceDB + CocoIndex blog (multimodal text+image flow)** —
  <https://www.lancedb.com/blog/keep-your-data-fresh-with-cocoindex-and-lancedb>
- **AI-coding-agent skill** (laat je agent v1-code correct schrijven) —
  zie `skills/cocoindex/` in de repo.
