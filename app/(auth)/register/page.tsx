import { redirect } from "next/navigation";

import { AuthForm } from "@/app/(auth)/_components/auth-form";
import { signUp } from "@/app/(auth)/actions";
import { getSupabaseServerClient } from "@/lib/supabase/server";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Account aanmaken",
};

export default async function RegisterPage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dev/dashboard");

  return <AuthForm mode="signup" action={signUp} />;
}
