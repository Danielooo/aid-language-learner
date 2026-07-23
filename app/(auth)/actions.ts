"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getHomeRoute } from "@/lib/auth/home-route";
import { isUserBanned } from "@/lib/auth/is-banned";
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

function sanitizeNextPath(
  value: FormDataEntryValue | string | null,
  fallback: string = APP_ROUTES.oefenen,
): string {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) {
    return fallback;
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

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("ban") || msg.includes("deactivat")) {
      return {
        ok: false,
        error: "Dit account is gedeactiveerd.",
      };
    }
    return {
      ok: false,
      error: "Gebruikersnaam of wachtwoord onjuist.",
    };
  }

  if (isUserBanned(data.user)) {
    await supabase.auth.signOut();
    return {
      ok: false,
      error: "Dit account is gedeactiveerd.",
    };
  }

  revalidatePath("/", "layout");
  redirect(sanitizeNextPath(formData.get("next"), getHomeRoute(data.user)));
}

export async function signOut(): Promise<void> {
  const supabase = await getSupabaseServerClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
