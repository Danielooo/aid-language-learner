import { copyGlobalGroupToPersonal } from "@/lib/exercises/copy-global-group-to-personal";
import { getExerciseUserAccess } from "@/lib/exercises/exercise-access";

import type {
  ExerciseGroupCopySuccess,
  ExerciseGroupsFailure,
} from "@/types/exercise-groups";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Kopieert een hele globale groep naar de persoonlijke collectie van de user.
 */
export async function POST(
  _req: Request,
  context: RouteContext,
): Promise<Response> {
  const access = await getExerciseUserAccess();
  if (!access.ok) return access.response;

  const { id } = await context.params;
  const result = await copyGlobalGroupToPersonal(
    access.supabase,
    access.userId,
    id,
  );

  if (!result.ok) {
    return Response.json(
      { ok: false, error: result.error } satisfies ExerciseGroupsFailure,
      { status: result.status },
    );
  }

  return Response.json({
    ok: true,
    personalGroupId: result.personalGroupId,
    name: result.name,
    exerciseCount: result.exerciseCount,
  } satisfies ExerciseGroupCopySuccess);
}
