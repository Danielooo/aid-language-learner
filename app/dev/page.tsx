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

      <ul className="grid gap-3 sm:grid-cols-2">
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
      </ul>
    </div>
  );
}
