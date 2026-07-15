import { z } from "zod";

import { ADMIN_ROLE, isAdminUser } from "@/lib/auth/is-admin";
import { assertAdmin } from "@/lib/auth/assert-admin";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export type AdminUserRow = {
  id: string;
  username: string | null;
  display_name: string | null;
  ai_disabled: boolean;
  role: "admin" | "user";
  banned: boolean;
  created_at: string | null;
};

export type UsersListSuccess = { ok: true; rows: AdminUserRow[] };
export type UsersFailure = { ok: false; error: string };

export async function GET(): Promise<Response> {
  await assertAdmin();
  const admin = getSupabaseAdmin();

  const { data: profiles, error } = await admin
    .from("profiles")
    .select("id, username, display_name, ai_disabled, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return Response.json(
      { ok: false, error: error.message } satisfies UsersFailure,
      { status: 500 },
    );
  }

  const rows: AdminUserRow[] = [];
  let page = 1;
  const perPage = 1000;
  const authById = new Map<
    string,
    { role: "admin" | "user"; banned: boolean }
  >();

  for (;;) {
    const { data, error: listError } = await admin.auth.admin.listUsers({
      page,
      perPage,
    });
    if (listError) {
      return Response.json(
        { ok: false, error: listError.message } satisfies UsersFailure,
        { status: 500 },
      );
    }
    for (const u of data.users) {
      authById.set(u.id, {
        role: isAdminUser(u) ? "admin" : "user",
        banned: Boolean(u.banned_until && new Date(u.banned_until) > new Date()),
      });
    }
    if (data.users.length < perPage) break;
    page += 1;
    if (page > 20) break;
  }

  for (const p of profiles ?? []) {
    const auth = authById.get(p.id);
    rows.push({
      id: p.id,
      username: p.username,
      display_name: p.display_name,
      ai_disabled: Boolean(p.ai_disabled),
      role: auth?.role ?? "user",
      banned: auth?.banned ?? false,
      created_at: p.created_at,
    });
  }

  return Response.json({ ok: true, rows } satisfies UsersListSuccess);
}

const patchBodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("set_role"),
    user_id: z.string().uuid(),
    role: z.enum(["admin", "user"]),
  }),
  z.object({
    action: z.literal("set_ai_disabled"),
    user_id: z.string().uuid(),
    ai_disabled: z.boolean(),
  }),
  z.object({
    action: z.literal("ban"),
    user_id: z.string().uuid(),
  }),
  z.object({
    action: z.literal("unban"),
    user_id: z.string().uuid(),
  }),
]);

async function countAdmins(): Promise<number> {
  const admin = getSupabaseAdmin();
  let page = 1;
  const perPage = 1000;
  let count = 0;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(error.message);
    for (const u of data.users) {
      if (isAdminUser(u)) count += 1;
    }
    if (data.users.length < perPage) break;
    page += 1;
    if (page > 20) break;
  }
  return count;
}

export async function PATCH(req: Request): Promise<Response> {
  const actor = await assertAdmin();
  const admin = getSupabaseAdmin();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json(
      { ok: false, error: "Body is geen geldige JSON." } satisfies UsersFailure,
      { status: 400 },
    );
  }

  const parse = patchBodySchema.safeParse(body);
  if (!parse.success) {
    return Response.json(
      { ok: false, error: "Validatie mislukt." } satisfies UsersFailure,
      { status: 400 },
    );
  }

  const action = parse.data;

  if (action.action === "set_role") {
    if (action.role === "user") {
      const { data: targetData, error: getError } =
        await admin.auth.admin.getUserById(action.user_id);
      if (getError || !targetData.user) {
        return Response.json(
          {
            ok: false,
            error: getError?.message ?? "User niet gevonden.",
          } satisfies UsersFailure,
          { status: 404 },
        );
      }
      if (isAdminUser(targetData.user)) {
        const adminCount = await countAdmins();
        if (adminCount <= 1) {
          return Response.json(
            {
              ok: false,
              error: "De laatste admin kan niet gedegradeerd worden.",
            } satisfies UsersFailure,
            { status: 400 },
          );
        }
      }
    }

    const { error } = await admin.auth.admin.updateUserById(action.user_id, {
      app_metadata: {
        role: action.role === "admin" ? ADMIN_ROLE : null,
      },
    });
    if (error) {
      return Response.json(
        { ok: false, error: error.message } satisfies UsersFailure,
        { status: 500 },
      );
    }
    return Response.json({ ok: true, rows: [] } satisfies UsersListSuccess);
  }

  if (action.action === "set_ai_disabled") {
    const { error } = await admin
      .from("profiles")
      .update({ ai_disabled: action.ai_disabled })
      .eq("id", action.user_id);
    if (error) {
      return Response.json(
        { ok: false, error: error.message } satisfies UsersFailure,
        { status: 500 },
      );
    }
    return Response.json({ ok: true, rows: [] } satisfies UsersListSuccess);
  }

  if (action.action === "ban") {
    if (action.user_id === actor.id) {
      return Response.json(
        {
          ok: false,
          error: "Je kunt jezelf niet deactiveren.",
        } satisfies UsersFailure,
        { status: 400 },
      );
    }
    const { data: targetData } = await admin.auth.admin.getUserById(
      action.user_id,
    );
    if (targetData?.user && isAdminUser(targetData.user)) {
      const adminCount = await countAdmins();
      if (adminCount <= 1) {
        return Response.json(
          {
            ok: false,
            error: "De laatste admin kan niet gedeactiveerd worden.",
          } satisfies UsersFailure,
          { status: 400 },
        );
      }
    }

    const { error: banError } = await admin.auth.admin.updateUserById(
      action.user_id,
      { ban_duration: "876000h" },
    );
    if (banError) {
      return Response.json(
        { ok: false, error: banError.message } satisfies UsersFailure,
        { status: 500 },
      );
    }
    return Response.json({ ok: true, rows: [] } satisfies UsersListSuccess);
  }

  // unban
  const { error: unbanError } = await admin.auth.admin.updateUserById(
    action.user_id,
    { ban_duration: "none" },
  );
  if (unbanError) {
    return Response.json(
      { ok: false, error: unbanError.message } satisfies UsersFailure,
      { status: 500 },
    );
  }

  return Response.json({ ok: true, rows: [] } satisfies UsersListSuccess);
}
