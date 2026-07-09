import "server-only";

import { randomBytes } from "node:crypto";

import {
  getAuth0UserById,
  updateAuth0UserAppMetadata,
} from "@/lib/auth/auth0-management";
import {
  deriveUsernameFromAuth0Profile,
  usernameToEmail,
} from "@/lib/auth/username";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

import type { User } from "@auth0/nextjs-auth0/types";

type AppMetadata = {
  supabase_user_id?: string;
  supabase_password?: string;
};

function generateSupabasePassword(): string {
  return randomBytes(24).toString("base64url");
}

/**
 * Zorgt dat er een Supabase-user + sessie-cookie bestaat voor de Auth0-user.
 * Wordt aangeroepen in `beforeSessionSaved` na elke succesvolle Auth0-login.
 */
export async function provisionSupabaseUser(auth0User: User): Promise<void> {
  const managementUser = await getAuth0UserById(auth0User.sub);
  const appMetadata = (managementUser?.app_metadata ?? {}) as AppMetadata;

  const username =
    (typeof managementUser?.user_metadata?.username === "string" &&
      managementUser.user_metadata.username) ||
    deriveUsernameFromAuth0Profile({
      email: auth0User.email,
      nickname: auth0User.nickname,
      name: auth0User.name,
      user_metadata: managementUser?.user_metadata,
    });

  const email =
    auth0User.email ??
    managementUser?.email ??
    usernameToEmail(username);

  let supabaseUserId = appMetadata.supabase_user_id;
  let supabasePassword = appMetadata.supabase_password;

  const admin = getSupabaseAdmin();

  if (!supabaseUserId || !supabasePassword) {
    supabasePassword = generateSupabasePassword();

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: supabasePassword,
      email_confirm: true,
      user_metadata: { username },
    });

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("already") || msg.includes("registered")) {
        const { data: listData, error: listError } =
          await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
        if (listError) throw listError;
        const existing = listData.users.find((u) => u.email === email);
        if (!existing) {
          throw new Error(
            `Supabase-user voor ${email} bestaat al maar kon niet worden opgezocht.`,
          );
        }
        supabaseUserId = existing.id;
        supabasePassword = generateSupabasePassword();
        await admin.auth.admin.updateUserById(existing.id, {
          password: supabasePassword,
        });
      } else {
        throw error;
      }
    } else if (data.user) {
      supabaseUserId = data.user.id;
    }

    if (!supabaseUserId || !supabasePassword) {
      throw new Error("Supabase provisioning leverde geen user-id op.");
    }

    await updateAuth0UserAppMetadata(auth0User.sub, {
      ...appMetadata,
      supabase_user_id: supabaseUserId,
      supabase_password: supabasePassword,
    });
  }

  const supabase = await getSupabaseServerClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password: supabasePassword,
  });

  if (signInError) {
    throw new Error(
      `Supabase-sessie na Auth0-login mislukt: ${signInError.message}`,
    );
  }
}
