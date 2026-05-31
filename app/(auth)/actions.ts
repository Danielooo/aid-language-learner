"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

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

  // Direct inloggen na succesvolle registratie zodat de cookie meteen
  // gezet wordt. Faalt alleen bij een echt rare race / config-issue.
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
  redirect("/dev/dashboard");
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
  const supabase = await getSupabaseServerClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: usernameToEmail(username),
    password,
  });

  if (error) {
    return {
      ok: false,
      error: "Username of wachtwoord onjuist.",
    };
  }

  revalidatePath("/", "layout");
  redirect("/dev/dashboard");
}

export async function signOut(): Promise<void> {
  const supabase = await getSupabaseServerClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
