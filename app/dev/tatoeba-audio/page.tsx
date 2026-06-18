import {
  buildAudioListUrl,
  buildSentenceWithAudioUrl,
  listAudios,
  listSentencesWithAudio,
} from "@/lib/api/tatoeba-audio";

import { AudioTable } from "./_components/audio-table";
import { ResultSections } from "./_components/result-sections";

import type {
  SectionA,
  SectionB,
  SentenceItem,
} from "./_components/result-sections";
import type { UploadDescriptor } from "./_components/types";
import type {
  TatoebaAudioListResponse,
  TatoebaResult,
  TatoebaSentenceListResponse,
  TatoebaSort,
} from "@/lib/api/tatoeba-audio";

// /dev/tatoeba-audio — verkenningspagina voor Tatoeba's audio-API.
//
// Wat deze pagina laat zien (server-side, één request-round):
//   A. GET /unstable/audios?lang=...&limit=...
//      → audio-eerst listing, max ~20 records
//   B. GET /v1/sentences?lang=...&has_audio=yes&include=audios,transcriptions
//         &trans:lang=...&showtrans:lang=...&sort=...&limit=...
//      → zin-eerst, met directe vertalingen en transcriptions[] array
//
// Beide responses worden parallel opgehaald (Promise.all) en de raw JSON
// belandt in de debug-panels onderaan. Per audio is er een "Upload naar
// Supabase"-knop die de /api/dev/tatoeba-audio/upload route triggert.

const LANG_OPTIONS = [
  { value: "spa", label: "Spaans (spa)" },
  { value: "eng", label: "Engels (eng)" },
  { value: "nld", label: "Nederlands (nld)" },
  { value: "fra", label: "Frans (fra)" },
  { value: "deu", label: "Duits (deu)" },
] as const;

const TRANS_OPTIONS = [
  { value: "", label: "Geen" },
  { value: "nld", label: "Nederlands (nld)" },
  { value: "eng", label: "Engels (eng)" },
] as const;

const SORT_OPTIONS: TatoebaSort[] = ["random", "relevance", "created", "words"];

function pickString(
  raw: string | string[] | undefined,
  fallback: string,
): string {
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw) && raw[0]) return raw[0];
  return fallback;
}

function pickOptional(raw: string | string[] | undefined): string | undefined {
  if (typeof raw === "string" && raw !== "") return raw;
  if (Array.isArray(raw) && raw[0]) return raw[0];
  return undefined;
}

type RawSearchParams = { [key: string]: string | string[] | undefined };

export default async function TatoebaAudioPlaygroundPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const raw = await searchParams;
  const lang = pickString(raw.lang, "spa");
  const transLang = pickOptional(raw.trans) ?? "nld";
  const limit = Math.max(1, Math.min(Number(pickString(raw.limit, "20")), 50));
  const sortValue = pickString(raw.sort, "random");
  const sort: TatoebaSort = (SORT_OPTIONS as readonly string[]).includes(
    sortValue,
  )
    ? (sortValue as TatoebaSort)
    : "random";
  const nativeOnly = pickOptional(raw.native) === "yes";

  const hasSubmitted = Object.keys(raw).length > 0;

  // Parallel fetch beide endpoints; vermijdt waterfall in TTFB.
  const [audioResult, sentenceResult] = hasSubmitted
    ? await Promise.all([
        listAudios({ lang, limit }),
        listSentencesWithAudio({
          lang,
          transLang: transLang === "" ? undefined : transLang,
          limit,
          sort,
          nativeOnly,
        }),
      ])
    : [null, null];

  const sectionA = audioResult
    ? buildSectionA(audioResult, { lang, limit })
    : { call: null, items: [] };

  const sectionB = sentenceResult
    ? buildSectionB(sentenceResult, {
        lang,
        transLang,
        limit,
        sort,
        nativeOnly,
      })
    : { call: null, sentences: [] };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Tatoeba audio-playground
        </h1>
        <p className="text-sm text-muted-foreground">
          Verkent wat er mogelijk is met audio-bestanden van Tatoeba: ophalen,
          afspelen, downloaden en doorzetten naar een Supabase-bucket. Toont
          alle JSON-requests en -responses in debug-panels onderaan.
        </p>
      </header>

      <AudioTable />

      <TatoebaAudioForm
        defaults={{ lang, trans: transLang, limit, sort, native: nativeOnly }}
      />

      {hasSubmitted ? (
        <ResultSections sectionA={sectionA} sectionB={sectionB} />
      ) : (
        <p className="rounded-md border border-dashed border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
          Vul het formulier in en klik &quot;Verzenden&quot; — beide endpoints
          worden parallel aangeroepen.
        </p>
      )}

      <FindingsPanel />
    </div>
  );
}

// ── Form ───────────────────────────────────────────────────────────────

type FormDefaults = {
  lang: string;
  trans: string;
  limit: number;
  sort: TatoebaSort;
  native: boolean;
};

