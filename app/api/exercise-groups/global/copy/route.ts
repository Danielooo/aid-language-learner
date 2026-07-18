import { z } from "zod";

import { copyGlobalGroupToPersonal } from "@/lib/exercises/copy-global-group-to-personal";
import { getExerciseUserAccess } from "@/lib/exercises/exercise-access";

import type {
  ExerciseGroupBulkCopySuccess,
  ExerciseGroupsFailure,
} from "@/types/exercise-groups";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const bodySchema = z.object({
  group_ids: z.array(z.string().uuid()).min(1).max(50),
});

/**
 * Bulk: kopieert meerdere community-groepen naar het persoonlijke leerplan.
 */
export async function POST(req: Request): Promise<Response> {
  const access = await getExerciseUserAccess();
  if (!access.ok) return access.response;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return Response.json(
      { ok: false, error: "Ongeldige JSON." } satisfies ExerciseGroupsFailure,
      { status: 400 },
    );
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json(
      {
        ok: false,
        error: "group_ids vereist (1–50 UUID's).",
      } satisfies ExerciseGroupsFailure,
      { status: 400 },
    );
  }

  let copied = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const groupId of parsed.data.group_ids) {
    const result = await copyGlobalGroupToPersonal(
      access.supabase,
      access.userId,
      groupId,
    );
    if (result.ok) {
      copied += 1;
      continue;
    }
    if (result.status === 409) {
      skipped += 1;
      continue;
    }
    errors.push(`${groupId}: ${result.error}`);
  }

  return Response.json({
    ok: true,
    copied,
    skipped,
    errors,
  } satisfies ExerciseGroupBulkCopySuccess);
}
