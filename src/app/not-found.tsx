import Link from "next/link";

import { Container } from "@/app/_components/ui/container";

export default function NotFound() {
  return (
    <Container
      width="sm"
      className="flex flex-1 flex-col items-center justify-center gap-6 py-24 text-center"
    >
      <div className="space-y-2">
        <p className="text-muted-foreground text-sm font-medium">404</p>
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">
          Pagina niet gevonden
        </h1>
        <p className="text-muted-foreground text-sm">
          De pagina die je zoekt bestaat niet (meer) of is verplaatst.
        </p>
      </div>
      <Link
        href="/"
        className="bg-accent text-accent-foreground inline-flex min-h-11 items-center justify-center rounded-md px-5 text-sm font-medium transition-colors hover:opacity-90"
      >
        Terug naar startpagina
      </Link>
    </Container>
  );
}
