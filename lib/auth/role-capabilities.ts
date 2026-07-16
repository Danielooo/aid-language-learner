import { isAdminUser } from "@/lib/auth/is-admin";
import { USER_AI_REQUESTS_PER_DAY } from "@/types/exercise-group-submission";

import type { User } from "@supabase/supabase-js";

export type RoleCapabilities = {
  isAdmin: boolean;
  /** Eigen account verwijderen via UI (admins mogen dit niet). */
  canDeleteAccount: boolean;
  /**
   * AI-generatie starten. Limiet (10/dag) en ai_disabled worden apart
   * server-side afgedwongen; dit is alleen de rol-basis.
   */
  canGenerateAiByRole: boolean;
  /** Unlimited AI requests (admins); users hebben USER_AI_REQUESTS_PER_DAY. */
  hasUnlimitedAi: boolean;
  userAiRequestsPerDay: number;
  canSubmitExerciseForGlobal: boolean;
  canReviewGlobalSubmissions: boolean;
  canCurateGlobalCorpus: boolean;
  canManageUsers: boolean;
};

/**
 * Productrechten uit docs/REQUIREMENTS-ROLES.md, afgeleid van de Auth-rol.
 * `ai_disabled` / daglimiet zijn profile-flags en horen hier niet bij.
 */
export function getRoleCapabilities(
  user: User | null | undefined,
): RoleCapabilities {
  const isAdmin = isAdminUser(user);

  return {
    isAdmin,
    canDeleteAccount: Boolean(user) && !isAdmin,
    canGenerateAiByRole: Boolean(user),
    hasUnlimitedAi: isAdmin,
    userAiRequestsPerDay: USER_AI_REQUESTS_PER_DAY,
    // Community-aanbieding van oefeningengroep (niet per losse oefening).
    canSubmitExerciseForGlobal: Boolean(user) && !isAdmin,
    canReviewGlobalSubmissions: isAdmin,
    canCurateGlobalCorpus: isAdmin,
    canManageUsers: isAdmin,
  };
}
