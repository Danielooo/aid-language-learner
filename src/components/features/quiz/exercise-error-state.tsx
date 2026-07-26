import Link from "next/link";

import { APP_ROUTES } from "@/lib/routes";

type ExerciseErrorStateProps = {
  message: string;
  status: number | null;
  onRetry: () => void;
};

export function ExerciseErrorState({
  message,
  status,
  onRetry,
}: ExerciseErrorStateProps) {
  // 404 op een lege tabel is geen "fout" maar een onboarding-moment:
  // verwijs door naar de generator zodat er überhaupt rijen bestaan.
  if (status === 404) {
    return (
      <div className="space-y-3 text-sm">
        <p className="text-foreground font-medium">{message}</p>
        <Link
          href={APP_ROUTES.generator}
          className="bg-accent text-accent-foreground hover:bg-accent/90 inline-flex h-9 items-center rounded-md px-3 text-sm font-medium transition-colors"
        >
          Naar de generator
        </Link>
      </div>
    );
  }
  return (
    <div className="space-y-3 text-sm">
      <p className="text-destructive font-medium">Kon geen oefening laden.</p>
      <p className="text-muted-foreground font-mono text-xs">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="border-input bg-background hover:bg-muted inline-flex h-9 cursor-pointer items-center rounded-md border px-3 text-sm"
      >
        Opnieuw proberen
      </button>
    </div>
  );
}
