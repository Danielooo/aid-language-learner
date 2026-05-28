import { ThemeToggle } from "@/app/_components/ui/theme-toggle";
import { Container } from "@/app/_components/ui/container";

export default function Home() {
  return (
    <Container className="flex flex-1 flex-col gap-12 py-16">
      <header className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            Eindopdracht AI Developer
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            AID Language Learner
          </h1>
        </div>
        <ThemeToggle />
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        <article className="rounded-lg border border-border bg-card p-6 text-card-foreground">
          <h2 className="text-base font-semibold">Design-tokens</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Semantische OKLCH-tokens (background, foreground, card, muted,
            accent, border, ring, destructive) — schakelen via class{" "}
            <code className="font-mono text-xs">dark</code>.
          </p>
        </article>
        <article className="rounded-lg border border-border bg-card p-6 text-card-foreground">
          <h2 className="text-base font-semibold">Mobile-first</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Tailwind <code className="font-mono text-xs">sm: md: lg:</code> zijn
            min-width. Container-primitive cap't breedte; padding loopt mee.
          </p>
        </article>
        <article className="rounded-lg border border-border bg-card p-6 text-card-foreground">
          <h2 className="text-base font-semibold">Accent &amp; focus</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            <span className="inline-block size-4 rounded-sm bg-accent align-middle" />{" "}
            <span className="align-middle">
              Tab door deze pagina om de focus-ring te zien.
            </span>
          </p>
        </article>
        <article className="rounded-lg border border-border bg-card p-6 text-card-foreground">
          <h2 className="text-base font-semibold">Volgende stap</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Casus definitief maken, daarna Supabase + Vercel AI SDK.
          </p>
        </article>
      </section>
    </Container>
  );
}
