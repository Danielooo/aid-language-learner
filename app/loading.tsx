import { Container } from "@/app/_components/ui/container";

export default function Loading() {
  return (
    <Container
      width="sm"
      className="flex flex-1 items-center justify-center py-24"
    >
      <div
        role="status"
        aria-label="Bezig met laden"
        className="border-muted border-t-accent size-10 animate-spin rounded-full border-2"
      />
    </Container>
  );
}
