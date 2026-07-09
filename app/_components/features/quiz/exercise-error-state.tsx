import Link from "next/link";

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
        <p className="font-medium text-foreground">{message}</p>
        <Link
          href="/oefeningen/generator"
          className="inline-flex h-9 items-center rounded-md bg-accent px-3 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90"
        >
          Naar de oefeningen-generator
        </Link>
      </div>
    );
  }
  return (
    <div className="space-y-3 text-sm">
      <p className="font-medium text-destructive">Kon geen oefening laden.</p>
      <p className="font-mono text-xs text-muted-foreground">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex h-9 cursor-pointer items-center rounded-md border border-input bg-background px-3 text-sm hover:bg-muted"
      >
        Opnieuw proberen
      </button>
    </div>
  );
}
