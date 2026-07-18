import "server-only";

import { isAdminUser } from "@/lib/auth/is-admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { USER_AI_REQUESTS_PER_DAY } from "@/types/exercise-group-submission";

import type { User } from "@supabase/supabase-js";

export type AiQuotaResult =
  | { ok: true; remaining: number | null }
  | { ok: false; status: 401 | 403 | 429; error: string };

export type AiQuotaStatus =
  | {
      ok: true;
      remaining: number | null;
      limit: number;
      disabled: boolean;
    }
  | { ok: false; status: 401 | 403; error: string };

function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Leest AI-quota zonder de teller te verhogen (voor UI-weergave).
 * Admins: remaining null (= onbeperkt).
 */
export async function getAiQuotaStatus(
  user: User | null | undefined,
): Promise<AiQuotaStatus> {
  if (!user) {
    return { ok: false, status: 401, error: "Niet ingelogd." };
  }

  if (isAdminUser(user)) {
    return {
      ok: true,
      remaining: null,
      limit: USER_AI_REQUESTS_PER_DAY,
      disabled: false,
    };
  }

  const admin = getSupabaseAdmin();
  const { data: profile, error } = await admin
    .from("profiles")
    .select("ai_disabled, ai_requests_date, ai_requests_count")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      status: 403,
      error: `Profiel ophalen mislukt: ${error.message}`,
    };
  }

  if (!profile) {
    return { ok: false, status: 403, error: "Profiel niet gevonden." };
  }

  const today = utcToday();
  const sameDay = profile.ai_requests_date === today;
  const count = sameDay ? (profile.ai_requests_count ?? 0) : 0;
  const remaining = Math.max(0, USER_AI_REQUESTS_PER_DAY - count);

  return {
    ok: true,
    remaining,
    limit: USER_AI_REQUESTS_PER_DAY,
    disabled: Boolean(profile.ai_disabled),
  };
}

/**
 * Controleert ai_disabled + daglimiet (UTC) en verhoogt de teller bij succes.
 * Admins: onbeperkt, geen teller. Gebruikt service role voor de atomiciteit
 * van de counter-update (anders kan RLS eigen update blokkeren bij race).
 */
export async function assertAndConsumeAiQuota(
  user: User | null | undefined,
): Promise<AiQuotaResult> {
  if (!user) {
    return { ok: false, status: 401, error: "Niet ingelogd." };
  }

  if (isAdminUser(user)) {
    return { ok: true, remaining: null };
  }

  const admin = getSupabaseAdmin();
  const { data: profile, error } = await admin
    .from("profiles")
    .select("ai_disabled, ai_requests_date, ai_requests_count")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      status: 403,
      error: `Profiel ophalen mislukt: ${error.message}`,
    };
  }

  if (!profile) {
    return { ok: false, status: 403, error: "Profiel niet gevonden." };
  }

  if (profile.ai_disabled) {
    return {
      ok: false,
      status: 403,
      error: "AI-generatie is uitgeschakeld voor jouw account.",
    };
  }

  const today = utcToday();
  const sameDay = profile.ai_requests_date === today;
  const count = sameDay ? (profile.ai_requests_count ?? 0) : 0;

  if (count >= USER_AI_REQUESTS_PER_DAY) {
    return {
      ok: false,
      status: 429,
      error: `Daglimiet bereikt (${USER_AI_REQUESTS_PER_DAY} AI-requests per dag, UTC).`,
    };
  }

  const nextCount = count + 1;
  const { error: updateError } = await admin
    .from("profiles")
    .update({
      ai_requests_date: today,
      ai_requests_count: nextCount,
    })
    .eq("id", user.id);

  if (updateError) {
    return {
      ok: false,
      status: 403,
      error: `Limiet bijwerken mislukt: ${updateError.message}`,
    };
  }

  return {
    ok: true,
    remaining: USER_AI_REQUESTS_PER_DAY - nextCount,
  };
}

/** Haalt de huidige sessie-user op (of null). */
export async function getSessionUser(): Promise<User | null> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
