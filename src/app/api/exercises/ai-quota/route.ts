import { getAiQuotaStatus, getSessionUser } from "@/lib/auth/assert-ai-quota";

export const dynamic = "force-dynamic";

/** Huidige AI-dagquota voor de ingelogde user (zonder te consumeren). */
export async function GET() {
  const user = await getSessionUser();
  const status = await getAiQuotaStatus(user);
  if (!status.ok) {
    return Response.json(
      { ok: false, error: status.error },
      { status: status.status },
    );
  }

  return Response.json({
    ok: true,
    remaining: status.remaining,
    limit: status.limit,
    disabled: status.disabled,
  });
}
