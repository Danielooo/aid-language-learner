import { redirect } from "next/navigation";

import { AuthForm } from "@/app/(auth)/_components/auth-form";
import { signUp } from "@/app/(auth)/actions";
import { APP_ROUTES } from "@/lib/routes";
import { getSupabaseServerClient } from "@/lib/supabase/server";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Account aanmaken",
};

type RegisterPageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function RegisterPage({
  searchParams,
}: RegisterPageProps) {
  const { next } = await searchParams;

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect(APP_ROUTES.vandaag);

  return <AuthForm mode="signup" action={signUp} next={next} />;
}
