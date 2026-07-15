"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getPasswordSchema } from "@/lib/auth/password-policy";
import { usernameToEmail } from "@/lib/auth/username";
import { APP_ROUTES } from "@/lib/routes";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

import type { AuthActionState } from "@/app/(auth)/_lib/state";

// Server Actions voor auth-flows. Houden Supabase Auth + cookies aan
// de server-zijde (geen tokens in de client-bundle), valideren input
// met Zod en geven typeerbare fouten terug aan `useActionState`.
//
// Synthetisch e-mailadres `<username>@aid.local` zorgt dat we met een
// pure username-UX kunnen werken zonder echte e-mail.
//
// Bij signUp gebruiken we `auth.admin.createUser({ email_confirm: true })`
// in plaats van het reguliere `auth.signUp` — synthetische e-mailadressen
// kunnen geen confirmation-mail ontvangen. Username gaat mee als
// `user_metadata.username` → komt via de `handle_new_user`-trigger in
// `public.profiles.username`.

const usernameSchema = z
  .string()
  .trim()
  .min(2, "Minimaal 2 tekens")
  .max(32, "Maximaal 32 tekens")
  .regex(/^[a-zA-Z0-9_-]+$/, "Alleen letters, cijfers, _ en - toegestaan");

const credentialsSchema = z.object({
  username: usernameSchema,
  password: getPasswordSchema(),
});

function sanitizeNextPath(value: FormDataEntryValue | string | null): string {
  if (typeof value !== "string") return APP_ROUTES.oefenen;
  if (!value.startsWith("/") || value.startsWith("//")) {
    return APP_ROUTES.oefenen;
  }
  return value;
}

export async function signUp(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = credentialsSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const fieldErrors: AuthActionState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (key === "username" || key === "password") {
        fieldErrors[key] = issue.message;
      }
    }
    return { ok: false, fieldErrors };
  }

  const { username, password } = parsed.data;
  const email = usernameToEmail(username);

  const admin = getSupabaseAdmin();
  const { error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username },
  });

  if (createError) {
    const msg = createError.message.toLowerCase();
    return {
      ok: false,
      error:
        msg.includes("already") || msg.includes("registered")
          ? "Deze username is al in gebruik."
          : createError.message,
    };
  }

  const supabase = await getSupabaseServerClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    return {
      ok: false,
      error: "Account aangemaakt, maar inloggen mislukte. Probeer login.",
    };
  }

  revalidatePath("/", "layout");
  redirect(sanitizeNextPath(formData.get("next")));
}

export async function signIn(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = credentialsSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { ok: false, error: "Vul username en wachtwoord in." };
  }

  const { username, password } = parsed.data;
  const email = usernameToEmail(username);
  const supabase = await getSupabaseServerClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return {
      ok: false,
      error: "Username of wachtwoord onjuist.",
    };
  }

  revalidatePath("/", "layout");
  redirect(sanitizeNextPath(formData.get("next")));
}

const oauthProviderSchema = z.enum(["google", "github"]);

export type OAuthProvider = z.infer<typeof oauthProviderSchema>;

/**
 * Start de OAuth-flow (PKCE) via Supabase. De SSR-client zet de
 * code-verifier-cookie; de provider stuurt de gebruiker terug naar
 * /auth/callback waar de code voor een sessie wordt ingewisseld.
 */
export async function signInWithOAuthProvider(
  formData: FormData,
): Promise<void> {
  const parsed = oauthProviderSchema.safeParse(formData.get("provider"));
  if (!parsed.success) redirect(APP_ROUTES.login);

  const next = sanitizeNextPath(formData.get("next"));

  const headerStore = await headers();
  const origin =
    headerStore.get("origin") ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "http://localhost:3000";

  const supabase = await getSupabaseServerClient();
  const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(next)}`;
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: parsed.data,
    options: { redirectTo },
  });

  if (error || !data.url) {
    redirect(`${APP_ROUTES.login}?fout=oauth`);
  }

  redirect(data.url);
}

export async function signOut(): Promise<void> {
  const supabase = await getSupabaseServerClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
