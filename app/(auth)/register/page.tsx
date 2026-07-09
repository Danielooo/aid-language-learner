import { redirect } from "next/navigation";

import { AuthForm } from "@/app/(auth)/_components/auth-form";
import { signUp } from "@/app/(auth)/actions";
import { auth0 } from "@/lib/auth0";
import { APP_ROUTES } from "@/lib/routes";

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

  const session = await auth0.getSession();
  if (session) redirect(APP_ROUTES.oefenen);

  return <AuthForm mode="signup" action={signUp} next={next} />;
}