function TatoebaAudioForm({ defaults }: { defaults: FormDefaults }) {
  return (
    <form
      method="GET"
      className="grid gap-4 rounded-lg border border-border bg-card p-5 text-card-foreground sm:grid-cols-2"
    >
      <FormField label="Brontaal" name="lang">
        <select
          name="lang"
          defaultValue={defaults.lang}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          {LANG_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="Vertaling-taal (sectie B)" name="trans">
        <select
          name="trans"
          defaultValue={defaults.trans}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          {TRANS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="Limit per sectie (1–50)" name="limit">
        <input
          type="number"
          name="limit"
          min={1}
          max={50}
          defaultValue={defaults.limit}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </FormField>

      <FormField label="Sort (sectie B)" name="sort">
        <select
          name="sort"
          defaultValue={defaults.sort}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </FormField>

      <label className="flex items-center gap-2 text-xs text-muted-foreground sm:col-span-2">
        <input
          type="checkbox"
          name="native"
          value="yes"
          defaultChecked={defaults.native}
          className="h-4 w-4 rounded border-input"
        />
        Alleen zinnen van native speakers (sectie B,{" "}
        <code className="font-mono">is_native=yes</code>)
      </label>

      <div className="flex items-end gap-3 sm:col-span-2">
        <button
          type="submit"
          className="inline-flex h-10 cursor-pointer items-center justify-center rounded-md bg-accent px-4 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90"
        >
          Verzenden
        </button>
        <a
          href="/dev/tatoeba-audio"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Reset
        </a>
      </div>
    </form>
  );
}

function FormField({
  label,
  name,
  children,
}: {
  label: string;
  name: string;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={name} className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

// ── Mappers van API-respons → client-vriendelijke structuur ────────────

function buildSectionA(
  result: TatoebaResult<TatoebaAudioListResponse>,
  params: { lang: string; limit: number },
): SectionA {
  const url = buildAudioListUrl(params);
  const paramsForDebug = {
    lang: params.lang,
    limit: String(params.limit),
  };

  if (!result.ok) {
    return {
      call: {
        url,
        params: paramsForDebug,
        response: result.error,
        ok: false,
      },
      items: [],
    };
  }

  const items = result.data.data.map((audio) => {
    const descriptor: UploadDescriptor = {
      audio_id: audio.id,
      lang: audio.sentence.lang ?? params.lang,
      sentence_id: audio.sentence.id,
      sentence_text: audio.sentence.text,
      license: audio.license ?? "",
      author: audio.author ?? "",
      attribution_url: audio.attribution_url ?? "",
    };
    return {
      descriptor,
      audioMeta: {
        download_url: audio.download_url,
        created: audio.created ?? "",
        modified: audio.modified ?? "",
      },
    };
  });

  return {
    call: { url, params: paramsForDebug, response: result.data, ok: true },
    items,
  };
}

function buildSectionB(
  result: TatoebaResult<TatoebaSentenceListResponse>,
  params: {
    lang: string;
    transLang: string;
    limit: number;
    sort: TatoebaSort;
    nativeOnly: boolean;
  },
): SectionB {
  const url = buildSentenceWithAudioUrl({
    lang: params.lang,
    transLang: params.transLang === "" ? undefined : params.transLang,
    limit: params.limit,
    sort: params.sort,
    nativeOnly: params.nativeOnly,
  });
  const paramsForDebug: Record<string, string> = {
    lang: params.lang,
    has_audio: "yes",
    include: "audios,transcriptions",
    sort: params.sort,
    limit: String(params.limit),
  };
  if (params.transLang) {
    paramsForDebug["trans:lang"] = params.transLang;
    paramsForDebug["trans:has_audio"] = "yes";
    paramsForDebug["showtrans:lang"] = params.transLang;
  }
  if (params.nativeOnly) paramsForDebug.is_native = "yes";

  if (!result.ok) {
    return {
      call: {
        url,
        params: paramsForDebug,
        response: result.error,
        ok: false,
      },
      sentences: [],
    };
  }

  const sentences: SentenceItem[] = result.data.data.map((sentence) => {
    const audios = (sentence.audios ?? []).map((audio) => ({
      descriptor: {
        audio_id: audio.id,
        lang: sentence.lang ?? params.lang,
        sentence_id: sentence.id,
        sentence_text: sentence.text,
        license: audio.license ?? "",
        author: audio.author ?? "",
        attribution_url: audio.attribution_url ?? "",
      } satisfies UploadDescriptor,
      audioMeta: {
        download_url: audio.download_url,
        created: audio.created ?? "",
        modified: audio.modified ?? "",
      },
    }));

    return {
      sentenceId: sentence.id,
      sentenceText: sentence.text,
      lang: sentence.lang ?? params.lang,
      transcriptions: (sentence.transcriptions ?? []).map((t) => ({
        text: t.text,
        script: t.script,
        type: t.type,
      })),
      translations: (sentence.translations ?? []).map((t) => ({
        id: t.id,
        lang: t.lang ?? "",
        text: t.text,
        is_direct: t.is_direct,
        audios: (t.audios ?? []).map((a) => ({
          audio_id: a.id,
          author: a.author,
          license: a.license,
          download_url: a.download_url,
        })),
      })),
      audios,
    };
  });

  return {
    call: { url, params: paramsForDebug, response: result.data, ok: true },
    sentences,
  };
}

// ── Findings: antwoorden op de vragen uit IDEEFASE.md ──────────────────

function FindingsPanel() {
  return (
    <section className="space-y-3 rounded-lg border border-border bg-card p-5 text-card-foreground">
      <h2 className="text-sm font-semibold">
        Bevindingen — wat is er mogelijk met Tatoeba-audio?
      </h2>

      <ul className="space-y-2 text-sm text-muted-foreground">
        <li>
          <strong className="text-foreground">~20 audios ophalen?</strong>{" "}
          Ja. <code className="font-mono">/unstable/audios?lang=spa&limit=20</code>{" "}
          retourneert direct 20 audios + parent-sentence. Voor zin-eerst{" "}
          <code className="font-mono">
            /v1/sentences?has_audio=yes&include=audios,transcriptions
          </code>
          .
        </li>
        <li>
          <strong className="text-foreground">Downloaden + Supabase?</strong>{" "}
          Ja. mp3 binary via{" "}
          <code className="font-mono">/v1/audios/&#123;id&#125;/file</code>{" "}
          (server-side, vanwege CORS én de licentie-gate). Opslag in publieke
          bucket <code className="font-mono">tatoeba-audio</code> met pad{" "}
          <code className="font-mono">
            &#123;lang&#125;/&#123;sentence_id&#125;/&#123;audio_id&#125;.mp3
          </code>
          .
        </li>
        <li>
          <strong className="text-foreground">Transcript in metadata?</strong>{" "}
          Niet als speech-to-text. Het{" "}
          <code className="font-mono">Audio</code>-object heeft alleen{" "}
          <code className="font-mono">id, author, license, attribution_url, download_url, created, modified</code>
          . <strong>De sentence-tekst zelf ís de transcript</strong> — elk
          audio-bestand is een opname van precies één zin uit het corpus.{" "}
          Het veld <code className="font-mono">transcriptions[]</code> bestaat
          wel, maar dat zijn alternatieve schrift-renderingen (pinyin/romaji);
          voor Spaans (Latijns schrift) is dat altijd leeg.
        </li>
        <li>
          <strong className="text-foreground">Licentie?</strong> Drie waarden:{" "}
          <code className="font-mono">CC0 1.0</code>,{" "}
          <code className="font-mono">CC BY 2.0 FR</code>, of leeg (= geen
          hergebruik buiten Tatoeba). De binary-endpoint geeft 403 voor de
          laatste; wij weigeren upload preventief.
        </li>
      </ul>

      <h3 className="pt-2 text-xs font-semibold uppercase tracking-wide text-foreground">
        Extra features mogelijk voor de translation-app
      </h3>
      <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        <li>
          <strong className="text-foreground">Pronunciation playback</strong>:
          ▶-knop op elke oefening-kaart die de Spaanse opname afspeelt. Direct
          via <code className="font-mono">download_url</code> of via de
          Supabase-bucket voor latency-controle.
        </li>
        <li>
          <strong className="text-foreground">Listen-and-type / dictation</strong>:
          quiz-modus waarin de user de zin hoort en intypt; lenient-compare
          (zelfde util als de generator-quiz) zorgt voor coulante scoring.
        </li>
        <li>
          <strong className="text-foreground">Native-speaker filter</strong>:
          door <code className="font-mono">is_native=yes</code> op{" "}
          <code className="font-mono">/v1/sentences</code> blijven alleen
          opnames van zelf-geïdentificeerde moedertaalsprekers over —
          kwaliteitssignaal voor je oefenmateriaal.
        </li>
        <li>
          <strong className="text-foreground">Exercises verrijken</strong>:
          batch-job die voor bestaande{" "}
          <code className="font-mono">exercises.source_text</code> een
          matchende zin in Tatoeba zoekt (via{" "}
          <code className="font-mono">q=...&has_audio=yes</code>) en de
          audio-url linkt. Past in de admin-knop uit{" "}
          <code className="font-mono">IDEEFASE.md</code>.
        </li>
        <li>
          <strong className="text-foreground">LLM tool-call</strong>:{" "}
          <code className="font-mono">findSentencesWithAudio(topic, n)</code>{" "}
          in de exercise-generator chat zodat AI-oefeningen meteen audio
          erbij krijgen i.p.v. tekst-only.
        </li>
        <li>
          <strong className="text-foreground">Tags &amp; categorieën</strong>:{" "}
          <code className="font-mono">tag=food</code> of{" "}
          <code className="font-mono">tag=travel</code> levert al een
          natuurlijke onderwerp-indeling die past op de topics van de
          generator.
        </li>
      </ul>

      <p className="text-[10px] text-muted-foreground/70">
        Bronnen:{" "}
        <a
          className="underline"
          href="https://api.tatoeba.org/openapi"
          target="_blank"
          rel="noreferrer"
        >
          api.tatoeba.org/openapi
        </a>{" "}
        ·{" "}
        <a
          className="underline"
          href="https://tatoeba.org/en/downloads"
          target="_blank"
          rel="noreferrer"
        >
          tatoeba.org/downloads
        </a>
      </p>
    </section>
  );
}
