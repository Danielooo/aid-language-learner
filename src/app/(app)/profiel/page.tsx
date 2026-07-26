import { redirect } from "next/navigation";

import { ProfilePageContent } from "@/components/features/profile/profile-page-content";
import { getAccountCapabilities } from "@/lib/auth/account-capabilities";
import { isAdminUser } from "@/lib/auth/is-admin";
import { APP_ROUTES } from "@/lib/routes";
import { getSupabaseServerClient } from "@/lib/supabase/server";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Profiel" };

export default async function ProfielPage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `${APP_ROUTES.login}?next=${encodeURIComponent(APP_ROUTES.profiel)}`,
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name, bio")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.username) {
    redirect(APP_ROUTES.login);
  }

  const capabilities = getAccountCapabilities(user);
  const canDeleteAccount = !isAdminUser(user);

  return (
    <ProfilePageContent
      username={profile.username}
      displayName={profile.display_name}
      bio={profile.bio}
      email={user.email ?? null}
      emailHelper={capabilities.emailHelper}
      canChangePassword={capabilities.canChangePassword}
      canDeleteAccount={canDeleteAccount}
    />
  );
}
