import { DEV_EXERCISE_TOOLS_REQUIRE_AUTH } from "@/lib/dev/exercise-generator-auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

// Lichte lijst van oefeningen voor de custom exercise-picker in de quiz.

export const dynamic = "force-dynamic";

export type ExercisePickerItem = {
  id: string;
  source_text: string;
  target_text: string;
  topic: string | null;
};

export type ExerciseListResponse = {
  exercises: ExercisePickerItem[];
  total: number;
  page: number;
  pageSize: number;
};

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const topicParam = url.searchParams.get("topic");
  const searchParam = url.searchParams.get("search");
  const pageParam = url.searchParams.get("page");
  const pageSizeParam = url.searchParams.get("pageSize");

  const topic =
    topicParam && topicParam.trim().length > 0 && topicParam !== "all"
      ? topicParam.trim()
      : null;
  const search = searchParam?.trim() ?? "";
  const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number.parseInt(pageSizeParam ?? String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE),
  );

  const serverSupabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await serverSupabase.auth.getUser();
  if (DEV_EXERCISE_TOOLS_REQUIRE_AUTH && !user) {
    return Response.json({ error: "Niet ingelogd." }, { status: 401 });
  }

  const supabase =
    !DEV_EXERCISE_TOOLS_REQUIRE_AUTH && !user
      ? getSupabaseAdmin()
      : serverSupabase;
  const seedOnly = !DEV_EXERCISE_TOOLS_REQUIRE_AUTH && !user;

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("exercises")
    .select("id, source_text, target_text, topic", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (seedOnly) query = query.is("owner_id", null);
  if (topic) query = query.eq("topic", topic);
  if (search.length > 0) {
    const pattern = `%${search}%`;
    query = query.or(
      `source_text.ilike.${pattern},target_text.ilike.${pattern}`,
    );
  }

  const { data, error, count } = await query;

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const payload: ExerciseListResponse = {
    exercises: (data ?? []).map((row) => ({
      id: row.id,
      source_text: row.source_text,
      target_text: row.target_text,
      topic: row.topic,
    })),
    total: count ?? 0,
    page,
    pageSize,
  };

  return Response.json(payload);
}
