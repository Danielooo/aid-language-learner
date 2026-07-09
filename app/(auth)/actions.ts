"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { APP_ROUTES } from "@/lib/routes";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

import type { AuthActionState } from "@/app/(auth)/_lib/state";

// Server Actions voor auth-flows. Houden Supabase Auth + cookies aan
// de server-zijde (geen tokens in de client-bundle), valideren input
// met Zod en geven typeerbare fouten terug aan `useActionState`.
//
// Synthetisch e-mailadres `<username>@aid.local` zorgt dat we met een
// pure username-UX kunnen werken zonder echte e-mail. De domeinkeus
// `aid.local` is bewust een privé/non-routable TLD; geen mailserver.
//
// Bij signUp gebruiken we `auth.admin.createUser({ email_confirm: true })`
// in plaats van het reguliere `auth.signUp` — synthetische e-mailadressen
// kunnen geen confirmation-mail ontvangen, dus zonder dit zou de user
// nooit ingelogd kunnen raken (afhankelijk van de project-config).
// Daarna loggen we in met de SSR-client zodat de session-cookie wordt
// gezet. Username gaat mee als `user_metadata.username` → komt via de
// `handle_new_user`-trigger in `public.profiles.username`.

const usernameSchema = z
  .string()
  .trim()
  .min(2, "Minimaal 2 tekens")
  .max(32, "Maximaal 32 tekens")
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    "Alleen letters, cijfers, _ en - toegestaan",
  );

const passwordSchema = z
  .string()
  .min(6, "Minimaal 6 tekens");

const credentialsSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
});

// `aid.local` is een non-routable privé-domein zodat synthetic emails
// nooit per ongeluk een echte mailserver raken. Lowercase houden voor
// consistente lookup; Supabase Auth normaliseert e-mail anders zelf
// ook al, maar expliciet is hier veiliger.
function usernameToEmail(username: string): string {
  return `${username.toLowerCase()}@aid.local`;
}

// Alleen interne paden toestaan als post-login-redirect; voorkomt open
// redirects via `?next=https://evil.example`.
function sanitizeNextPath(value: FormDataEntryValue | string | null): string {
  if (typeof value !== "string") return APP_ROUTES.vandaag;
  if (!value.startsWith("/") || value.startsWith("//")) {
    return APP_ROUTES.vandaag;
  }
  return value;
}

export async function signUp(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const rawUsername = formData.get("username");
  const rawPassword = formData.get("password");
  const parsed = credentialsSchema.safeParse({
    username: rawUsername,
    password: rawPassword,
  });

  // #region agent log
  fetch("http://127.0.0.1:7865/ingest/0922b9b0-9fbf-4ddb-a3a6-2516b9e67588", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "618d0e",
    },
    body: JSON.stringify({
      sessionId: "618d0e",
      runId: "pre-fix",
      hypothesisId: "A",
      location: "actions.ts:signUp:parse",
      message: "signUp input parsed",
      data: {
        hasUsername: typeof rawUsername === "string" && rawUsername.length > 0,
        usernameLen:
          typeof rawUsername === "string" ? rawUsername.length : null,
        hasPassword: typeof rawPassword === "string" && rawPassword.length > 0,
        passwordLen:
          typeof rawPassword === "string" ? rawPassword.length : null,
        parseOk: parsed.success,
        parseIssues: parsed.success
          ? []
          : parsed.error.issues.map((i) => i.message),
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

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

  let admin;
  try {
    admin = getSupabaseAdmin();
  } catch (adminInitError) {
    // #region agent log
    fetch("http://127.0.0.1:7865/ingest/0922b9b0-9fbf-4ddb-a3a6-2516b9e67588", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "618d0e",
      },
      body: JSON.stringify({
        sessionId: "618d0e",
        runId: "pre-fix",
        hypothesisId: "B",
        location: "actions.ts:signUp:admin-init",
        message: "getSupabaseAdmin threw",
        data: {
          error:
            adminInitError instanceof Error
              ? adminInitError.message
              : String(adminInitError),
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    throw adminInitError;
  }

  const { error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username },
  });

  // #region agent log
  fetch("http://127.0.0.1:7865/ingest/0922b9b0-9fbf-4ddb-a3a6-2516b9e67588", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "618d0e",
    },
    body: JSON.stringify({
      sessionId: "618d0e",
      runId: "pre-fix",
      hypothesisId: "B",
      location: "actions.ts:signUp:createUser",
      message: "admin.createUser result",
      data: {
        emailDomain: email.split("@")[1] ?? null,
        createError: createError?.message ?? null,
        createErrorStatus: createError?.status ?? null,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

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

  // Direct inloggen na succesvolle registratie zodat de cookie meteen
  // gezet wordt. Faalt alleen bij een echt rare race / config-issue.
  const supabase = await getSupabaseServerClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  // #region agent log
  fetch("http://127.0.0.1:7865/ingest/0922b9b0-9fbf-4ddb-a3a6-2516b9e67588", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "618d0e",
    },
    body: JSON.stringify({
      sessionId: "618d0e",
      runId: "pre-fix",
      hypothesisId: "F",
      location: "actions.ts:signUp:postCreateSignIn",
      message: "signIn after createUser",
      data: { signInError: signInError?.message ?? null },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

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
  const rawUsername = formData.get("username");
  const rawPassword = formData.get("password");
  const parsed = credentialsSchema.safeParse({
    username: rawUsername,
    password: rawPassword,
  });

  // #region agent log
  fetch("http://127.0.0.1:7865/ingest/0922b9b0-9fbf-4ddb-a3a6-2516b9e67588", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "618d0e",
    },
    body: JSON.stringify({
      sessionId: "618d0e",
      runId: "pre-fix",
      hypothesisId: "C",
      location: "actions.ts:signIn:parse",
      message: "signIn input parsed",
      data: {
        hasUsername: typeof rawUsername === "string" && rawUsername.length > 0,
        hasPassword: typeof rawPassword === "string" && rawPassword.length > 0,
        parseOk: parsed.success,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

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

  // #region agent log
  fetch("http://127.0.0.1:7865/ingest/0922b9b0-9fbf-4ddb-a3a6-2516b9e67588", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "618d0e",
    },
    body: JSON.stringify({
      sessionId: "618d0e",
      runId: "pre-fix",
      hypothesisId: "D",
      location: "actions.ts:signIn:result",
      message: "signInWithPassword result",
      data: {
        emailDomain: email.split("@")[1] ?? null,
        error: error?.message ?? null,
        errorStatus: error?.status ?? null,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

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

  // #region agent log
  fetch("http://127.0.0.1:7865/ingest/0922b9b0-9fbf-4ddb-a3a6-2516b9e67588", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "618d0e",
    },
    body: JSON.stringify({
      sessionId: "618d0e",
      runId: "pre-fix",
      hypothesisId: "E",
      location: "actions.ts:signInWithOAuth",
      message: "OAuth start",
      data: {
        provider: parsed.data,
        origin,
        redirectTo,
        error: error?.message ?? null,
        hasUrl: Boolean(data.url),
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

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
