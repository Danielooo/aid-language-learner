import Link from "next/link";

export default function DevIndexPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          API-playground
        </h1>
        <p className="text-sm text-muted-foreground">
          Verken live de twee externe API&apos;s die de basis vormen voor de
          AI-feature: Tatoeba (voorbeeldzinnen) en Wiktionary (definities).
        </p>
      </header>

      <ul className="grid gap-3">
        <li>
          <Link
            href="/dev/tatoeba"
            className="block rounded-lg border border-border bg-card p-5 text-card-foreground transition-colors hover:border-ring"
          >
            <h2 className="text-base font-semibold">Tatoeba</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Zinnen-corpus met vertalingen. Filter op brontaal, vereiste
              vertaling, tag en zoekterm.
            </p>
          </Link>
        </li>

        <li>
          <Link
            href="/dev/tatoeba-quiz"
            className="block rounded-lg border border-border bg-card p-5 text-card-foreground transition-colors hover:border-ring"
          >
            <h2 className="text-base font-semibold">Tatoeba-quiz</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Random Spaanse zin vertalen naar het Nederlands. Lenient
              vergelijking (hoofdletters/leestekens negeren), score en
              historie in localStorage.
            </p>
          </Link>
        </li>
        <li>
          <Link
            href="/dev/wiktionary"
            className="block rounded-lg border border-border bg-card p-5 text-card-foreground transition-colors hover:border-ring"
          >
            <h2 className="text-base font-semibold">Wiktionary</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Definities per taal-sectie. Toont de ruwheid (HTML, coverage-gaps)
              die de AI moet interpreteren.
            </p>
          </Link>
        </li>
        <li>
          <Link
            href="/dev/wiktionary-chat"
            className="block rounded-lg border border-border bg-card p-5 text-card-foreground transition-colors hover:border-ring"
          >
            <h2 className="text-base font-semibold">Wiktionary-chatbot</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Vercel AI SDK demo (les 11). Stelt vragen over één woord;
              Wiktionary-data wordt vooraf in de system prompt geplakt.
              Inclusief raw-JSON debug-panels.
            </p>
          </Link>
        </li>
        <li>
          <Link
            href="/dev/exercise-generator"
            className="block rounded-lg border border-border bg-card p-5 text-card-foreground transition-colors hover:border-ring"
          >
            <h2 className="text-base font-semibold">Oefeningen-generator</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Vercel AI SDK met tool-calling. Vraag de chatbot om N
              Spaans→Nederlands vertaalzinnen voor een onderwerp; review en
              persist naar Supabase. Vier debug-panels: in/uit voor zowel
              OpenAI als Supabase.
            </p>
          </Link>
        </li>
        <li>
          <Link
            href="/dev/exercise-generator-quiz"
            className="block rounded-lg border border-border bg-card p-5 text-card-foreground transition-colors hover:border-ring"
          >
            <h2 className="text-base font-semibold">
              Oefeningen-generator-quiz
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Quiz op je gegenereerde oefeningen uit Supabase. Topic-filter,
              lenient vergelijking, score en historie in localStorage.
            </p>
          </Link>
        </li>
        <li>
          <Link
            href="/dev/dashboard"
            className="block rounded-lg border border-border bg-card p-5 text-card-foreground transition-colors hover:border-ring"
          >
            <h2 className="text-base font-semibold">Dashboard</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Prestatie-overzicht op basis van je oefen-historie uit de
              generator-quiz: totalen, accuracy per topic, zwakke oefeningen
              en een 7-daagse trend.
            </p>
          </Link>
        </li>
      </ul>
    </div>
  );
}
