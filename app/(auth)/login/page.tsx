import { redirect } from "next/navigation";

import { AuthForm } from "@/app/(auth)/_components/auth-form";
import { signIn } from "@/app/(auth)/actions";
import { auth0 } from "@/lib/auth0";
import { APP_ROUTES } from "@/lib/routes";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Inloggen",
};

type LoginPageProps = {
  searchParams: Promise<{ next?: string; fout?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next, fout } = await searchParams;

  const session = await auth0.getSession();
  if (session) redirect(APP_ROUTES.oefenen);

  return (
    <AuthForm
      mode="signin"
      action={signIn}
      next={next}
      externalError={
        fout === "oauth"
          ? "Inloggen via de provider is niet gelukt. Probeer opnieuw of log in met je username."
          : undefined
      }
    />
  );
}
