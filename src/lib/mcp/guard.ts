import "server-only";

/** Of MCP alleen in dev of met expliciete flag draait (geen admin-keys in prod). */
export function isMcpEnabled(): boolean {
  return (
    process.env.NODE_ENV === "development" || process.env.MCP_ENABLED === "true"
  );
}

export function mcpDisabledResponse(): Response {
  return new Response(null, { status: 404 });
}

/** Optionele Bearer-check wanneer MCP_DEV_SECRET gezet is. */
export function isMcpAuthorized(request: Request): boolean {
  const secret = process.env.MCP_DEV_SECRET;
  if (!secret) return true;

  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export function mcpUnauthorizedResponse(): Response {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

export function assertMcpRequestAllowed(request: Request): Response | null {
  if (!isMcpEnabled()) return mcpDisabledResponse();
  if (!isMcpAuthorized(request)) return mcpUnauthorizedResponse();
  return null;
}
