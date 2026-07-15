import { redirect } from "next/navigation";

import { AuthForm } from "@/app/(auth)/_components/auth-form";
import { signIn } from "@/app/(auth)/actions";
import { APP_ROUTES } from "@/lib/routes";
import { getSupabaseServerClient } from "@/lib/supabase/server";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Inloggen",
};

type LoginPageProps = {
  searchParams: Promise<{ next?: string; fout?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next, fout } = await searchParams;

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect(APP_ROUTES.oefenen);

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
