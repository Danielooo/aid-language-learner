import Link from "next/link";

import { APP_ROUTES } from "@/lib/routes";

type QuizSubPageMetaProps = {
  escHint: string;
};

export function QuizSubPageMeta({ escHint }: QuizSubPageMetaProps) {
  return (
    <>
      <Link
        href={APP_ROUTES.oefenen}
        className="underline hover:text-foreground"
      >
        ← Oefenen
      </Link>
      <span aria-hidden>·</span>
      <span>{escHint}</span>
    </>
  );
}
