// Download-proxy. Streamt een Tatoeba-audio via deze server naar de
// browser met een gedwongen Content-Disposition: attachment-header en
// een nette bestandsnaam.
//
// Waarom een proxy en niet `<a href download>` direct op de bron-URL?
// Het HTML `download`-attribuut wordt door browsers genegeerd voor
// cross-origin URL's (security): klikken op zo'n link navigeert dan in
// plaats van te downloaden. Door via onze eigen origin te streamen
// (same-origin t.o.v. de pagina) eerbiedigt de browser het attribuut wel.
//
// Daarnaast geeft tatoeba.org/audio/download/{id} al een nette
// attachment-filename, maar audio.tatoeba.org/sentences/...mp3 doet dat
// niet — onze proxy normaliseert dat naar één voorspelbare filename.

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const ALLOWED_HOSTS = new Set([
  "audio.tatoeba.org",
  "api.tatoeba.org",
  "tatoeba.org",
]);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rawUrl = searchParams.get("url");
  const filename = sanitizeFilename(
    searchParams.get("filename") ?? "tatoeba-audio.mp3",
  );

  if (!rawUrl) {
    return Response.json(
      { ok: false, error: "Parameter 'url' is verplicht." },
      { status: 400 },
    );
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    return Response.json(
      { ok: false, error: "Ongeldige URL." },
      { status: 400 },
    );
  }

  // Veiligheid: alleen Tatoeba-hosts mogen door deze proxy. Anders is
  // dit een open relay waar iemand willekeurige content via onze server
  // kan tunnelen.
  if (parsedUrl.protocol !== "https:") {
    return Response.json(
      { ok: false, error: "Alleen https URL's toegestaan." },
      { status: 400 },
    );
  }
  if (!ALLOWED_HOSTS.has(parsedUrl.hostname)) {
    return Response.json(
      {
        ok: false,
        error: `Host '${parsedUrl.hostname}' staat niet op de whitelist.`,
      },
      { status: 403 },
    );
  }

  let upstream: Response;
  try {
    upstream = await fetch(parsedUrl.toString(), {
      cache: "no-store",
      redirect: "follow",
    });
  } catch (e) {
    return Response.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "Upstream-fetch faalde.",
      },
      { status: 502 },
    );
  }

  if (!upstream.ok || !upstream.body) {
    return Response.json(
      {
        ok: false,
        error: `Upstream gaf HTTP ${upstream.status} terug.`,
        upstream_status: upstream.status,
        upstream_content_type: upstream.headers.get("content-type"),
      },
      { status: upstream.status },
    );
  }

  // Headers normaliseren: altijd attachment + onze filename. Content-
  // Length doorzetten als upstream 'm geeft (kan ontbreken bij chunked).
  const headers = new Headers({
    "Content-Type": upstream.headers.get("content-type") ?? "audio/mpeg",
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Cache-Control": "no-store",
  });
  const upstreamLength = upstream.headers.get("content-length");
  if (upstreamLength) headers.set("Content-Length", upstreamLength);

  return new Response(upstream.body, {
    status: 200,
    headers,
  });
}

// Stripped down: alleen letters, cijfers, punt, koppelteken en underscore.
// Voorkomt header-injection en stomme bestandsnamen.
function sanitizeFilename(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 128);
  return cleaned.length > 0 ? cleaned : "tatoeba-audio.mp3";
}
