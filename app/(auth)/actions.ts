"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createAuth0User } from "@/lib/auth/auth0-management";
import { getPasswordRealmAuthErrorMessage } from "@/lib/auth/auth0-token-errors";
import {
  establishAuth0SessionFromTokens,
  fetchPasswordRealmTokens,
} from "@/lib/auth/establish-auth0-session";
import { getPasswordSchema } from "@/lib/auth/password-policy";
import { usernameToEmail } from "@/lib/auth/username";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { APP_ROUTES } from "@/lib/routes";

import type { AuthActionState } from "@/app/(auth)/_lib/state";

// Server Actions voor auth-flows via Auth0 + Supabase-provisioning.
// Username/wachtwoord: Auth0 Management API (signUp) en password-realm grant (signIn).
// OAuth: Auth0 SDK-routes (/auth/login?connection=...).

const usernameSchema = z
  .string()
  .trim()
  .min(2, "Minimaal 2 tekens")
  .max(32, "Maximaal 32 tekens")
  .regex(/^[a-zA-Z0-9_-]+$/, "Alleen letters, cijfers, _ en - toegestaan");

const passwordSchema = getPasswordSchema();

const credentialsSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
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

  try {
    await createAuth0User({ email, password, username });
  } catch (error) {
    const msg =
      error instanceof Error ? error.message.toLowerCase() : String(error);
    return {
      ok: false,
      error:
        msg.includes("already") || msg.includes("exists")
          ? "Deze username is al in gebruik."
          : error instanceof Error
            ? error.message
            : "Registratie mislukt.",
    };
  }

  let tokenResponse;
  try {
    tokenResponse = await fetchPasswordRealmTokens(email, password);
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Inloggen na registratie mislukt.",
    };
  }

  if (tokenResponse.error || !tokenResponse.id_token) {
    return {
      ok: false,
      error:
        getPasswordRealmAuthErrorMessage(tokenResponse) ??
        "Account aangemaakt, maar inloggen mislukte. Probeer login.",
    };
  }

  try {
    await establishAuth0SessionFromTokens(tokenResponse);
  } catch {
    return {
      ok: false,
      error: "Account aangemaakt, maar sessie opzetten mislukte. Probeer login.",
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

  let tokenResponse;
  try {
    tokenResponse = await fetchPasswordRealmTokens(email, password);
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Inloggen mislukt. Probeer opnieuw.",
    };
  }

  if (tokenResponse.error || !tokenResponse.id_token) {
    return {
      ok: false,
      error:
        getPasswordRealmAuthErrorMessage(tokenResponse) ??
        "Username of wachtwoord onjuist.",
    };
  }

  try {
    await establishAuth0SessionFromTokens(tokenResponse);
  } catch {
    return {
      ok: false,
      error: "Inloggen mislukt. Probeer het opnieuw.",
    };
  }

  revalidatePath("/", "layout");
  redirect(sanitizeNextPath(formData.get("next")));
}

export async function signOut(): Promise<void> {
  const supabase = await getSupabaseServerClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/auth/logout");
}
