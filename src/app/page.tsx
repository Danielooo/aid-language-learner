import Link from "next/link";

import { SiteHeaderServer } from "@/components/site-header-server";
import { Container } from "@/components/ui/container";
import { getHomeRoute } from "@/lib/auth/home-route";
import { isAdminUser } from "@/lib/auth/is-admin";
import { APP_ROUTES } from "@/lib/routes";
import { getSupabaseServerClient } from "@/lib/supabase/server";

// Publieke About-pagina. Gasten en ingelogde gebruikers kunnen `/`
// bezoeken; post-login landt elders via getHomeRoute.
export default async function Home() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const homeHref = user ? getHomeRoute(user) : null;
  const homeLabel = user
    ? isAdminUser(user)
      ? "Naar beheer"
      : "Naar oefenen"
    : null;

  return (
    <>
      <SiteHeaderServer />
      <main className="flex-1">
        <Container className="flex flex-col gap-16 py-16 sm:py-24">
          <section className="mx-auto max-w-2xl space-y-6 text-center">
            <h1 className="text-foreground text-4xl font-semibold tracking-tight sm:text-5xl">
              Language Learner
            </h1>
            <p className="text-foreground text-lg font-medium tracking-tight sm:text-xl">
              Leer Spaans met zinnen die{" "}
              <span className="text-accent">jij</span> nodig hebt
            </p>
            <p className="text-muted-foreground text-base sm:text-lg">
              Genereer oefenzinnen met AI voor jouw situaties — het restaurant,
              de garage, het station. Oefen met flashcards, sorteren en typen,
              en onthoud alles dankzij spaced repetition.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {homeHref && homeLabel ? (
                <Link
                  href={homeHref}
                  className="bg-accent text-accent-foreground hover:bg-accent/90 inline-flex min-h-12 items-center rounded-md px-6 text-base font-medium transition-colors"
                >
                  {homeLabel}
                </Link>
              ) : (
                <Link
                  href={APP_ROUTES.login}
                  className="border-border bg-background text-foreground hover:bg-muted inline-flex min-h-12 items-center rounded-md border px-6 text-base font-medium transition-colors"
                >
                  Inloggen
                </Link>
              )}
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              title="Jouw zinnen, door AI"
              description="Vraag om zinnen voor elke situatie en de AI-generator maakt Spaans-Nederlandse oefeningen op maat, inclusief alternatieve vertalingen."
            />
            <FeatureCard
              title="Drie oefenvormen"
              description="Flashcards om te herkennen, sorteren om zinsbouw te trainen en typen om actief te produceren — elk traint een andere vaardigheid."
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
            <h2 className="text-foreground text-2xl font-semibold tracking-tight">
              Zo werkt het
            </h2>
            <ol className="text-muted-foreground space-y-3 text-left text-sm">
              <StepItem index={1}>
                Kies of genereer topics die bij jouw leven passen — van
                boodschappen doen tot een sollicitatiegesprek.
              </StepItem>
              <StepItem index={2}>
                Oefen de zinnen met flashcards, sorteren of typen. Audio van
                moedertaalsprekers helpt met uitspraak.
              </StepItem>
              <StepItem index={3}>
                Kom dagelijks terug voor je herhalingen. Het schema plant elke
                zin op het moment dat je &apos;m bijna zou vergeten.
              </StepItem>
            </ol>
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
    <article className="border-border bg-card text-card-foreground rounded-2xl border p-6">
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="text-muted-foreground mt-2 text-sm">{description}</p>
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
    <li className="border-border bg-card flex gap-3 rounded-xl border p-4">
      <span className="bg-accent text-accent-foreground flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
        {index}
      </span>
      <span>{children}</span>
    </li>
  );
}
