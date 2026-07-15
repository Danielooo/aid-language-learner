import { redirect } from "next/navigation";

import { AuthForm } from "@/app/(auth)/_components/auth-form";
import { signIn } from "@/app/(auth)/actions";
import { getHomeRoute } from "@/lib/auth/home-route";
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
  if (user) redirect(getHomeRoute(user));

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
