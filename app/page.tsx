import Link from "next/link";
import { redirect } from "next/navigation";

import { SiteHeaderServer } from "@/app/_components/site-header-server";
import { Container } from "@/app/_components/ui/container";
import { APP_ROUTES } from "@/lib/routes";
import { getSupabaseServerClient } from "@/lib/supabase/server";

// Publieke landingspagina. Ingelogde gebruikers gaan direct door naar
// de app (/oefenen) — de landing is alleen voor bezoekers.
export default async function Home() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(APP_ROUTES.oefenen);
  }

  return (
    <>
      <SiteHeaderServer />
      <main className="flex-1">
        <Container className="flex flex-col gap-16 py-16 sm:py-24">
          <section className="mx-auto max-w-2xl space-y-6 text-center">
            <p className="text-sm font-medium uppercase tracking-wide text-accent">
              Spaans leren die blijft hangen
            </p>
            <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              Leer Spaans met zinnen die{" "}
              <span className="text-accent">jij</span> nodig hebt
            </h1>
            <p className="text-base text-muted-foreground sm:text-lg">
              Genereer oefenzinnen met AI voor jouw situaties — het restaurant,
              de garage, het station. Oefen met flashcards, typen en sorteren,
              en onthoud alles dankzij spaced repetition.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href={APP_ROUTES.register}
                className="inline-flex min-h-12 items-center rounded-md bg-accent px-6 text-base font-medium text-accent-foreground transition-colors hover:bg-accent/90"
              >
                Begin gratis
              </Link>
              <Link
                href={APP_ROUTES.login}
                className="inline-flex min-h-12 items-center rounded-md border border-border bg-background px-6 text-base font-medium text-foreground transition-colors hover:bg-muted"
              >
                Inloggen
              </Link>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              title="Jouw zinnen, door AI"
              description="Vraag om zinnen voor elke situatie en de AI-generator maakt Spaans-Nederlandse oefeningen op maat, inclusief alternatieve vertalingen."
            />
            <FeatureCard
              title="Drie oefenvormen"
              description="Flashcards om te herkennen, typen om actief te produceren en sorteren om zinsbouw te trainen — elk traint een andere vaardigheid."
            />
            <FeatureCard
              title="Spaced repetition"
              description="Elke zin wordt precies op het juiste moment herhaald: eerst na minuten, daarna dagen, weken en maanden. Zo blijft het hangen."
            />
            <FeatureCard
              title="AI-hulp tijdens het oefenen"
              description="Loop je vast? Vraag de ingebouwde chat om een hint of uitleg over grammatica — zonder dat het antwoord wordt weggegeven."
            />
          </section>

          <section className="mx-auto max-w-2xl space-y-4 text-center">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              Zo werkt het
            </h2>
            <ol className="space-y-3 text-left text-sm text-muted-foreground">
              <StepItem index={1}>
                Kies of genereer topics die bij jouw leven passen — van
                boodschappen doen tot een sollicitatiegesprek.
              </StepItem>
              <StepItem index={2}>
                Oefen de zinnen met flashcards, typen of sorteren. Audio van
                moedertaalsprekers helpt met uitspraak.
              </StepItem>
              <StepItem index={3}>
                Kom dagelijks terug voor je herhalingen. Het schema plant elke
                zin op het moment dat je &apos;m bijna zou vergeten.
              </StepItem>
            </ol>
            <Link
              href={APP_ROUTES.register}
              className="inline-flex min-h-11 items-center rounded-md bg-accent px-5 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90"
            >
              Maak een account
            </Link>
          </section>
        </Container>
      </main>
    </>
  );
}

function FeatureCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <article className="rounded-2xl border border-border bg-card p-6 text-card-foreground">
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </article>
  );
}

function StepItem({
  index,
  children,
}: {
  index: number;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-3 rounded-xl border border-border bg-card p-4">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
        {index}
      </span>
      <span>{children}</span>
    </li>
  );
}
