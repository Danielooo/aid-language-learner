import { z } from "zod";

import { copyGlobalGroupToPersonal } from "@/lib/exercises/copy-global-group-to-personal";
import { getExerciseUserAccess } from "@/lib/exercises/exercise-access";

import type {
  ExerciseGroupCopySuccess,
  ExerciseGroupsFailure,
} from "@/types/exercise-groups";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

type RouteContext = { params: Promise<{ id: string }> };

const bodySchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
  })
  .optional();

/**
 * Kopieert een heel community-topic naar het persoonlijke leerplan.
 * Optioneel body `{ name }` bij naamconflict / herhaald overnemen.
 */
export async function POST(
  req: Request,
  context: RouteContext,
): Promise<Response> {
  const access = await getExerciseUserAccess();
  if (!access.ok) return access.response;

  const { id } = await context.params;

  let name: string | undefined;
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    let json: unknown = undefined;
    try {
      json = await req.json();
    } catch {
      return Response.json(
        { ok: false, error: "Ongeldige JSON." } satisfies ExerciseGroupsFailure,
        { status: 400 },
      );
    }
    const parsed = bodySchema.safeParse(json ?? {});
    if (!parsed.success) {
      return Response.json(
        { ok: false, error: "Ongeldige topicnaam." } satisfies ExerciseGroupsFailure,
        { status: 400 },
      );
    }
    name = parsed.data?.name;
  }

  const result = await copyGlobalGroupToPersonal(
    access.supabase,
    access.userId,
    id,
    { name },
  );

  if (!result.ok) {
    return Response.json(
      {
        ok: false,
        error: result.error,
        ...(result.code ? { code: result.code } : {}),
        ...(result.suggestedName
          ? { suggestedName: result.suggestedName }
          : {}),
      } satisfies ExerciseGroupsFailure,
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
