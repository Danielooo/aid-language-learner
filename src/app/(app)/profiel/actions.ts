"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  getAccountCapabilities,
  isSyntheticEmail,
} from "@/lib/auth/account-capabilities";
import { getPasswordSchema } from "@/lib/auth/password-policy";
import { usernameToEmail } from "@/lib/auth/username";
import { APP_ROUTES } from "@/lib/routes";
import { isAdminUser } from "@/lib/auth/is-admin";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

import type { ProfileActionState } from "@/app/(app)/profiel/_lib/state";

const usernameSchema = z
  .string()
  .trim()
  .min(2, "Minimaal 2 tekens")
  .max(32, "Maximaal 32 tekens")
  .regex(/^[a-zA-Z0-9_-]+$/, "Alleen letters, cijfers, _ en - toegestaan");

const updateProfileSchema = z.object({
  username: usernameSchema,
  displayName: z
    .string()
    .trim()
    .max(80, "Maximaal 80 tekens")
    .optional()
    .transform((value) => value ?? ""),
  bio: z
    .string()
    .trim()
    .max(500, "Maximaal 500 tekens")
    .optional()
    .transform((value) => value ?? ""),
});

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Vul je huidige wachtwoord in"),
    newPassword: getPasswordSchema(),
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "Nieuw wachtwoord moet verschillen van het huidige",
    path: ["newPassword"],
  });

async function requireUser() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(APP_ROUTES.login);
  }

  return { supabase, user };
}

export async function updateProfile(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const parsed = updateProfileSchema.safeParse({
    username: formData.get("username"),
    displayName: formData.get("displayName") ?? "",
    bio: formData.get("bio") ?? "",
  });

  if (!parsed.success) {
    const fieldErrors: ProfileActionState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (key === "username" || key === "displayName" || key === "bio") {
        fieldErrors[key] = issue.message;
      }
    }
    return { ok: false, fieldErrors };
  }

  const { supabase, user } = await requireUser();
  const { username, displayName, bio } = parsed.data;
  const capabilities = getAccountCapabilities(user);

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();

  const previousUsername = currentProfile?.username ?? null;
  const usernameChanged =
    previousUsername !== null &&
    previousUsername.toLowerCase() !== username.toLowerCase();

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      username,
      display_name: displayName.length > 0 ? displayName : null,
      bio: bio.length > 0 ? bio : null,
    })
    .eq("id", user.id);

  if (profileError) {
    const msg = profileError.message.toLowerCase();
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return {
        ok: false,
        fieldErrors: { username: "Deze username is al in gebruik." },
      };
    }
    return { ok: false, error: profileError.message };
  }

  // Auth-metadata + synthetische e-mail synchroon houden met login.
  if (usernameChanged) {
    const admin = getSupabaseAdmin();
    const updatePayload: {
      user_metadata: { username: string };
      email?: string;
      email_confirm?: boolean;
    } = {
      user_metadata: { username },
    };

    if (capabilities.usesSyntheticEmail || isSyntheticEmail(user.email)) {
      updatePayload.email = usernameToEmail(username);
      updatePayload.email_confirm = true;
    }

    const { error: authError } = await admin.auth.admin.updateUserById(
      user.id,
      updatePayload,
    );

    if (authError) {
      // Profiel staat al op de nieuwe username; auth-sync is best-effort
      // maar we melden het wel zodat de user weet dat login-e-mail kan afwijken.
      return {
        ok: false,
        error: `Profiel opgeslagen, maar account-sync mislukte: ${authError.message}`,
      };
    }
  } else {
    const { error: metaError } = await supabase.auth.updateUser({
      data: { username },
    });
    if (metaError) {
      return {
        ok: false,
        error: `Profiel opgeslagen, maar metadata-sync mislukte: ${metaError.message}`,
      };
    }
  }

  revalidatePath("/", "layout");
  revalidatePath(APP_ROUTES.profiel);
  return { ok: true, message: "Profiel opgeslagen." };
}

export async function changePassword(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
  });

  if (!parsed.success) {
    const fieldErrors: ProfileActionState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (key === "currentPassword" || key === "newPassword") {
        fieldErrors[key] = issue.message;
      }
    }
    return { ok: false, fieldErrors };
  }

  const { supabase, user } = await requireUser();
  const capabilities = getAccountCapabilities(user);

  if (!capabilities.canChangePassword) {
    return {
      ok: false,
      error: "Wachtwoord wijzigen is niet beschikbaar bij SSO-login.",
    };
  }

  if (!user.email) {
    return { ok: false, error: "Geen e-mailadres gekoppeld aan dit account." };
  }

  const { currentPassword, newPassword } = parsed.data;

  // Hermerken met huidig wachtwoord vóór update.
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });

  if (verifyError) {
    return {
      ok: false,
      fieldErrors: { currentPassword: "Huidig wachtwoord is onjuist." },
    };
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  revalidatePath(APP_ROUTES.profiel);
  return { ok: true, message: "Wachtwoord gewijzigd." };
}

export async function deleteAccount(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const confirm = String(formData.get("confirm") ?? "").trim();
  const { supabase, user } = await requireUser();

  if (isAdminUser(user)) {
    return {
      ok: false,
      error: "Admin-accounts kunnen niet via deze pagina worden verwijderd.",
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();

  const username = profile?.username ?? "";
  if (!username || confirm !== username) {
    return {
      ok: false,
      fieldErrors: {
        confirm: "Typ je exacte username om te bevestigen.",
      },
    };
  }

  const admin = getSupabaseAdmin();
  const { error } = await admin.auth.admin.deleteUser(user.id);

  if (error) {
    return { ok: false, error: error.message };
  }

  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect(APP_ROUTES.landing);
}
